import { Head, router, setLayoutProps } from '@inertiajs/react';
import {
    AlertTriangle,
    ExternalLink,
    PanelRightClose,
    PanelRightOpen,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import MarkdownContent from '@/components/markdown-content';
import PostHeader from '@/components/post-header';
import TableOfContents from '@/components/table-of-contents';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useMarkdownToc } from '@/hooks/use-markdown-toc';
import { useIsMobile } from '@/hooks/use-mobile';
import { normalizeMarkdownHeadingText } from '@/lib/markdown-heading-text';
import { dashboard } from '@/routes';
import {
    edit,
    index,
    namespace as namespaceRoute,
    show,
} from '@/routes/admin/posts';

function findHeadingOffset(
    content: string,
    headingText: string,
    level: number,
): number | null {
    const normalizedTarget = normalizeMarkdownHeadingText(headingText);

    if (!normalizedTarget) {
        return null;
    }

    const normalizedContent = content.replace(/\r\n/g, '\n');
    const lines = normalizedContent.split('\n');
    let offset = 0;
    let activeFence: string | null = null;

    for (const line of lines) {
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

            offset +=
                line.length +
                (offset + line.length < normalizedContent.length ? 1 : 0);

            continue;
        }

        if (activeFence !== null) {
            offset +=
                line.length +
                (offset + line.length < normalizedContent.length ? 1 : 0);

            continue;
        }

        const m = /^(#{1,6})\s+(.+?)(?:\s+#+\s*)?$/.exec(trimmedLine);

        if (
            m &&
            m[1].length === level &&
            normalizeMarkdownHeadingText(m[2]) === normalizedTarget
        ) {
            return offset;
        }

        offset +=
            line.length +
            (offset + line.length < normalizedContent.length ? 1 : 0);
    }

    return null;
}

type Namespace = {
    id: number;
    name: string;
    slug: string;
    full_path: string;
};

type Post = {
    id: number;
    title: string;
    slug: string;
    full_path: string;
    content: string;
    is_draft: boolean;
    published_at: string | null;
    created_at: string;
};

export default function Show({
    namespace,
    post,
}: {
    namespace: Namespace;
    post: Post;
}) {
    const { currentUrl } = useCurrentUrl();
    const isMobile = useIsMobile();
    const [tocOverride, setTocOverride] = useState<boolean | null>(null);
    const tocPosts = useMemo(
        () => [{ slug: post.slug, content: post.content }],
        [post.content, post.slug],
    );

    const handleEditHeading = ({
        level,
        text,
        id,
    }: {
        level: number;
        text: string;
        id: string;
    }) => {
        const offset = findHeadingOffset(post.content, text, level);
        const editUrl = edit.url({ namespace: namespace.id, post: post.slug });

        if (typeof offset !== 'number') {
            router.visit(editUrl);

            return;
        }

        const clampedOffset = Math.max(
            0,
            Math.min(offset, post.content.length),
        );
        const params = new URLSearchParams({ jump: clampedOffset.toString() });

        if (id) {
            params.set('return_heading', id);
        }

        params.set('return_to', currentUrl);

        router.visit(`${editUrl}?${params.toString()}`);
    };

    const toc = useMarkdownToc(tocPosts, {
        headingAnchorPlacement: 'gutter',
        onEditHeading: handleEditHeading,
    });
    const entry = toc.get(post.slug);
    const hasHeadings = (entry?.headings.length ?? 0) > 0;
    const tocVisible = tocOverride ?? !isMobile;
    setLayoutProps({
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'Namespaces', href: index.url() },
            { title: namespace.name, href: namespaceRoute.url(namespace.id) },
            {
                title: post.title,
                href: show.url({ namespace: namespace.id, post: post.slug }),
            },
        ],
    });

    return (
        <>
            <Head title={post.title} />

            <div className="space-y-6 p-4">
                <PostHeader namespace={namespace} post={post} />

                <section className="space-y-4">
                    <div className="flex items-center justify-between gap-4 rounded-xl border bg-card px-5 py-4">
                        <div className="flex items-center gap-3">
                            <div>
                                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    Preview
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Canonical rendering inside the admin
                                    workflow.
                                </p>
                            </div>
                            <a
                                href={`/${post.full_path}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-muted-foreground transition-colors hover:text-foreground"
                                title="Open canonical URL"
                            >
                                <ExternalLink className="size-4" />
                            </a>
                        </div>
                        {hasHeadings && (
                            <button
                                type="button"
                                onClick={() =>
                                    setTocOverride(
                                        (prev) => !(prev ?? !isMobile),
                                    )
                                }
                                className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                            >
                                {tocVisible ? (
                                    <PanelRightClose size={16} />
                                ) : (
                                    <PanelRightOpen size={16} />
                                )}
                                TOC
                            </button>
                        )}
                    </div>

                    {tocVisible && hasHeadings && (
                        <div className="xl:hidden">
                            <TableOfContents
                                posts={[
                                    {
                                        id: post.id,
                                        title: post.title,
                                        slug: post.slug,
                                        headings: entry!.headings,
                                    },
                                ]}
                            />
                        </div>
                    )}

                    <div
                        className={
                            tocVisible && hasHeadings
                                ? 'xl:grid xl:grid-cols-[1fr_240px] xl:gap-8'
                                : ''
                        }
                    >
                        <div className="min-w-0 rounded-xl border bg-card p-6">
                            <div className="mb-6 rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                                /{post.full_path}
                            </div>
                            {post.is_draft && (
                                <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-900/20">
                                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                    <div className="text-amber-800 dark:text-amber-400">
                                        <p className="font-semibold">
                                            Draft — not publicly visible
                                        </p>
                                        <p className="text-sm">
                                            This post is saved as a draft.
                                            Visitors will see a 404.
                                        </p>
                                    </div>
                                </div>
                            )}
                            {!post.is_draft &&
                                post.published_at &&
                                new Date(post.published_at) > new Date() && (
                                    <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800/40 dark:bg-blue-900/20">
                                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                                        <div className="text-blue-800 dark:text-blue-400">
                                            <p className="font-semibold">
                                                Scheduled — not yet public
                                            </p>
                                            <p className="text-sm">
                                                Publicly accessible from{' '}
                                                <span className="font-medium">
                                                    {new Date(
                                                        post.published_at,
                                                    ).toLocaleString(
                                                        undefined,
                                                        {
                                                            dateStyle: 'long',
                                                            timeStyle: 'short',
                                                        },
                                                    )}
                                                </span>
                                                . Visitors will see a 404 until
                                                then.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            <div className="prose max-w-none prose-neutral dark:prose-invert">
                                <MarkdownContent
                                    content={post.content}
                                    components={entry?.components}
                                />
                            </div>
                        </div>

                        {tocVisible && hasHeadings && (
                            <aside className="hidden xl:block">
                                <TableOfContents
                                    sticky
                                    posts={[
                                        {
                                            id: post.id,
                                            title: post.title,
                                            slug: post.slug,
                                            headings: entry!.headings,
                                        },
                                    ]}
                                />
                            </aside>
                        )}
                    </div>
                </section>
            </div>
        </>
    );
}
