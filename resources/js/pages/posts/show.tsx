import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRightLeft,
    ChevronRight,
    PanelLeftClose,
    PanelLeftOpen,
    PanelRightClose,
    PanelRightOpen,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { siX } from 'simple-icons';
import type { ContentNavNode } from '@/components/content-nav-tree';
import ContentNavTree from '@/components/content-nav-tree';
import MarkdownContent from '@/components/markdown-content';
import TableOfContents from '@/components/table-of-contents';
import { Button } from '@/components/ui/button';
import ViewContextBadge from '@/components/view-context-badge';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useMarkdownToc } from '@/hooks/use-markdown-toc';
import { useIsMobile } from '@/hooks/use-mobile';
import { login } from '@/routes';
import {
    edit as adminPostEdit,
    show as adminPostShow,
} from '@/routes/admin/posts';
import { path as contentPath } from '@/routes/posts';

type PostNamespace = {
    id: number;
    slug: string;
    full_path: string;
    name: string;
    cover_image_url: string | null;
};

type Post = {
    id: number;
    slug: string;
    full_path: string;
    title: string;
    content: string;
    published_at: string;
    updated_at: string;
};

function findHeadingOffset(
    content: string,
    headingText: string,
    level: number,
): number | null {
    const normalizedTarget = headingText.trim().toLowerCase();

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

        const match = /^(#{1,6})\s+(.+?)(?:\s+#+\s*)?$/.exec(trimmedLine);

        if (
            match &&
            match[1].length === level &&
            match[2].trim().toLowerCase() === normalizedTarget
        ) {
            return offset;
        }

        offset +=
            line.length +
            (offset + line.length < normalizedContent.length ? 1 : 0);
    }

    return null;
}

type Preview = {
    status: 'draft' | 'scheduled';
    published_at: string | null;
} | null;

export default function Show({
    breadcrumbs,
    cardImage,
    navRoot,
    namespace,
    post,
    postUrl,
    preview = null,
}: {
    breadcrumbs: Array<{ name: string; full_path: string }>;
    cardImage: string | null;
    navRoot: ContentNavNode;
    namespace: PostNamespace;
    post: Post;
    postUrl: string;
    preview?: Preview;
}) {
    const { auth } = usePage<{
        auth: { user: { id: number; name: string } | null };
    }>().props;
    const { currentUrl } = useCurrentUrl();
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

        router.visit(
            adminPostEdit.url(
                {
                    namespace: namespace.id,
                    post: post.slug,
                },
                {
                    query: {
                        ...(typeof offset === 'number' ? { jump: offset } : {}),
                        return_heading: id,
                        return_to: currentUrl,
                    },
                },
            ),
        );
    };
    const tocPosts = useMemo(
        () => [{ slug: post.slug, content: post.content }],
        [post.content, post.slug],
    );
    const toc = useMarkdownToc(
        tocPosts,
        auth.user
            ? {
                  headingAnchorPlacement: 'gutter',
                  onEditHeading: handleEditHeading,
              }
            : {},
    );
    const entry = toc.get(post.slug);
    const isMobile = useIsMobile();
    const [tocOverride, setTocOverride] = useState<boolean | null>(null);
    const [navOverride, setNavOverride] = useState<boolean | null>(null);
    const tocVisible = tocOverride ?? !isMobile;
    const hasNav = navRoot.children.length > 0 || navRoot.posts.length > 0;
    const hasHeadings = (entry?.headings.length ?? 0) > 0;
    const navVisible = navOverride ?? !isMobile;

    let gridCols = '';

    if (hasNav && navVisible && tocVisible && hasHeadings) {
        gridCols = 'lg:grid-cols-[220px_1fr_240px]';
    } else if (hasNav && navVisible) {
        gridCols = 'lg:grid-cols-[220px_1fr]';
    } else if (hasNav && !navVisible && tocVisible && hasHeadings) {
        gridCols = 'lg:grid-cols-[40px_1fr_240px]';
    } else if (hasNav && !navVisible) {
        gridCols = 'lg:grid-cols-[40px_1fr]';
    } else if (tocVisible && hasHeadings) {
        gridCols = 'lg:grid-cols-[1fr_240px]';
    }

    return (
        <>
            <Head title={`${post.title} | ${navRoot.name}`}>
                <meta
                    name="twitter:card"
                    content={cardImage ? 'summary_large_image' : 'summary'}
                />
                <meta
                    name="twitter:title"
                    content={`${post.title} | ${navRoot.name}`}
                />
                {cardImage && <meta name="twitter:image" content={cardImage} />}
                <meta
                    property="og:title"
                    content={`${post.title} | ${navRoot.name}`}
                />
                <meta property="og:url" content={postUrl} />
                {cardImage && <meta property="og:image" content={cardImage} />}
            </Head>

            <div className="min-h-screen bg-background">
                {preview && (
                    <div
                        className={`sticky top-0 z-[60] border-b px-4 py-3 ${preview.status === 'draft' ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/40' : 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/40'}`}
                    >
                        <div className="mx-auto flex max-w-7xl items-center gap-3">
                            <AlertTriangle
                                className={`size-5 shrink-0 ${preview.status === 'draft' ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}
                            />
                            <div
                                className={`flex flex-wrap items-baseline gap-x-2 text-sm font-semibold ${preview.status === 'draft' ? 'text-amber-800 dark:text-amber-300' : 'text-blue-800 dark:text-blue-300'}`}
                            >
                                {preview.status === 'draft' ? (
                                    <>
                                        <span className="tracking-wide uppercase">
                                            Draft
                                        </span>
                                        <span className="font-normal opacity-80">
                                            This post is not published. Only
                                            logged-in users can see this
                                            preview.
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <span className="tracking-wide uppercase">
                                            Scheduled
                                        </span>
                                        <span className="font-normal opacity-80">
                                            Publishes on{' '}
                                            {preview.published_at &&
                                                new Date(
                                                    preview.published_at,
                                                ).toLocaleString(undefined, {
                                                    dateStyle: 'long',
                                                    timeStyle: 'short',
                                                })}
                                            . Only logged-in users can see this
                                            preview.
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {namespace.cover_image_url && (
                    <div className="h-48 w-full overflow-hidden md:h-64">
                        <img
                            src={namespace.cover_image_url}
                            alt={namespace.name}
                            className="h-full w-full object-cover"
                        />
                    </div>
                )}
                <header className="sticky top-0 z-50 border-b bg-background">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href="/"
                                className="text-2xl font-bold hover:underline"
                            >
                                ThinkStream
                            </Link>
                            {breadcrumbs.map((breadcrumb) => (
                                <div
                                    key={breadcrumb.full_path}
                                    className="flex items-center gap-2 text-sm text-muted-foreground"
                                >
                                    <ChevronRight className="size-4" />
                                    <Link
                                        href={contentPath.url(
                                            breadcrumb.full_path,
                                        )}
                                        className="hover:text-foreground hover:underline"
                                    >
                                        {breadcrumb.name}
                                    </Link>
                                </div>
                            ))}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <ChevronRight className="size-4" />
                                <Link
                                    href={contentPath.url(namespace.full_path)}
                                    className="hover:text-foreground hover:underline"
                                >
                                    {namespace.name}
                                </Link>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {hasHeadings && (
                                <button
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
                                    Toggle TOC
                                </button>
                            )}
                            {hasNav && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setNavOverride(
                                            (prev) => !(prev ?? !isMobile),
                                        )
                                    }
                                    className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    {navVisible ? (
                                        <PanelLeftClose size={16} />
                                    ) : (
                                        <PanelLeftOpen size={16} />
                                    )}
                                    Toggle Nav
                                </button>
                            )}
                            {auth.user ? (
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button asChild variant="default" size="sm">
                                        <Link
                                            href={adminPostShow.url({
                                                namespace: namespace.id,
                                                post: post.slug,
                                            })}
                                            className="inline-flex items-center gap-1.5"
                                        >
                                            <ArrowRightLeft className="size-4" />
                                            Manage
                                        </Link>
                                    </Button>
                                    <ViewContextBadge
                                        label="Site View"
                                        variant="site"
                                    />
                                </div>
                            ) : (
                                <Button asChild variant="outline" size="sm">
                                    <Link
                                        href={login.url({
                                            query: { intended: currentUrl },
                                        })}
                                    >
                                        Login
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                </header>

                <div
                    className={`mx-auto max-w-7xl px-4 py-10 ${gridCols ? `lg:grid lg:gap-12 ${gridCols}` : ''}`}
                >
                    {hasNav && (
                        <aside className="self-start lg:sticky lg:top-24">
                            {navVisible ? (
                                <div className="flex max-h-[calc(100vh-7rem)] flex-col text-sm">
                                    <div className="mb-3 shrink-0">
                                        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                            {navRoot.name}
                                        </p>
                                    </div>
                                    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                                        <ContentNavTree
                                            currentPath={post.full_path}
                                            root={navRoot}
                                        />
                                    </div>
                                    <div className="mt-4 shrink-0 border-t pt-3">
                                        <button
                                            type="button"
                                            data-test="posts-nav-close"
                                            onClick={() =>
                                                setNavOverride(false)
                                            }
                                            className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                                        >
                                            <PanelLeftClose size={14} />
                                            Close
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <button
                                        type="button"
                                        data-test="posts-nav-open"
                                        onClick={() => setNavOverride(true)}
                                        className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                        title="Open nav"
                                    >
                                        <PanelLeftOpen size={16} />
                                    </button>
                                </div>
                            )}
                        </aside>
                    )}

                    <main className="min-w-0">
                        {tocVisible && hasHeadings && (
                            <div className="mb-8 block lg:hidden">
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
                        <article className="space-y-4">
                            <header
                                id={`post-${post.slug}`}
                                className="scroll-mt-24 space-y-3"
                            >
                                <h1 className="text-3xl font-bold">
                                    {post.title}
                                </h1>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                        Share:
                                    </span>
                                    <a
                                        href={`https://x.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(`${post.title} | ${navRoot.name}`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                        title="Share on X"
                                    >
                                        <svg
                                            viewBox="0 0 24 24"
                                            className="size-4 fill-current"
                                            aria-hidden="true"
                                        >
                                            <path d={siX.path} />
                                        </svg>
                                    </a>
                                </div>
                            </header>
                            <div className="prose max-w-none prose-neutral dark:prose-invert">
                                <MarkdownContent
                                    content={post.content}
                                    components={entry?.components}
                                />
                            </div>
                            <footer className="border-t pt-4">
                                <time
                                    dateTime={post.updated_at}
                                    className="text-sm text-muted-foreground"
                                >
                                    Last updated:{' '}
                                    {new Date(
                                        post.updated_at,
                                    ).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </time>
                            </footer>
                        </article>
                    </main>

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
