import { useEffect, useMemo, useRef, useState } from 'react';
import type { Heading } from '@/hooks/use-markdown-toc';
import { cn } from '@/lib/utils';

type TocPost = {
    id: number;
    title: string;
    slug: string;
    headings: Heading[];
};

type TocItem = {
    id: string;
    label: string;
    level: number;
};

const ACTIVE_HEADING_OFFSET = 160;

export default function TableOfContents({
    onNavigate,
    posts,
    sticky = false,
}: {
    onNavigate?: () => void;
    posts: TocPost[];
    sticky?: boolean;
}) {
    const scrollContainerRef = useRef<HTMLElement | null>(null);
    const itemRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
    const items = useMemo<TocItem[]>(
        () =>
            posts.flatMap((post) => [
                {
                    id: `post-${post.slug}`,
                    label: post.title,
                    level: 0,
                },
                ...post.headings.map((heading) => ({
                    id: heading.id,
                    label: heading.text,
                    level: heading.level,
                })),
            ]),
        [posts],
    );
    const [activeId, setActiveId] = useState<string | null>(
        items[0]?.id ?? null,
    );

    useEffect(() => {
        if (items.length === 0) {
            return;
        }

        const updateActiveId = () => {
            let nextActiveId = items[0]?.id ?? null;

            for (const item of items) {
                const element = document.getElementById(item.id);

                if (!element) {
                    continue;
                }

                if (
                    element.getBoundingClientRect().top <= ACTIVE_HEADING_OFFSET
                ) {
                    nextActiveId = item.id;
                } else {
                    break;
                }
            }

            setActiveId((currentActiveId) =>
                currentActiveId === nextActiveId
                    ? currentActiveId
                    : nextActiveId,
            );
        };

        updateActiveId();

        window.addEventListener('scroll', updateActiveId, { passive: true });
        window.addEventListener('resize', updateActiveId);
        window.addEventListener('hashchange', updateActiveId);

        return () => {
            window.removeEventListener('scroll', updateActiveId);
            window.removeEventListener('resize', updateActiveId);
            window.removeEventListener('hashchange', updateActiveId);
        };
    }, [items]);

    useEffect(() => {
        if (!activeId) {
            return;
        }

        const scrollContainer = scrollContainerRef.current;
        const activeItem = itemRefs.current.get(activeId);

        if (
            !scrollContainer ||
            !activeItem ||
            scrollContainer.scrollHeight <= scrollContainer.clientHeight
        ) {
            return;
        }

        const containerTop = scrollContainer.getBoundingClientRect().top;
        const itemTop = activeItem.getBoundingClientRect().top;
        const offset = itemTop - containerTop;
        const scrollTop = scrollContainer.scrollTop + offset;
        const clampedTop =
            scrollTop -
            scrollContainer.clientHeight / 2 +
            activeItem.offsetHeight / 2;

        scrollContainer.scrollTop = Math.max(0, clampedTop);
    }, [activeId]);

    const registerItemRef =
        (id: string) => (element: HTMLAnchorElement | null) => {
            if (element) {
                itemRefs.current.set(id, element);
            } else {
                itemRefs.current.delete(id);
            }
        };

    const handleTocClick =
        (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
            e.preventDefault();
            const target = document.getElementById(id);

            if (target) {
                target.scrollIntoView({ block: 'start' });
            }

            window.history.pushState(null, '', `#${encodeURIComponent(id)}`);
            setActiveId(id);
            onNavigate?.();
        };

    return (
        <nav
            ref={scrollContainerRef}
            data-test="table-of-contents"
            data-sticky={sticky}
            className={cn(
                'space-y-4 text-sm',
                sticky &&
                    'sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1',
            )}
        >
            <p className="font-semibold text-foreground">Contents</p>
            {posts.map((post) => (
                <div key={post.id} className="space-y-1">
                    <a
                        ref={registerItemRef(`post-${post.slug}`)}
                        href={`#${encodeURIComponent(`post-${post.slug}`)}`}
                        onClick={handleTocClick(`post-${post.slug}`)}
                        data-test={`toc-link-post-${post.slug}`}
                        data-active={activeId === `post-${post.slug}`}
                        aria-current={
                            activeId === `post-${post.slug}`
                                ? 'location'
                                : undefined
                        }
                        className={cn(
                            'block rounded-md px-2 py-1 leading-snug font-medium transition-colors',
                            activeId === `post-${post.slug}`
                                ? 'bg-accent text-foreground'
                                : 'text-foreground hover:text-primary',
                        )}
                    >
                        {post.title}
                    </a>
                    {post.headings.length > 0 && (
                        <ul className="ml-0.5 space-y-1 border-l border-border">
                            {post.headings.map((h) => (
                                <li
                                    key={h.id}
                                    style={{
                                        paddingLeft: `${(h.level - 1) * 12 + 8}px`,
                                    }}
                                >
                                    <a
                                        ref={registerItemRef(h.id)}
                                        href={`#${encodeURIComponent(h.id)}`}
                                        onClick={handleTocClick(h.id)}
                                        data-test={`toc-link-${h.id}`}
                                        data-active={activeId === h.id}
                                        aria-current={
                                            activeId === h.id
                                                ? 'location'
                                                : undefined
                                        }
                                        className={cn(
                                            'block rounded-md px-2 py-1 leading-snug transition-colors',
                                            activeId === h.id
                                                ? 'bg-accent font-medium text-foreground'
                                                : 'text-muted-foreground hover:text-foreground',
                                        )}
                                    >
                                        {h.text}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ))}
        </nav>
    );
}
