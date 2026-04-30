import { Head, Link } from '@inertiajs/react';
import {
    BarChart3,
    Clock,
    ExternalLink,
    Eye,
    FileText,
    Globe,
    Tag,
} from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { dashboard } from '@/routes';
import { show as tagShow } from '@/routes/tags';

type RecentPost = {
    id: number;
    title: string;
    full_path: string;
    page_views: number;
    updated_at: string;
    canonical_url: string | null;
    admin_url: string;
};

type TopPost = {
    id: number;
    title: string;
    slug: string;
    full_path: string;
    page_views: number;
    canonical_url: string | null;
    admin_url: string;
};

type TopReferrer = {
    host: string;
    post_count: number;
    total_views: number;
};

type TagStat = {
    id: number;
    name: string;
    posts_count: number;
};

function formatRelativeTime(isoString: string): string {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);

    if (days < 30) {
        return `${days}d ago`;
    }

    return new Date(isoString).toLocaleDateString();
}

export default function Dashboard({
    recent_posts,
    top_posts,
    top_referrers,
    tags,
}: {
    recent_posts: RecentPost[];
    top_posts: TopPost[];
    top_referrers: TopReferrer[];
    tags: TagStat[];
}) {
    const totalViews = top_posts.reduce(
        (sum, post) => sum + post.page_views,
        0,
    );

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                    <Card className="border-sky-200/80 bg-linear-to-br from-sky-50 via-white to-cyan-50 shadow-none dark:border-sky-900/60 dark:from-sky-950/40 dark:via-background dark:to-cyan-950/30">
                        <CardHeader>
                            <CardDescription>Page Views</CardDescription>
                            <CardTitle className="text-3xl">
                                {totalViews.toLocaleString()}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
                            <div className="rounded-lg bg-sky-100 p-2 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                                <BarChart3 className="size-4" />
                            </div>
                            Current top 10 posts by tracked canonical views.
                        </CardContent>
                    </Card>

                    <Card className="min-w-0 overflow-hidden shadow-none">
                        <Tabs defaultValue="recent">
                            <CardHeader>
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <CardDescription>
                                            Analytics
                                        </CardDescription>
                                        <CardTitle>Top 10</CardTitle>
                                    </div>
                                    <TabsList>
                                        <TabsTrigger value="recent">
                                            <Clock />
                                            Recent
                                        </TabsTrigger>
                                        <TabsTrigger value="pv">
                                            <Eye />
                                            PV
                                        </TabsTrigger>
                                        <TabsTrigger value="referrers">
                                            <Globe />
                                            Referrers
                                        </TabsTrigger>
                                    </TabsList>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <TabsContent value="recent">
                                    {recent_posts.length === 0 ? (
                                        <div className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
                                            No posts yet.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {recent_posts.map((post) => (
                                                <div
                                                    key={post.id}
                                                    className="flex flex-col gap-3 rounded-xl border px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                                                >
                                                    <div className="flex min-w-0 items-start gap-4">
                                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                                            <Clock className="size-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <Link
                                                                href={
                                                                    post.admin_url
                                                                }
                                                                className="inline-flex max-w-full items-center gap-2 overflow-hidden font-medium hover:underline"
                                                            >
                                                                <FileText className="size-4 shrink-0 text-muted-foreground" />
                                                                <span className="truncate">
                                                                    {post.title}
                                                                </span>
                                                            </Link>
                                                            <p className="mt-1 truncate text-sm text-muted-foreground">
                                                                /
                                                                {post.full_path}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                                                        {post.page_views >
                                                            0 && (
                                                            <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm font-medium">
                                                                <Eye className="size-4 text-muted-foreground" />
                                                                {post.page_views.toLocaleString()}
                                                            </div>
                                                        )}
                                                        <span className="shrink-0 text-sm text-muted-foreground">
                                                            {formatRelativeTime(
                                                                post.updated_at,
                                                            )}
                                                        </span>
                                                        {post.canonical_url ? (
                                                            <Link
                                                                href={
                                                                    post.canonical_url
                                                                }
                                                                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                                                            >
                                                                <ExternalLink className="size-4" />
                                                            </Link>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="pv">
                                    {top_posts.length === 0 ? (
                                        <div className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
                                            No tracked page views yet.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {top_posts.map((post, index) => (
                                                <div
                                                    key={post.id}
                                                    className="flex flex-col gap-3 rounded-xl border px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                                                >
                                                    <div className="flex min-w-0 items-start gap-4">
                                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                                                            {index + 1}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <Link
                                                                href={
                                                                    post.admin_url
                                                                }
                                                                className="inline-flex max-w-full items-center gap-2 overflow-hidden font-medium hover:underline"
                                                            >
                                                                <FileText className="size-4 shrink-0 text-muted-foreground" />
                                                                <span className="truncate">
                                                                    {post.title}
                                                                </span>
                                                            </Link>
                                                            <p className="mt-1 truncate text-sm text-muted-foreground">
                                                                /
                                                                {post.full_path}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                                                        <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm font-medium">
                                                            <Eye className="size-4 text-muted-foreground" />
                                                            {post.page_views.toLocaleString()}
                                                        </div>
                                                        {post.canonical_url ? (
                                                            <Link
                                                                href={
                                                                    post.canonical_url
                                                                }
                                                                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                                                            >
                                                                Canonical
                                                                <ExternalLink className="size-4" />
                                                            </Link>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="referrers">
                                    {top_referrers.length === 0 ? (
                                        <div className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
                                            No referrer data yet.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {top_referrers.map((referrer) => (
                                                <div
                                                    key={referrer.host}
                                                    className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3"
                                                >
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                                                            <Globe className="size-4" />
                                                        </div>
                                                        <span className="truncate text-sm font-medium">
                                                            {referrer.host}
                                                        </span>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-3">
                                                        <span className="text-xs text-muted-foreground">
                                                            {
                                                                referrer.post_count
                                                            }{' '}
                                                            {referrer.post_count ===
                                                            1
                                                                ? 'post'
                                                                : 'posts'}
                                                        </span>
                                                        <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm font-medium">
                                                            <Eye className="size-4 text-muted-foreground" />
                                                            {referrer.total_views.toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>
                            </CardContent>
                        </Tabs>
                    </Card>
                </div>

                {tags.length > 0 && (
                    <Card className="shadow-none">
                        <CardHeader>
                            <CardDescription>Tags</CardDescription>
                            <CardTitle>All Tags</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag) => (
                                    <Link
                                        key={tag.id}
                                        href={tagShow(tag.name).url}
                                        className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1.5 text-sm transition-colors hover:bg-muted"
                                    >
                                        <Tag className="size-3 shrink-0 text-muted-foreground" />
                                        <span className="font-medium">
                                            {tag.name}
                                        </span>
                                        <span className="rounded-full bg-background px-1.5 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
                                            {tag.posts_count}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
