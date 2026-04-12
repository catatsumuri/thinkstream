import { Form, Head, Link, setLayoutProps } from '@inertiajs/react';
import ReactMarkdown from 'react-markdown';
import { CodeBlock } from '@/components/code-block';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';
import {
    destroy,
    edit,
    index,
    namespace as namespaceRoute,
} from '@/routes/admin/posts';

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
    setLayoutProps({
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'Posts', href: index.url() },
            { title: namespace.name, href: namespaceRoute.url(namespace.slug) },
            {
                title: post.title,
                href: edit.url({ namespace: namespace.slug, post: post.slug }),
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
                            <Link
                                href={edit.url({
                                    namespace: namespace.slug,
                                    post: post.slug,
                                })}
                            >
                                Edit
                            </Link>
                        </Button>
                        <Form
                            {...destroy.form({
                                namespace: namespace.slug,
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

                <div className="rounded-xl border p-6">
                    <div className="prose max-w-none prose-neutral dark:prose-invert">
                        <ReactMarkdown components={{ code: CodeBlock }}>
                            {post.content}
                        </ReactMarkdown>
                    </div>
                </div>
            </div>
        </>
    );
}
