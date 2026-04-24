<?php

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\User;
use App\Support\NamespaceBackupArchive;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;

uses(RefreshDatabase::class);

test('top page loads', function () {
    $page = visit('/');

    $page
        ->assertSee('ThinkStream')
        ->assertPresent('[data-test="docs-search-shortcut"]')
        ->assertSee('Powered by ThinkStream')
        ->assertAttribute(
            '[data-test="homepage-github-link"]',
            'href',
            'https://github.com/catatsumuri/thinkstream',
        )
        ->assertAttribute(
            '[data-test="homepage-github-link"]',
            'target',
            '_blank',
        )
        ->assertAttribute(
            '[data-test="homepage-github-link"]',
            'rel',
            'noopener noreferrer',
        )
        ->assertPresent('[data-test="homepage-github-icon"]');
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

test('post title row keeps the path inline without the path badge label', function () {
    $post = Post::factory()->published()->create([
        'slug' => 'inline-path-post',
        'title' => 'Inline Path Post',
    ]);

    $page = visit(route('posts.path', ['path' => $post->full_path]));

    expect($page->script(<<<'JS'
        (() => {
            const titleRow = document.querySelector('[data-test="post-title-row"]');
            const inlinePath = document.querySelector('[data-test="post-path-inline"]');
            const pathBadge = document.querySelector('[data-test="post-path-badge"]');

            return {
                hasTitleRow: !! titleRow,
                hasInlinePath: !! inlinePath,
                hasPathBadge: !! pathBadge,
                titleRowText: titleRow?.textContent ?? null,
                inlinePathText: inlinePath?.textContent?.trim() ?? null,
            };
        })()
    JS))->toBe([
        'hasTitleRow' => true,
        'hasInlinePath' => true,
        'hasPathBadge' => false,
        'titleRowText' => "Inline Path Post/{$post->full_path}",
        'inlinePathText' => '/'.$post->full_path,
    ]);
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

test('desktop sidebars stay sticky while the article scrolls', function () {
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

    $page->assertVisible('[data-test="posts-nav-close"]')
        ->assertPresent('[data-test="content-nav-shell"]')
        ->assertPresent('[data-test="table-of-contents"][data-sticky="true"]')
        ->script('window.scrollTo(0, 1400)');

    expect($page->script(<<<'JS'
        (() => {
            const shell = document.querySelector('[data-test="content-nav-shell"]');
            const scroll = document.querySelector('[data-test="content-nav-scroll"]');

            if (! shell || ! scroll) {
                return null;
            }

            const shellStyle = window.getComputedStyle(shell);
            const scrollStyle = window.getComputedStyle(scroll);

            return {
                borderTopLeftRadius: shellStyle.borderTopLeftRadius,
                borderTopWidth: shellStyle.borderTopWidth,
                shellBackground: shellStyle.backgroundColor,
                scrollOverflowY: scrollStyle.overflowY,
            };
        })()
    JS))->toBe([
        'borderTopLeftRadius' => '0px',
        'borderTopWidth' => '0px',
        'shellBackground' => 'rgba(0, 0, 0, 0)',
        'scrollOverflowY' => 'auto',
    ]);

    expect($page->script(<<<'JS'
        (() => {
            const leftSidebar = document.querySelector('[data-test="content-nav-shell"]');
            const rightSidebar = document.querySelector('[data-test="table-of-contents"][data-sticky="true"]');

            if (! leftSidebar || ! rightSidebar) {
                return null;
            }

            return {
                leftTop: Math.round(leftSidebar.getBoundingClientRect().top),
                rightTop: Math.round(rightSidebar.getBoundingClientRect().top),
            };
        })()
    JS))->toBe([
        'leftTop' => 80,
        'rightTop' => 80,
    ]);

    $page
        ->click('Close')
        ->assertVisible('[data-test="posts-nav-open"]');

    expect($page->script(<<<'JS'
        (() => {
            const button = document.querySelector('[data-test="posts-nav-open"]');

            if (! button) {
                return null;
            }

            return button.offsetParent !== null;
        })()
    JS))->toBeTrue();
});

test('post navigation folders can be expanded from the sidebar', function () {
    $namespace = PostNamespace::factory()->create([
        'slug' => 'docs',
        'name' => 'Docs',
        'description' => 'Documentation root.',
        'is_published' => true,
    ]);

    $childNamespace = PostNamespace::factory()->create([
        'parent_id' => $namespace->id,
        'slug' => 'installation',
        'name' => 'Installation',
        'description' => 'Installation guides.',
        'is_published' => true,
    ]);

    $currentPost = Post::factory()->for($namespace, 'namespace')->published()->create([
        'slug' => 'overview',
        'title' => 'Overview',
    ]);

    Post::factory()->for($childNamespace, 'namespace')->published()->create([
        'slug' => 'nested-post-title',
        'title' => 'Nested Post Title',
    ]);

    $page = visit(route('posts.path', ['path' => $currentPost->full_path]))->resize(1440, 1200);

    $page->assertDontSee('Nested Post Title');

    expect($page->script(<<<'JS'
        (() => {
            const button = document.querySelector('[aria-label="Expand Installation"]');

            if (! button) {
                return false;
            }

            button.click();

            return true;
        })()
    JS))->toBeTrue();

    $page->assertSee('Nested Post Title');
});

test('post page hides inline navigation and toc below desktop width', function () {
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'name' => 'Guides',
        'is_published' => true,
    ]);

    $currentPost = Post::factory()->for($namespace, 'namespace')->published()->create([
        'slug' => 'index',
        'title' => 'Index',
        'content' => "## Section One\n\nBody\n\n## Section Two\n\nMore body",
    ]);

    Post::factory()->for($namespace, 'namespace')->published()->create([
        'slug' => 'advanced',
        'title' => 'Advanced',
    ]);

    $page = visit(route('posts.path', ['path' => $currentPost->full_path]))
        ->resize(768, 1000)
        ->wait(0.3);

    expect($page->script(<<<'JS'
        (() => {
            const inlineNav = document.querySelector('[data-test="content-nav-shell"]');
            const inlineToc = document.querySelector('[data-test="table-of-contents"][data-sticky="true"]');

            return {
                inlineNavVisible: !! inlineNav && inlineNav.offsetParent !== null,
                inlineTocVisible: !! inlineToc && inlineToc.offsetParent !== null,
            };
        })()
    JS))->toBe([
        'inlineNavVisible' => false,
        'inlineTocVisible' => false,
    ]);
});

test('post page avoids horizontal overflow on narrow mobile widths', function () {
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'name' => 'Guides',
        'is_published' => true,
    ]);

    $currentPost = Post::factory()->for($namespace, 'namespace')->published()->create([
        'slug' => 'index',
        'title' => 'Index',
        'content' => "## Section One\n\nBody",
    ]);

    $page = visit(route('posts.path', ['path' => $currentPost->full_path]))->resize(480, 1000);

    expect($page->script(<<<'JS'
        (() => {
            const toggleNavButton = Array.from(document.querySelectorAll('button')).find((el) => el.textContent?.includes('Toggle Nav'));
            const toggleTocButton = Array.from(document.querySelectorAll('button')).find((el) => el.textContent?.includes('Toggle TOC'));

            return {
                compactHeader: (document.querySelector('header')?.getBoundingClientRect().height ?? 0) < 120,
                hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
                toggleNavTextVisible: !! toggleNavButton && toggleNavButton.offsetParent !== null,
                toggleTocTextVisible: !! toggleTocButton && toggleTocButton.offsetParent !== null,
            };
        })()
    JS))->toBe([
        'compactHeader' => true,
        'hasHorizontalOverflow' => false,
        'toggleNavTextVisible' => false,
        'toggleTocTextVisible' => false,
    ]);
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
        ->assertPresent('[data-test="docs-search-shortcut"]')
        ->assertDontSee('Toggle Nav');

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
        ->click('[data-test="docs-nav-toggle"]')
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

test('canonical namespace page preserves multiline descriptions', function () {
    $namespace = PostNamespace::factory()->create([
        'slug' => 'inertiajs-v3',
        'name' => 'Inertia.js v3',
        'description' => "Install the server adapter first.\nThen configure the client entrypoint.",
        'is_published' => true,
    ]);

    Post::factory()->for($namespace, 'namespace')->published()->create([
        'slug' => 'installation',
        'title' => 'Installation',
    ]);

    $page = visit(route('posts.path', ['path' => $namespace->full_path]))->resize(1280, 720);

    $page
        ->assertNoJavaScriptErrors()
        ->assertSee('Inertia.js v3')
        ->assertSee('Install the server adapter first.')
        ->assertSee('Then configure the client entrypoint.');

    expect($page->script(<<<'JS'
        (() => {
            const descriptions = [...document.querySelectorAll('main p')];
            const target = descriptions.find((element) =>
                element.textContent?.includes('Install the server adapter first.') &&
                element.textContent?.includes('Then configure the client entrypoint.')
            );

            if (! target) {
                return null;
            }

            return window.getComputedStyle(target).whiteSpace;
        })()
    JS))->toBe('pre-line');
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
        'slug' => 'guides-backup-button',
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
        'slug' => 'guides-backup-button',
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

    $page->click('button[aria-label="Edit section: Line Breaks"]');

    $page
        ->wait(0.8)
        ->assertPresent('[data-test="view-post-link"]');

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

    $page->fill('content', $post->content."\n");

    expect($page->script(<<<'JS'
        (() => {
            const button = document.querySelector('[data-test="save-post-button"]');

            if (! button) {
                return null;
            }

            return button.hasAttribute('disabled');
        })()
    JS))->toBeFalse();

    $page
        ->click('[data-test="save-post-button"]')
        ->wait(0.8)
        ->assertPresent('[data-test="manage-post-edit-link"]');

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

test('admin namespace page shows the namespace description in the manage header', function () {
    $user = User::factory()->create([
        'email' => 'test@example.com',
    ]);

    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'name' => 'Guides',
        'description' => "Practical guides for writing and publishing posts.\nIncludes workflows and publishing notes.",
    ]);

    $this->actingAs($user);

    $page = visit(route('admin.posts.namespace', $namespace, absolute: false))->resize(1440, 900);

    $page
        ->assertNoJavaScriptErrors()
        ->assertSee('Manage Namespace')
        ->assertSee('Guides')
        ->assertSee('Practical guides for writing and publishing posts.')
        ->assertSee('Includes workflows and publishing notes.');
});

test('admin namespace page shows a cover image thumbnail in the manage header', function () {
    $user = User::factory()->create([
        'email' => 'test@example.com',
    ]);

    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'name' => 'Guides',
        'cover_image' => 'namespaces/guides-cover.jpg',
    ]);

    $this->actingAs($user);

    $page = visit(route('admin.posts.namespace', $namespace, absolute: false))->resize(1440, 900);

    $page
        ->assertNoJavaScriptErrors()
        ->assertPresent('[data-test="manage-namespace-cover-image"]')
        ->assertAttribute(
            '[data-test="manage-namespace-cover-image"]',
            'src',
            '/storage/namespaces/guides-cover.jpg',
        );
});

test('admin namespace page shows backup count and backup management button when backups exist', function () {
    $user = User::factory()->create([
        'email' => 'test@example.com',
    ]);

    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'name' => 'Guides',
    ]);

    $backupDirectory = NamespaceBackupArchive::directory();
    $backupPrefix = NamespaceBackupArchive::currentPrefix($namespace);
    File::ensureDirectoryExists($backupDirectory);
    File::delete([
        ...File::glob($backupDirectory.'/'.$backupPrefix.'-*.zip'),
        ...File::glob($backupDirectory.'/'.$namespace->slug.'-*.zip'),
    ]);

    $firstBackup = $backupDirectory.'/'.$backupPrefix.'-20260421-010203.zip';
    $secondBackup = $backupDirectory.'/'.$backupPrefix.'-20260421-040506.zip';

    File::put($firstBackup, 'backup-1');
    File::put($secondBackup, 'backup-2');

    try {
        $this->actingAs($user);

        $page = visit(route('admin.posts.namespace', $namespace, absolute: false))->resize(1440, 900);

        $page
            ->assertNoJavaScriptErrors()
            ->assertPresent('[data-test="manage-namespace-backups-link"]')
            ->assertAttribute(
                '[data-test="manage-namespace-backups-link"]',
                'href',
                route('admin.posts.backups', $namespace, false),
            );

        expect($page->script(<<<'JS'
            (() => {
                const link = document.querySelector('[data-test="manage-namespace-backups-link"]');

                if (! link) {
                    return null;
                }

                return link.textContent?.replace(/\s+/g, ' ').trim();
            })()
        JS))->toContain('2 backups')
            ->toContain('Backup Management');
    } finally {
        File::delete([
            ...File::glob($backupDirectory.'/'.$backupPrefix.'-*.zip'),
            ...File::glob($backupDirectory.'/'.$namespace->slug.'-*.zip'),
        ]);
    }
});

test('admin post edit warns before leaving with unsaved changes', function () {
    $user = User::factory()->create([
        'email' => 'test@example.com',
    ]);

    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'name' => 'Guides',
    ]);

    $post = Post::factory()->for($namespace, 'namespace')->create([
        'slug' => 'todo',
        'title' => 'Todo',
        'content' => '# Todo',
    ]);

    $this->actingAs($user);

    $page = visit(route('admin.posts.edit', [
        'namespace' => $namespace->id,
        'post' => $post->slug,
    ], absolute: false))->resize(1440, 900);

    $page
        ->assertNoJavaScriptErrors()
        ->assertMissing('[data-test="manage-post-revisions-link"]')
        ->assertMissing('[data-test="manage-post-delete-trigger"]')
        ->fill('title', 'Todo updated');

    expect($page->script(<<<'JS'
        (() => {
            let confirmCalls = 0;

            window.confirm = () => {
                confirmCalls += 1;
                return false;
            };

            document.querySelector('[data-test="view-post-link"]')?.click();

            return {
                confirmCalls,
                path: window.location.pathname,
            };
        })()
    JS))->toBe([
        'confirmCalls' => 1,
        'path' => route('admin.posts.edit', [
            'namespace' => $namespace->id,
            'post' => $post->slug,
        ], false),
    ]);
});

test('admin post header shows revisions and delete as labeled actions', function () {
    $user = User::factory()->create([
        'email' => 'test@example.com',
    ]);

    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'name' => 'Guides',
    ]);

    $post = Post::factory()->for($namespace, 'namespace')->create([
        'slug' => 'todo',
        'title' => 'Todo',
        'content' => '# Todo',
    ]);

    $this->actingAs($user);

    $page = visit(route('admin.posts.show', [
        'namespace' => $namespace->id,
        'post' => $post->slug,
    ], absolute: false))->resize(1440, 900);

    $page->assertNoJavaScriptErrors()
        ->assertPresent('[data-test="manage-post-edit-link"]')
        ->assertPresent('[data-test="manage-post-revisions-link"]')
        ->assertPresent('[data-test="manage-post-delete-trigger"]');

    expect($page->text('[data-test="manage-post-edit-link"]'))
        ->toContain('Edit');

    expect($page->text('[data-test="manage-post-revisions-link"]'))
        ->toContain('Revisions');

    expect($page->text('[data-test="manage-post-delete-trigger"]'))
        ->toContain('Delete');

    expect($page->script(<<<'JS'
        (() => {
            const editLink = document.querySelector('[data-test="manage-post-edit-link"]');
            const adminBadge = [...document.querySelectorAll('span, div, a')].find((element) =>
                element.textContent?.replace(/\s+/g, ' ').trim() === 'Admin View'
            );

            if (! editLink || ! adminBadge) {
                return null;
            }

            const editRect = editLink.getBoundingClientRect();
            const adminRect = adminBadge.getBoundingClientRect();

            return editRect.left < adminRect.left;
        })()
    JS))->toBeTrue();
});
