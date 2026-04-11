<?php

namespace Database\Seeders;

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\User;
use Illuminate\Database\Seeder;

class PostSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'test@example.com'],
            ['name' => 'Test User', 'password' => bcrypt('password')],
        );

        $namespace = PostNamespace::updateOrCreate(
            ['slug' => 'guides'],
            [
                'name' => 'Guides',
                'description' => 'Practical guides, walkthroughs, and reference notes for writing and publishing posts.',
            ],
        );

        Post::create([
            'namespace_id' => $namespace->id,
            'user_id' => $user->id,
            'title' => 'Markdown Syntax Guide',
            'slug' => 'index',
            'content' => trim(<<<'MD'
# What is Markdown?

Markdown is a lightweight markup language for formatting plain text. You use simple symbols to define structure, and it converts to HTML or other formats for display.

---

# Headings

Use `#` symbols to define heading levels.

```
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
```

---

# Paragraphs and Line Breaks

Separate paragraphs with a blank line. To force a line break within a paragraph, end a line with two or more spaces.

This is the first paragraph.

This is the second paragraph.

---

# Text Formatting

## Bold

Wrap text in `**double asterisks**` or `__double underscores__` to make it bold.

**This text is bold.**

## Italic

Wrap text in `*single asterisks*` or `_single underscores_` for italic.

*This text is italic.*

## Bold and Italic

Combine both with `***triple asterisks***`.

***This text is bold and italic.***

## Strikethrough

Wrap text in `~~double tildes~~` for strikethrough.

~~This text is crossed out.~~

## Inline Code

Wrap code in backticks to display it inline.

Use `const message = "Hello, World!"` to declare a constant.

---

# Lists

## Unordered Lists

Use `-`, `*`, or `+` to create bullet points.

- Apples
- Oranges
- Bananas

Nested lists:

- Fruits
  - Apples
  - Oranges
- Vegetables
  - Carrots
  - Spinach

## Ordered Lists

1. First step
2. Second step
3. Third step

## Task Lists

- [x] Write the first draft
- [x] Add code examples
- [ ] Proofread
- [ ] Publish

---

# Code Blocks

## Fenced Code Blocks

```php
<?php

function greet(string $name): string
{
    return "Hello, {$name}!";
}

echo greet('World');
```

```javascript
const greet = (name) => `Hello, ${name}!`;

console.log(greet('World'));
```

```bash
# Install dependencies
npm install react-markdown

# Start the dev server
npm run dev
```

---

# Links and Images

```
[Link text](https://example.com)
[Link with title](https://example.com "Tooltip text")
![Alt text](image.png)
```

[Visit Google](https://www.google.com)

---

# Blockquotes

> This is a blockquote.
> It can span multiple lines.
>
> > This is a nested blockquote.

---

# Tables

| Language   | Purpose       | Difficulty |
|------------|---------------|------------|
| HTML       | Markup        | Easy       |
| CSS        | Styling       | Medium     |
| JavaScript | Programming   | Hard       |
| Markdown   | Documentation | Easy       |
MD),
            'published_at' => now(),
        ]);
    }
}
