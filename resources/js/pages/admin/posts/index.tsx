import { Head, Link } from '@inertiajs/react';
import { Form } from '@inertiajs/react';
import NamespaceController from '@/actions/App/Http/Controllers/Admin/NamespaceController';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';
import { create as namespaceCreate } from '@/routes/admin/namespaces';
import { index, namespace as namespaceRoute } from '@/routes/admin/posts';

type Namespace = {
    id: number;
    slug: string;
    name: string;
    is_published: boolean;
    posts_count: number;
};

export default function Index({ namespaces }: { namespaces: Namespace[] }) {
    return (
        <>
            <Head title="Posts" />

            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Posts</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage namespaces and their posts
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={namespaceCreate.url()}>New Namespace</Link>
                    </Button>
                </div>

                {namespaces.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-12 text-center">
                        <p className="text-muted-foreground">
                            No namespaces yet.
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Create a namespace to start adding posts.
                        </p>
                        <Button asChild className="mt-4">
                            <Link href={namespaceCreate.url()}>
                                Create your first namespace
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <div className="rounded-xl border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="px-4 py-3 text-left font-medium">
                                        Namespace
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium">
                                        Slug
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium">
                                        Posts
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {namespaces.map((ns) => (
                                    <tr
                                        key={ns.id}
                                        className="border-b last:border-0"
                                    >
                                        <td className="px-4 py-3 font-medium">
                                            <Link
                                                href={namespaceRoute.url(
                                                    ns.id,
                                                )}
                                                className="text-primary hover:underline"
                                            >
                                                {ns.name}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {ns.slug}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                                    ns.is_published
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-muted text-muted-foreground'
                                                }`}
                                            >
                                                {ns.is_published
                                                    ? 'Published'
                                                    : 'Draft'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {ns.posts_count}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    asChild
                                                >
                                                    <Link
                                                        href={NamespaceController.edit.url(
                                                            ns.id,
                                                        )}
                                                    >
                                                        Edit
                                                    </Link>
                                                </Button>
                                                <Form
                                                    {...NamespaceController.destroy.form(
                                                        ns.id,
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
