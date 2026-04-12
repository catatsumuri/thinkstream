import { Head, Link } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import {
    PanelLeftClose,
    PanelLeftOpen,
    PanelRightClose,
    PanelRightOpen,
} from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import TableOfContents from '@/components/table-of-contents';
import { useMarkdownToc } from '@/hooks/use-markdown-toc';
import { useIsMobile } from '@/hooks/use-mobile';
import { login } from '@/routes';
import { index as adminPosts } from '@/routes/admin/posts';
import { namespace as namespaceRoute, show as showRoute } from '@/routes/posts';

type PostNamespace = {
    id: number;
    slug: string;
    name: string;
    cover_image_url: string | null;
};

type Post = {
    id: number;
    slug: string;
    title: string;
    content: string;
    published_at: string;
};

type NavPost = {
    id: number;
    slug: string;
    title: string;
    published_at: string;
};

export default function Show({
    namespace,
    post,
    posts,
}: {
    namespace: PostNamespace;
    post: Post;
    posts: NavPost[];
}) {
    const { auth } = usePage<{
        auth: { user: { id: number; name: string } | null };
    }>().props;
    const toc = useMarkdownToc([post]);
    const entry = toc.get(post.slug);
    const isMobile = useIsMobile();
    const [tocOverride, setTocOverride] = useState<boolean | null>(null);
    const [navOverride, setNavOverride] = useState<boolean | null>(null);
    const tocVisible = tocOverride ?? !isMobile;
    const hasNav = posts.length > 1;
    const hasHeadings = (entry?.headings.length ?? 0) > 0;
    const navVisible = navOverride ?? true;

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
            <Head title={post.title} />

            <div className="min-h-screen bg-background">
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
                        <div className="flex items-baseline gap-2">
                            <Link
                                href="/"
                                className="text-2xl font-bold hover:underline"
                            >
                                ThinkStream
                            </Link>
                            <span className="text-muted-foreground">/</span>
                            <Link
                                href={namespaceRoute.url({
                                    namespace: namespace.slug,
                                })}
                                className="text-sm text-muted-foreground hover:underline"
                            >
                                {namespace.slug}
                            </Link>
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
                            {auth.user ? (
                                <Link
                                    href={adminPosts.url()}
                                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    Admin
                                </Link>
                            ) : (
                                <Link
                                    href={login.url()}
                                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    Login
                                </Link>
                            )}
                        </div>
                    </div>
                </header>

                <div
                    className={`mx-auto max-w-7xl px-4 py-10 ${gridCols ? `lg:grid lg:gap-12 ${gridCols}` : ''}`}
                >
                    {hasNav && (
                        <aside className="hidden self-start lg:sticky lg:top-24 lg:block">
                            {navVisible ? (
                                <nav className="flex max-h-[calc(100vh-7rem)] flex-col text-sm">
                                    <div className="mb-3 shrink-0">
                                        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                            {namespace.name}
                                        </p>
                                    </div>
                                    <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                                        {posts.map((p) => (
                                            <Link
                                                key={p.id}
                                                href={showRoute.url({
                                                    namespace: namespace.slug,
                                                    post: p.slug,
                                                })}
                                                className={`block rounded px-2 py-1.5 leading-snug transition-colors ${
                                                    p.slug === post.slug
                                                        ? 'bg-accent font-medium text-accent-foreground'
                                                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                                                }`}
                                            >
                                                {p.title}
                                            </Link>
                                        ))}
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
                                </nav>
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
                            <header className="space-y-1">
                                <h1 className="text-3xl font-bold">
                                    {post.title}
                                </h1>
                                <time
                                    dateTime={post.published_at}
                                    className="text-sm text-muted-foreground"
                                >
                                    {new Date(
                                        post.published_at,
                                    ).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </time>
                            </header>
                            <div className="prose max-w-none prose-neutral dark:prose-invert">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={entry?.components}
                                >
                                    {post.content}
                                </ReactMarkdown>
                            </div>
                        </article>
                    </main>

                    {tocVisible && hasHeadings && (
                        <aside className="hidden lg:block">
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
                        </aside>
                    )}
                </div>
            </div>
        </>
    );
}
