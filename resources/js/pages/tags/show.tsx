import { Head, Link } from '@inertiajs/react';
import { SimpleIconSvg } from '@/components/markdown-card-group';
import { getSimpleIcon } from '@/lib/simple-icon-lookup';
import { timeAgo } from '@/lib/time';
import { home } from '@/routes';
import { path as contentPath } from '@/routes/posts';

type PostGroup = {
    namespace: {
        name: string;
        full_path: string;
    };
    posts: Array<{
        title: string;
        full_path: string;
        published_at: string;
    }>;
};

export default function TagShow({
    tag,
    groups,
}: {
    tag: string;
    groups: PostGroup[];
}) {
    const githubIcon = getSimpleIcon('github');

    return (
        <>
            <Head title={`Posts tagged "${tag}"`} />

            <div className="min-h-screen bg-background">
                <header className="border-b">
                    <div className="mx-auto flex max-w-7xl items-center px-4 py-6">
                        <Link
                            href={home.url()}
                            className="text-2xl font-bold hover:opacity-80"
                        >
                            ThinkStream
                        </Link>
                    </div>
                </header>

                <div className="mx-auto max-w-3xl px-4 py-10">
                    <div className="mb-8">
                        <p className="mb-1 text-sm text-muted-foreground">
                            Tag
                        </p>
                        <h1 className="text-3xl font-bold">{tag}</h1>
                    </div>

                    {groups.length === 0 ? (
                        <p className="text-muted-foreground">
                            No published posts with this tag.
                        </p>
                    ) : (
                        <div className="space-y-8">
                            {groups.map((group) => (
                                <section key={group.namespace.full_path}>
                                    <Link
                                        href={contentPath.url(
                                            group.namespace.full_path,
                                        )}
                                        className="mb-3 block text-sm font-medium text-muted-foreground hover:text-foreground"
                                    >
                                        {group.namespace.name}
                                    </Link>
                                    <ul className="divide-y rounded-lg border">
                                        {group.posts.map((post) => (
                                            <li key={post.full_path}>
                                                <Link
                                                    href={contentPath.url(
                                                        post.full_path,
                                                    )}
                                                    className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-accent"
                                                >
                                                    <span className="font-medium">
                                                        {post.title}
                                                    </span>
                                                    <span
                                                        className="shrink-0 text-xs text-muted-foreground"
                                                        suppressHydrationWarning
                                                        title={new Date(
                                                            post.published_at,
                                                        ).toLocaleDateString()}
                                                    >
                                                        {timeAgo(
                                                            post.published_at,
                                                        )}
                                                    </span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ))}
                        </div>
                    )}
                </div>

                <footer className="border-t">
                    <div className="mx-auto flex max-w-7xl justify-center px-4 py-6 text-sm text-muted-foreground">
                        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
                            <span>Powered by ThinkStream</span>
                            <a
                                href="https://github.com/catatsumuri/thinkstream"
                                target="_blank"
                                rel="noopener noreferrer"
                                data-test="thinkstream-footer-link"
                                className="inline-flex items-center gap-2 font-medium text-foreground underline underline-offset-4 transition-opacity hover:opacity-70"
                            >
                                {githubIcon && (
                                    <span data-test="thinkstream-footer-icon">
                                        <SimpleIconSvg
                                            icon={githubIcon}
                                            className="size-4"
                                        />
                                    </span>
                                )}
                                github.com/catatsumuri/thinkstream
                            </a>
                        </p>
                    </div>
                </footer>
            </div>
        </>
    );
}
