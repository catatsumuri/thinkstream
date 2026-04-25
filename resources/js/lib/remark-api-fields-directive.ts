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

export function remarkApiFieldsDirective() {
    return (tree: Root) => {
        visit(tree, (node: Node) => {
            if (node.type !== 'containerDirective') {
                return;
            }

            const directiveNode = node as ContainerDirectiveNode;

            if (directiveNode.name === 'responsefield') {
                directiveNode.data = directiveNode.data || {};
                directiveNode.data.hName = 'responsefield';
                directiveNode.data.hProperties = {
                    'data-field-name': directiveNode.attributes?.name,
                    'data-field-type': directiveNode.attributes?.type,
                    'data-field-required': directiveNode.attributes?.required,
                    'data-field-default': directiveNode.attributes?.default,
                    'data-field-deprecated':
                        directiveNode.attributes?.deprecated,
                };
            }

            if (directiveNode.name === 'paramfield') {
                directiveNode.data = directiveNode.data || {};
                directiveNode.data.hName = 'paramfield';
                directiveNode.data.hProperties = {
                    'data-field-name': directiveNode.attributes?.name,
                    'data-field-type': directiveNode.attributes?.type,
                    'data-field-required': directiveNode.attributes?.required,
                    'data-field-default': directiveNode.attributes?.default,
                    'data-field-deprecated':
                        directiveNode.attributes?.deprecated,
                    'data-field-path': directiveNode.attributes?.path,
                    'data-field-query': directiveNode.attributes?.query,
                    'data-field-body': directiveNode.attributes?.body,
                };
            }
        });
    };
}
