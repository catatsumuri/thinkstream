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
    icon?: string;
    index: number;
    meta?: string | null;
    value: string;
}

function capitalize(value: string): string {
    return value.length > 0 ? value[0].toUpperCase() + value.slice(1) : value;
}

function parseCodeMeta(meta: string | null | undefined): {
    title: string;
    icon?: string;
    cleanMeta: string;
} {
    if (!meta) {
        return { title: '', cleanMeta: '' };
    }

    const iconMatch = /\bicon="([^"]*)"/.exec(meta);
    const icon = iconMatch?.[1];
    const cleanMeta = meta.replace(/\s*\bicon="[^"]*"/, '').trim();
    const tokens = cleanMeta.length > 0 ? cleanMeta.split(/\s+/) : [];
    const metaTokens: string[] = [];

    while (tokens.length > 0) {
        const token = tokens.at(-1);

        if (!token || !isCodeMetaToken(token)) {
            break;
        }

        metaTokens.unshift(tokens.pop()!);
    }

    const title = tokens.join(' ').trim();
    const remainingMeta = metaTokens.join(' ').trim();

    return {
        title,
        icon,
        cleanMeta: remainingMeta,
    };
}

function isCodeMetaToken(token: string): boolean {
    return (
        /^(lines|twoslash|copy|wrap|showlinenumbers|lineNumbers)$/i.test(
            token,
        ) ||
        /^\{[\d,\- ]+\}$/.test(token) ||
        /^[A-Za-z_][\w-]*=(?:"[^"]*"|'[^']*'|[^\s]+)$/.test(token)
    );
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
                const {
                    title: parsedTitle,
                    icon,
                    cleanMeta,
                } = parseCodeMeta(codeNode.meta);
                const title = parsedTitle || capitalize(lang) || lang;

                tabs.push({
                    lang,
                    title,
                    icon,
                    index: tabIndex,
                    meta: cleanMeta || null,
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
