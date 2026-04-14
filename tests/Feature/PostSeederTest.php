<?php

use App\Models\Post;
use App\Models\PostNamespace;
use Database\Seeders\PostSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('post seeder creates the zenn syntax guide with code block examples', function () {
    $this->seed(PostSeeder::class);

    $namespace = PostNamespace::query()
        ->where('slug', 'guides')
        ->first();

    expect($namespace)->not->toBeNull();
    expect($namespace->post_order)->toContain('zenn-syntax');

    $post = Post::query()
        ->where('namespace_id', $namespace->id)
        ->where('slug', 'zenn-syntax')
        ->first();

    expect($post)->not->toBeNull();
    expect($post->title)->toBe('Zenn Syntax');
    expect($post->content)->toContain('## Basic Image');
    expect($post->content)->toContain('## Sized Image');
    expect($post->content)->toContain('## Alt Text');
    expect($post->content)->toContain('## Caption');
    expect($post->content)->toContain('## Linked Image');
    expect($post->content)->toContain('## Code Block with Filename');
    expect($post->content)->toContain('```php:index.php');
    expect($post->content)->toContain('## Diff Highlighting');
    expect($post->content)->toContain('```diff ts:src/utils.ts');
    expect($post->content)->toContain('## GitHub Embed');
    expect($post->content)->toContain('https://github.com/zenn-dev/zenn-editor/blob/canary/lerna.json');
    expect($post->content)->toContain('@[github](https://github.com/zenn-dev/zenn-editor/blob/canary/lerna.json)');
    expect($post->content)->toContain('![Guide cover](/storage/namespaces/guide.png =250x)');
    expect($post->content)->toContain('![](/storage/namespaces/guide.png =250x)');
    expect($post->content)->toContain('*Guide cover image*');
    expect($post->content)->toContain('[![](/storage/namespaces/guide.png =250x)](https://zenn.dev)');
    expect($post->published_at)->not->toBeNull();
});
