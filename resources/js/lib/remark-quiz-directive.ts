import type { Code, Root } from 'mdast';
import type { Node } from 'unist';
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

export function remarkQuizDirective() {
    return (tree: Root) => {
        visit(tree, (node: Node) => {
            if (node.type !== 'containerDirective') {
                return;
            }

            const directiveNode = node as ContainerDirectiveNode;

            if (directiveNode.name !== 'quiz') {
                return;
            }

            const codeChild = directiveNode.children.find(
                (child) => child.type === 'code',
            ) as Code | undefined;
            const json = codeChild?.value ?? '{}';

            directiveNode.data = directiveNode.data || {};
            directiveNode.data.hName = 'div';
            directiveNode.data.hProperties = { 'data-quiz': json };
        });
    };
}
