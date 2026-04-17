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

test('mintlify-style codegroup renders icons declared in code meta', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'content' => <<<'MARKDOWN'
# CodeGroup Icons

<CodeGroup>

```javascript JavaScript icon="javascript"
console.log('Hello from JavaScript');
```

```python Python icon="python"
print('Hello from Python')
```

```php PHP icon="php"
echo 'Hello from PHP';
```

</CodeGroup>
MARKDOWN,
    ]);

    $page = visit(route('posts.show', [$namespace, $post]));

    $page
        ->assertNoJavaScriptErrors()
        ->assertPresent(
            '[data-test="code-group-tab-JavaScript"] svg[aria-label="JavaScript"]',
        )
        ->assertPresent(
            '[data-test="code-group-tab-Python"] svg[aria-label="Python"]',
        )
        ->assertPresent('[data-test="code-group-tab-PHP"] svg[aria-label="PHP"]');
});

test('mintlify-style badges render inline and with supported variants', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'content' => <<<'MARKDOWN'
# Badge

<Badge>Badge</Badge>
<Badge color="green" icon="circle-check">Stable</Badge>
<Badge stroke color="orange">Beta</Badge>
<Badge disabled icon="lock" color="gray">Locked</Badge>

This feature requires a <Badge color="orange" size="sm">Premium</Badge> subscription.
MARKDOWN,
    ]);

    $page = visit(route('posts.show', [$namespace, $post]));

    $page
        ->assertNoJavaScriptErrors()
        ->assertPresent('[data-test="markdown-badge"]')
        ->assertPresent('[data-test="markdown-badge"] svg')
        ->assertSee('Stable')
        ->assertSee('Beta')
        ->assertSee('Locked')
        ->assertSee('Premium')
        ->assertSee('subscription.');
});

test('mintlify-style tooltips render inline triggers', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'content' => <<<'MARKDOWN'
# Tooltip

Hover over <Tooltip tip="Application Programming Interface" headline="API" cta="Read more" href="/guides/index">API</Tooltip> for a definition.

Simple tooltip: hover over <Tooltip tip="Hypertext Markup Language">HTML</Tooltip>.
MARKDOWN,
    ]);

    $page = visit(route('posts.show', [$namespace, $post]));

    $page
        ->assertNoJavaScriptErrors()
        ->assertPresent('[data-test="markdown-tooltip"]')
        ->assertSee('Hover over')
        ->assertSee('API')
        ->assertSee('HTML');
});

test('mintlify-style updates render as timeline entries', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'content' => <<<'MARKDOWN'
# Update

<Update label="2024-10-11" description="v0.2.0" tags={["Feature", "Improvement"]}>

## Improved card icon support

Cards now support brand icons from the simple-icons library.

</Update>
MARKDOWN,
    ]);

    $page = visit(route('posts.show', [$namespace, $post]));

    $page
        ->assertNoJavaScriptErrors()
        ->assertPresent('[data-test="markdown-update"]')
        ->assertSee('2024-10-11')
        ->assertSee('v0.2.0')
        ->assertSee('Feature')
        ->assertSee('Improvement')
        ->assertSee('Improved card icon support');
});
