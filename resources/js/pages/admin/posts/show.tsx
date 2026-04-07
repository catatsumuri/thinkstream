import { Head, Link, setLayoutProps } from '@inertiajs/react';
import { Form } from '@inertiajs/react';
import ReactMarkdown from 'react-markdown';
import PostController from '@/actions/App/Http/Controllers/Admin/PostController';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';
import { index } from '@/routes/admin/posts';

type Post = {
    id: number;
    title: string;
    slug: string;
    content: string;
    published_at: string | null;
    created_at: string;
};

export default function Show({ post }: { post: Post }) {
    setLayoutProps({
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'Posts', href: index.url() },
            { title: post.title, href: PostController.show.url(post.slug) },
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
                            <span>{post.slug}</span>
                            <span>·</span>
                            {post.published_at ? (
                                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    Published
                                </span>
                            ) : (
                                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                    Draft
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                        <Button variant="outline" asChild>
                            <Link href={PostController.edit.url(post.slug)}>Edit</Link>
                        </Button>
                        <Form {...PostController.destroy.form(post.slug)}>
                            {({ processing }) => (
                                <Button type="submit" variant="destructive" disabled={processing}>
                                    Delete
                                </Button>
                            )}
                        </Form>
                    </div>
                </div>

                <div className="rounded-xl border p-6">
                    <div className="prose prose-neutral dark:prose-invert max-w-none">
                        <ReactMarkdown>{post.content}</ReactMarkdown>
                    </div>
                </div>
            </div>
        </>
    );
}
