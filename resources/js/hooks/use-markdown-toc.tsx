import { Link as LinkIcon } from 'lucide-react';
import { useMemo } from 'react';
import type { Components } from 'react-markdown';
import { CodeBlock } from '@/components/code-block';

export type Heading = { level: number; text: string; id: string };

export type TocEntry = {
    headings: Heading[];
    components: Components;
};

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-');
}

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

            if (activeFence === null) {
                activeFence = fence;
            } else if (
                fence[0] === activeFence[0] &&
                fence.length >= activeFence.length
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

        const text = match[2].trim();

        headings.push({
            level: match[1].length,
            text,
            id: `${postSlug}-${slugify(text)}`,
        });
    }

    return headings;
}

function copyAnchorUrl(id: string): void {
    if (typeof window === 'undefined') {
        return;
    }

    const url = new URL(window.location.href);
    url.hash = id;

    window.history.replaceState(window.history.state, '', url);

    void navigator.clipboard?.writeText(url.toString());
}

function makeHeadingComponents(postSlug: string): Components {
    const makeTag = (level: number) =>
        function Heading({ children }: { children?: React.ReactNode }) {
            const text =
                typeof children === 'string'
                    ? children
                    : String(children ?? '');
            const id = `${postSlug}-${slugify(text)}`;
            const Tag = `h${level}` as 'h1' | 'h2' | 'h3';

            return (
                <Tag id={id} className="group scroll-mt-6">
                    <span className="inline-flex items-center gap-2">
                        {children}
                        <a
                            href={`#${id}`}
                            onClick={() => copyAnchorUrl(id)}
                            aria-label={`Copy link to ${text}`}
                            title="Copy link to this section"
                            data-test={`heading-anchor-${id}`}
                            className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none"
                        >
                            <LinkIcon className="size-4" />
                        </a>
                    </span>
                </Tag>
            );
        };

    return { h1: makeTag(1), h2: makeTag(2), h3: makeTag(3), code: CodeBlock };
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
                components: makeHeadingComponents(post.slug),
            });
        }

        return map;
    }, [posts]);
}
