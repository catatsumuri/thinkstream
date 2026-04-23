<?php

use App\Models\Post;
use App\Models\PostNamespace;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('canonical post page exposes markdown actions when enabled', function () {
    config(['thinkstream.markdown_pages.enabled' => true]);

    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'name' => 'Guides',
        'is_published' => true,
    ]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'slug' => 'routing',
        'title' => 'Routing',
        'content' => "## Intro\n\nRoute content.",
    ]);

    $page = visit(route('posts.path', ['path' => $post->full_path]));

    $page
        ->assertPresent('[data-test="view-as-markdown"]')
        ->assertPresent('[data-test="copy-page-markdown"]')
        ->assertAttribute(
            '[data-test="view-as-markdown"]',
            'href',
            route('posts.path.markdown', ['path' => $post->full_path], false),
        );

    $page->script(<<<'JS'
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: {
                writeText: async (value) => {
                    window.__copiedMarkdown = value;
                },
            },
        });
    JS);

    $page->script(<<<'JS'
        document.querySelector('[data-test="copy-page-markdown"]')?.click();
    JS);

    $page->wait(0.5);

    expect($page->script(<<<'JS'
        (() => window.__copiedMarkdown)()
    JS))
        ->toContain('# Routing')
        ->toContain('## Intro')
        ->toContain('Route content.');
});

test('canonical namespace page hides markdown actions when disabled', function () {
    config(['thinkstream.markdown_pages.enabled' => false]);

    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'name' => 'Guides',
        'is_published' => true,
    ]);

    visit(route('posts.path', ['path' => $namespace->full_path]))
        ->assertMissing('[data-test="view-as-markdown"]')
        ->assertMissing('[data-test="copy-page-markdown"]');
});
