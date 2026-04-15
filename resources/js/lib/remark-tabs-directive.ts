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

export function remarkTabsDirective() {
    return (tree: Root) => {
        visit(tree, (node: Node) => {
            if (node.type !== 'containerDirective') {
                return;
            }

            const directiveNode = node as ContainerDirectiveNode;

            if (directiveNode.name === 'tabs') {
                directiveNode.data = directiveNode.data || {};
                directiveNode.data.hName = 'tabs';
                directiveNode.data.hProperties = {
                    'data-tabs-sync':
                        directiveNode.attributes?.sync ?? undefined,
                    'data-tabs-border-bottom':
                        directiveNode.attributes?.borderBottom ?? undefined,
                };
            }

            if (directiveNode.name === 'tab') {
                directiveNode.data = directiveNode.data || {};
                directiveNode.data.hName = 'tab';
                directiveNode.data.hProperties = {
                    'data-tab-title': directiveNode.attributes?.title,
                    'data-tab-icon': directiveNode.attributes?.icon,
                };
            }
        });
    };
}
