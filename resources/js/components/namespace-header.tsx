import { Link } from '@inertiajs/react';
import {
    ArrowRightLeft,
    CheckCircle2,
    FilePen,
    FolderOpen,
    FolderPlus,
    Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ViewContextBadge from '@/components/view-context-badge';
import { useCurrentUrl } from '@/hooks/use-current-url';
import {
    create as namespaceCreate,
    edit as editNamespace,
} from '@/routes/admin/namespaces';
import { namespace as namespaceRoute } from '@/routes/admin/posts';

type Namespace = {
    id: number;
    slug: string;
    full_path: string;
    name: string;
    is_published: boolean;
};

export default function NamespaceHeader({
    namespace,
}: {
    namespace: Namespace;
}) {
    const { currentUrl } = useCurrentUrl();
    const childNamespaceCreateUrl = `${namespaceCreate.url()}?${new URLSearchParams({ parent: String(namespace.id) }).toString()}`;
    const siteUrl = `/${namespace.full_path}`;

    return (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-5 dark:border-amber-900/80 dark:bg-amber-950/20">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold tracking-wider text-amber-700 uppercase dark:text-amber-300">
                        Manage Namespace
                    </p>
                    <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h1 className="flex items-center gap-2 text-2xl font-semibold">
                            <FolderOpen className="size-5 shrink-0 text-amber-700 dark:text-amber-300" />
                            <Link
                                href={namespaceRoute.url(namespace.id)}
                                className="hover:underline"
                            >
                                {namespace.name}
                            </Link>
                        </h1>
                        <div className="flex items-center gap-2">
                            <p className="text-sm text-amber-800/70 dark:text-amber-200/70">
                                /{namespace.full_path}
                            </p>
                        </div>
                    </div>
                    <div className="mt-2">
                        {namespace.is_published ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                <CheckCircle2 className="size-3" />
                                Published
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                <FilePen className="size-3" />
                                Draft
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link href={siteUrl}>
                                <ArrowRightLeft className="size-4" />
                                View Site
                            </Link>
                        </Button>
                        <ViewContextBadge label="Admin View" variant="admin" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link
                                href={editNamespace.url(namespace.id, {
                                    query: { return_to: currentUrl },
                                })}
                            >
                                <Pencil className="size-4" />
                                Edit
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={childNamespaceCreateUrl}>
                                <FolderPlus className="size-4" />
                                New Child Namespace
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
