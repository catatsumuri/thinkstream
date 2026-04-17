import { Head, Link, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { login } from '@/routes';
import { index as adminPosts } from '@/routes/admin/posts';
import { path as contentPath } from '@/routes/posts';

type PostNamespace = {
    id: number;
    slug: string;
    full_path: string;
    name: string;
    description?: string | null;
    cover_image_url: string | null;
};

type ChildNamespace = PostNamespace & {
    posts_count: number;
};

type Post = {
    id: number;
    slug: string;
    title: string;
    full_path: string;
    published_at: string | null;
};

export default function Namespace({
    breadcrumbs,
    children,
    namespace,
    posts,
}: {
    breadcrumbs: Array<{ name: string; full_path: string }>;
    children: ChildNamespace[];
    namespace: PostNamespace;
    posts: Post[];
}) {
    const { auth } = usePage<{
        auth: { user: { id: number; name: string } | null };
    }>().props;

    return (
        <>
            <Head title={namespace.name} />

            <div className="min-h-screen bg-background">
                {namespace.cover_image_url && (
                    <div className="h-48 w-full overflow-hidden md:h-64">
                        <img
                            src={namespace.cover_image_url}
                            alt={namespace.name}
                            className="h-full w-full object-cover"
                        />
                    </div>
                )}
                <header className="sticky top-0 z-50 border-b bg-background">
                    <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-6">
                        <div className="space-y-2">
                            <Link
                                href="/"
                                className="text-2xl font-bold hover:underline"
                            >
                                ThinkStream
                            </Link>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                {breadcrumbs.map((breadcrumb) => (
                                    <div
                                        key={breadcrumb.full_path}
                                        className="flex items-center gap-2"
                                    >
                                        <ChevronRight className="size-4" />
                                        <Link
                                            href={contentPath.url(
                                                breadcrumb.full_path,
                                            )}
                                            className="hover:text-foreground hover:underline"
                                        >
                                            {breadcrumb.name}
                                        </Link>
                                    </div>
                                ))}
                                <div className="flex items-center gap-2">
                                    <ChevronRight className="size-4" />
                                    <span className="font-medium text-foreground">
                                        {namespace.name}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
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
                    </div>
                </header>

                <div className="mx-auto max-w-7xl px-4 py-10">
                    <main className="space-y-12">
                        <section className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                /{namespace.full_path}
                            </p>
                            {namespace.description && (
                                <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                                    {namespace.description}
                                </p>
                            )}
                        </section>

                        {children.length > 0 && (
                            <section className="space-y-4">
                                <div>
                                    <h2 className="text-xl font-semibold">
                                        Child Namespaces
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        Browse deeper sections in this branch.
                                    </p>
                                </div>
                                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                                    {children.map((child) => (
                                        <Link
                                            key={child.id}
                                            href={contentPath.url(
                                                child.full_path,
                                            )}
                                            className="group overflow-hidden rounded-xl border transition-colors hover:bg-muted/50"
                                        >
                                            <div className="relative aspect-video overflow-hidden border-b">
                                                {child.cover_image_url ? (
                                                    <img
                                                        src={
                                                            child.cover_image_url
                                                        }
                                                        alt={child.name}
                                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                                                )}
                                            </div>
                                            <div className="space-y-2 p-5">
                                                <p className="font-semibold">
                                                    {child.name}
                                                </p>
                                                {child.description && (
                                                    <p className="line-clamp-2 text-sm text-muted-foreground">
                                                        {child.description}
                                                    </p>
                                                )}
                                                <p className="text-xs text-muted-foreground">
                                                    /{child.full_path}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {child.posts_count} direct{' '}
                                                    {child.posts_count === 1
                                                        ? 'post'
                                                        : 'posts'}
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}

                        <section className="space-y-4">
                            <div>
                                <h2 className="text-xl font-semibold">Posts</h2>
                                <p className="text-sm text-muted-foreground">
                                    Direct posts published in this namespace.
                                </p>
                            </div>

                            {posts.length === 0 ? (
                                <p className="text-muted-foreground">
                                    No direct posts in this namespace yet.
                                </p>
                            ) : (
                                <div className="rounded-xl border">
                                    <div className="divide-y">
                                        {posts.map((post) => (
                                            <Link
                                                key={post.id}
                                                href={contentPath.url(
                                                    post.full_path,
                                                )}
                                                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
                                            >
                                                <div className="space-y-1">
                                                    <p className="font-medium">
                                                        {post.title}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        /{post.full_path}
                                                    </p>
                                                </div>
                                                <div className="shrink-0 text-sm text-muted-foreground">
                                                    {post.published_at
                                                        ? new Date(
                                                              post.published_at,
                                                          ).toLocaleDateString()
                                                        : 'Draft'}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    </main>
                </div>
            </div>
        </>
    );
}
