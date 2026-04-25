import { type Root } from 'mdast';
import { type Node } from 'unist';
import { visit } from 'unist-util-visit';

interface TextDirectiveNode extends Node {
    type: 'textDirective';
    name: string;
    attributes?: Record<string, string | boolean | undefined>;
    data?: {
        hName?: string;
        hProperties?: Record<string, unknown>;
    };
}

export function remarkTooltipDirective() {
    return (tree: Root) => {
        visit(tree, (node: Node) => {
            if (node.type !== 'textDirective') {
                return;
            }

            const directiveNode = node as TextDirectiveNode;

            if (directiveNode.name !== 'tooltip') {
                return;
            }

            directiveNode.data = directiveNode.data || {};
            directiveNode.data.hName = 'tooltip';
            directiveNode.data.hProperties = {
                'data-tooltip-tip': directiveNode.attributes?.tip,
                'data-tooltip-headline': directiveNode.attributes?.headline,
                'data-tooltip-cta': directiveNode.attributes?.cta,
                'data-tooltip-href': directiveNode.attributes?.href,
            };
        });
    };
}
