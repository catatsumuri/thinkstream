import { useMemo } from 'react';
import type { Components } from 'react-markdown';
import {
    createMarkdownComponents,
    type MarkdownComponentOptions,
} from '@/lib/markdown-components';
import {
    extractMarkdownHeadings,
    type MarkdownHeading,
} from '@/lib/markdown-headings';

export type Heading = MarkdownHeading;

export type TocEntry = {
    headings: Heading[];
    components: Components;
};

/**
 * Pre-computes TOC headings and custom heading components for a list of markdown posts.
 * Results are memoized and keyed by post slug.
 */
export function useMarkdownToc(
    posts: Array<{ slug: string; content: string }>,
    componentOptions: MarkdownComponentOptions = {},
): Map<string, TocEntry> {
    return useMemo(() => {
        const map = new Map<string, TocEntry>();

        for (const post of posts) {
            map.set(post.slug, {
                headings: extractMarkdownHeadings(post.content, post.slug),
                components: createMarkdownComponents(
                    post.slug,
                    componentOptions,
                ),
            });
        }

        return map;
    }, [componentOptions, posts]);
}
