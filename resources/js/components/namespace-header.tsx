import { Link } from '@inertiajs/react';
import {
    ArrowRightLeft,
    Archive,
    CheckCircle2,
    ChevronDown,
    FilePen,
    FolderOpen,
    FolderPlus,
    Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ViewContextBadge from '@/components/view-context-badge';
import { cn } from '@/lib/utils';
import {
    create as namespaceCreate,
    edit as editNamespace,
} from '@/routes/admin/namespaces';
import {
    create as createPost,
    namespace as namespaceRoute,
} from '@/routes/admin/posts';

type Namespace = {
    id: number;
    slug: string;
    full_path: string;
    name: string;
    description?: string | null;
    cover_image_url?: string | null;
    backup_count?: number;
    backup_management_url?: string | null;
    is_published: boolean;
};

export default function NamespaceHeader({
    namespace,
    childNamespacesCount,
    postsCount,
    namespacesReorderMode = false,
    postsReorderMode = false,
}: {
    namespace: Namespace;
    childNamespacesCount: number;
    postsCount: number;
    namespacesReorderMode?: boolean;
    postsReorderMode?: boolean;
}) {
    const childNamespaceCreateUrl = `${namespaceCreate.url()}?${new URLSearchParams({ parent: String(namespace.id) }).toString()}`;
    const siteUrl = `/${namespace.full_path}`;
    const statusLabel = namespace.is_published ? 'Published' : 'Draft';
    const activeModes = [
        namespacesReorderMode ? 'Child namespace reorder active' : null,
        postsReorderMode ? 'Post reorder active' : null,
    ].filter(Boolean);

    const metrics = [
        {
            label: 'Child namespaces',
            value: childNamespacesCount.toLocaleString(),
            hint:
                childNamespacesCount === 0
                    ? 'No nested namespaces yet'
                    : 'Nested beneath this namespace',
        },
        {
            label: 'Posts',
            value: postsCount.toLocaleString(),
            hint:
                postsCount === 0
                    ? 'No posts in this namespace yet'
                    : 'Managed from the post table below',
        },
        {
            label: 'Backups',
            value: (namespace.backup_count ?? 0).toLocaleString(),
            hint: namespace.backup_management_url
                ? 'Backup management available'
                : 'No backups available yet',
        },
    ];

    return (
        <section className="relative overflow-hidden rounded-[1.75rem] border border-amber-200/70 bg-gradient-to-br from-amber-50 via-background to-orange-50 p-6 shadow-sm sm:p-7 dark:border-amber-900/70 dark:from-amber-950/20 dark:via-background dark:to-orange-950/10">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-amber-200/35 blur-3xl dark:bg-amber-500/10" />
                <div className="absolute bottom-0 left-0 h-36 w-36 rounded-full bg-orange-200/25 blur-3xl dark:bg-orange-500/10" />
            </div>

            <div className="relative flex flex-col gap-6">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-3xl min-w-0 space-y-4">
                        <div className="inline-flex w-fit items-center rounded-full border border-amber-200/70 bg-background/80 px-3 py-1 text-xs font-medium text-amber-700 shadow-sm dark:border-amber-900/70 dark:text-amber-300">
                            Manage Namespace
                        </div>

                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                            {namespace.cover_image_url && (
                                <div className="shrink-0">
                                    <img
                                        data-test="manage-namespace-cover-image"
                                        src={namespace.cover_image_url}
                                        alt={`${namespace.name} cover`}
                                        className="h-24 w-36 rounded-2xl border border-amber-200/80 object-cover shadow-sm dark:border-amber-900/80"
                                    />
                                </div>
                            )}

                            <div className="min-w-0 flex-1 space-y-3">
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h1 className="flex min-w-0 items-center gap-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                                            <FolderOpen className="size-6 shrink-0 text-amber-700 dark:text-amber-300" />
                                            <Link
                                                href={namespaceRoute.url(
                                                    namespace.id,
                                                )}
                                                className="truncate hover:underline"
                                            >
                                                {namespace.name}
                                            </Link>
                                        </h1>

                                        <span
                                            className={cn(
                                                'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
                                                namespace.is_published
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-muted text-muted-foreground',
                                            )}
                                        >
                                            {namespace.is_published ? (
                                                <CheckCircle2 className="size-3.5" />
                                            ) : (
                                                <FilePen className="size-3.5" />
                                            )}
                                            {statusLabel}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 text-sm text-amber-900/70 dark:text-amber-100/70">
                                        <span className="rounded-full bg-background/80 px-3 py-1 ring-1 ring-border/60">
                                            /{namespace.full_path}
                                        </span>
                                        <ViewContextBadge
                                            label="Admin View"
                                            variant="admin"
                                        />
                                    </div>
                                </div>

                                {namespace.description ? (
                                    <p className="max-w-2xl text-sm leading-6 whitespace-pre-line text-amber-950/80 dark:text-amber-100/80">
                                        {namespace.description}
                                    </p>
                                ) : (
                                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                                        This namespace groups related posts and
                                        nested namespaces. Use the controls on
                                        the right to expand the structure or
                                        update its metadata.
                                    </p>
                                )}

                                {activeModes.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {activeModes.map((mode) => (
                                            <span
                                                key={mode}
                                                className="inline-flex items-center rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background"
                                            >
                                                {mode}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            {metrics.map((metric) => (
                                <Card
                                    key={metric.label}
                                    className="gap-0 border-border/60 bg-background/80 py-0 shadow-none backdrop-blur"
                                >
                                    <CardContent className="space-y-1 px-4 py-4">
                                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                            {metric.label}
                                        </p>
                                        <p className="text-2xl font-semibold tracking-tight">
                                            {metric.value}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {metric.hint}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    <Card className="w-full max-w-xl gap-0 border-border/70 bg-background/88 py-0 shadow-lg shadow-black/5 backdrop-blur xl:w-[23rem]">
                        <CardContent className="space-y-4 px-5 py-5">
                            <div className="space-y-1">
                                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    Controls
                                </p>
                                <h2 className="text-lg font-semibold">
                                    Namespace actions
                                </h2>
                                <p className="text-sm leading-6 text-muted-foreground">
                                    Open the public page, create content inside
                                    this namespace, or update its settings and
                                    backups.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3">
                                <Button asChild size="lg" className="w-full">
                                    <Link href={siteUrl}>
                                        <ArrowRightLeft className="size-4" />
                                        View Site
                                    </Link>
                                </Button>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                size="lg"
                                                className="w-full"
                                            >
                                                <FilePen className="size-4" />
                                                Create
                                                <ChevronDown className="size-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            align="end"
                                            className="w-56"
                                        >
                                            <DropdownMenuItem asChild>
                                                <Link
                                                    href={createPost.url(
                                                        namespace.id,
                                                    )}
                                                >
                                                    <FilePen className="size-4" />
                                                    Post
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link
                                                    href={
                                                        childNamespaceCreateUrl
                                                    }
                                                >
                                                    <FolderPlus className="size-4" />
                                                    Child Namespace
                                                </Link>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    <Button
                                        variant="outline"
                                        size="lg"
                                        className="w-full"
                                        asChild
                                    >
                                        <Link
                                            href={editNamespace.url(
                                                namespace.id,
                                            )}
                                        >
                                            <Pencil className="size-4" />
                                            Edit Namespace
                                        </Link>
                                    </Button>
                                </div>
                            </div>

                            {namespace.backup_management_url ? (
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    asChild
                                >
                                    <Link
                                        href={namespace.backup_management_url}
                                        data-test="manage-namespace-backups-link"
                                    >
                                        <Archive className="size-4" />
                                        {namespace.backup_count ?? 0} backups
                                        <span className="text-muted-foreground">
                                            · Backup Management
                                        </span>
                                    </Link>
                                </Button>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
                                    No backups yet. Once backups exist,
                                    management links will appear here.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
    );
}
