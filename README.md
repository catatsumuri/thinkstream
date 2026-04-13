# thinkstream

## Markdown rendering

The app renders markdown through `resources/js/components/markdown-content.tsx`, which wraps `react-markdown` with `remark-gfm`, `remark-directive`, and a custom Zenn directive plugin.

Custom markdown behavior is split into three layers:

1. `resources/js/lib/zenn-markdown.ts`
   - Preprocesses source text before `react-markdown` parses it.
   - `preprocessZennSyntax()` normalizes shorthand Zenn directive syntax such as `:::message alert` into directive attributes that `remark-directive` can understand.
   - `preprocessZennMarkdown()` rewrites image syntax like `![](/path/to/image.png =250x)` and carries width, height, and caption metadata through the URL while skipping fenced code blocks.
2. `resources/js/lib/remark-zenn-directive.ts`
   - Converts parsed Zenn container directives into HTML nodes that React can render.
   - Current support maps `:::message` and `:::message alert` into `<aside>` nodes with message or alert styling.
3. `resources/js/lib/markdown-components.tsx`
   - Overrides markdown element rendering for headings, code blocks, images, and caption-like paragraphs.
   - `resources/js/components/code-block.tsx` also treats fenced `mermaid` blocks specially and renders them through `resources/js/components/mermaid-block.tsx`.

### Supported extensions in this repository

Current seeded examples cover:

1. Zenn-style image width syntax such as `=250x`
2. Image captions written as italic text on the following line
3. Linked images with the same width metadata handling
4. `:::message` and `:::message alert` callout blocks
5. Fenced `mermaid` code blocks rendered as diagrams

### Adding more Zenn syntax

When adding a new Zenn-style snippet or block syntax:

1. Normalize shorthand source syntax in `preprocessZennSyntax()` when the parser needs a more explicit form.
2. Extend `preprocessZennMarkdown()` when the feature is best represented as rewritten markdown or encoded metadata.
3. Add or update `remarkZennDirective()` when the feature should become a custom markdown node after parsing.
4. Add or update a renderer in `createMarkdownComponents()` when the final HTML needs custom React output.
5. Add seeded example content in `database/seeders/PostSeeder.php`.
6. Add regression coverage in a browser test and, when appropriate, a feature test for seeded content.

This keeps the markdown pipeline composable without introducing a separate renderer registry.
