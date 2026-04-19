import { Head, Link, setLayoutProps } from '@inertiajs/react';
import { Form } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock,
    ExternalLink,
    FilePen,
    FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';
import { create as namespaceCreate } from '@/routes/admin/namespaces';
import {
    index,
    namespace as namespaceRoute,
    create,
    edit,
    destroy,
    show,
} from '@/routes/admin/posts';

type Namespace = {
    id: number;
    slug: string;
    full_path: string;
    name: string;
};

type ChildNamespace = {
    id: number;
    slug: string;
    full_path: string;
    name: string;
    is_published: boolean;
    posts_count: number;
};

type Post = {
    id: number;
    title: string;
    slug: string;
    is_draft: boolean;
    published_at: string | null;
    created_at: string;
};

type Ancestor = {
    id: number;
    name: string;
};

export default function Namespace({
    namespace,
    ancestors,
    children,
    posts,
}: {
    namespace: Namespace;
    ancestors: Ancestor[];
    children: ChildNamespace[];
    posts: Post[];
}) {
    const childNamespaceCreateUrl = `${namespaceCreate.url()}?${new URLSearchParams({ parent: String(namespace.id) }).toString()}`;

    setLayoutProps({
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'Namespaces', href: index.url() },
            ...ancestors.map((ancestor) => ({
                title: ancestor.name,
                href: namespaceRoute.url(ancestor.id),
            })),
            { title: namespace.name, href: namespaceRoute.url(namespace.id) },
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
                    <div className="flex items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link href={childNamespaceCreateUrl}>
                                New Child Namespace
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href={create.url(namespace.id)}>
                                New Post
                            </Link>
                        </Button>
                    </div>
                </div>

                {children.length > 0 && (
                    <div className="space-y-2">
                        <h2 className="text-sm font-medium text-muted-foreground">
                            Child Namespaces
                        </h2>
                        <div className="rounded-xl border">
                            <table className="w-full text-sm">
                                <tbody>
                                    {children.map((child) => (
                                        <tr
                                            key={child.id}
                                            className="border-b last:border-0"
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <FolderOpen className="size-4 text-muted-foreground" />
                                                    <Link
                                                        href={namespaceRoute.url(
                                                            child.id,
                                                        )}
                                                        className="font-medium text-primary hover:underline"
                                                    >
                                                        {child.name}
                                                    </Link>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                /{child.full_path}
                                            </td>
                                            <td className="px-4 py-3">
                                                {child.is_published ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                        <CheckCircle2 className="size-3" />
                                                        Published
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                                        <FilePen className="size-3" />
                                                        Draft
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {child.posts_count}{' '}
                                                {child.posts_count === 1
                                                    ? 'post'
                                                    : 'posts'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {posts.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-12 text-center">
                        <p className="text-muted-foreground">
                            No posts in this namespace yet.
                        </p>
                        <div className="mt-4 flex items-center justify-center gap-2">
                            <Button variant="outline" asChild>
                                <Link href={childNamespaceCreateUrl}>
                                    Create a child namespace
                                </Link>
                            </Button>
                            <Button asChild>
                                <Link href={create.url(namespace.id)}>
                                    Create your first post
                                </Link>
                            </Button>
                        </div>
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
                                                href={show.url({
                                                    namespace: namespace.id,
                                                    post: post.slug,
                                                })}
                                                className="hover:underline"
                                            >
                                                {post.title}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            /{namespace.full_path}/{post.slug}
                                        </td>
                                        <td className="px-4 py-3">
                                            {post.is_draft ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                                    <FilePen className="size-3" />
                                                    Draft
                                                </span>
                                            ) : !post.published_at ||
                                              new Date(post.published_at) >
                                                  new Date() ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                    <Clock className="size-3" />
                                                    Scheduled
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                    <CheckCircle2 className="size-3" />
                                                    Published
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
                                                {!post.is_draft &&
                                                    post.published_at &&
                                                    new Date(
                                                        post.published_at,
                                                    ) <= new Date() && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            asChild
                                                        >
                                                            <a
                                                                href={`/${namespace.full_path}/${post.slug}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                <ExternalLink className="size-4" />
                                                                View
                                                            </a>
                                                        </Button>
                                                    )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    asChild
                                                >
                                                    <Link
                                                        href={edit.url({
                                                            namespace:
                                                                namespace.id,
                                                            post: post.slug,
                                                        })}
                                                    >
                                                        Edit
                                                    </Link>
                                                </Button>
                                                <Form
                                                    {...destroy.form({
                                                        namespace: namespace.id,
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
