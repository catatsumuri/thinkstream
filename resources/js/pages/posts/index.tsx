import { Head, Link, usePage } from '@inertiajs/react';
import { login } from '@/routes';
import { index as adminPosts } from '@/routes/admin/posts';
import { namespace as namespaceRoute } from '@/routes/posts';

type PostNamespace = {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    posts_count: number;
};

export default function Index({ namespaces }: { namespaces: PostNamespace[] }) {
    const { auth } = usePage<{
        auth: { user: { id: number; name: string } | null };
    }>().props;

    return (
        <>
            <Head title="ThinkStream" />

            <div className="min-h-screen bg-background">
                <header className="border-b">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6">
                        <h1 className="text-2xl font-bold">ThinkStream</h1>
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
                    {namespaces.length === 0 ? (
                        <p className="text-muted-foreground">
                            No namespaces yet.
                        </p>
                    ) : (
                        <ul className="space-y-3">
                            {namespaces.map((ns) => (
                                <li key={ns.id}>
                                    <Link
                                        href={namespaceRoute.url(ns.slug)}
                                        className="flex items-center justify-between gap-6 rounded-lg border px-5 py-4 transition-colors hover:bg-muted/50"
                                    >
                                        <span className="min-w-0">
                                            <span className="block font-medium">
                                                {ns.name}
                                            </span>
                                            {ns.description && (
                                                <span className="mt-1 block text-sm text-muted-foreground">
                                                    {ns.description}
                                                </span>
                                            )}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                            {ns.posts_count}{' '}
                                            {ns.posts_count === 1
                                                ? 'post'
                                                : 'posts'}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </>
    );
}
