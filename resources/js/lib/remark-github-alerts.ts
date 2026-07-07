import type { Blockquote, Root } from 'mdast';
import { visit } from 'unist-util-visit';
import { GITHUB_ALERT_VARIANTS } from './markdown-syntax-manifest.js';

/**
 * Normalizes GitHub-style blockquote alerts (`> [!NOTE]` etc.) onto the same
 * `<aside class="msg …">` contract that `:::message` directives produce, so
 * the MessageBox renderer handles both syntaxes without knowing about this
 * plugin.
 *
 * Follows GitHub semantics: the marker must be the only content on the first
 * line of the blockquote (`> [!NOTE] text` stays a plain blockquote). Unlike
 * GitHub, markers are matched case-insensitively and alerts may nest, for
 * consistency with `:::message`.
 */
const ALERT_MARKER_PATTERN =
    /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(?:\r?\n|$)/i;

interface AlertBlockquote extends Blockquote {
    data?: {
        hName?: string;
        hProperties?: Record<string, unknown>;
    };
}

export function remarkGithubAlerts() {
    return (tree: Root) => {
        visit(tree, 'blockquote', (node: Blockquote) => {
            const blockquote = node as AlertBlockquote;

            if (blockquote.data?.hName) {
                return;
            }

            const paragraph = blockquote.children[0];

            if (paragraph?.type !== 'paragraph') {
                return;
            }

            const firstChild = paragraph.children[0];

            if (firstChild?.type !== 'text') {
                return;
            }

            const match = ALERT_MARKER_PATTERN.exec(firstChild.value);

            if (!match) {
                return;
            }

            const variant =
                GITHUB_ALERT_VARIANTS[
                    match[1].toUpperCase() as keyof typeof GITHUB_ALERT_VARIANTS
                ];
            const rest = firstChild.value.slice(match[0].length);

            if (rest) {
                firstChild.value = rest;
            } else {
                paragraph.children.shift();

                if (paragraph.children[0]?.type === 'break') {
                    paragraph.children.shift();
                }

                if (paragraph.children.length === 0) {
                    blockquote.children.shift();
                }
            }

            const data = blockquote.data ?? (blockquote.data = {});
            data.hName = 'aside';
            data.hProperties = {
                className: `msg ${variant}`,
            };
        });
    };
}
