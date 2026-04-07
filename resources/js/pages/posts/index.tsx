import { Head } from '@inertiajs/react';
import ReactMarkdown from 'react-markdown';

type Post = {
    id: number;
    title: string;
    slug: string;
    content: string;
    published_at: string;
};

export default function Index({ posts }: { posts: Post[] }) {
    return (
        <>
            <Head title="ThinkStream" />

            <div className="min-h-screen bg-background">
                <header className="border-b">
                    <div className="mx-auto max-w-3xl px-4 py-6">
                        <h1 className="text-2xl font-bold">ThinkStream</h1>
                    </div>
                </header>

                <main className="mx-auto max-w-3xl px-4 py-10">
                    {posts.length === 0 ? (
                        <p className="text-muted-foreground">No posts yet.</p>
                    ) : (
                        <div className="space-y-16">
                            {posts.map((post) => (
                                <article key={post.id} className="space-y-4">
                                    <header className="space-y-1">
                                        <h2 className="text-2xl font-bold">{post.title}</h2>
                                        <time
                                            dateTime={post.published_at}
                                            className="text-sm text-muted-foreground"
                                        >
                                            {new Date(post.published_at).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </time>
                                    </header>
                                    <div className="prose prose-neutral dark:prose-invert max-w-none">
                                        <ReactMarkdown>{post.content}</ReactMarkdown>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </>
    );
}
