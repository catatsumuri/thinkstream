<?php

use App\Models\Post;
use App\Models\PostNamespace;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('code blocks with tab metastring keep the real language for Prism highlighting', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'content' => <<<'MARKDOWN'
# Tab Metastring Highlighting

```php tab=Pest
test('example', function () {
    expect(true)->toBeTrue();
});
```

```php tab=PHPUnit
/** @test */
public function example(): void
{
    $this->assertTrue(true);
}
```
MARKDOWN,
    ]);

    $page = visit(route('posts.path', ['path' => $post->full_path]));

    $page
        ->assertNoJavaScriptErrors()
        ->assertPresent('code.language-php')
        ->wait(0.5);

    expect($page->script('Boolean(window.Prism?.languages?.php)'))->toBeTrue();
    expect($page->script(<<<'JS'
        (() => document.querySelector('code.language-php')?.innerHTML.includes('token keyword') ?? false)()
    JS))->toBeTrue();
});

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

    $page = visit(route('posts.path', ['path' => $post->full_path]));

    $page
        ->assertNoJavaScriptErrors()
        ->assertSee('index.php')
        ->assertPresent('code.language-php')
        ->wait(0.5);

    expect($page->script('Boolean(window.Prism?.languages?.php)'))->toBeTrue();
    expect($page->script(<<<'JS'
        (() => document.querySelector('code.language-php')?.innerHTML.includes('token keyword') ?? false)()
    JS))->toBeTrue();
});
