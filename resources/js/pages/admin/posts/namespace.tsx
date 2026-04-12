import { Head, Link, setLayoutProps } from '@inertiajs/react';
import { Form } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';
import {
    index,
    namespace as namespaceRoute,
    create,
    edit,
    destroy,
} from '@/routes/admin/posts';

type Namespace = {
    id: number;
    slug: string;
    name: string;
};

type Post = {
    id: number;
    title: string;
    slug: string;
    published_at: string | null;
    created_at: string;
};

export default function Namespace({
    namespace,
    posts,
}: {
    namespace: Namespace;
    posts: Post[];
}) {
    setLayoutProps({
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'Posts', href: index.url() },
            { title: namespace.name, href: namespaceRoute.url(namespace.slug) },
        ],
    });

    return (
        <>
            <Head title={`Posts — ${namespace.name}`} />

            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            {namespace.name}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            /{namespace.slug}
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={create.url(namespace.slug)}>New Post</Link>
                    </Button>
                </div>

                {posts.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-12 text-center">
                        <p className="text-muted-foreground">
                            No posts in this namespace yet.
                        </p>
                        <Button asChild className="mt-4">
                            <Link href={create.url(namespace.slug)}>
                                Create your first post
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <div className="rounded-xl border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="px-4 py-3 text-left font-medium">
                                        Title
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium">
                                        Slug
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium">
                                        Created
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {posts.map((post) => (
                                    <tr
                                        key={post.id}
                                        className="border-b last:border-0"
                                    >
                                        <td className="px-4 py-3 font-medium">
                                            {post.title}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {post.slug}
                                        </td>
                                        <td className="px-4 py-3">
                                            {post.published_at ? (
                                                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                    Published
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                                    Draft
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {new Date(
                                                post.created_at,
                                            ).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    asChild
                                                >
                                                    <Link
                                                        href={edit.url({
                                                            namespace:
                                                                namespace.slug,
                                                            post: post.slug,
                                                        })}
                                                    >
                                                        Edit
                                                    </Link>
                                                </Button>
                                                <Form
                                                    {...destroy.form({
                                                        namespace:
                                                            namespace.slug,
                                                        post: post.slug,
                                                    })}
                                                >
                                                    {({ processing }) => (
                                                        <Button
                                                            type="submit"
                                                            variant="destructive"
                                                            size="sm"
                                                            disabled={
                                                                processing
                                                            }
                                                        >
                                                            Delete
                                                        </Button>
                                                    )}
                                                </Form>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
