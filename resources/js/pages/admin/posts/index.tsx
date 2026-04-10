import { Head, Link } from '@inertiajs/react';
import { Form } from '@inertiajs/react';
import PostController from '@/actions/App/Http/Controllers/Admin/PostController';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';
import { index, create } from '@/routes/admin/posts';

type Post = {
    id: number;
    title: string;
    slug: string;
    published_at: string | null;
    created_at: string;
};

export default function Index({ posts }: { posts: Post[] }) {
    return (
        <>
            <Head title="Posts" />

            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Posts</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage your markdown posts
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={create.url()}>New Post</Link>
                    </Button>
                </div>

                {posts.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-12 text-center">
                        <p className="text-muted-foreground">No posts yet.</p>
                        <Button asChild className="mt-4">
                            <Link href={create.url()}>
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
                                            <Link
                                                href={PostController.show.url(
                                                    post.slug,
                                                )}
                                                className="text-primary hover:underline"
                                            >
                                                {post.title}
                                            </Link>
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
                                                        href={PostController.edit.url(
                                                            post.slug,
                                                        )}
                                                    >
                                                        Edit
                                                    </Link>
                                                </Button>
                                                <Form
                                                    {...PostController.destroy.form(
                                                        post.slug,
                                                    )}
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

Index.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Posts', href: index.url() },
    ],
};
