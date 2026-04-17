<?php

namespace Database\Seeders;

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

/**
 * Seeds the example markdown guide posts used in local development.
 *
 * Usage:
 * `vendor/bin/sail artisan db:seed --class=Database\\Seeders\\PostSeeder --no-interaction`
 */
class PostSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'test@example.com'],
            ['name' => 'Test User', 'password' => bcrypt('password')],
        );

        $coverImagePath = Storage::disk('public')->putFileAs(
            'namespaces',
            database_path('seeders/images/guide.png'),
            'guide.png',
        );

        $namespace = PostNamespace::updateOrCreate(
            ['slug' => 'guides'],
            [
                'name' => 'Guides',
                'description' => 'Practical guides, walkthroughs, and reference notes for writing and publishing posts.',
                'cover_image' => $coverImagePath,
                'post_order' => ['index', 'extended-syntax', 'zenn-syntax', 'mintlify-syntax'],
            ],
        );

        Post::updateOrCreate(
            ['namespace_id' => $namespace->id, 'slug' => 'index'],
            [
                'user_id' => $user->id,
                'title' => 'Markdown Syntax Guide',
                'content' => trim(<<<'MD'
# What is Markdown?

Markdown is a lightweight markup language for formatting plain text. You use simple symbols like `#`, `*`, and `-` to define structure, and it converts to HTML for display. The goal is to keep source text readable as-is, even before rendering.

---

# Headings

Use `#` symbols to define heading levels. The number of `#` characters sets the level.

```
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
```

The above renders as:

## Heading 2
### Heading 3
#### Heading 4

> Heading 1 is typically reserved for the page title and used only once per document.

---

# Paragraphs and Line Breaks

## Paragraphs

Separate paragraphs with a **blank line**. A single newline without a blank line does not create a new paragraph — the lines are joined.

```
This is the first paragraph.

This is the second paragraph.
```

This is the first paragraph.

This is the second paragraph.

## Line Breaks

To force a line break **within** a paragraph (without starting a new paragraph), end the line with **two or more spaces** before pressing Enter.

```
Line one
Line two (same paragraph, new line)
```

Line one
Line two (same paragraph, new line)

---

# Text Formatting

## Bold

```
**This text is bold.**
__This also works.__
```

**This text is bold.**
__This also works.__

## Italic

```
*This text is italic.*
_This also works._
```

*This text is italic.*
_This also works._

## Bold and Italic

```
***This text is bold and italic.***
```

***This text is bold and italic.***

## Strikethrough

```
~~This text is crossed out.~~
```

~~This text is crossed out.~~

## Inline Code

Wrap code in single backticks to render it as monospace inline code. Useful for referencing variable names, commands, or short snippets.

```
Use `npm install` to install dependencies.
The `<div>` element is a block-level container.
Set `DEBUG=true` in your environment.
```

Use `npm install` to install dependencies.
The `<div>` element is a block-level container.
Set `DEBUG=true` in your environment.

---

# Lists

## Unordered Lists

Use `-`, `*`, or `+` to create bullet points. They are interchangeable.

```
- Apples
- Oranges
- Bananas
```

- Apples
- Oranges
- Bananas

## Nested Lists

Indent with two or four spaces to create sub-items.

```
- Fruits
  - Apples
  - Oranges
    - Navel
    - Blood
- Vegetables
  - Carrots
  - Spinach
```

- Fruits
  - Apples
  - Oranges
    - Navel
    - Blood
- Vegetables
  - Carrots
  - Spinach

## Ordered Lists

```
1. First step
2. Second step
3. Third step
```

1. First step
2. Second step
3. Third step

> The actual numbers don't matter — Markdown will renumber them in order. You can use `1.` for every item and it still renders correctly.

## Task Lists

Use `- [ ]` for an unchecked box and `- [x]` for a checked box.

```
- [x] Write the first draft
- [x] Add code examples
- [ ] Proofread
- [ ] Publish
```

- [x] Write the first draft
- [x] Add code examples
- [ ] Proofread
- [ ] Publish

---

# Code Blocks

## Fenced Code Blocks

Wrap code in triple backticks. Optionally add a language identifier after the opening fence for syntax highlighting.

Plain block — no language identifier:

````
```
Plain code block, no highlighting
```
````

```
Plain code block, no highlighting
```

JavaScript — add `javascript` after the opening fence:

````
```javascript
const greet = (name) => `Hello, ${name}!`;
console.log(greet('World'));
```
````

```javascript
const greet = (name) => `Hello, ${name}!`;
console.log(greet('World'));
```

PHP:

````
```php
<?php

function greet(string $name): string
{
    return "Hello, {$name}!";
}

echo greet('World');
```
````

```php
<?php

function greet(string $name): string
{
    return "Hello, {$name}!";
}

echo greet('World');
```

Bash:

````
```bash
# Install dependencies
npm install react-markdown

# Start the dev server
npm run dev
```
````

```bash
# Install dependencies
npm install react-markdown

# Start the dev server
npm run dev
```

JSON:

````
```json
{
  "name": "thinkstream",
  "version": "1.0.0",
  "dependencies": {
    "react": "^19.0.0"
  }
}
```
````

```json
{
  "name": "thinkstream",
  "version": "1.0.0",
  "dependencies": {
    "react": "^19.0.0"
  }
}
```

## Long Lines

Long lines scroll horizontally rather than wrapping, so the code block never distorts your layout.

```sql
SELECT users.id, users.name, orders.id AS order_id, orders.total, orders.status FROM users INNER JOIN orders ON orders.user_id = users.id WHERE orders.status IN ('pending', 'processing') ORDER BY orders.created_at DESC;
```

---

# Links

## Inline Links

The basic form is `[visible text](URL)`.

```
[Visit the Markdown Guide](https://www.markdownguide.org)
```

[Visit the Markdown Guide](https://www.markdownguide.org)

## Links with Titles

Add a quoted title after the URL. It appears as a tooltip on hover.

```
[Markdown Guide](https://www.markdownguide.org "The best Markdown reference")
```

[Markdown Guide](https://www.markdownguide.org "The best Markdown reference")

## Bare URLs

Wrap a URL in angle brackets to turn it into a clickable link without custom text.

```
<https://www.example.com>
<hello@example.com>
```

<https://www.example.com>
<hello@example.com>

## Reference-Style Links

Define the URL separately and reference it by label. Useful for keeping long URLs out of the prose.

```
Check out [GitHub][gh] and [MDN][mdn] for documentation.

[gh]: https://github.com
[mdn]: https://developer.mozilla.org
```

Check out [GitHub][gh] and [MDN][mdn] for documentation.

[gh]: https://github.com
[mdn]: https://developer.mozilla.org

---

# Blockquotes

Use `>` to create a blockquote. Add multiple `>` characters for nested quotes.

```
> This is a blockquote.
> It can span multiple lines.
>
> A blank `>` line creates a paragraph break inside the quote.
>
> > This is a nested blockquote.
```

> This is a blockquote.
> It can span multiple lines.
>
> A blank `>` line creates a paragraph break inside the quote.
>
> > This is a nested blockquote.

Blockquotes can contain other Markdown elements:

```
> **Note:** This is an important callout.
> Use `code` or *emphasis* freely inside quotes.
```

> **Note:** This is an important callout.
> Use `code` or *emphasis* freely inside quotes.

---

# Tables

Use `|` to separate columns and `-` for the header separator row.

```
| Name       | Role      | Active |
|------------|-----------|--------|
| Alice      | Admin     | Yes    |
| Bob        | Editor    | No     |
| Carol      | Viewer    | Yes    |
```

| Name       | Role      | Active |
|------------|-----------|--------|
| Alice      | Admin     | Yes    |
| Bob        | Editor    | No     |
| Carol      | Viewer    | Yes    |

## Column Alignment

Add `:` to the separator row to control alignment per column.

```
| Left       | Center     | Right  |
|:-----------|:----------:|-------:|
| Apple      | Banana     | Cherry |
| 1          | 2          | 3      |
```

| Left       | Center     | Right  |
|:-----------|:----------:|-------:|
| Apple      | Banana     | Cherry |
| 1          | 2          | 3      |

MD),
                'published_at' => now(),
            ]);

        Post::updateOrCreate(
            ['namespace_id' => $namespace->id, 'slug' => 'extended-syntax'],
            [
                'user_id' => $user->id,
                'title' => 'Extended Markdown Syntax',
                'content' => trim(<<<'MD'
# Extended Markdown Syntax

Extended syntax adds features beyond the core Markdown spec. This page covers GitHub Flavored Markdown (GFM) extensions, which are supported by this renderer.

> Features marked **✓ Renders here** are active in this app. Others may require additional plugins or a different renderer.

---

# Strikethrough ✓ Renders here

Wrap text in `~~double tildes~~`.

```
The price was ~~$99~~ now **$49**.
```

The price was ~~$99~~ now **$49**.

---

# Task Lists ✓ Renders here

Use `- [ ]` for unchecked and `- [x]` for checked items.

```
- [x] Design the schema
- [x] Write the migration
- [ ] Add validation
- [ ] Write tests
```

- [x] Design the schema
- [x] Write the migration
- [ ] Add validation
- [ ] Write tests

---

# Tables ✓ Renders here

Tables use `|` for column separators and `:` in the divider row for alignment.

```
| Syntax    | Description | Renders? |
|:----------|:-----------:|:--------:|
| **bold**  | Bold text   | ✓        |
| *italic*  | Italic text | ✓        |
| ~~strike~~| Strikethrough| ✓       |
| `code`    | Inline code | ✓        |
```

| Syntax    | Description  | Renders? |
|:----------|:------------:|:--------:|
| **bold**  | Bold text    | ✓        |
| *italic*  | Italic text  | ✓        |
| ~~strike~~| Strikethrough| ✓        |
| `code`    | Inline code  | ✓        |

---

# Autolinks ✓ Renders here

Angle-bracket autolinks turn a raw URL or email into a clickable link.

```
Visit <https://github.com> for source hosting.
Contact us at <hello@example.com>.
```

Visit <https://github.com> for source hosting.
Contact us at <hello@example.com>.

---

# Footnotes ✓ Renders here

Add `[^label]` inline, then define the footnote anywhere in the document. The renderer collects them at the bottom.

```
Markdown was created by John Gruber[^gruber] in 2004.

[^gruber]: John Gruber is a writer and web developer who created Markdown
           together with Aaron Swartz.
```

Markdown was created by John Gruber[^gruber] in 2004.

[^gruber]: John Gruber is a writer and web developer who created Markdown together with Aaron Swartz.

Multiple footnotes work independently:

```
The spec[^spec] describes the syntax. There are many implementations[^impl].

[^spec]: https://spec.commonmark.org
[^impl]: Including Pandoc, kramdown, and remark.
```

The spec[^spec] describes the syntax. There are many implementations[^impl].

[^spec]: https://spec.commonmark.org
[^impl]: Including Pandoc, kramdown, and remark.

---

# Highlight ✗ Requires plugin

The `==highlight==` syntax is **not** part of GFM. It requires a plugin such as `remark-mark-and-unmark`. Without it, the `==` delimiters are rendered as plain text.

```
==This text should be highlighted.==
```

With the plugin active it renders as a `<mark>` element (yellow background by default).

---

# Subscript and Superscript ✗ Requires plugin

`~sub~` and `^sup^` are not standard GFM. They need `remark-sub` / `remark-sup` or similar.

```
H~2~O        → H₂O
E = mc^2^    → E = mc²
```

Without the plugins the delimiters appear literally.

---

# Definition Lists ✗ Requires plugin

Definition lists use a term followed by `:` definitions. Not supported in GFM — requires `remark-definition-list` or Pandoc.

```
Markdown
:   A lightweight markup language.

HTML
:   The standard markup language for web pages.
```

---

# Heading IDs ✗ Renderer-dependent

Some renderers accept `{#custom-id}` after a heading to set an explicit `id` attribute for deep linking.

```
## Installation {#installation}
```

GFM renderers (like GitHub) auto-generate IDs from heading text. Explicit IDs are supported by Pandoc and some static site generators, but not by `remark-gfm` out of the box.

---

# Emoji Shortcodes ✗ Requires plugin

`:shortcode:` syntax is popular on GitHub but requires `remark-emoji` or similar to convert to actual emoji characters.

```
:rocket: :white_check_mark: :warning: :tada:
```

Without the plugin these render as literal text. You can always paste the emoji character directly instead: 🚀 ✅ ⚠️ 🎉

---

> **WIP:** More examples coming soon.
MD),
                'published_at' => now(),
            ]);

        Post::updateOrCreate(
            ['namespace_id' => $namespace->id, 'slug' => 'zenn-syntax'],
            [
                'user_id' => $user->id,
                'title' => 'Zenn Syntax',
                'content' => trim(<<<'MD'
# Zenn Syntax

> Reference: https://zenn.dev/zenn/articles/markdown-guide

Zenn supports a few convenient image patterns on top of regular Markdown.

## Basic Image

```md
![](/storage/namespaces/guide.png)
```

![](/storage/namespaces/guide.png)

## Sized Image

Use `=250x` after the image URL to set the width in pixels.

```md
![](/storage/namespaces/guide.png =250x)
```

![](/storage/namespaces/guide.png =250x)

## Alt Text

```md
![Guide cover](/storage/namespaces/guide.png =250x)
```

![Guide cover](/storage/namespaces/guide.png =250x)

## Caption

Place italic text on the next line to display it like a caption.

```md
![](/storage/namespaces/guide.png =250x)
*Guide cover image*
```

![](/storage/namespaces/guide.png =250x)
*Guide cover image*

## Linked Image

```md
[![](/storage/namespaces/guide.png =250x)](https://zenn.dev)
```

[![](/storage/namespaces/guide.png =250x)](https://zenn.dev)

## Message

Wrap content in `:::message` to display an info callout.

```md
:::message
Your message here
:::
```

:::message
Your message here
:::

Use `:::message alert` for warnings.

```md
:::message alert
Your warning here
:::
```

:::message alert
Your warning here
:::

This system also supports extended variants as a non-standard extension. These are not part of the Zenn spec but work here.

```md
:::message note
Neutral note.
:::

:::message tip
Helpful tip.
:::

:::message check
Success or confirmation.
:::
```

:::message note
Neutral note.
:::

:::message tip
Helpful tip.
:::

:::message check
Success or confirmation.
:::

## Details (Collapsible)

Wrap content in `:::details` followed by a title to create a collapsible block. The content is hidden until the reader clicks to expand it.

```md
:::details Click to expand
This content is hidden by default.
:::
```

:::details Click to expand
This content is hidden by default.
:::

Any block content can go inside — paragraphs, code, lists, and even other directives.

```md
:::details Show code example
Here is some hidden code:

```ts
function add(a: number, b: number): number {
    return a + b;
}
` ``

And a list:

- Item one
- Item two
:::
```

:::details Show code example
Here is some hidden code:

```ts
function add(a: number, b: number): number {
    return a + b;
}
```

And a list:

- Item one
- Item two
:::

To nest directives, use more colons on the outer block.

```md
::::details Details with a nested callout
:::message
This note is inside a collapsible section.
:::
::::
```

::::details Details with a nested callout
:::message
This note is inside a collapsible section.
:::
::::

## Link Card

A URL placed alone on its own line is automatically displayed as a card.

```md
https://zenn.dev
```

https://zenn.dev

Use the `@[card](URL)` form for URLs that contain underscores.

```md
@[card](https://zenn.dev/zenn/articles/markdown-guide)
```

@[card](https://zenn.dev/zenn/articles/markdown-guide)

YouTube URLs are automatically embedded as a video player.

```md
https://www.youtube.com/watch?v=WRVsOCh907o
```

https://www.youtube.com/watch?v=WRVsOCh907o

## Code Block with Filename

Add `:filename` after the language name to display a filename label above the code block.

Use `` ```php:index.php `` to attach a filename:

```php:index.php
<?php

echo 'Hello, world!';
```

Use `` ```ts:src/utils.ts `` to attach a path:

```ts:src/utils.ts
export function greet(name: string): string {
    return `Hello, ${name}!`;
}
```

## Diff Highlighting

Start the fence with `diff` followed by the language name to enable diff highlighting. Lines beginning with `+` are shown in green and lines beginning with `-` in red.

Use `` ```diff js `` for diff highlighting:

```diff js
@@ -4,6 +4,5 @@
+    const foo = bar.baz([1, 2, 3]) + 1;
-    let foo = bar.baz([1, 2, 3]);
     return foo;
```

You can combine `diff` with a filename using `` ```diff ts:src/utils.ts ``:

```diff ts:src/utils.ts
@@ -1,5 +1,5 @@
-export function greet(name: string) {
+export function greet(name: string): string {
     return `Hello, ${name}!`;
 }
```

## GitHub Embed

A GitHub file URL placed alone on its own line is automatically embedded as a code block.

```md
https://github.com/zenn-dev/zenn-editor/blob/canary/lerna.json
```

https://github.com/zenn-dev/zenn-editor/blob/canary/lerna.json

Use a line range with `#L{start}-L{end}` to show a specific section.

```md
https://github.com/zenn-dev/zenn-editor/blob/canary/lerna.json#L1-L3
```

https://github.com/zenn-dev/zenn-editor/blob/canary/lerna.json#L1-L3

The `@[github](URL)` form also works.

```md
@[github](https://github.com/zenn-dev/zenn-editor/blob/canary/lerna.json)
```

@[github](https://github.com/zenn-dev/zenn-editor/blob/canary/lerna.json)
MD),
                'published_at' => now(),
            ]);

        Post::updateOrCreate(
            ['namespace_id' => $namespace->id, 'slug' => 'mintlify-syntax'],
            [
                'user_id' => $user->id,
                'title' => 'Mintlify Syntax (WIP)',
                'content' => trim(<<<'MD'
# Mintlify Syntax

> References:
> - https://starter.mintlify.com/essentials/markdown
> - https://mintlify.wiki/motleyai/docs/essentials/markdown
> - https://www.mintlify.com/docs/components/index

Mintlify ships with MDX-flavored components for docs sites. This page covers the components supported by the ThinkStream Markdown pipeline.

---

# Callouts

Mintlify provides five callout types. Each maps to a Zenn-style `:::message` directive internally.

<Note>
  This is a note callout. Use it for neutral information.
</Note>

<Tip>
  This is a tip callout. Use it for helpful advice.
</Tip>

<Info>
  This is an info callout. Use it for additional context.
</Info>

<Warning>
  This is a warning callout. Use it for cautionary information.
</Warning>

<Check>
  This is a check callout. Use it for success states or confirmations.
</Check>

Source:

```mdx
<Note>
  This is a note callout. Use it for neutral information.
</Note>

<Tip>
  This is a tip callout. Use it for helpful advice.
</Tip>

<Info>
  This is an info callout. Use it for additional context.
</Info>

<Warning>
  This is a warning callout. Use it for cautionary information.
</Warning>

<Check>
  This is a check callout. Use it for success states or confirmations.
</Check>
```

You can also use the underlying Zenn-style directive syntax directly:

```md
:::message note
Note content here.
:::

:::message tip
Tip content here.
:::

:::message
Info content here.
:::

:::message alert
Warning content here.
:::

:::message check
Check content here.
:::
```

---

# Cards

Mintlify uses `<Card>` blocks to create linked navigation tiles.

Live example:

<Card title="Tabs" icon="folder" href="/guides/index">
  Organize related content into a switchable tab UI.
</Card>

<Card title="Callouts" icon="message-square-warning" href="/guides/zenn-syntax">
  Highlight important information with styled alerts.
</Card>

Source:

```mdx
<Card title="Tabs" icon="folder" href="/guides/index">
  Organize related content into a switchable tab UI.
</Card>
```

---

# Card Groups

Cards are often grouped to create documentation indexes.

Live example:

<CardGroup cols={2}>
  <Card title="Tabs" icon="folder" href="/guides/index">
    Organize related content into a switchable tab UI.
  </Card>
  <Card title="Steps" icon="list-ordered" href="/guides/zenn-syntax">
    Sequential steps guide the reader through a process.
  </Card>
  <Card title="Callouts" icon="message-square-warning" href="/guides/extended-syntax">
    Highlight important information with styled alerts.
  </Card>
  <Card title="Code Blocks" icon="code" href="/guides/index">
    Display syntax-highlighted code with optional filenames.
  </Card>
</CardGroup>

Self-closing cards (no body text):

<CardGroup cols={3}>
  <Card title="npm" icon="download" href="/guides/index" />
  <Card title="yarn" icon="zap" href="/guides/index" />
  <Card title="pnpm" icon="rocket" href="/guides/index" />
</CardGroup>

Source:

```mdx
<CardGroup cols={2}>
  <Card title="Tabs" icon="folder" href="/guides/index">
    Organize related content into a switchable tab UI.
  </Card>
  <Card title="Steps" icon="list-ordered" href="/guides/zenn-syntax">
    Sequential steps guide the reader through a process.
  </Card>
</CardGroup>
```

Rendered result for the same source:

<CardGroup cols={2}>
  <Card title="Tabs" icon="folder" href="/guides/index">
    Organize related content into a switchable tab UI.
  </Card>
  <Card title="Steps" icon="list-ordered" href="/guides/zenn-syntax">
    Sequential steps guide the reader through a process.
  </Card>
</CardGroup>

---

# Tabs

Mintlify commonly uses `<Tabs>` and `<Tab>` to switch between examples.

Live example:

<Tabs>
  <Tab title="npm">
    ```bash
    npm install
    ```
  </Tab>
  <Tab title="yarn">
    ```bash
    yarn install
    ```
  </Tab>
  <Tab title="pnpm">
    ```bash
    pnpm install
    ```
  </Tab>
</Tabs>

Source example:

````mdx
<Tabs>
  <Tab title="npm">
    ```bash
    npm install
    ```
  </Tab>
  <Tab title="yarn">
    ```bash
    yarn install
    ```
  </Tab>
  <Tab title="pnpm">
    ```bash
    pnpm install
    ```
  </Tab>
</Tabs>
````

Possible fallback if tabs are unsupported: split content into headings such as `## npm` and `## pnpm`.

---

# Accordions

Accordion components create collapsible sections. The `title` attribute sets the visible label. An optional `icon` attribute is accepted but ignored by this renderer.

Live examples:

<Accordion title="What is Mintlify?">
  Mintlify is a documentation platform that helps you create beautiful, performant documentation sites.
</Accordion>

<Accordion title="How do I get started?" icon="rocket">
  Follow our [quickstart guide](/quickstart) to set up your documentation site in minutes.
</Accordion>

Source:

```mdx
<Accordion title="What is Mintlify?">
  Mintlify is a documentation platform that helps you create beautiful, performant documentation sites.
</Accordion>

<Accordion title="How do I get started?" icon="rocket">
  Follow our [quickstart guide](/quickstart) to set up your documentation site in minutes.
</Accordion>
```

You can also use the underlying Zenn `:::details` syntax directly:

```md
:::details What is Mintlify?
Mintlify is a documentation platform.
:::
```

---

# Steps

Step-based walkthroughs use `<Steps>` and `<Step title="...">` to produce a numbered sequential guide.

Live example:

<Steps>
  <Step title="Create a file">
    Create a new MDX file in your docs directory.
  </Step>
  <Step title="Add frontmatter">
    Add YAML frontmatter with `title` and `description`.
  </Step>
  <Step title="Write content">
    Write your documentation using MDX syntax.
  </Step>
  <Step title="Preview">
    Run `mint dev` to preview your changes.
  </Step>
</Steps>

Source:

```mdx
<Steps>
  <Step title="Create a file">
    Create a new MDX file in your docs directory.
  </Step>
  <Step title="Add frontmatter">
    Add YAML frontmatter with `title` and `description`.
  </Step>
  <Step title="Write content">
    Write your documentation using MDX syntax.
  </Step>
  <Step title="Preview">
    Run `mint dev` to preview your changes.
  </Step>
</Steps>
```

---

# Badge

Use `<Badge>` to display status indicators, labels, and metadata inline within prose or as standalone elements.

Live examples:

<Badge>Badge</Badge>
<Badge color="blue">New</Badge>
<Badge color="green" icon="circle-check">Stable</Badge>
<Badge stroke color="orange">Beta</Badge>
<Badge disabled icon="lock" color="gray">Locked</Badge>

Inline usage:

This feature requires a <Badge color="orange" size="sm">Premium</Badge> subscription, and this endpoint returns <Badge color="blue" shape="pill">JSON</Badge> format.

Source:

```mdx
<Badge>Badge</Badge>
<Badge color="blue">New</Badge>
<Badge color="green" icon="circle-check">Stable</Badge>
<Badge stroke color="orange">Beta</Badge>
<Badge disabled icon="lock" color="gray">Locked</Badge>

This feature requires a <Badge color="orange" size="sm">Premium</Badge> subscription.
```

---

# API Fields

## ResponseField

Use `<ResponseField>` to describe the fields of an API response. Supports `name`, `type`, `required`, `default`, and `deprecated`.

Live example:

<ResponseField name="id" type="string" required>
  Unique identifier for the resource.
</ResponseField>

<ResponseField name="title" type="string" required>
  The post title.
</ResponseField>

<ResponseField name="published_at" type="string | null">
  ISO 8601 timestamp, or `null` if the post is unpublished.
</ResponseField>

<ResponseField name="slug" type="string" required deprecated>
  URL slug. Use `handle` instead.
</ResponseField>

Source:

```mdx
<ResponseField name="id" type="string" required>
  Unique identifier for the resource.
</ResponseField>

<ResponseField name="published_at" type="string | null">
  ISO 8601 timestamp, or `null` if the post is unpublished.
</ResponseField>

<ResponseField name="slug" type="string" required deprecated>
  URL slug. Use `handle` instead.
</ResponseField>
```

## ParamField

Use `<ParamField>` to describe request parameters. The attribute key (`path`, `query`, or `body`) indicates where the parameter appears, and its value is the parameter name.

Live example:

<ParamField path="slug" type="string" required>
  Slug used to resolve the page.
</ParamField>

<ParamField query="include" type="string">
  Comma-separated list of relations to include in the response.
</ParamField>

<ParamField body="title" type="string" required>
  The post title.
</ParamField>

Source:

```mdx
<ParamField path="slug" type="string" required>
  Slug used to resolve the page.
</ParamField>

<ParamField query="include" type="string">
  Comma-separated list of relations to include in the response.
</ParamField>

<ParamField body="title" type="string" required>
  The post title.
</ParamField>
```

---

# CodeGroup

`<CodeGroup>` displays multiple code blocks as a tabbed interface. The tab title comes from the meta string after the language identifier. Add `icon="..."` to the meta string when you want an icon in the tab label. Selecting a tab persists the choice across all CodeGroup instances on the page.

Live example:

<CodeGroup>

```javascript JavaScript icon="javascript"
const response = await fetch('https://api.example.com/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Alice', email: 'alice@example.com' }),
});
const data = await response.json();
```

```python Python icon="python"
import requests

response = requests.post(
    'https://api.example.com/users',
    json={'name': 'Alice', 'email': 'alice@example.com'},
)
data = response.json()
```

```php PHP icon="php"
$response = Http::post('https://api.example.com/users', [
    'name' => 'Alice',
    'email' => 'alice@example.com',
]);
$data = $response->json();
```

</CodeGroup>

A second CodeGroup syncs with the first — selecting Python above will also activate Python here:

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

Source:

````mdx
<CodeGroup>

```javascript JavaScript icon="javascript"
const response = await fetch('https://api.example.com/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Alice', email: 'alice@example.com' }),
});
const data = await response.json();
```

```python Python icon="python"
import requests

response = requests.post(
    'https://api.example.com/users',
    json={'name': 'Alice', 'email': 'alice@example.com'},
)
data = response.json()
```

```php PHP icon="php"
$response = Http::post('https://api.example.com/users', [
    'name' => 'Alice',
    'email' => 'alice@example.com',
]);
$data = $response->json();
```

</CodeGroup>
````

---

# Tooltip

`<Tooltip>` wraps inline text and shows a popover on hover. Use `tip` for the tooltip body, `headline` for a bold title, and `cta` + `href` for an optional call-to-action link.

Live example:

Hover over <Tooltip tip="Application Programming Interface: a set of protocols that lets software components communicate." headline="API" cta="Read more" href="/guides/index">API</Tooltip> for a definition.

Simple tooltip: hover over <Tooltip tip="Hypertext Markup Language — the standard language for web pages.">HTML</Tooltip>.

Source:

```mdx
Hover over <Tooltip tip="Application Programming Interface: a set of protocols that lets software components communicate." headline="API" cta="Read more" href="/guides/index">API</Tooltip> for a definition.

Simple tooltip: hover over <Tooltip tip="Hypertext Markup Language — the standard language for web pages.">HTML</Tooltip>.
```

---

# Update

`<Update>` displays a changelog entry in a timeline layout. Use `label` for the date or version (it also becomes an anchor link), `description` for a subtitle, and `tags` for filter labels.

Live example:

<Update label="2024-10-11" description="v0.2.0" tags={["Feature", "Improvement"]}>

## Improved card icon support

Cards now support brand icons from the `simple-icons` library in addition to Lucide icons. Pass any brand name as the `icon` prop on `<Card>`.

</Update>

<Update label="2024-09-01" description="v0.1.0" tags={["Initial release"]}>

## First release

Initial launch of Thinkstream with support for Markdown, GFM, Zenn syntax, and core Mintlify components including callouts, cards, tabs, steps, and code groups.

</Update>

Source:

```mdx
<Update label="2024-10-11" description="v0.2.0" tags={["Feature", "Improvement"]}>

## Improved card icon support

Cards now support brand icons from the `simple-icons` library in addition to Lucide icons. Pass any brand name as the `icon` prop on `<Card>`.

</Update>

<Update label="2024-09-01" description="v0.1.0" tags={["Initial release"]}>

## First release

Initial launch of Thinkstream with support for Markdown, GFM, Zenn syntax, and core Mintlify components including callouts, cards, tabs, steps, and code groups.

</Update>
```
MD),
                'published_at' => now(),
            ]);
    }
}
