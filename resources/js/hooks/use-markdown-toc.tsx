import { useMemo } from 'react';
import type { Components } from 'react-markdown';
import { createMarkdownComponents } from '@/lib/markdown-components';
import { normalizeMarkdownHeadingText } from '@/lib/markdown-heading-text';
import { slugify } from '@/lib/slugify';

export type Heading = { level: number; text: string; id: string };

export type TocEntry = {
    headings: Heading[];
    components: Components;
};

function extractHeadings(content: string, postSlug: string): Heading[] {
    const headings: Heading[] = [];

    // Track the exact opening fence (e.g. "```" or "````") so nested shorter
    // fences inside quad-backtick meta-examples don't prematurely close it.
    let activeFence: string | null = null;

    for (const line of content.split('\n')) {
        const trimmedLine = line.trimStart();

        const fenceMatch = /^(`{3,}|~{3,})/.exec(trimmedLine);

        if (fenceMatch) {
            const fence = fenceMatch[1];
            const remainder = trimmedLine.slice(fence.length);

            if (activeFence === null) {
                activeFence = fence;
            } else if (
                fence[0] === activeFence[0] &&
                fence.length >= activeFence.length &&
                remainder.trim() === ''
            ) {
                activeFence = null;
            }

            continue;
        }

        if (activeFence !== null) {
            continue;
        }

        const match = /^(#{1,3})\s+(.+)$/.exec(trimmedLine);

        if (match === null) {
            continue;
        }

        const text = normalizeMarkdownHeadingText(match[2].trim());

        headings.push({
            level: match[1].length,
            text,
            id: `${postSlug}-${slugify(text)}`,
        });
    }

    return headings;
}

/**
 * Pre-computes TOC headings and custom heading components for a list of markdown posts.
 * Results are memoized and keyed by post slug.
 */
export function useMarkdownToc(
    posts: Array<{ slug: string; content: string }>,
): Map<string, TocEntry> {
    return useMemo(() => {
        const map = new Map<string, TocEntry>();

        for (const post of posts) {
            map.set(post.slug, {
                headings: extractHeadings(post.content, post.slug),
                components: createMarkdownComponents(post.slug),
            });
        }

        return map;
    }, [posts]);
}
