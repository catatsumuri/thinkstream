<?php

use App\Models\Post;
use App\Models\PostNamespace;
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
