<?php

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('top page loads', function () {
    $page = visit('/');

    $page->assertSee('ThinkStream');
});

test('published post headings expose copyable anchor links', function () {
    $post = Post::factory()->published()->create([
        'slug' => 'anchor-post',
        'title' => 'Anchor Post',
        'content' => <<<'MARKDOWN'
# Section Title

Body

```bash
# Install dependencies
npm install
```
MARKDOWN,
    ]);

    $page = visit(route('posts.path', ['path' => $post->full_path]));

    $page
        ->assertSee('Anchor Post')
        ->assertSee('Section Title')
        ->assertNotPresent('a[href="#anchor-post-install-dependencies"]')
        ->assertPresent('[data-test="heading-anchor-anchor-post-section-title"]')
        ->assertAttribute(
            '[data-test="heading-anchor-anchor-post-section-title"]',
            'href',
            '#anchor-post-section-title',
        );
});

test('formatted headings keep anchor ids and toc links in sync', function () {
    $post = Post::factory()->published()->create([
        'slug' => 'formatted-headings',
        'title' => 'Formatted Headings',
        'content' => <<<'MARKDOWN'
## The `foo_bar` [Guide](https://example.com/docs)

Body
MARKDOWN,
    ]);

    $page = visit(route('posts.path', ['path' => $post->full_path]))->resize(1600, 900);

    $page
        ->assertNoJavaScriptErrors()
        ->assertPresent('[data-test="heading-anchor-formatted-headings-the-foo-bar-guide"]')
        ->assertPresent('[data-test="table-of-contents"][data-sticky="true"] [data-test="toc-link-formatted-headings-the-foo-bar-guide"]')
        ->assertAttribute(
            '[data-test="heading-anchor-formatted-headings-the-foo-bar-guide"]',
            'href',
            '#formatted-headings-the-foo-bar-guide',
        )
        ->assertAttribute(
            '[data-test="table-of-contents"][data-sticky="true"] [data-test="toc-link-formatted-headings-the-foo-bar-guide"]',
            'href',
            '#formatted-headings-the-foo-bar-guide',
        );
});

test('markdown external links open in a new tab safely', function () {
    $post = Post::factory()->published()->create([
        'slug' => 'external-links',
        'title' => 'External Links',
        'content' => <<<'MARKDOWN'
[External Docs](https://example.com/docs)

[Internal Docs](/guides/internal)
MARKDOWN,
    ]);

    $page = visit(route('posts.path', ['path' => $post->full_path]));

    $page
        ->assertSee('External Links')
        ->assertAttribute(
            'a[href="https://example.com/docs"]',
            'target',
            '_blank',
        )
        ->assertAttribute(
            'a[href="https://example.com/docs"]',
            'rel',
            'noopener noreferrer',
        )
        ->assertAttributeMissing('a[href="/guides/internal"]', 'target')
        ->assertAttributeMissing('a[href="/guides/internal"]', 'rel');
});

test('table of contents supports encoded hashes for japanese headings', function () {
    $post = Post::factory()->published()->create([
        'slug' => 'upgrade-12-to-13',
        'title' => 'Upgrade 12 to 13',
        'content' => collect([
            '## Installation',
            str_repeat('Setup steps. ', 120),
            '## キャッシュ',
            str_repeat('Cache migration notes. ', 120),
        ])->implode("\n\n"),
    ]);

    $headingId = 'upgrade-12-to-13-キャッシュ';
    $encodedHeadingId = rawurlencode($headingId);

    $page = visit(route('posts.path', ['path' => $post->full_path]))->resize(1600, 900);

    $page
        ->assertNoJavaScriptErrors()
        ->assertPresent("[data-test=\"heading-anchor-{$headingId}\"]")
        ->assertPresent("[data-test=\"table-of-contents\"][data-sticky=\"true\"] [data-test=\"toc-link-{$headingId}\"]")
        ->assertAttribute(
            "[data-test=\"heading-anchor-{$headingId}\"]",
            'href',
            "#{$encodedHeadingId}",
        )
        ->assertAttribute(
            "[data-test=\"table-of-contents\"][data-sticky=\"true\"] [data-test=\"toc-link-{$headingId}\"]",
            'href',
            "#{$encodedHeadingId}",
        );

    expect($page->script(<<<JS
        (() => {
            const link = document.querySelector('[data-test="table-of-contents"][data-sticky="true"] [data-test="toc-link-{$headingId}"]');

            if (! link) {
                return null;
            }

            link.click();

            return window.location.hash;
        })()
    JS))->toBe("#{$encodedHeadingId}");

    $page->wait(0.5);

    expect($page->script(<<<JS
        (() => {
            return document.querySelector('[data-test="table-of-contents"][data-sticky="true"] [data-test="toc-link-{$headingId}"]')?.getAttribute('data-active');
        })()
    JS))->toBe('true');

    expect($page->script(<<<JS
        (() => {
            const heading = document.getElementById('{$headingId}');

            if (! heading) {
                return null;
            }

            const top = heading.getBoundingClientRect().top;

            return top >= 0 && top <= 160;
        })()
    JS))->toBeTrue();
});

test('post navigation toggle stays within the viewport after page scroll', function () {
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'name' => 'Guides',
        'is_published' => true,
    ]);

    $currentPost = Post::factory()->for($namespace, 'namespace')->published()->create([
        'slug' => 'index',
        'title' => 'Index',
        'content' => collect(range(1, 40))
            ->map(fn (int $section): string => "## Section {$section}\n\n".str_repeat('Long body content. ', 30))
            ->implode("\n\n"),
    ]);

    Post::factory()->for($namespace, 'namespace')->published()->create([
        'slug' => 'advanced',
        'title' => 'Advanced',
    ]);

    $page = visit(route('posts.path', ['path' => $currentPost->full_path]))->resize(1440, 1200);

    $page
        ->assertVisible('[data-test="posts-nav-close"]')
        ->script('window.scrollTo(0, document.body.scrollHeight)');

    expect($page->script(<<<'JS'
        (() => {
            const button = document.querySelector('[data-test="posts-nav-close"]');

            if (! button) {
                return null;
            }

            const rect = button.getBoundingClientRect();

            return rect.top >= 0 && rect.bottom <= window.innerHeight;
        })()
    JS))->toBeTrue();

    $page
        ->click('Close')
        ->assertVisible('[data-test="posts-nav-open"]');

    expect($page->script(<<<'JS'
        (() => {
            const button = document.querySelector('[data-test="posts-nav-open"]');

            if (! button) {
                return null;
            }

            const rect = button.getBoundingClientRect();

            return rect.top >= 0 && rect.bottom <= window.innerHeight;
        })()
    JS))->toBeTrue();
});

test('namespace navigation toggle removes the empty desktop gutter', function () {
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'name' => 'Guides',
        'description' => 'Practical guides, walkthroughs, and reference notes for writing and publishing posts.',
        'is_published' => true,
    ]);

    Post::factory()->for($namespace, 'namespace')->published()->create([
        'slug' => 'index',
        'title' => 'Markdown Syntax Guide',
    ]);

    Post::factory()->for($namespace, 'namespace')->published()->create([
        'slug' => 'zenn-syntax',
        'title' => 'Zenn Syntax',
    ]);

    $page = visit(route('posts.path', ['path' => $namespace->full_path]))->resize(1280, 720);

    $page
        ->assertSee('Guides')
        ->assertSee('Toggle Nav');

    $before = $page->script(<<<'JS'
        (() => {
            const layout = document.querySelector('[data-test="namespace-layout"]');

            if (! layout) {
                return null;
            }

            const style = window.getComputedStyle(layout);

            return {
                display: style.display,
                gridTemplateColumns: style.gridTemplateColumns,
            };
        })()
    JS);

    $page
        ->click('Toggle Nav')
        ->wait(0.3);

    $after = $page->script(<<<'JS'
        (() => {
            const layout = document.querySelector('[data-test="namespace-layout"]');

            if (! layout) {
                return null;
            }

            const style = window.getComputedStyle(layout);

            return {
                display: style.display,
                gridTemplateColumns: style.gridTemplateColumns,
                asideExists: !! document.querySelector('[data-test="namespace-nav"]'),
                scrollWidth: document.documentElement.scrollWidth,
                viewportWidth: window.innerWidth,
            };
        })()
    JS);

    expect($before['display'])->toBe('grid');
    expect($before['gridTemplateColumns'])->toContain('240px');
    expect($after)->toBe([
        'display' => 'block',
        'gridTemplateColumns' => 'none',
        'asideExists' => false,
        'scrollWidth' => 1280,
        'viewportWidth' => 1280,
    ]);
});

test('table of contents highlights the active heading and stays scrollable', function () {
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'name' => 'Guides',
        'is_published' => true,
    ]);

    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'slug' => 'index',
        'title' => 'Index',
        'content' => collect(range(1, 120))
            ->map(
                fn (int $section): string => "## Section {$section}\n\n".str_repeat(
                    'Long body content. ',
                    60,
                ),
            )
            ->implode("\n\n"),
    ]);

    $page = visit(route('posts.path', ['path' => $post->full_path]))->resize(1600, 900);

    $page
        ->assertNoJavaScriptErrors()
        ->assertPresent('[data-test="table-of-contents"][data-sticky="true"]')
        ->assertPresent('[data-test="table-of-contents"][data-sticky="true"] [data-test="toc-link-index-section-12"]')
        ->wait(0.5);

    expect($page->script(<<<'JS'
        (() => {
            const toc = document.querySelector('[data-test="table-of-contents"][data-sticky="true"]');

            if (! toc) {
                return null;
            }

            const style = window.getComputedStyle(toc);

            return toc.scrollHeight > toc.clientHeight && ['auto', 'scroll'].includes(style.overflowY);
        })()
    JS))->toBeTrue();

    $page->script(<<<'JS'
        (() => {
            const heading = document.getElementById('index-section-12');

            if (! heading) {
                return null;
            }

            heading.scrollIntoView({ block: 'start' });

            return true;
        })()
    JS);

    $page->wait(0.5);

    expect($page->script(<<<'JS'
        (() => document.querySelector('[data-test="table-of-contents"][data-sticky="true"] [data-test="toc-link-index-section-12"]')?.getAttribute('data-active'))()
    JS))->toBe('true');
});

test('admin post deep links restore hashed headings and use gutter anchors', function () {
    $user = User::factory()->create([
        'email' => 'test@example.com',
    ]);

    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'name' => 'Guides',
    ]);

    $post = Post::factory()->for($namespace, 'namespace')->create([
        'slug' => 'index',
        'title' => 'Index',
        'content' => collect(range(1, 20))
            ->map(
                fn (int $section): string => "## Intro {$section}\n\n".str_repeat(
                    'Long body content. ',
                    90,
                ),
            )
            ->push("## Line Breaks\n\n".str_repeat('Long body content. ', 90))
            ->implode("\n\n"),
    ]);

    $headingId = 'index-line-breaks';

    $this->actingAs($user);

    $page = visit(route('admin.posts.show', [
        'namespace' => $namespace->id,
        'post' => $post->slug,
    ], absolute: false))->resize(1600, 900);

    $page
        ->assertNoJavaScriptErrors()
        ->wait(0.5);

    $page->script(<<<JS
        (() => {
            const url = new URL(window.location.href);
            url.hash = '{$headingId}';
            window.location.assign(url.toString());

            return true;
        })()
    JS);

    $page->wait(0.8);

    expect($page->script(<<<JS
        (() => {
            const anchor = document.querySelector('[data-test="heading-anchor-{$headingId}"]');
            const tocLink = document.querySelector('[data-test="table-of-contents"][data-sticky="true"] [data-test="toc-link-{$headingId}"]');

            if (! anchor || ! tocLink) {
                return null;
            }

            return {
                anchorPlacement: anchor.getAttribute('data-anchor-placement'),
                tocHref: tocLink.getAttribute('href'),
            };
        })()
    JS))->toBe([
        'anchorPlacement' => 'gutter',
        'tocHref' => "#{$headingId}",
    ]);

    $metrics = $page->script(<<<JS
        (() => {
            const heading = document.getElementById('{$headingId}');

            if (! heading) {
                return null;
            }

            const top = heading.getBoundingClientRect().top;

            return {
                top,
                scrollY: window.scrollY,
                innerHeight: window.innerHeight,
                hash: window.location.hash,
            };
        })()
    JS);

    expect($metrics['hash'])->toBe("#{$headingId}");
    expect($metrics['scrollY'])->toBeGreaterThan(0);
    expect($metrics['top'])->toBeGreaterThanOrEqual(0);
    expect($metrics['top'])->toBeLessThanOrEqual($metrics['innerHeight']);

    expect($page->script(<<<JS
        (() => {
            const heading = document.getElementById('{$headingId}');
            const anchor = document.querySelector('[data-test="heading-anchor-{$headingId}"]');

            if (! heading || ! anchor) {
                return null;
            }

            const headingRect = heading.getBoundingClientRect();
            const anchorRect = anchor.getBoundingClientRect();

            return anchorRect.right <= headingRect.left + 8;
        })()
    JS))->toBeTrue();
});

test('admin post table of contents stays within the viewport for wide markdown', function () {
    $user = User::factory()->create([
        'email' => 'test@example.com',
    ]);

    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'name' => 'Guides',
    ]);

    $post = Post::factory()->for($namespace, 'namespace')->create([
        'slug' => 'index',
        'title' => 'Index',
        'content' => implode("\n\n", [
            '## What is Markdown?',
            str_repeat('Long body content with inline code like `DEBUG=true` and `<div>` references. ', 20),
            '## SQL Example',
            '```sql',
            "SELECT users.id, users.name, orders.id AS order_id, orders.total, orders.status FROM users INNER JOIN orders ON orders.user_id = users.id WHERE orders.status IN ('pending', 'processing') ORDER BY orders.created_at DESC;",
            '```',
            ...collect(range(1, 18))
                ->map(
                    fn (int $section): string => "## Section {$section}\n\n".str_repeat(
                        'Long body content. ',
                        60,
                    ),
                )
                ->all(),
        ]),
    ]);

    $this->actingAs($user);

    $page = visit(route('admin.posts.show', [
        'namespace' => $namespace->id,
        'post' => $post->slug,
    ], absolute: false))->resize(1280, 720);

    $page
        ->assertNoJavaScriptErrors()
        ->assertPresent('[data-test="table-of-contents"][data-sticky="true"]')
        ->wait(0.5);

    expect($page->script(<<<'JS'
        (() => {
            const toc = document.querySelector('[data-test="table-of-contents"][data-sticky="true"]');

            if (! toc) {
                return null;
            }

            const rect = toc.getBoundingClientRect();

            return rect.right <= window.innerWidth && document.documentElement.scrollWidth <= window.innerWidth;
        })()
    JS))->toBeTrue();
});

test('admin section edit returns to the heading after saving', function () {
    $user = User::factory()->create([
        'email' => 'test@example.com',
    ]);

    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'name' => 'Guides',
    ]);

    $post = Post::factory()->for($namespace, 'namespace')->create([
        'slug' => 'index',
        'title' => 'Index',
        'content' => implode("\r\n\r\n", [
            ...collect(range(1, 20))
                ->map(
                    fn (int $section): string => "## Intro {$section}\r\n\r\n".str_repeat(
                        'Long body content. ',
                        90,
                    ),
                )
                ->all(),
            implode("\n", [
                '````md',
                '## Not a heading',
                '````',
                '',
                '## Line Breaks',
                '',
                str_repeat('Long body content. ', 90),
            ]),
        ]),
    ]);

    $headingId = 'index-line-breaks';
    $expectedOffset = strpos(str_replace("\r\n", "\n", $post->content), '## Line Breaks');

    $this->actingAs($user);

    $page = visit(route('admin.posts.show', [
        'namespace' => $namespace->id,
        'post' => $post->slug,
    ], absolute: false))->resize(1600, 900);

    $page
        ->assertNoJavaScriptErrors()
        ->wait(0.5);

    expect($page->script(<<<'JS'
        (() => {
            const button = document.querySelector('button[aria-label="Edit section: Line Breaks"]');

            if (! button) {
                return null;
            }

            button.click();

            return true;
        })()
    JS))->toBeTrue();

    $page
        ->wait(0.8)
        ->assertSee('Edit Post');

    expect($page->script(<<<'JS'
        (() => {
            const textarea = document.querySelector('textarea[name="content"]');

            if (! textarea) {
                return null;
            }

            return {
                selectionStart: textarea.selectionStart,
                selectedText: textarea.value.slice(textarea.selectionStart, textarea.selectionEnd),
            };
        })()
    JS))->toBe([
        'selectionStart' => $expectedOffset,
        'selectedText' => '## Line Breaks',
    ]);

    $page
        ->click('Save Changes')
        ->wait(0.8)
        ->assertSee('Index');

    $metrics = $page->script(<<<JS
        (() => {
            const heading = document.getElementById('{$headingId}');

            if (! heading) {
                return null;
            }

            const top = heading.getBoundingClientRect().top;

            return {
                hash: window.location.hash,
                scrollY: window.scrollY,
                top,
                innerHeight: window.innerHeight,
            };
        })()
    JS);

    expect($metrics['hash'])->toBe("#{$headingId}");
    expect($metrics['scrollY'])->toBeGreaterThan(0);
    expect($metrics['top'])->toBeGreaterThanOrEqual(0);
    expect($metrics['top'])->toBeLessThanOrEqual($metrics['innerHeight']);
});
