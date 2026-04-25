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

export function remarkUpdateDirective() {
    return (tree: Root) => {
        visit(tree, (node: Node) => {
            if (node.type !== 'containerDirective') {
                return;
            }

            const directiveNode = node as ContainerDirectiveNode;

            if (directiveNode.name !== 'update') {
                return;
            }

            directiveNode.data = directiveNode.data || {};
            directiveNode.data.hName = 'update';
            directiveNode.data.hProperties = {
                'data-update-label': directiveNode.attributes?.label,
                'data-update-description':
                    directiveNode.attributes?.description,
                'data-update-tags': directiveNode.attributes?.tags,
            };
        });
    };
}
