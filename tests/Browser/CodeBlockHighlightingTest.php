<?php

use App\Models\Post;
use App\Models\PostNamespace;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('code blocks with filenames keep Prism syntax highlighting', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'content' => <<<'MARKDOWN'
# Syntax Highlighting

```php:index.php
<?php

function add(int $a, int $b): int
{
    return $a + $b;
}
```
MARKDOWN,
    ]);

    $page = visit(route('posts.show', [$namespace, $post]));

    $page
        ->assertNoJavaScriptErrors()
        ->assertSee('index.php')
        ->assertPresent('code.language-php')
        ->assertPresent('code.language-php .token.keyword');
});
