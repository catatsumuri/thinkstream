import { Form, Head, Link, router, setLayoutProps } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock,
    FilePen,
    PanelRightClose,
    PanelRightOpen,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import MarkdownContent from '@/components/markdown-content';
import TableOfContents from '@/components/table-of-contents';
import { Button } from '@/components/ui/button';
import { useMarkdownToc } from '@/hooks/use-markdown-toc';
import { normalizeMarkdownHeadingText } from '@/lib/markdown-heading-text';
import { useIsMobile } from '@/hooks/use-mobile';
import { dashboard } from '@/routes';
import {
    destroy,
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

            offset += line.length + (offset + line.length < normalizedContent.length ? 1 : 0);

            continue;
        }

        if (activeFence !== null) {
            offset += line.length + (offset + line.length < normalizedContent.length ? 1 : 0);

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

        offset += line.length + (offset + line.length < normalizedContent.length ? 1 : 0);
    }

    return null;
}

type Namespace = {
    id: number;
    name: string;
    slug: string;
};

type Post = {
    id: number;
    title: string;
    slug: string;
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
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-semibold">{post.title}</h1>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>
                                {namespace.slug}/{post.slug}
                            </span>
                            <span>·</span>
                            {post.is_draft ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                    <FilePen className="size-3" />
                                    Draft
                                </span>
                            ) : !post.published_at ||
                              new Date(post.published_at) > new Date() ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                    <Clock className="size-3" />
                                    Scheduled
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    <CheckCircle2 className="size-3" />
                                    Published
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
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
                        <Button variant="outline" asChild>
                            <Link
                                href={edit.url({
                                    namespace: namespace.id,
                                    post: post.slug,
                                })}
                            >
                                Edit
                            </Link>
                        </Button>
                        <Form
                            {...destroy.form({
                                namespace: namespace.id,
                                post: post.slug,
                            })}
                        >
                            {({ processing }) => (
                                <Button
                                    type="submit"
                                    variant="destructive"
                                    disabled={processing}
                                >
                                    Delete
                                </Button>
                            )}
                        </Form>
                    </div>
                </div>

                {tocVisible && hasHeadings && (
                    <div className="lg:hidden">
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
                            ? 'lg:grid lg:grid-cols-[1fr_240px] lg:gap-8'
                            : ''
                    }
                >
                    <div className="rounded-xl border p-6">
                        <div className="prose max-w-none prose-neutral dark:prose-invert">
                            <MarkdownContent
                                content={post.content}
                                components={entry?.components}
                            />
                        </div>
                    </div>

                    {tocVisible && hasHeadings && (
                        <aside className="hidden lg:block">
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
            </div>
        </>
    );
}
