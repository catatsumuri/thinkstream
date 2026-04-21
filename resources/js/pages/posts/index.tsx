import { Head, Link, usePage } from '@inertiajs/react';
import { ImageOff, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { login } from '@/routes';
import { namespace as adminNamespaceRoute } from '@/routes/admin/posts';
import { path as contentPath } from '@/routes/posts';

type PostNamespace = {
    id: number;
    slug: string;
    full_path: string;
    name: string;
    description: string | null;
    cover_image_url: string | null;
    posts_count: number;
};

export default function Index({ namespaces }: { namespaces: PostNamespace[] }) {
    const { auth } = usePage<{
        auth: { user: { id: number; name: string } | null };
    }>().props;
    const { currentUrl } = useCurrentUrl();

    return (
        <>
            <Head title="ThinkStream" />

            <div className="min-h-screen bg-background">
                <header className="border-b">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6">
                        <h1 className="text-2xl font-bold">ThinkStream</h1>
                        {!auth.user && (
                            <Button asChild variant="outline" size="sm">
                                <Link
                                    href={login.url({
                                        query: { intended: currentUrl },
                                    })}
                                >
                                    Login
                                </Link>
                            </Button>
                        )}
                    </div>
                </header>

                <div className="mx-auto max-w-7xl px-4 py-10">
                    {namespaces.length === 0 ? (
                        <p className="text-muted-foreground">
                            No namespaces yet.
                        </p>
                    ) : (
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {namespaces.map((ns) => (
                                <div
                                    key={ns.id}
                                    className="group overflow-hidden rounded-xl border transition-colors hover:bg-muted/50"
                                >
                                    <div className="relative aspect-video overflow-hidden border-b">
                                        <Link
                                            href={contentPath.url(ns.full_path)}
                                        >
                                            {ns.cover_image_url ? (
                                                <img
                                                    src={ns.cover_image_url}
                                                    alt={ns.name}
                                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                />
                                            ) : (
                                                <>
                                                    <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted-foreground/50">
                                                        <ImageOff className="size-6" />
                                                        <span className="text-xs font-medium tracking-wide uppercase">
                                                            No image
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                        </Link>
                                    </div>
                                    <div className="flex flex-col gap-1 p-5">
                                        <Link
                                            href={contentPath.url(ns.full_path)}
                                            className="leading-snug font-semibold hover:underline"
                                        >
                                            {ns.name}
                                        </Link>
                                        {ns.description && (
                                            <span className="line-clamp-2 text-sm text-muted-foreground">
                                                {ns.description}
                                            </span>
                                        )}
                                        <span className="mt-2 text-xs text-muted-foreground">
                                            /{ns.full_path}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {ns.posts_count}{' '}
                                            {ns.posts_count === 1
                                                ? 'post'
                                                : 'posts'}
                                        </span>
                                        {auth.user && (
                                            <div className="mt-3">
                                                <Button
                                                    asChild
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    <Link
                                                        href={adminNamespaceRoute.url(
                                                            ns.id,
                                                        )}
                                                        className="inline-flex items-center gap-1.5"
                                                    >
                                                        <Settings2 className="size-4" />
                                                        Manage
                                                    </Link>
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
