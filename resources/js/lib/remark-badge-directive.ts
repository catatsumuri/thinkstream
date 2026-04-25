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

export function remarkBadgeDirective() {
    return (tree: Root) => {
        visit(tree, (node: Node) => {
            if (node.type !== 'textDirective') {
                return;
            }

            const directiveNode = node as TextDirectiveNode;

            if (directiveNode.name !== 'badge') {
                return;
            }

            directiveNode.data = directiveNode.data || {};
            directiveNode.data.hName = 'badge';
            directiveNode.data.hProperties = {
                'data-badge-color': directiveNode.attributes?.color,
                'data-badge-size': directiveNode.attributes?.size,
                'data-badge-shape': directiveNode.attributes?.shape,
                'data-badge-icon': directiveNode.attributes?.icon,
                'data-badge-stroke': directiveNode.attributes?.stroke,
                'data-badge-disabled': directiveNode.attributes?.disabled,
            };
        });
    };
}
