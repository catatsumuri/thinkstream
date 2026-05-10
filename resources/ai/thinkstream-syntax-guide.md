# Thinkstream Markdown Syntax Guide

Use this guide when formatting Scrap note content. Prefer these constructs over plain prose where they add clarity.

---

## Critical Rule: URLs Must Be Standalone

**Never place a URL on the same line or in the same paragraph as other text.**

Wrong:

```
See the implementation here: https://github.com/owner/repo/blob/main/src/Foo.php#L10-L20
```

Wrong:

```
1. Step description. https://github.com/owner/repo/blob/main/src/Foo.php#L10-L20
```

Correct — use `@[github]()` on its own line:

```
@[github](https://github.com/owner/repo/blob/main/src/Foo.php#L10-L20)
```

Correct — or place the bare URL as a standalone paragraph (blank line before and after):

```
Step description.

https://github.com/owner/repo/blob/main/src/Foo.php#L10-L20
```

---

## Embeds

### GitHub Code Embed

Renders the file inline with syntax highlighting. Supports line ranges.

```
@[github](https://github.com/owner/repo/blob/branch/path/to/file.php)
@[github](https://github.com/owner/repo/blob/branch/path/to/file.php#L42)
@[github](https://github.com/owner/repo/blob/branch/path/to/file.php#L10-L30)
```

### Link Card

Renders an OGP preview card for any URL.

```
@[card](https://example.com/some/page)
```

Any standalone `https://` URL (not GitHub) also becomes a link card automatically.

### YouTube

Place the YouTube URL alone on its own paragraph — it embeds automatically.

```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

---

## Callout Blocks

```
:::message
Default info callout.
:::

:::message note
Neutral note.
:::

:::message tip
Helpful tip.
:::

:::message alert
Warning or caution.
:::

:::message check
Success or confirmation.
:::
```

---

## Collapsible Section

```
:::details Click to expand
Hidden content goes here.
:::
```

---

## Code Blocks

Standard with language:

````
```php
echo "hello";
```
````

With filename:

````
```php:src/Console/Add.php
echo "hello";
```
````

Diff (prefix lines with `+` added / `-` removed):

````
```diff php
- old line
+ new line
```
````

---

## Standard Markdown

Use standard GFM for everything else: headings (`##`, `###`), ordered/unordered lists, bold/italic, inline code, blockquotes, and tables.

Tables:

```
| Column A | Column B |
|----------|----------|
| value    | value    |
```
