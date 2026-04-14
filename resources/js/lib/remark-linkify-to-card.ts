/**
 * A remark plugin that converts standalone URLs in paragraphs to embed card divs.
 *
 * When a paragraph contains only a single http(s) URL link (with optional surrounding
 * whitespace), the paragraph node is converted to a <div> via data.hName and
 * data.hProperties — no rehype-raw required.
 */
import type { Link, Paragraph, Root, Text } from 'mdast';
import { visit } from 'unist-util-visit';
import { isYoutubeUrl } from './url-matcher';

export type EmbedType = 'youtube' | 'card';

/**
 * Returns the link node if the paragraph contains only a single standalone link,
 * otherwise returns null.
 */
function isStandaloneLinkInParagraph(paragraph: Paragraph): Link | null {
    const children = paragraph.children;

    if (children.length === 1 && children[0].type === 'link') {
        return children[0] as Link;
    }

    const linkIndex = children.findIndex((child) => child.type === 'link');

    if (linkIndex === -1) {
        return null;
    }

    const isOnlyWhitespace = (node: (typeof children)[number]) => {
        if (node.type === 'text') {
            return ((node as Text).value?.trim() ?? '') === '';
        }

        return node.type === 'break';
    };

    const beforeLink = children.slice(0, linkIndex);
    const afterLink = children.slice(linkIndex + 1);

    if (
        beforeLink.every(isOnlyWhitespace) &&
        afterLink.every(isOnlyWhitespace)
    ) {
        return children[linkIndex] as Link;
    }

    return null;
}

function detectEmbedType(url: string): EmbedType {
    if (isYoutubeUrl(url)) {
        return 'youtube';
    }

    return 'card';
}

/**
 * remark-linkify-to-card plugin
 */
export function remarkLinkifyToCard() {
    return (tree: Root) => {
        visit(tree, 'paragraph', (node: Paragraph) => {
            const standaloneLink = isStandaloneLinkInParagraph(node);

            if (!standaloneLink) {
                return;
            }

            const url = standaloneLink.url;

            if (!url || !url.match(/^https?:\/\//)) {
                return;
            }

            const embedType = detectEmbedType(url);

            const data = (node.data ??= {});

            (data as any).hName = 'div';

            (data as any).hProperties = {
                'data-embed-type': embedType,
                'data-embed-url': url,
            };

            node.children = [];
        });
    };
}
