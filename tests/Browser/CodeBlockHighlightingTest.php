<?php

use App\Models\Post;
use App\Models\PostNamespace;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('code blocks with tab metastring keep the real language for Shiki highlighting', function () {
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
        ->assertPresent('code.language-php span[style*="--shiki-light"]');
});

test('code blocks with filenames keep Shiki syntax highlighting', function () {
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
        ->assertPresent('code.language-php span[style*="--shiki-light"]');
});

test('blade code blocks highlight with the native blade grammar', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'content' => <<<'MARKDOWN'
# Blade Highlighting

```blade
@if ($user)
    {{ $user->name }}
@endif
```
MARKDOWN,
    ]);

    $page = visit(route('posts.path', ['path' => $post->full_path]));

    $page
        ->assertNoJavaScriptErrors()
        ->assertPresent('code.language-blade')
        ->assertPresent('code.language-blade span[style*="--shiki-light"]');
});

test('token colors switch between the light and dark themes', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'content' => <<<'MARKDOWN'
# Dual Theme

```php
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
        ->assertPresent('code.language-php span[style*="--shiki-dark"]');

    $colors = $page->script(<<<'JS'
        (() => {
            const token = document.querySelector('code.language-php span[style*="--shiki-light"]');
            document.documentElement.classList.remove('dark');
            const light = getComputedStyle(token).color;
            document.documentElement.classList.add('dark');
            const dark = getComputedStyle(token).color;
            document.documentElement.classList.remove('dark');

            return { light, dark };
        })()
    JS);

    expect($colors['light'])->not->toBe($colors['dark']);
});
