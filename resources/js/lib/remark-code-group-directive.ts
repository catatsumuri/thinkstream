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

interface CodeGroupTabInfo {
    lang: string;
    title: string;
    index: number;
    meta?: string | null;
    value: string;
}

function capitalize(value: string): string {
    return value.length > 0 ? value[0].toUpperCase() + value.slice(1) : value;
}

export function remarkCodeGroupDirective() {
    return (tree: Root) => {
        visit(tree, (node: Node) => {
            if (node.type !== 'containerDirective') {
                return;
            }

            const directiveNode = node as ContainerDirectiveNode;

            if (directiveNode.name !== 'codegroup') {
                return;
            }

            const tabs: CodeGroupTabInfo[] = [];
            let tabIndex = 0;

            for (const child of directiveNode.children) {
                if (child.type !== 'code') {
                    continue;
                }

                const codeNode = child as Code;
                const lang = codeNode.lang ?? '';
                const title = codeNode.meta?.trim() || capitalize(lang) || lang;

                tabs.push({
                    lang,
                    title,
                    index: tabIndex,
                    meta: codeNode.meta ?? null,
                    value: codeNode.value,
                });
                tabIndex++;
            }

            const data = directiveNode.data ?? (directiveNode.data = {});
            data.hName = 'codegroup';
            data.hProperties = {
                'data-codegroup-tabs': JSON.stringify(tabs),
            };
        });
    };
}
