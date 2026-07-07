<?php

use App\Models\Post;
use App\Models\PostNamespace;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('github blockquote alerts render as message asides', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'content' => <<<'MARKDOWN'
# Alerts

> [!NOTE]
> Useful information.

> [!CAUTION]
> Risky action.

> [!NOTE] Same-line text keeps this a plain blockquote.
MARKDOWN,
    ]);

    $page = visit(route('posts.path', ['path' => $post->full_path]));

    $page->assertNoJavaScriptErrors()
        ->assertPresent('aside.msg.note')
        ->assertPresent('aside.msg.alert')
        ->assertPresent('.prose blockquote')
        ->assertSee('Useful information.')
        ->assertSee('Risky action.');
});
