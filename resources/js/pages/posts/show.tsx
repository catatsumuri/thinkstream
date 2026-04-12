import { Head, Link } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useMarkdownToc } from '@/hooks/use-markdown-toc';
import { login } from '@/routes';
import { index as adminPosts } from '@/routes/admin/posts';

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

export default function Show({
    namespace,
    post,
}: {
    namespace: PostNamespace;
    post: Post;
}) {
    const { auth } = usePage<{
        auth: { user: { id: number; name: string } | null };
    }>().props;
    const toc = useMarkdownToc([post]);
    const entry = toc.get(post.slug);

    return (
        <>
            <Head title={post.title} />

            <div className="min-h-screen bg-background">
                <header className="border-b">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6">
                        <div>
                            <Link
                                href="/"
                                className="text-2xl font-bold hover:underline"
                            >
                                ThinkStream
                            </Link>
                            <span className="ml-2 text-sm text-muted-foreground">
                                / {namespace.slug}
                            </span>
                        </div>
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
                </header>

                <div className="mx-auto max-w-7xl px-4 py-10">
                    <main>
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
                </div>
            </div>
        </>
    );
}
