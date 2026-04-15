# thinkstream

## Markdown rendering

The app renders markdown through `resources/js/components/markdown-content.tsx`, which wraps `react-markdown` with `remark-gfm`, `remark-directive`, and a custom Zenn directive plugin.

Custom markdown behavior is split into three layers:

1. `resources/js/lib/zenn-markdown.ts`
   - Preprocesses source text before `react-markdown` parses it.
   - `preprocessZennSyntax()` normalizes shorthand Zenn directive syntax such as `:::message alert` into directive attributes that `remark-directive` can understand.
   - The same preprocessing layer also normalizes selected Mintlify-style JSX snippets such as `<Tabs>` / `<Tab>` into directive syntax before parsing.
   - `preprocessZennMarkdown()` rewrites image syntax like `![](/path/to/image.png =250x)` and carries width, height, and caption metadata through the URL while skipping fenced code blocks.
2. `resources/js/lib/remark-zenn-directive.ts`
   - Converts parsed Zenn container directives into HTML nodes that React can render.
   - Current support maps `:::message` and `:::message alert` into `<aside>` nodes with message or alert styling.
   - `resources/js/lib/remark-tabs-directive.ts` maps `:::tabs` / `:::tab` directives into custom `<tabs>` / `<tab>` nodes for the React renderer.
3. `resources/js/lib/markdown-components.tsx`
   - Overrides markdown element rendering for headings, code blocks, images, and caption-like paragraphs.
   - `resources/js/components/code-block.tsx` also treats fenced `mermaid` blocks specially and renders them through `resources/js/components/mermaid-block.tsx`.
   - `resources/js/components/markdown-tabs.tsx` renders tab groups produced from Mintlify-style `<Tabs>` syntax.

### Supported extensions in this repository

Current seeded examples cover:

1. Zenn-style image width syntax such as `=250x`
2. Image captions written as italic text on the following line
3. Linked images with the same width metadata handling
4. `:::message` and `:::message alert` callout blocks
5. Fenced `mermaid` code blocks rendered as diagrams
6. Link cards from standalone URLs and `@[card](URL)` directives, with OGP metadata fetched server-side and YouTube URLs rendered as iframe embeds
7. Mintlify-style `<Tabs>` / `<Tab>` blocks, normalized into directives before parsing and rendered as interactive tabs

Planned components tracked in the `mintlify-syntax` seeded post (WIP):

- `<Accordion>` — maps directly to `:::details`; no new component needed
- `<Callout type="info|warning">` — maps directly to `:::message` / `:::message{.alert}`; no new component needed
- `<Steps>` / `<Step>` — requires a new directive handler and React component
- `<Card>` / `<CardGroup>` — includes self-closing `<Card ... />` syntax; requires a new code path
- `<CodeGroup>` — variant of `<Tabs>` restricted to code blocks
- `<Banner>`, `<Badge>`, `<Frame>`, Mermaid, `<ResponseField>`, `<ParamField>` — lower priority; decide per component whether to render natively or leave as literal code

### Adding more Zenn syntax

When adding a new Zenn-style snippet or block syntax:

1. Normalize shorthand source syntax in `preprocessZennSyntax()` when the parser needs a more explicit form.
2. Extend `preprocessZennMarkdown()` when the feature is best represented as rewritten markdown or encoded metadata.
3. Add or update `remarkZennDirective()` when the feature should become a custom markdown node after parsing.
4. Add or update a renderer in `createMarkdownComponents()` when the final HTML needs custom React output.
5. Add seeded example content in `database/seeders/PostSeeder.php`.
6. Add regression coverage in a browser test and, when appropriate, a feature test for seeded content.

This keeps the markdown pipeline composable without introducing a separate renderer registry.

### Adding Mintlify syntax

Mintlify uses JSX-like tags (`<Tabs>`, `<Tab>`, `<Accordion>`, …) that `react-markdown` cannot parse directly. These are converted to `remark-directive` container directive syntax in `preprocessMintlifySyntax()` before the parser runs.

The two-pass approach for any new component is:

1. **Preprocessor** (`preprocessMintlifySyntax` in `zenn-markdown.ts`) — strip JSX tags and emit directive syntax.
2. **Remark plugin** (`remark-tabs-directive.ts` or a new file) — set `hName` and `hProperties` on the AST node.
3. **React component** (`markdown-content.tsx` component map) — render the final HTML.

Some planned components skip steps 2 and 3 because they reuse existing Zenn rendering:

| Mintlify tag | Directive output | Rendered by |
|---|---|---|
| `<Tabs>` / `<Tab>` | `::::tabs` / `:::tab` | `MarkdownTabs` / `MarkdownTab` via `remark-tabs-directive` |
| `<Accordion title="X">` | `:::details[X]` | `DetailsBox` via `remarkZennDirective` — no new code |
| `<Callout type="info">` | `:::message` | `MessageBox` via `remarkZennDirective` — no new code |
| `<Callout type="warning">` | `:::message{.alert}` | `MessageBox` via `remarkZennDirective` — no new code |

#### Things to be aware of when extending

**`buildDirectiveAttributes` allowlist** — only attributes listed here are forwarded from the JSX tag into the directive attribute string. Add any new attribute names before relying on them downstream.

```ts
['title', 'icon', 'sync', 'borderBottom'].includes(key)
```

**Self-closing tags** — the open-tag regex (`/^<Foo(?<attributes>[^>]*)>$/`) does not match `<Card ... />`. Self-closing components need a separate regex branch in the preprocessor.

**Container depth** — `<Tabs>` uses four colons (`::::`) at the outer level so the inner `:::tab` directives are unambiguously nested. Any new outer container that wraps a three-colon inner directive must use four colons for the same reason. Track depth with a counter similar to `mintlifyTabsDepth`.

**Fenced code blocks inside tags** — the preprocessor tracks `activeFence` and strips tag-level indentation from fence lines. This is required because CommonMark treats a four-space-indented line starting with backticks as an indented code block rather than a fenced code block. Keep the `effectiveLine` stripping in place for any new tag-aware branch.
