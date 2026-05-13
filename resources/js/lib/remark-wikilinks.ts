import type { Link, Root, Text } from 'mdast';
import { visit } from 'unist-util-visit';

const WIKILINK_RE = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;

export function remarkWikilinks(resolveWikilink: (path: string) => string) {
    return (tree: Root) => {
        visit(tree, 'text', (node: Text, index, parent) => {
            if (parent === undefined || index === undefined) {
                return;
            }

            const parts: (Text | Link)[] = [];
            let lastIndex = 0;
            let match: RegExpExecArray | null;

            WIKILINK_RE.lastIndex = 0;

            while ((match = WIKILINK_RE.exec(node.value)) !== null) {
                const [full, path, label] = match;
                const trimmedPath = path.trim();

                const displayLabel =
                    label?.trim() ??
                    trimmedPath.split('/').pop() ??
                    trimmedPath;

                if (match.index > lastIndex) {
                    parts.push({
                        type: 'text',
                        value: node.value.slice(lastIndex, match.index),
                    });
                }

                parts.push({
                    type: 'link',
                    url: resolveWikilink(trimmedPath),
                    children: [{ type: 'text', value: displayLabel }],
                });

                lastIndex = match.index + full.length;
            }

            if (parts.length === 0) {
                return;
            }

            if (lastIndex < node.value.length) {
                parts.push({
                    type: 'text',
                    value: node.value.slice(lastIndex),
                });
            }

            parent.children.splice(index, 1, ...parts);

            return index;
        });
    };
}
