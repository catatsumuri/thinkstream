import type { Paragraph, Root, Text } from 'mdast';
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

            if (directiveNode.name === 'message') {
                const attributes = directiveNode.attributes ?? {};
                const className =
                    attributes.className ?? attributes.class ?? '';
                const isAlert =
                    className.includes('alert') ||
                    attributes.alert !== undefined;

                const data = directiveNode.data ?? (directiveNode.data = {});
                data.hName = 'aside';
                data.hProperties = {
                    className: `msg ${isAlert ? 'alert' : 'message'}`,
                };
            }

            if (directiveNode.name === 'details') {
                let summaryText = '詳細';
                const bodyChildren = [...directiveNode.children];

                if (
                    bodyChildren.length > 0 &&
                    bodyChildren[0].type === 'paragraph'
                ) {
                    const first = bodyChildren.shift() as Paragraph;

                    if (first.children?.[0]?.type === 'text') {
                        summaryText = (first.children[0] as Text).value;
                    }
                }

                const data = directiveNode.data ?? (directiveNode.data = {});
                data.hName = 'details';
                data.hProperties = {};

                directiveNode.children = [
                    {
                        type: 'paragraph',
                        data: { hName: 'summary' },
                        children: [{ type: 'text', value: summaryText }],
                    } as Paragraph,
                    {
                        type: 'paragraph',
                        data: {
                            hName: 'div',
                            hProperties: { className: 'details-content' },
                        },
                        children: bodyChildren,
                    } as Paragraph,
                ];
            }
        });
    };
}
