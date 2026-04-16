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

test('mintlify-style callouts render as typed message boxes', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'content' => <<<'MARKDOWN'
# Callouts

<Note>
  Neutral note.
</Note>

<Tip>
  Helpful tip.
</Tip>

<Info>
  Additional context.
</Info>

<Warning>
  Warning details.
</Warning>

<Check>
  Success state.
</Check>
MARKDOWN,
    ]);

    $page = visit(route('posts.show', [$namespace, $post]));

    $page
        ->assertNoJavaScriptErrors()
        ->assertPresent('svg.lucide-info')
        ->assertPresent('svg.lucide-lightbulb')
        ->assertPresent('svg.lucide-triangle-alert')
        ->assertPresent('svg.lucide-circle-check')
        ->assertSee('Neutral note.')
        ->assertSee('Helpful tip.')
        ->assertSee('Additional context.')
        ->assertSee('Warning details.')
        ->assertSee('Success state.');
});

test('mintlify-style Columns renders as a card group grid', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'content' => <<<'MARKDOWN'
# Columns

<Columns cols={2}>
    <Card title="Vite Plugin" href="/v3/installation" icon="bolt">
        Automatic page resolution and SSR setup.
    </Card>
    <Card title="HTTP Requests" href="/v3/the-basics" icon="globe">
        Make standalone HTTP requests.
    </Card>
</Columns>
MARKDOWN,
    ]);

    $page = visit(route('posts.show', [$namespace, $post]));

    $page
        ->assertNoJavaScriptErrors()
        ->assertPresent('[data-test="markdown-card-group"]')
        ->assertSee('Vite Plugin')
        ->assertSee('HTTP Requests');
});
