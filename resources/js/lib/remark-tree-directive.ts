import { type Code, type Root } from 'mdast';
import { type Node } from 'unist';
import { visit } from 'unist-util-visit';

interface ContainerDirectiveNode extends Node {
    type: 'containerDirective';
    name: string;
    children: Node[];
    data?: {
        hName?: string;
        hProperties?: Record<string, unknown>;
    };
}

export function remarkTreeDirective() {
    return (tree: Root) => {
        visit(tree, (node: Node) => {
            if (node.type !== 'containerDirective') {
                return;
            }

            const directiveNode = node as ContainerDirectiveNode;

            if (directiveNode.name !== 'tree') {
                return;
            }

            const codeChild = directiveNode.children.find(
                (c) => c.type === 'code',
            ) as Code | undefined;
            const json = codeChild?.value ?? '[]';

            directiveNode.data = directiveNode.data || {};
            directiveNode.data.hName = 'tree';
            directiveNode.data.hProperties = { 'data-tree': json };
        });
    };
}
