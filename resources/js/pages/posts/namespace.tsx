import { Head, Link, usePage } from '@inertiajs/react';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import TableOfContents from '@/components/table-of-contents';
import { useMarkdownToc } from '@/hooks/use-markdown-toc';
import { useIsMobile } from '@/hooks/use-mobile';
import { login } from '@/routes';
import { index as adminPosts } from '@/routes/admin/posts';
import { show as showRoute } from '@/routes/posts';

type PostNamespace = {
    id: number;
    slug: string;
    name: string;
};

type Post = {
    id: number;
    slug: string;
    title: string;
    content: string;
    published_at: string;
};

export default function Namespace({
    namespace,
    posts,
}: {
    namespace: PostNamespace;
    posts: Post[];
}) {
    const { auth } = usePage<{
        auth: { user: { id: number; name: string } | null };
    }>().props;
    const toc = useMarkdownToc(posts);
    const isMobile = useIsMobile();
    const [tocOverride, setTocOverride] = useState<boolean | null>(null);
    const tocVisible = tocOverride ?? !isMobile;

    return (
        <>
            <Head title={namespace.name} />

            <div className="min-h-screen bg-background">
                <header className="border-b">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6">
                        <div className="flex items-baseline gap-2">
                            <Link
                                href="/"
                                className="text-2xl font-bold hover:underline"
                            >
                                ThinkStream
                            </Link>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-lg font-semibold">
                                {namespace.name}
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            {posts.length > 0 && (
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
                    className={`mx-auto max-w-7xl px-4 py-10 lg:grid lg:gap-12 ${tocVisible && posts.length > 0 ? 'lg:grid-cols-[1fr_240px]' : ''}`}
                >
                    {tocVisible && posts.length > 0 && (
                        <div className="mb-8 block lg:hidden">
                            <TableOfContents
                                posts={posts.map((post) => ({
                                    id: post.id,
                                    title: post.title,
                                    slug: post.slug,
                                    headings: toc.get(post.slug)!.headings,
                                }))}
                            />
                        </div>
                    )}

                    <main className="min-w-0">
                        {posts.length === 0 ? (
                            <p className="text-muted-foreground">
                                No posts in this namespace yet.
                            </p>
                        ) : (
                            <div className="space-y-16">
                                {posts.map((post) => (
                                    <article
                                        key={post.id}
                                        id={`post-${post.slug}`}
                                        className="scroll-mt-6 space-y-4"
                                    >
                                        <header className="space-y-1">
                                            <h2 className="text-2xl font-bold">
                                                <Link
                                                    href={showRoute.url({
                                                        namespace:
                                                            namespace.slug,
                                                        post: post.slug,
                                                    })}
                                                    className="hover:underline"
                                                >
                                                    {post.title}
                                                </Link>
                                            </h2>
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
                                                components={
                                                    toc.get(post.slug)!
                                                        .components
                                                }
                                            >
                                                {post.content}
                                            </ReactMarkdown>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </main>

                    {tocVisible && posts.length > 0 && (
                        <aside className="hidden lg:block">
                            <TableOfContents
                                posts={posts.map((post) => ({
                                    id: post.id,
                                    title: post.title,
                                    slug: post.slug,
                                    headings: toc.get(post.slug)!.headings,
                                }))}
                            />
                        </aside>
                    )}
                </div>
            </div>
        </>
    );
}
