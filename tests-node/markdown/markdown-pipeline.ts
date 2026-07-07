import { toHtml } from 'hast-util-to-html';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import {
    preprocessMarkdownContent,
    preprocessMarkdownSyntax,
} from '../../resources/js/lib/markdown-syntax.ts';
import { remarkFallbackDirective } from '../../resources/js/lib/remark-fallback-directive.ts';
import { remarkGithubAlerts } from '../../resources/js/lib/remark-github-alerts.ts';
import { remarkZennDirective } from '../../resources/js/lib/remark-zenn-directive.ts';

/**
 * Contract-freeze harness mirroring the ReactMarkdown pipeline in
 * resources/js/components/markdown-content.tsx: the same preprocessing, the
 * contract-relevant remark plugins, remark-rehype with allowDangerousHtml,
 * and react-markdown's raw-to-literal-text step. App-specific plugins
 * (wikilinks, linkify-to-card, supersub, definition lists, emoji, mark) are
 * deliberately excluded. unified, remark-parse, remark-rehype, and
 * hast-util-to-html are pinned to the versions react-markdown itself uses.
 */
const processor = unified()
    .use(remarkParse)
    .use(remarkGfm, { singleTilde: false })
    .use(remarkDirective)
    .use(remarkZennDirective)
    .use(remarkGithubAlerts)
    .use(remarkFallbackDirective)
    .use(remarkRehype, { allowDangerousHtml: true });

interface WalkableNode {
    type?: string;
    children?: unknown[];
}

/**
 * react-markdown renders hast raw nodes as literal text instead of parsing
 * them (post-transform in react-markdown/lib/index.js when skipHtml is
 * false); replicate that so frozen output matches the app.
 */
function convertRawNodesToText(node: WalkableNode): void {
    if (node.type === 'raw') {
        node.type = 'text';
    }

    for (const child of node.children ?? []) {
        convertRawNodesToText(child as WalkableNode);
    }
}

export function renderMarkdownToHtml(markdown: string): string {
    const preprocessed = preprocessMarkdownContent(
        preprocessMarkdownSyntax(markdown),
    );
    const mdast = processor.parse(preprocessed);
    const hast = processor.runSync(mdast);

    convertRawNodesToText(hast as WalkableNode);

    return toHtml(hast);
}
