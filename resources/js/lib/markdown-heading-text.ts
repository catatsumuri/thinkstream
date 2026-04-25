import { Children, isValidElement, type ReactNode } from 'react';

export function normalizeMarkdownHeadingText(text: string): string {
    return text
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        .replace(/!\[([^\]]*)\]\[[^\]]*\]/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
        .replace(/<[^>]+>/g, '')
        .trim();
}

export function extractRenderedHeadingText(node: ReactNode): string {
    if (typeof node === 'string' || typeof node === 'number') {
        return String(node);
    }

    if (typeof node === 'boolean' || node === null || node === undefined) {
        return '';
    }

    if (Array.isArray(node)) {
        return node.map(extractRenderedHeadingText).join('');
    }

    if (!isValidElement<{ children?: ReactNode; alt?: string }>(node)) {
        return '';
    }

    if (
        typeof node.props.alt === 'string' &&
        node.props.children === undefined
    ) {
        return node.props.alt;
    }

    return Children.toArray(node.props.children)
        .map(extractRenderedHeadingText)
        .join('');
}
