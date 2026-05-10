import type { Root, Text } from 'mdast';
import type { Node } from 'unist';
import { visit } from 'unist-util-visit';

interface TextDirectiveNode extends Node {
    type: 'textDirective';
    name: string;
    attributes?: Record<string, string | boolean | undefined>;
    children: Node[];
    data?: { hName?: string };
}

interface ParentWithChildren extends Node {
    children: Node[];
}

function hasChildren(node: Node): node is ParentWithChildren {
    return 'children' in node && Array.isArray(node.children);
}

/**
 * Converts unhandled textDirective nodes back to their original literal text.
 * Must run after all directive-handling plugins so only genuinely unhandled
 * directives are affected (i.e. those with no data.hName set).
 *
 * Without this, text like "lang:add" silently loses ":add" because
 * remark-directive parses it as a textDirective that no plugin claims.
 */
export function remarkFallbackDirective() {
    return (tree: Root) => {
        visit(
            tree,
            'textDirective',
            (
                node: Node,
                index: number | undefined,
                parent: Node | undefined,
            ) => {
                const directive = node as TextDirectiveNode;

                if (directive.data?.hName || index === undefined || !parent) {
                    return;
                }

                if (!hasChildren(parent)) {
                    return;
                }

                let text = `:${directive.name}`;

                const childText = (
                    directive.children as Array<{
                        type: string;
                        value?: string;
                    }>
                )
                    .filter((c) => c.type === 'text')
                    .map((c) => c.value ?? '')
                    .join('');

                if (childText) {
                    text += `[${childText}]`;
                }

                const attrEntries = Object.entries(directive.attributes ?? {});

                if (attrEntries.length > 0) {
                    const attrs = attrEntries
                        .map(([k, v]) =>
                            v === '' || v === true ? k : `${k}="${v}"`,
                        )
                        .join(' ');
                    text += `{${attrs}}`;
                }

                parent.children.splice(index, 1, {
                    type: 'text',
                    value: text,
                } as Text);
            },
        );
    };
}
