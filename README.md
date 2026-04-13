# thinkstream

## Markdown rendering

The app renders markdown through `resources/js/components/markdown-content.tsx`, which wraps `react-markdown` with `remark-gfm`.

Custom markdown behavior is split into two layers:

1. `resources/js/lib/zenn-markdown.ts`
   - Preprocesses markdown before rendering.
   - Current Zenn support rewrites image syntax like `![](/path/to/image.png =250x)` and carries width, height, and caption metadata through the URL.
   - Any new Zenn-style syntax should be normalized here first, while skipping fenced code blocks.
2. `resources/js/lib/markdown-components.tsx`
   - Overrides markdown element rendering for headings, code blocks, images, and caption-like paragraphs.
   - Use this file when a syntax feature needs custom React output after preprocessing.

### Adding more Zenn syntax

When adding a new Zenn-style snippet or block syntax:

1. Extend `preprocessZennMarkdown()` in `resources/js/lib/zenn-markdown.ts`.
2. Convert the new syntax into standard markdown or metadata that `react-markdown` can safely consume.
3. Add or update a renderer in `createMarkdownComponents()` when the final HTML needs custom React output.
4. Add seeded example content in `database/seeders/PostSeeder.php`.
5. Add regression coverage in a browser test and, when appropriate, a feature test for seeded content.

This keeps the markdown pipeline composable without introducing a separate renderer registry.
