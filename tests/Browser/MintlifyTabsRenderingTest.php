<?php

use App\Models\Post;
use App\Models\PostNamespace;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('mintlify-style tabs render as interactive tab controls', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'content' => <<<'MARKDOWN'
# Tabs

<Tabs>
  <Tab title="npm">
    ```bash
    npm install
    ```
  </Tab>
  <Tab title="pnpm">
    ```bash
    pnpm install
    ```
  </Tab>
</Tabs>
MARKDOWN,
    ]);

    $page = visit(route('posts.show', [$namespace, $post]));

    $page
        ->assertNoJavaScriptErrors()
        ->assertPresent('[data-test="markdown-tabs"]')
        ->assertPresent('[data-test="markdown-tab-trigger-npm"]')
        ->assertPresent('[data-test="markdown-tab-trigger-pnpm"]')
        ->assertSee('npm install');
});

test('mintlify-style tabs inside fenced code blocks stay as literal code', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'content' => <<<'MARKDOWN'
# Tabs Example

````mdx
<Tabs>
  <Tab title="npm">
    ```bash
    npm install
    ```
  </Tab>
</Tabs>
````
MARKDOWN,
    ]);

    $page = visit(route('posts.show', [$namespace, $post]));

    $page
        ->assertNoJavaScriptErrors()
        ->assertMissing('[data-test="markdown-tabs"]')
        ->assertSee('<Tabs>')
        ->assertSee('<Tab title="npm">');
});
