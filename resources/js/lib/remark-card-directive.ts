import { type Root } from 'mdast';
import { type Node } from 'unist';
import { visit } from 'unist-util-visit';

interface ContainerDirectiveNode extends Node {
    type: 'containerDirective';
    name: string;
    attributes?: Record<string, string | boolean | undefined>;
    data?: {
        hName?: string;
        hProperties?: Record<string, unknown>;
    };
}

export function remarkCardDirective() {
    return (tree: Root) => {
        visit(tree, (node: Node) => {
            if (node.type !== 'containerDirective') {
                return;
            }

            const directiveNode = node as ContainerDirectiveNode;

            if (directiveNode.name === 'cardgroup') {
                directiveNode.data = directiveNode.data || {};
                directiveNode.data.hName = 'cardgroup';
                directiveNode.data.hProperties = {
                    'data-card-group-cols':
                        directiveNode.attributes?.cols ?? undefined,
                };
            }

            if (directiveNode.name === 'card') {
                directiveNode.data = directiveNode.data || {};
                directiveNode.data.hName = 'card';
                directiveNode.data.hProperties = {
                    'data-card-title': directiveNode.attributes?.title,
                    'data-card-icon': directiveNode.attributes?.icon,
                    'data-card-href': directiveNode.attributes?.href,
                };
            }
        });
    };
}
