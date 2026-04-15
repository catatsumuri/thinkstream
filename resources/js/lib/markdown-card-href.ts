import { defaultUrlTransform } from 'react-markdown';

export function sanitizeMarkdownCardHref(href?: string): string | undefined {
    if (!href) {
        return undefined;
    }

    const sanitizedHref = defaultUrlTransform(href.trim());

    return sanitizedHref === '' ? undefined : sanitizedHref;
}
