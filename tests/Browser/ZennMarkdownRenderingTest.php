<?php

use App\Models\Post;
use App\Models\PostNamespace;
use App\Services\OgpMetadataService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function fakeOgpMetadata(): void
{
    app()->bind(OgpMetadataService::class, function () {
        return new class extends OgpMetadataService
        {
            public function fetch(string $url): ?array
            {
                return [
                    'title' => 'Example Domain',
                    'description' => 'This is an example.',
                    'image' => null,
                    'url' => $url,
                ];
            }
        };
    });
}

test('zenn-style markdown image metadata renders width and caption', function () {
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'name' => 'Guides',
        'is_published' => true,
    ]);

    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'slug' => 'zenn-images',
        'title' => 'Zenn Images',
        'content' => <<<'MARKDOWN'
# Zenn Images

![Guide cover](/storage/namespaces/guide.png =250x)
*Guide cover image*

[![](/storage/namespaces/guide.png =250x)](https://zenn.dev)
MARKDOWN,
    ]);

    $page = visit(route('posts.path', ['path' => $post->full_path]));

    $page
        ->assertNoJavaScriptErrors()
        ->assertSee('Guide cover image')
        ->assertAttribute('img[alt="Guide cover"]', 'width', '250')
        ->assertPresent('a[href="https://zenn.dev"]');
});

test('standalone URL renders as link card div', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'content' => <<<'MARKDOWN'
# Link Card

https://example.com
MARKDOWN,
    ]);

    fakeOgpMetadata();

    $page = visit(route('posts.path', ['path' => $post->full_path]));

    $page
        ->assertNoJavaScriptErrors()
        ->assertPresent('[data-test="embed-card-card"]');
});

test('@[card](URL) directive renders as link card', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'content' => <<<'MARKDOWN'
# Link Card

@[card](https://example.com)
MARKDOWN,
    ]);

    fakeOgpMetadata();

    $page = visit(route('posts.path', ['path' => $post->full_path]));

    $page
        ->assertNoJavaScriptErrors()
        ->assertPresent('[data-test="embed-card-card"]');
});

test(':::details directive renders as details/summary element', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'content' => <<<'MARKDOWN'
# Details Test

:::details Show details
Before diff

```diff
- old value
+ new value
```

After diff
:::
MARKDOWN,
    ]);

    $page = visit(route('posts.path', ['path' => $post->full_path]));

    $page
        ->assertNoJavaScriptErrors()
        ->assertPresent('[data-test="details-block"]')
        ->assertPresent('[data-test="details-block"]:not(.not-prose)')
        ->assertPresent('[data-test="details-block"] summary.not-prose')
        ->assertPresent('[data-test="details-block"] pre.text-gray-300')
        ->assertSee('Show details');
});

test('YouTube URL renders as iframe embed', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'content' => <<<'MARKDOWN'
# YouTube

https://www.youtube.com/watch?v=WRVsOCh907o
MARKDOWN,
    ]);

    $page = visit(route('posts.path', ['path' => $post->full_path]));

    $page->assertNoJavaScriptErrors()
        ->assertPresent('[data-test="embed-card-youtube"]')
        ->assertPresent('iframe[src*="youtube-nocookie.com"]');
});

test('GitHub URL renders as github embed', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'content' => <<<'MARKDOWN'
# GitHub

https://github.com/laravel/framework/blob/13.x/composer.json
MARKDOWN,
    ]);

    $page = visit(route('posts.path', ['path' => $post->full_path]))->resize(390, 844);

    $page->assertNoJavaScriptErrors()
        ->assertPresent('[data-test="embed-github"]')
        ->assertPresent('[data-test="embed-github"].bg-card')
        ->assertPresent('[data-test="embed-github-scroll"]')
        ->assertPresent('[data-test="embed-github-code"]');

    $scrollMetrics = $page->script(<<<'JS'
        (() => {
            const viewport = document.querySelector('[data-test="embed-github-scroll"]');

            if (!viewport) {
                return null;
            }

            const styles = window.getComputedStyle(viewport);

            return {
                overflowX: styles.overflowX,
                overflowY: styles.overflowY,
                maxHeight: styles.maxHeight,
                hasHorizontalOverflow: viewport.scrollWidth > viewport.clientWidth,
                hasVerticalOverflow: viewport.scrollHeight > viewport.clientHeight,
            };
        })()
    JS);

    expect($scrollMetrics)->toBe([
        'overflowX' => 'auto',
        'overflowY' => 'auto',
        'maxHeight' => '512px',
        'hasHorizontalOverflow' => true,
        'hasVerticalOverflow' => true,
    ]);

});

test('link text containing a URL with port renders the full URL including port', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'content' => '[http://localhost:8000](http://localhost:8000) です',
    ]);

    $page = visit(route('posts.path', ['path' => $post->full_path]));

    $linkText = $page->script(<<<'JS'
        (() => document.querySelector('.prose a')?.textContent)()
    JS);

    $page->assertNoJavaScriptErrors();
    expect($linkText)->toBe('http://localhost:8000');
});

test('@[github](URL) directive renders as github embed', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'content' => <<<'MARKDOWN'
# GitHub

@[github](https://github.com/zenn-dev/zenn-editor/blob/canary/lerna.json)
MARKDOWN,
    ]);

    $page = visit(route('posts.path', ['path' => $post->full_path]));

    $page->assertNoJavaScriptErrors()
        ->assertPresent('[data-test="embed-github"]');
});

test('data URI images render without triggering empty src warning', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'content' => <<<'MARKDOWN'
# Data Image

![Example](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==)
MARKDOWN,
    ]);

    $page = visit(route('posts.path', ['path' => $post->full_path]));

    $page->assertNoJavaScriptErrors();

    $src = $page->script(<<<'JS'
        (() => document.querySelector('img[alt="Example"]')?.getAttribute('src') ?? '')()
    JS);

    expect($src)->toStartWith('data:image/png;base64,');
});
