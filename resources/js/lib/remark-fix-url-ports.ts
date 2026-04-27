/**
 * Reverts digit-only textDirective nodes back to plain text.
 *
 * remark-directive does not require directive names to start with a letter,
 * so `:8000` inside a link text (e.g. `[http://localhost:8000](...)`) is
 * incorrectly parsed as a textDirective named "8000". This plugin detects
 * that case and restores the colon + digits as a plain text node.
 */
import type { Root, Text } from 'mdast';
import type { TextDirective } from 'mdast-util-directive';
import { visit } from 'unist-util-visit';

export function remarkFixUrlPorts() {
    return (tree: Root) => {
        visit(
            tree,
            'textDirective',
            (node: TextDirective, index, parent) => {
                if (
                    parent === undefined ||
                    index === undefined ||
                    !/^\d+$/.test(node.name) ||
                    node.children.length !== 0
                ) {
                    return;
                }

                const text: Text = {
                    type: 'text',
                    value: ':' + node.name,
                };

                parent.children.splice(index, 1, text);

                return index;
            },
        );
    };
}
