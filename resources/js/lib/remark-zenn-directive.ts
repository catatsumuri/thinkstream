import type { Root } from 'mdast';
import type { Node } from 'unist';
import { visit } from 'unist-util-visit';

interface ContainerDirectiveNode extends Node {
    type: 'containerDirective';
    name: string;
    attributes?: Record<string, string | undefined>;
    children: Node[];
    data?: {
        hName?: string;
        hProperties?: Record<string, unknown>;
    };
}

export function remarkZennDirective() {
    return (tree: Root) => {
        visit(tree, (node: Node) => {
            if (node.type !== 'containerDirective') {
                return;
            }

            const directiveNode = node as ContainerDirectiveNode;

            if (directiveNode.name !== 'message') {
                return;
            }

            const attributes = directiveNode.attributes ?? {};
            const className = attributes.className ?? attributes.class ?? '';
            const isAlert =
                className.includes('alert') || attributes.alert !== undefined;

            const data = directiveNode.data ?? (directiveNode.data = {});
            data.hName = 'aside';
            data.hProperties = {
                className: `msg ${isAlert ? 'alert' : 'message'}`,
            };
        });
    };
}
