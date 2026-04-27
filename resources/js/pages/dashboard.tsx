import { Head, Link } from '@inertiajs/react';
import { BarChart3, ExternalLink, Eye, FileText, Globe } from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { dashboard } from '@/routes';

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

export default function Dashboard({
    top_posts,
    top_referrers,
}: {
    top_posts: TopPost[];
    top_referrers: TopReferrer[];
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

                    <Card className="shadow-none">
                        <Tabs defaultValue="posts">
                            <CardHeader>
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <CardDescription>
                                            Analytics
                                        </CardDescription>
                                        <CardTitle>Top 10</CardTitle>
                                    </div>
                                    <TabsList>
                                        <TabsTrigger value="posts">
                                            <FileText />
                                            Posts
                                        </TabsTrigger>
                                        <TabsTrigger value="referrers">
                                            <Globe />
                                            Referrers
                                        </TabsTrigger>
                                    </TabsList>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <TabsContent value="posts">
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
                                                                className="inline-flex items-center gap-2 font-medium hover:underline"
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
