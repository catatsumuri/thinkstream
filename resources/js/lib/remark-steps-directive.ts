import type { Root } from 'mdast';
import type { Node } from 'unist';
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

export function remarkStepsDirective() {
    return (tree: Root) => {
        visit(tree, (node: Node) => {
            if (node.type !== 'containerDirective') {
                return;
            }

            const directiveNode = node as ContainerDirectiveNode;

            if (directiveNode.name === 'steps') {
                directiveNode.data = directiveNode.data || {};
                directiveNode.data.hName = 'steps';
                directiveNode.data.hProperties = {};
            }

            if (directiveNode.name === 'step') {
                directiveNode.data = directiveNode.data || {};
                directiveNode.data.hName = 'step';
                directiveNode.data.hProperties = {
                    'data-step-title': directiveNode.attributes?.title,
                    'data-step-icon': directiveNode.attributes?.icon,
                };
            }
        });
    };
}
