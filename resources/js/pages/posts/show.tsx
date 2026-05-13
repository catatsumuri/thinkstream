import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    BookOpen,
    ChevronRight,
    ExternalLink,
    List,
    PanelLeftClose,
    PanelLeftOpen,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { siX } from 'simple-icons';
import type { ContentNavNode } from '@/components/content-nav-tree';
import ContentNavTree from '@/components/content-nav-tree';
import DocsHeaderActions from '@/components/docs-header-actions';
import { SimpleIconSvg } from '@/components/markdown-card-group';
import MarkdownContent from '@/components/markdown-content';
import MarkdownPageActions from '@/components/markdown-page-actions';
import TableOfContents from '@/components/table-of-contents';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useBelowDesktop } from '@/hooks/use-below-desktop';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useMarkdownToc } from '@/hooks/use-markdown-toc';
import { getSimpleIcon } from '@/lib/simple-icon-lookup';
import { timeAgo } from '@/lib/time';
import {
    edit as adminPostEdit,
    show as adminPostShow,
} from '@/routes/admin/posts';
import { path as contentPath } from '@/routes/posts';
import { markdown as contentPathMarkdown } from '@/routes/posts/path';
import { show as tagShow } from '@/routes/tags';

const postDateFormatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
});

const postDateTimeFormatter = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'UTC',
});

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
    reference_title: string | null;
    reference_url: string | null;
    tags: Array<{ name: string }>;
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
    const { auth, thinkstream } = usePage<{
        auth: { user: { id: number; name: string } | null };
        thinkstream: { markdown_pages: { enabled: boolean } };
    }>().props;
    const { currentUrl } = useCurrentUrl();
    const isBelowDesktop = useBelowDesktop();
    const markdownPagesEnabled = thinkstream.markdown_pages.enabled;
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [mobileTocOpen, setMobileTocOpen] = useState(false);
    const [tocOverride, setTocOverride] = useState<boolean | null>(null);
    const [navOverride, setNavOverride] = useState<boolean | null>(null);
    const githubIcon = getSimpleIcon('github');

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
                  scrollMargin: 'scroll-mt-40',
                  onEditHeading: handleEditHeading,
              }
            : {},
    );

    const entry = toc.get(post.slug);
    const markdownUrl = contentPathMarkdown.url({ path: post.full_path });
    const hasNav = navRoot.children.length > 0 || navRoot.posts.length > 0;
    const hasHeadings = (entry?.headings.length ?? 0) > 0;
    const navVisible = navOverride ?? true;
    const tocVisible = tocOverride ?? true;
    const showDesktopSidebars = !isBelowDesktop;
    const showDesktopNav = showDesktopSidebars && hasNav;
    const showDesktopToc = showDesktopSidebars && tocVisible && hasHeadings;

    let gridCols = '';

    if (showDesktopNav && navVisible && showDesktopToc) {
        gridCols = 'lg:grid-cols-[240px_1fr_240px]';
    } else if (showDesktopNav && navVisible) {
        gridCols = 'lg:grid-cols-[240px_1fr]';
    } else if (showDesktopNav && !navVisible && showDesktopToc) {
        gridCols = 'lg:grid-cols-[40px_1fr_240px]';
    } else if (showDesktopNav && !navVisible) {
        gridCols = 'lg:grid-cols-[40px_1fr]';
    } else if (showDesktopToc) {
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
                                                postDateTimeFormatter.format(
                                                    new Date(
                                                        preview.published_at,
                                                    ),
                                                )}
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

                <header
                    className={`sticky z-50 border-b border-border/60 bg-background/80 backdrop-blur ${auth.user ? 'top-16' : 'top-0'}`}
                >
                    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:py-6">
                        <div className="flex min-w-0 items-center gap-2">
                            <Link
                                href="/"
                                className="shrink-0 text-2xl font-bold hover:underline"
                            >
                                ThinkStream
                            </Link>
                            <div className="hidden min-w-0 items-center gap-2 lg:flex">
                                {breadcrumbs.map((breadcrumb) => (
                                    <div
                                        key={breadcrumb.full_path}
                                        className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground"
                                    >
                                        <ChevronRight className="size-4 shrink-0" />
                                        <Link
                                            href={contentPath.url(
                                                breadcrumb.full_path,
                                            )}
                                            className="truncate hover:text-foreground hover:underline"
                                        >
                                            {breadcrumb.name}
                                        </Link>
                                    </div>
                                ))}
                                <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                                    <ChevronRight className="size-4 shrink-0" />
                                    <Link
                                        href={contentPath.url(
                                            namespace.full_path,
                                        )}
                                        className="truncate hover:text-foreground hover:underline"
                                    >
                                        {namespace.name}
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <DocsHeaderActions
                            authUser={auth.user}
                            currentUrl={currentUrl}
                            defaultNamespace={navRoot.full_path}
                            manageHref={adminPostShow.url({
                                namespace: namespace.id,
                                post: post.slug,
                            })}
                            hasNav={hasNav}
                            navVisible={navVisible}
                            onToggleNav={() =>
                                setNavOverride((prev) => !(prev ?? true))
                            }
                            hasHeadings={hasHeadings}
                            tocVisible={tocVisible}
                            onToggleToc={() =>
                                setTocOverride((prev) => !(prev ?? true))
                            }
                            onOpenMobileNav={() => setMobileNavOpen(true)}
                            onOpenMobileToc={() => setMobileTocOpen(true)}
                        />
                    </div>

                    <div className="border-t px-4 py-3 lg:hidden">
                        <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                            <ChevronRight className="size-4 shrink-0" />
                            <span className="truncate">{navRoot.name}</span>
                            <ChevronRight className="size-4 shrink-0" />
                            <span className="truncate">{post.title}</span>
                        </div>
                    </div>
                </header>

                <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                    <SheetContent side="left" className="w-[280px] p-0">
                        <SheetHeader className="border-b border-border/60 px-4 py-3">
                            <SheetTitle className="flex items-center gap-2 text-base">
                                <BookOpen className="size-4 text-primary" />
                                {navRoot.name}
                            </SheetTitle>
                        </SheetHeader>
                        <div className="flex-1 overflow-y-auto overscroll-contain p-4">
                            <ContentNavTree
                                currentPath={post.full_path}
                                root={navRoot}
                                onNavigate={() => setMobileNavOpen(false)}
                            />
                        </div>
                        <div className="border-t border-border/60 p-3">
                            <SheetClose asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start gap-2 text-muted-foreground"
                                >
                                    <X className="size-3.5" />
                                    Close
                                </Button>
                            </SheetClose>
                        </div>
                    </SheetContent>
                </Sheet>

                <Sheet open={mobileTocOpen} onOpenChange={setMobileTocOpen}>
                    <SheetContent side="right" className="w-[280px] p-0">
                        <SheetHeader className="border-b border-border/60 px-4 py-3">
                            <SheetTitle className="flex items-center gap-2 text-base">
                                <List className="size-4 text-primary" />
                                On this page
                            </SheetTitle>
                        </SheetHeader>
                        <div className="flex-1 overflow-y-auto overscroll-contain p-4">
                            {hasHeadings && entry && (
                                <TableOfContents
                                    posts={[
                                        {
                                            id: post.id,
                                            title: post.title,
                                            slug: post.slug,
                                            headings: entry.headings,
                                        },
                                    ]}
                                    onNavigate={() => setMobileTocOpen(false)}
                                />
                            )}
                        </div>
                        <div className="border-t border-border/60 p-3">
                            <SheetClose asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start gap-2 text-muted-foreground"
                                >
                                    <X className="size-3.5" />
                                    Close
                                </Button>
                            </SheetClose>
                        </div>
                    </SheetContent>
                </Sheet>

                <div
                    className={`mx-auto max-w-7xl px-4 py-10 ${gridCols ? `lg:grid lg:gap-12 ${gridCols}` : ''}`}
                >
                    {hasNav && (
                        <aside
                            className={`hidden self-start lg:sticky lg:block ${auth.user ? 'lg:top-36' : 'lg:top-20'}`}
                        >
                            {navVisible ? (
                                <div
                                    data-test="content-nav-shell"
                                    className={`flex flex-col text-sm ${auth.user ? 'max-h-[calc(100vh-10rem)]' : 'max-h-[calc(100vh-6rem)]'}`}
                                >
                                    <div className="shrink-0 pb-4">
                                        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                            {navRoot.name}
                                        </p>
                                    </div>
                                    <div
                                        data-test="content-nav-scroll"
                                        className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-3"
                                    >
                                        <ContentNavTree
                                            currentPath={post.full_path}
                                            root={navRoot}
                                        />
                                    </div>
                                    <div className="mt-6 shrink-0 border-t border-border/60 pt-4">
                                        <button
                                            type="button"
                                            data-test="posts-nav-close"
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
                                        data-test="posts-nav-open"
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

                    <main className="min-w-0">
                        <article className="space-y-4">
                            <header
                                id={`post-${post.slug}`}
                                className={`space-y-4 ${auth.user ? 'scroll-mt-40' : 'scroll-mt-24'}`}
                            >
                                <div
                                    data-test="post-title-row"
                                    className="flex flex-wrap items-baseline gap-x-3 gap-y-2"
                                >
                                    <h1 className="text-3xl font-bold text-balance sm:text-4xl">
                                        {post.title}
                                    </h1>
                                    <div
                                        data-test="post-path-inline"
                                        className="max-w-full text-sm text-muted-foreground"
                                    >
                                        <span className="min-w-0 break-all sm:break-normal">
                                            /{post.full_path}
                                        </span>
                                    </div>
                                </div>
                                {post.reference_url && (
                                    <div className="flex justify-end">
                                        <a
                                            href={post.reference_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 rounded-md border border-border/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                        >
                                            <span className="text-muted-foreground/60">
                                                Source
                                            </span>
                                            <span className="h-3 w-px bg-border" />
                                            <span className="max-w-64 truncate">
                                                {post.reference_title ??
                                                    post.reference_url}
                                            </span>
                                            <ExternalLink className="size-3 shrink-0" />
                                        </a>
                                    </div>
                                )}

                                {post.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {post.tags.map((tag) => (
                                            <Link
                                                key={tag.name}
                                                href={tagShow.url(tag.name)}
                                                className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                            >
                                                {tag.name}
                                            </Link>
                                        ))}
                                    </div>
                                )}

                                <div className="flex flex-col gap-3">
                                    <div
                                        data-test="post-header-actions"
                                        className="flex flex-wrap items-center gap-2"
                                    >
                                        {markdownPagesEnabled && (
                                            <MarkdownPageActions
                                                markdownUrl={markdownUrl}
                                            />
                                        )}
                                        <a
                                            href={`https://x.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(`${post.title} | ${navRoot.name}`)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/60 px-2.5 text-xs text-muted-foreground shadow-none transition-colors hover:bg-accent hover:text-foreground"
                                            title="Share on X"
                                        >
                                            <svg
                                                viewBox="0 0 24 24"
                                                className="size-3.5 fill-current"
                                                aria-hidden="true"
                                            >
                                                <path d={siX.path} />
                                            </svg>
                                            Share
                                        </a>
                                    </div>
                                </div>
                            </header>

                            <div className="prose max-w-none prose-neutral dark:prose-invert">
                                <MarkdownContent
                                    content={post.content}
                                    components={entry?.components}
                                />
                            </div>

                            <footer className="flex justify-end border-t pt-4">
                                <time
                                    dateTime={post.updated_at}
                                    className="text-xs text-muted-foreground/60"
                                >
                                    Last updated:{' '}
                                    <span
                                        suppressHydrationWarning
                                        title={postDateFormatter.format(
                                            new Date(post.updated_at),
                                        )}
                                    >
                                        {timeAgo(post.updated_at)}
                                    </span>
                                </time>
                            </footer>
                        </article>
                    </main>

                    {tocVisible && hasHeadings && (
                        <aside
                            className={`hidden self-start lg:sticky lg:block ${auth.user ? 'lg:top-36' : 'lg:top-20'}`}
                        >
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

                <footer className="border-t">
                    <div className="mx-auto flex max-w-7xl justify-center px-4 py-6 text-sm text-muted-foreground">
                        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
                            <span>Powered by ThinkStream</span>
                            <a
                                href="https://github.com/catatsumuri/thinkstream"
                                target="_blank"
                                rel="noopener noreferrer"
                                data-test="thinkstream-footer-link"
                                className="inline-flex items-center gap-2 font-medium text-foreground underline underline-offset-4 transition-opacity hover:opacity-70"
                            >
                                {githubIcon && (
                                    <span data-test="thinkstream-footer-icon">
                                        <SimpleIconSvg
                                            icon={githubIcon}
                                            className="size-4"
                                        />
                                    </span>
                                )}
                                github.com/catatsumuri/thinkstream
                            </a>
                        </p>
                    </div>
                </footer>
            </div>
        </>
    );
}
