import { type Code, type Root } from 'mdast';
import { visit } from 'unist-util-visit';

/**
 * Remark plugin that preserves code block meta strings.
 *
 * Saves the meta portion of a fenced code block info string
 * (everything after the first word) into node.data.hProperties.metastring
 * so it is available as a prop in React components.
 *
 * Example: ```diff js:routes/web.php
 *   lang = "diff", meta = "js:routes/web.php"
 *   → hProperties.metastring = "js:routes/web.php"
 */
export function remarkCodeMeta() {
    return (tree: Root) => {
        visit(tree, 'code', (node: Code) => {
            if (node.meta) {
                const data = node.data || (node.data = {});
                const hProperties = data.hProperties || (data.hProperties = {});
                hProperties.metastring = node.meta;
            }
        });
    };
}
