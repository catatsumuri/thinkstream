<?php

namespace Database\Seeders;

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

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
                'post_order' => ['index', 'extended-syntax'],
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
    }
}
