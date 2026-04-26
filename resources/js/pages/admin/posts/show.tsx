import { Form, Head, Link, router, setLayoutProps } from '@inertiajs/react';
import {
    AlertTriangle,
    ExternalLink,
    Eye,
    EyeOff,
    FileText,
    History,
    PanelLeftClose,
    PanelLeftOpen,
    Pencil,
    Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ContentNavNode } from '@/components/content-nav-tree';
import ContentNavTree from '@/components/content-nav-tree';
import MarkdownContent from '@/components/markdown-content';
import TableOfContents from '@/components/table-of-contents';
import ViewContextBadge from '@/components/view-context-badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useBelowDesktop } from '@/hooks/use-below-desktop';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useMarkdownToc } from '@/hooks/use-markdown-toc';
import { normalizeMarkdownHeadingText } from '@/lib/markdown-heading-text';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import {
    destroy,
    edit,
    index,
    namespace as namespaceRoute,
    revisions,
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
    page_views: number;
    http_referer: string | null;
    http_referer_url: string | null;
    is_draft: boolean;
    published_at: string | null;
    created_at: string;
    reference_title: string | null;
    reference_url: string | null;
    tags: string[];
};

export default function Show({
    namespace,
    navRoot,
    post,
}: {
    namespace: Namespace;
    navRoot: ContentNavNode;
    post: Post;
}) {
    const { currentUrl } = useCurrentUrl();
    const isBelowDesktop = useBelowDesktop();
    const [navOverride, setNavOverride] = useState<boolean | null>(null);
    const [rightTab, setRightTab] = useState<'toc' | 'info'>('info');
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
    const hasNav = navRoot.children.length > 0 || navRoot.posts.length > 0;
    const navVisible = navOverride ?? true;
    const showDesktopNav = !isBelowDesktop && hasNav;

    let gridCols = '';

    if (showDesktopNav && navVisible) {
        gridCols = 'lg:grid-cols-[240px_1fr_280px]';
    } else if (showDesktopNav && !navVisible) {
        gridCols = 'lg:grid-cols-[40px_1fr_280px]';
    } else {
        gridCols = 'lg:grid-cols-[1fr_280px]';
    }

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

    const isScheduled =
        !post.is_draft &&
        !!post.published_at &&
        new Date(post.published_at) > new Date();

    return (
        <>
            <Head title={post.title} />

            <div className="space-y-4 p-4">
                <div className={`lg:grid lg:gap-8 ${gridCols}`}>
                    {hasNav && (
                        <aside className="hidden self-start lg:sticky lg:top-20 lg:block">
                            {navVisible ? (
                                <div className="flex max-h-[calc(100vh-6rem)] flex-col text-sm">
                                    <div className="shrink-0 pb-4">
                                        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                            {navRoot.name}
                                        </p>
                                    </div>
                                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-3">
                                        <ContentNavTree
                                            currentPath={post.full_path}
                                            root={navRoot}
                                        />
                                    </div>
                                    <div className="mt-6 shrink-0 border-t border-border/60 pt-4">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setNavOverride(false)
                                            }
                                            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                        >
                                            <PanelLeftClose size={14} />
                                            Close
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-center">
                                    <button
                                        type="button"
                                        onClick={() => setNavOverride(true)}
                                        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                        title="Open nav"
                                    >
                                        <PanelLeftOpen size={16} />
                                    </button>
                                </div>
                            )}
                        </aside>
                    )}

                    <section className="min-w-0 space-y-4">
                        {post.is_draft && (
                            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-900/20">
                                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                <div className="text-amber-800 dark:text-amber-400">
                                    <p className="font-semibold">
                                        Draft — not publicly visible
                                    </p>
                                    <p className="text-sm">
                                        This post is saved as a draft. Visitors
                                        will see a 404.
                                    </p>
                                </div>
                            </div>
                        )}

                        {isScheduled && (
                            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800/40 dark:bg-blue-900/20">
                                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                                <div className="text-blue-800 dark:text-blue-400">
                                    <p className="font-semibold">
                                        Scheduled — not yet public
                                    </p>
                                    <p className="text-sm">
                                        Publicly accessible from{' '}
                                        <span className="font-medium">
                                            {new Date(
                                                post.published_at!,
                                            ).toLocaleString(undefined, {
                                                dateStyle: 'long',
                                                timeStyle: 'short',
                                            })}
                                        </span>
                                        . Visitors will see a 404 until then.
                                    </p>
                                </div>
                            </div>
                        )}

                        {hasHeadings && (
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

                        <div className="min-w-0 rounded-xl border bg-card">
                            <div className="flex items-center justify-between border-b border-border px-5 py-3">
                                <div className="flex items-center gap-2">
                                    <FileText className="size-4 text-muted-foreground" />
                                    <span className="text-sm font-medium text-muted-foreground">
                                        Preview
                                    </span>
                                </div>
                                {post.reference_url && (
                                    <a
                                        href={post.reference_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                    >
                                        <span className="max-w-32 truncate">
                                            {post.reference_title ??
                                                'Reference'}
                                        </span>
                                        <ExternalLink className="size-3 shrink-0" />
                                    </a>
                                )}
                            </div>
                            <div className="p-6 lg:p-8">
                                <h1 className="mb-6 text-3xl font-bold tracking-tight lg:text-4xl">
                                    {post.title}
                                </h1>
                                <div className="prose max-w-none prose-neutral dark:prose-invert">
                                    <MarkdownContent
                                        content={post.content}
                                        components={entry?.components}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 lg:hidden">
                            <Button asChild variant="outline" size="sm">
                                <Link
                                    href={edit.url({
                                        namespace: namespace.id,
                                        post: post.slug,
                                    })}
                                >
                                    <Pencil className="size-4" />
                                    Edit
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="sm">
                                <a
                                    href={`/${post.full_path}`}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <ExternalLink className="size-4" />
                                    View Site
                                </a>
                            </Button>
                            <Button asChild variant="outline" size="sm">
                                <Link
                                    href={revisions.url({
                                        namespace: namespace.id,
                                        post: post.slug,
                                    })}
                                >
                                    <History className="size-4" />
                                    Revisions
                                </Link>
                            </Button>
                        </div>
                    </section>

                    <aside className="hidden self-start lg:sticky lg:top-20 lg:block">
                        <div className="mb-4 flex gap-1 rounded-lg bg-muted/50 p-0.5">
                            <button
                                type="button"
                                onClick={() => setRightTab('info')}
                                className={cn(
                                    'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                                    rightTab === 'info'
                                        ? 'bg-card text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                Info
                            </button>
                            <button
                                type="button"
                                onClick={() => setRightTab('toc')}
                                className={cn(
                                    'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                                    rightTab === 'toc'
                                        ? 'bg-card text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                TOC
                            </button>
                        </div>

                        <div className={cn(rightTab !== 'toc' && 'hidden')}>
                            {hasHeadings ? (
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
                            ) : (
                                <p className="px-1 text-xs text-muted-foreground">
                                    No headings
                                </p>
                            )}
                        </div>

                        <div
                            className={cn(
                                'space-y-4',
                                rightTab !== 'info' && 'hidden',
                            )}
                        >
                            <div
                                data-test="post-show-status-card"
                                className="overflow-hidden rounded-xl border border-border bg-card"
                            >
                                <div className="border-b border-border px-4 py-3">
                                    <h3 className="text-sm font-semibold">
                                        Status
                                    </h3>
                                </div>
                                <div className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={cn(
                                                'flex size-9 items-center justify-center rounded-lg',
                                                post.is_draft
                                                    ? 'bg-amber-100 dark:bg-amber-900/30'
                                                    : isScheduled
                                                      ? 'bg-blue-100 dark:bg-blue-900/30'
                                                      : 'bg-green-100 dark:bg-green-900/30',
                                            )}
                                        >
                                            {post.is_draft ? (
                                                <EyeOff className="size-4 text-amber-700 dark:text-amber-400" />
                                            ) : (
                                                <Eye
                                                    className={cn(
                                                        'size-4',
                                                        isScheduled
                                                            ? 'text-blue-700 dark:text-blue-400'
                                                            : 'text-green-700 dark:text-green-400',
                                                    )}
                                                />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">
                                                {post.is_draft
                                                    ? 'Draft'
                                                    : isScheduled
                                                      ? 'Scheduled'
                                                      : 'Published'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {post.is_draft
                                                    ? 'Not visible to readers'
                                                    : isScheduled
                                                      ? `Visible from ${new Date(post.published_at!).toLocaleDateString()}`
                                                      : post.published_at
                                                        ? `Since ${new Date(post.published_at).toLocaleDateString()}`
                                                        : 'Visible to everyone'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-xl border border-border bg-card">
                                <div className="border-b border-border px-4 py-3">
                                    <h3 className="text-sm font-semibold">
                                        Info
                                    </h3>
                                </div>
                                <div className="divide-y divide-border">
                                    <div className="flex items-center justify-between px-4 py-3">
                                        <span className="text-sm text-muted-foreground">
                                            Views
                                        </span>
                                        <span className="text-sm font-medium">
                                            {post.page_views.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between px-4 py-3">
                                        <span className="text-sm text-muted-foreground">
                                            Created
                                        </span>
                                        <span className="text-sm font-medium">
                                            {new Date(
                                                post.created_at,
                                            ).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between px-4 py-3">
                                        <span className="text-sm text-muted-foreground">
                                            Path
                                        </span>
                                        <span className="max-w-32 truncate font-mono text-xs text-muted-foreground">
                                            /{post.full_path}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                                        <span className="text-sm text-muted-foreground">
                                            Referer
                                        </span>
                                        {post.http_referer &&
                                        post.http_referer_url ? (
                                            <a
                                                href={post.http_referer_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="max-w-32 truncate text-right text-xs text-muted-foreground underline-offset-4 hover:underline"
                                            >
                                                {post.http_referer}
                                            </a>
                                        ) : post.http_referer ? (
                                            <span className="max-w-32 truncate text-right text-xs text-muted-foreground">
                                                {post.http_referer}
                                            </span>
                                        ) : (
                                            <span className="text-sm font-medium">
                                                -
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {post.tags.length > 0 && (
                                <div
                                    data-test="post-show-tags-card"
                                    className="overflow-hidden rounded-xl border border-border bg-card"
                                >
                                    <div className="border-b border-border px-4 py-3">
                                        <h3 className="text-sm font-semibold">
                                            Tags
                                        </h3>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 p-4">
                                        {post.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="overflow-hidden rounded-xl border border-border bg-card">
                                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                                    <h3 className="text-sm font-semibold">
                                        Actions
                                    </h3>
                                    <ViewContextBadge
                                        label="Admin View"
                                        variant="admin"
                                    />
                                </div>
                                <div className="space-y-1 p-2">
                                    <Link
                                        data-test="manage-post-edit-link"
                                        href={edit.url({
                                            namespace: namespace.id,
                                            post: post.slug,
                                        })}
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
                                    >
                                        <Pencil className="size-4 text-muted-foreground" />
                                        <span>Edit</span>
                                    </Link>
                                    <a
                                        href={`/${post.full_path}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
                                    >
                                        <ExternalLink className="size-4 text-muted-foreground" />
                                        <span>View Site</span>
                                    </a>
                                    <Link
                                        data-test="manage-post-revisions-link"
                                        href={revisions.url({
                                            namespace: namespace.id,
                                            post: post.slug,
                                        })}
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
                                    >
                                        <History className="size-4 text-muted-foreground" />
                                        <span>Revisions</span>
                                    </Link>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <button
                                                type="button"
                                                data-test="manage-post-delete-trigger"
                                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                                            >
                                                <Trash2 className="size-4" />
                                                <span>Delete</span>
                                            </button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogTitle>
                                                Delete &ldquo;{post.title}
                                                &rdquo;?
                                            </DialogTitle>
                                            <DialogDescription>
                                                This action cannot be undone.
                                                The post and all its revisions
                                                will be permanently deleted.
                                            </DialogDescription>
                                            <Form
                                                {...destroy.form({
                                                    namespace: namespace.id,
                                                    post: post.slug,
                                                })}
                                            >
                                                {({ processing }) => (
                                                    <DialogFooter className="gap-2">
                                                        <DialogClose asChild>
                                                            <Button variant="secondary">
                                                                Cancel
                                                            </Button>
                                                        </DialogClose>
                                                        <Button
                                                            variant="destructive"
                                                            disabled={
                                                                processing
                                                            }
                                                            asChild
                                                        >
                                                            <button type="submit">
                                                                Delete
                                                            </button>
                                                        </Button>
                                                    </DialogFooter>
                                                )}
                                            </Form>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </>
    );
}
