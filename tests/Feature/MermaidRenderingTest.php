<?php

use App\Models\Post;
use App\Models\PostNamespace;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('mermaid code block is passed through to the frontend unchanged', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'content' => <<<'MD'
# Mermaid Demo

```mermaid
graph TD
  A[Start] --> B{Choice}
  B -->|Yes| C[Success]
  B -->|No| D[Failure]
```
MD,
    ]);

    $response = $this->get(route('posts.path', ['path' => $post->full_path]));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('posts/show')
        ->where('post.content', $post->content)
    );
});
