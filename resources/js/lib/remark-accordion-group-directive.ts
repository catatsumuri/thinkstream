import type { Root } from 'mdast';
import type { Node } from 'unist';
import { visit } from 'unist-util-visit';

interface ContainerDirectiveNode extends Node {
    type: 'containerDirective';
    name: string;
    data?: {
        hName?: string;
        hProperties?: Record<string, unknown>;
    };
}

export function remarkAccordionGroupDirective() {
    return (tree: Root) => {
        visit(tree, (node: Node) => {
            if (node.type !== 'containerDirective') {
                return;
            }

            const directiveNode = node as ContainerDirectiveNode;

            if (directiveNode.name === 'accordion-group') {
                directiveNode.data = directiveNode.data || {};
                directiveNode.data.hName = 'accordion-group';
                directiveNode.data.hProperties = {};
            }
        });
    };
}
