import { Head, Link, usePage } from '@inertiajs/react';
import { AlertTriangle, ChevronRight, ImageOff } from 'lucide-react';
import { useState } from 'react';
import type { ContentNavNode } from '@/components/content-nav-tree';
import ContentNavTree from '@/components/content-nav-tree';
import DocsHeaderActions from '@/components/docs-header-actions';
import MarkdownPageActions from '@/components/markdown-page-actions';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useIsMobile } from '@/hooks/use-mobile';
import { namespace as adminNamespaceRoute } from '@/routes/admin/posts';
import { path as contentPath } from '@/routes/posts';
import { markdown as contentPathMarkdown } from '@/routes/posts/path';

type PostNamespace = {
    id: number;
    slug: string;
    full_path: string;
    name: string;
    description?: string | null;
    cover_image_url: string | null;
    is_published: boolean;
};

type ChildNamespace = PostNamespace & {
    posts_count: number;
};

type Post = {
    id: number;
    slug: string;
    title: string;
    full_path: string;
    published_at: string | null;
};

export default function Namespace({
    breadcrumbs,
    children,
    navRoot,
    namespace,
    posts,
    preview = false,
}: {
    breadcrumbs: Array<{ name: string; full_path: string }>;
    children: ChildNamespace[];
    navRoot: ContentNavNode;
    namespace: PostNamespace;
    posts: Post[];
    preview?: boolean;
}) {
    const { auth, thinkstream } = usePage<{
        auth: { user: { id: number; name: string } | null };
        thinkstream: { markdown_pages: { enabled: boolean } };
    }>().props;
    const { currentUrl } = useCurrentUrl();
    const isMobile = useIsMobile();
    const [navOverride, setNavOverride] = useState<boolean | null>(null);
    const navVisible = navOverride ?? !isMobile;
    const markdownPagesEnabled = thinkstream.markdown_pages.enabled;
    const markdownUrl = contentPathMarkdown.url({ path: namespace.full_path });

    return (
        <>
            <Head title={namespace.name} />

            <div className="min-h-screen bg-background">
                {preview && (
                    <div className="sticky top-0 z-[60] border-b border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-900/40">
                        <div className="mx-auto flex max-w-7xl items-center gap-3">
                            <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                            <div className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
                                <span className="tracking-wide uppercase">
                                    Unpublished
                                </span>
                                <span className="font-normal opacity-80">
                                    This namespace is not publicly visible. Only
                                    logged-in users can see this preview.
                                </span>
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
                <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
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
                                    <span className="truncate font-medium text-foreground">
                                        {namespace.name}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <DocsHeaderActions
                            authUser={auth.user}
                            currentUrl={currentUrl}
                            defaultNamespace={navRoot.full_path}
                            manageHref={adminNamespaceRoute.url(namespace.id)}
                            hasNav
                            navVisible={navVisible}
                            onToggleNav={() =>
                                setNavOverride((prev) => !(prev ?? !isMobile))
                            }
                        />
                    </div>

                    <div className="border-t px-4 py-3 lg:hidden">
                        <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                            <ChevronRight className="size-4 shrink-0" />
                            <span className="truncate">{navRoot.name}</span>
                            <ChevronRight className="size-4 shrink-0" />
                            <span className="truncate">{namespace.name}</span>
                        </div>
                    </div>
                </header>

                <div
                    data-test="namespace-layout"
                    className={`mx-auto max-w-7xl px-4 py-10 ${navVisible ? 'lg:grid lg:grid-cols-[240px_1fr] lg:gap-12' : ''}`}
                >
                    {navVisible && (
                        <aside
                            data-test="namespace-nav"
                            className="mb-8 lg:mb-0 lg:block"
                        >
                            <div
                                data-test="content-nav-shell"
                                className="lg:sticky lg:top-24"
                            >
                                <div className="pb-4">
                                    <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        {navRoot.name}
                                    </p>
                                </div>
                                <div
                                    data-test="content-nav-scroll"
                                    className="max-h-[calc(100vh-7rem)] overflow-y-auto overscroll-contain pr-3"
                                >
                                    <ContentNavTree
                                        currentPath={namespace.full_path}
                                        root={navRoot}
                                    />
                                </div>
                            </div>
                        </aside>
                    )}

                    <main data-test="namespace-main" className="space-y-12">
                        <section className="space-y-3">
                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                <p>/{namespace.full_path}</p>
                                {markdownPagesEnabled && (
                                    <MarkdownPageActions
                                        markdownUrl={markdownUrl}
                                    />
                                )}
                            </div>
                            {namespace.description ? (
                                <p className="max-w-3xl text-base leading-7 whitespace-pre-line text-muted-foreground">
                                    {namespace.description}
                                </p>
                            ) : auth.user ? (
                                <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                                    No description yet.
                                </p>
                            ) : null}
                        </section>

                        {children.length > 0 && (
                            <section className="space-y-4">
                                <div>
                                    <h2 className="text-xl font-semibold">
                                        Child Namespaces
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        Browse deeper sections in this branch.
                                    </p>
                                </div>
                                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                                    {children.map((child) => (
                                        <Link
                                            key={child.id}
                                            href={contentPath.url(
                                                child.full_path,
                                            )}
                                            className="group overflow-hidden rounded-xl border transition-colors hover:bg-muted/50"
                                        >
                                            <div className="relative aspect-video overflow-hidden border-b">
                                                {child.cover_image_url ? (
                                                    <img
                                                        src={
                                                            child.cover_image_url
                                                        }
                                                        alt={child.name}
                                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <>
                                                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted-foreground/50">
                                                            <ImageOff className="size-6" />
                                                            <span className="text-xs font-medium tracking-wide uppercase">
                                                                No image
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            <div className="space-y-2 p-5">
                                                <p className="font-semibold">
                                                    {child.name}
                                                </p>
                                                {child.description && (
                                                    <p className="line-clamp-2 text-sm text-muted-foreground">
                                                        {child.description}
                                                    </p>
                                                )}
                                                <p className="text-xs text-muted-foreground">
                                                    /{child.full_path}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {child.posts_count} direct{' '}
                                                    {child.posts_count === 1
                                                        ? 'post'
                                                        : 'posts'}
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}

                        <section className="space-y-4">
                            <div>
                                <h2 className="text-xl font-semibold">Posts</h2>
                                <p className="text-sm text-muted-foreground">
                                    Direct posts published in this namespace.
                                </p>
                            </div>

                            {posts.length === 0 ? (
                                <p className="text-muted-foreground">
                                    No direct posts in this namespace yet.
                                </p>
                            ) : (
                                <div className="rounded-xl border">
                                    <div className="divide-y">
                                        {posts.map((post) => (
                                            <Link
                                                key={post.id}
                                                href={contentPath.url(
                                                    post.full_path,
                                                )}
                                                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
                                            >
                                                <div className="space-y-1">
                                                    <p className="font-medium">
                                                        {post.title}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        /{post.full_path}
                                                    </p>
                                                </div>
                                                <div className="shrink-0 text-sm text-muted-foreground">
                                                    {post.published_at
                                                        ? new Date(
                                                              post.published_at,
                                                          ).toLocaleDateString()
                                                        : 'Draft'}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    </main>
                </div>
            </div>
        </>
    );
}
