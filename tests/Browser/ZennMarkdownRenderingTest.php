<?php

use App\Models\Post;
use App\Models\PostNamespace;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

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

    $page = visit(route('posts.show', [$namespace, $post]));

    $page
        ->assertSee('Guide cover image')
        ->assertAttribute('img[alt="Guide cover"]', 'width', '250')
        ->assertPresent('a[href="https://zenn.dev"]');
});
