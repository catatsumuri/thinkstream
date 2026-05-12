import type { DragEndEvent } from '@dnd-kit/core';
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Form } from '@inertiajs/react';
import { Head, Link, router } from '@inertiajs/react';
import {
    Archive,
    ArrowUpDown,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    ChevronsUpDown,
    ExternalLink,
    FilePen,
    Folder,
    FolderPlus,
    GripVertical,
    Inbox,
    Pencil,
    Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import NamespaceController from '@/actions/App/Http/Controllers/Admin/NamespaceController';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { matchesDeleteConfirmation } from '@/lib/delete-confirmation';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { index as backupsIndex } from '@/routes/admin/backups';
import { create as namespaceCreate } from '@/routes/admin/namespaces';
import { index, namespace as namespaceRoute } from '@/routes/admin/posts';

type Namespace = {
    id: number;
    slug: string;
    full_path: string;
    name: string;
    is_published: boolean;
    is_system: boolean;
    posts_count: number;
    children: Namespace[];
};

type Sort = {
    column: string;
    direction: 'asc' | 'desc';
};

type NamespaceSummary = {
    childCount: number;
    draftCount: number;
    publishedCount: number;
    rootCount: number;
    totalCount: number;
    totalPosts: number;
};

function summarizeNamespaces(namespaces: Namespace[]): NamespaceSummary {
    let totalCount = 0;
    let childCount = 0;
    let totalPosts = 0;
    let publishedCount = 0;
    let draftCount = 0;

    function visit(nodes: Namespace[], depth = 0): void {
        nodes.forEach((namespace) => {
            totalCount += 1;
            totalPosts += namespace.posts_count;

            if (depth > 0) {
                childCount += 1;
            }

            if (!namespace.is_system) {
                if (namespace.is_published) {
                    publishedCount += 1;
                } else {
                    draftCount += 1;
                }
            }

            visit(namespace.children, depth + 1);
        });
    }

    visit(namespaces);

    return {
        childCount,
        draftCount,
        publishedCount,
        rootCount: namespaces.length,
        totalCount,
        totalPosts,
    };
}

function sortLabel(sort: Sort): string {
    const columnLabels: Record<string, string> = {
        is_published: 'Status',
        name: 'Name',
        posts_count: 'Post count',
        sort_order: 'Manual order',
    };

    const label = columnLabels[sort.column] ?? sort.column;
    const direction = sort.direction === 'asc' ? 'ascending' : 'descending';

    return `${label}, ${direction}`;
}

function SystemRow({ namespace }: { namespace: Namespace }) {
    return (
        <tr className="border-b bg-violet-50/50 dark:bg-violet-950/10">
            <td className="w-8 px-2 py-3" />
            <td className="px-4 py-3 font-medium">
                <div className="flex items-center gap-1.5">
                    <Inbox className="size-3.5 shrink-0 text-violet-500" />
                    <Link
                        href={namespaceRoute.url(namespace.id)}
                        className="text-primary hover:underline"
                    >
                        {namespace.name}
                    </Link>
                </div>
            </td>
            <td className="px-4 py-3 text-muted-foreground">
                /{namespace.slug}
            </td>
            <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                    <Inbox className="size-3" />
                    System
                </span>
            </td>
            <td className="px-4 py-3 text-muted-foreground">
                {namespace.posts_count}
            </td>
            <td className="px-4 py-3 text-right">
                <Button variant="outline" size="sm" asChild>
                    <Link href={namespaceRoute.url(namespace.id)}>
                        <Folder className="size-4" />
                        Browse
                    </Link>
                </Button>
            </td>
        </tr>
    );
}

function DeleteNamespaceDialog({ namespace }: { namespace: Namespace }) {
    const [confirmation, setConfirmation] = useState('');
    const matches = matchesDeleteConfirmation(confirmation, namespace.name);

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                    <Trash2 className="size-4" />
                    Delete
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>
                    Delete &ldquo;{namespace.name}&rdquo;?
                </DialogTitle>
                <DialogDescription className="space-y-3">
                    <p>
                        This will permanently delete the namespace, all child
                        namespaces, and all their posts. This action cannot be
                        undone.
                    </p>
                    <p>
                        Type{' '}
                        <span className="font-semibold">{namespace.name}</span>{' '}
                        to confirm.
                    </p>
                </DialogDescription>
                <Form action={NamespaceController.destroy(namespace.id)}>
                    {({ processing }) => (
                        <div className="space-y-4">
                            <Input
                                name="confirmation"
                                value={confirmation}
                                onChange={(event) =>
                                    setConfirmation(event.target.value)
                                }
                                autoComplete="off"
                                placeholder={namespace.name}
                            />
                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button
                                        variant="secondary"
                                        onClick={() => setConfirmation('')}
                                    >
                                        Cancel
                                    </Button>
                                </DialogClose>
                                <Button
                                    variant="destructive"
                                    disabled={processing || !matches}
                                    asChild
                                >
                                    <button type="submit">Delete</button>
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function NamespacesHeaderPanel({
    namespaces,
    reorderMode,
    sort,
    onToggleReorder,
}: {
    namespaces: Namespace[];
    reorderMode: boolean;
    sort: Sort;
    onToggleReorder: () => void;
}) {
    const summary = summarizeNamespaces(namespaces);
    const hasNamespaces = namespaces.length > 0;

    const metrics = [
        {
            label: 'Root namespaces',
            value: summary.rootCount.toLocaleString(),
            hint: `${summary.childCount.toLocaleString()} nested`,
        },
        {
            label: 'All namespaces',
            value: summary.totalCount.toLocaleString(),
            hint: `${summary.publishedCount.toLocaleString()} published`,
        },
        {
            label: 'Posts in tree',
            value: summary.totalPosts.toLocaleString(),
            hint: hasNamespaces
                ? 'Across all visible namespaces'
                : 'No content yet',
        },
        {
            label: 'Needs attention',
            value: summary.draftCount.toLocaleString(),
            hint:
                summary.draftCount === 0
                    ? 'All namespaces published'
                    : 'Draft namespaces remaining',
        },
    ];

    return (
        <section className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-gradient-to-br from-amber-50 via-background to-sky-50 p-6 shadow-sm sm:p-7 dark:from-amber-950/20 dark:via-background dark:to-sky-950/20">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-amber-200/30 blur-3xl dark:bg-amber-500/10" />
                <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-sky-200/30 blur-3xl dark:bg-sky-500/10" />
            </div>

            <div className="relative flex flex-col gap-6">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-3xl space-y-4">
                        <div className="inline-flex w-fit items-center rounded-full border border-amber-200/70 bg-background/80 px-3 py-1 text-xs font-medium text-amber-700 shadow-sm dark:border-amber-900/70 dark:text-amber-300">
                            Admin content structure
                        </div>

                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                                    Namespaces
                                </h1>
                                <span
                                    className={cn(
                                        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
                                        reorderMode
                                            ? 'bg-foreground text-background'
                                            : 'bg-background/80 text-muted-foreground ring-1 ring-border/70',
                                    )}
                                >
                                    {reorderMode ? (
                                        <>
                                            <Check className="size-3.5" />
                                            Reorder mode
                                        </>
                                    ) : (
                                        <>
                                            <ArrowUpDown className="size-3.5" />
                                            Sorted by {sortLabel(sort)}
                                        </>
                                    )}
                                </span>
                            </div>

                            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                                Root namespaces, child trees, and publishing
                                state are managed from here. Keep the top-level
                                structure readable, then drill into each
                                namespace for post-level work.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

                    <Card className="w-full max-w-xl gap-0 border-border/70 bg-background/88 py-0 shadow-lg shadow-black/5 backdrop-blur xl:w-[24rem]">
                        <CardContent className="space-y-4 px-5 py-5">
                            <div className="space-y-1">
                                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    Controls
                                </p>
                                <h2 className="text-lg font-semibold">
                                    Primary actions
                                </h2>
                                <p className="text-sm leading-6 text-muted-foreground">
                                    Create a new root namespace, reorder the
                                    current tree, or jump to Backups to restore
                                    a zip archive into the hierarchy.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3">
                                <Button asChild size="lg" className="w-full">
                                    <Link href={namespaceCreate.url()}>
                                        <FolderPlus className="size-4" />
                                        New Namespace
                                    </Link>
                                </Button>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Button
                                        variant={
                                            reorderMode
                                                ? 'secondary'
                                                : 'outline'
                                        }
                                        size="lg"
                                        onClick={onToggleReorder}
                                        className="w-full"
                                    >
                                        {reorderMode ? (
                                            <>
                                                <Check className="size-4" />
                                                Done
                                            </>
                                        ) : (
                                            <>
                                                <ArrowUpDown className="size-4" />
                                                Reorder
                                            </>
                                        )}
                                    </Button>

                                    <Button variant="outline" size="lg" asChild>
                                        <Link href={backupsIndex.url()}>
                                            <Archive className="size-4" />
                                            Backup / Restore
                                        </Link>
                                    </Button>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
                                {reorderMode ? (
                                    <p>
                                        Drag root namespaces to change their top
                                        level order. Child namespaces keep their
                                        local tree under each parent.
                                    </p>
                                ) : hasNamespaces ? (
                                    <p>
                                        Expand a row to inspect child
                                        namespaces. Sorting changes the current
                                        view, while reorder mode returns to the
                                        manual structure.
                                    </p>
                                ) : (
                                    <p>
                                        Start with a single namespace for your
                                        first content area, then branch into
                                        child namespaces as the catalog grows.
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
    );
}

function SortIcon({ column, sort }: { column: string; sort: Sort }) {
    if (sort.column !== column) {
        return <ChevronsUpDown className="ml-1 inline size-3 opacity-40" />;
    }

    return sort.direction === 'asc' ? (
        <ChevronUp className="ml-1 inline size-3" />
    ) : (
        <ChevronDown className="ml-1 inline size-3" />
    );
}

function SortableHeader({
    column,
    label,
    sort,
}: {
    column: string;
    label: string;
    sort: Sort;
}) {
    function handleSort() {
        const direction =
            sort.column === column && sort.direction === 'asc' ? 'desc' : 'asc';
        router.get(
            index.url(),
            { sort: column, dir: direction },
            { preserveScroll: true },
        );
    }

    return (
        <button
            onClick={handleSort}
            className="flex cursor-pointer items-center font-medium hover:text-foreground"
        >
            {label}
            <SortIcon column={column} sort={sort} />
        </button>
    );
}

function SortableRow({
    namespace,
    isDndActive,
    isExpanded,
    onToggle,
}: {
    namespace: Namespace;
    isDndActive: boolean;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: namespace.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <tr ref={setNodeRef} style={style} className="border-b last:border-0">
            <td className="w-8 px-2 py-3">
                {isDndActive ? (
                    <button
                        {...attributes}
                        {...listeners}
                        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
                    >
                        <GripVertical className="size-4" />
                    </button>
                ) : namespace.children.length > 0 ? (
                    <button
                        type="button"
                        onClick={onToggle}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        {isExpanded ? (
                            <ChevronDown className="size-4" />
                        ) : (
                            <ChevronRight className="size-4" />
                        )}
                    </button>
                ) : null}
            </td>
            <td className="px-4 py-3 font-medium">
                <div className="flex items-center gap-1.5">
                    <Folder className="size-3.5 shrink-0 text-muted-foreground" />
                    <Link
                        href={namespaceRoute.url(namespace.id)}
                        className="text-primary hover:underline"
                    >
                        {namespace.name}
                    </Link>
                </div>
            </td>
            <td className="px-4 py-3 text-muted-foreground">
                /{namespace.slug}
            </td>
            <td className="px-4 py-3">
                {namespace.is_published ? (
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
                {namespace.posts_count}
            </td>
            <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <a
                            href={`/${namespace.full_path}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <ExternalLink className="size-4" />
                            View
                        </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                        <Link href={NamespaceController.edit.url(namespace.id)}>
                            <Pencil className="size-4" />
                            Edit
                        </Link>
                    </Button>
                    <DeleteNamespaceDialog namespace={namespace} />
                </div>
            </td>
        </tr>
    );
}

function ChildRow({
    namespace,
    depth,
    expandedIds,
    onToggle,
}: {
    namespace: Namespace;
    depth: number;
    expandedIds: Set<number>;
    onToggle: (id: number) => void;
}) {
    const isExpanded = expandedIds.has(namespace.id);

    return (
        <>
            <tr className="border-b bg-muted/30 last:border-0">
                <td className="w-8 px-2 py-3">
                    {namespace.children.length > 0 && (
                        <button
                            type="button"
                            onClick={() => onToggle(namespace.id)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            {isExpanded ? (
                                <ChevronDown className="size-4" />
                            ) : (
                                <ChevronRight className="size-4" />
                            )}
                        </button>
                    )}
                </td>
                <td
                    className="px-4 py-3 font-medium"
                    style={{ paddingLeft: `${(depth + 1) * 1.5}rem` }}
                >
                    <div className="flex items-center gap-1.5">
                        <Folder className="size-3.5 shrink-0 text-muted-foreground" />
                        <Link
                            href={namespaceRoute.url(namespace.id)}
                            className="text-primary hover:underline"
                        >
                            {namespace.name}
                        </Link>
                    </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                    /{namespace.full_path}
                </td>
                <td className="px-4 py-3">
                    {namespace.is_published ? (
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
                    {namespace.posts_count}
                </td>
                <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                        {namespace.is_published && (
                            <Button variant="outline" size="sm" asChild>
                                <a
                                    href={`/${namespace.full_path}`}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <ExternalLink className="size-4" />
                                    View
                                </a>
                            </Button>
                        )}
                        <Button variant="outline" size="sm" asChild>
                            <Link
                                href={NamespaceController.edit.url(
                                    namespace.id,
                                )}
                            >
                                <Pencil className="size-4" />
                                Edit
                            </Link>
                        </Button>
                        <DeleteNamespaceDialog namespace={namespace} />
                    </div>
                </td>
            </tr>
            {isExpanded &&
                namespace.children.map((child) => (
                    <ChildRow
                        key={child.id}
                        namespace={child}
                        depth={depth + 1}
                        expandedIds={expandedIds}
                        onToggle={onToggle}
                    />
                ))}
        </>
    );
}

export default function Index({
    namespaces: initialNamespaces,
    sort,
}: {
    namespaces: Namespace[];
    sort: Sort;
}) {
    const [namespaces, setNamespaces] = useState(initialNamespaces);
    const [reorderMode, setReorderMode] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

    const systemNamespaces = namespaces.filter((ns) => ns.is_system);
    const regularNamespaces = namespaces.filter((ns) => !ns.is_system);

    function toggleExpand(id: number) {
        setExpandedIds((prev) => {
            const next = new Set(prev);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    }

    useEffect(() => {
        setNamespaces(initialNamespaces);
    }, [initialNamespaces]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        const oldIndex = regularNamespaces.findIndex(
            (ns) => ns.id === active.id,
        );
        const newIndex = regularNamespaces.findIndex((ns) => ns.id === over.id);
        const reordered = arrayMove(regularNamespaces, oldIndex, newIndex);

        setNamespaces([...systemNamespaces, ...reordered]);
        router.patch(
            NamespaceController.reorder.url(),
            { ids: reordered.map((ns) => ns.id) },
            { preserveScroll: true },
        );
    }

    function handleReorderToggle() {
        if (reorderMode) {
            setReorderMode(false);

            return;
        }

        if (sort.column !== 'sort_order' || sort.direction !== 'asc') {
            router.get(index.url(), undefined, {
                preserveScroll: true,
                replace: true,
                onSuccess: () => setReorderMode(true),
            });

            return;
        }

        setReorderMode(true);
    }

    return (
        <>
            <Head title="Namespaces" />

            <div className="space-y-6 p-4">
                <NamespacesHeaderPanel
                    namespaces={namespaces}
                    reorderMode={reorderMode}
                    sort={sort}
                    onToggleReorder={handleReorderToggle}
                />

                {namespaces.length === 0 ? (
                    <Card className="border-dashed py-0 shadow-none">
                        <CardContent className="flex flex-col items-center px-6 py-14 text-center">
                            <div className="rounded-full border bg-muted/60 p-4">
                                <FolderPlus className="size-6 text-muted-foreground" />
                            </div>
                            <h2 className="mt-5 text-xl font-semibold">
                                No namespaces yet
                            </h2>
                            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                                Create a root namespace to define your first
                                content area, then branch into child namespaces
                                when the structure becomes deeper.
                            </p>
                            <Button asChild className="mt-6">
                                <Link href={namespaceCreate.url()}>
                                    <FolderPlus className="size-4" />
                                    Create your first namespace
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <Card className="gap-0 py-0 shadow-sm">
                            <div className="flex flex-col gap-2 border-b px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold">
                                        Namespace tree
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        {reorderMode
                                            ? 'Drag and drop root namespaces to set the manual order.'
                                            : 'Browse the top-level structure, expand children, and open a namespace for deeper editing.'}
                                    </p>
                                </div>
                                <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                                    {reorderMode
                                        ? 'Manual ordering active'
                                        : `Current sort: ${sortLabel(sort)}`}
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="w-8 px-2 py-3" />
                                            <th className="px-4 py-3 text-left">
                                                {reorderMode ? (
                                                    <span className="font-medium">
                                                        Namespace
                                                    </span>
                                                ) : (
                                                    <SortableHeader
                                                        column="name"
                                                        label="Namespace"
                                                        sort={sort}
                                                    />
                                                )}
                                            </th>
                                            <th className="px-4 py-3 text-left font-medium">
                                                Slug
                                            </th>
                                            <th className="px-4 py-3 text-left">
                                                {reorderMode ? (
                                                    <span className="font-medium">
                                                        Status
                                                    </span>
                                                ) : (
                                                    <SortableHeader
                                                        column="is_published"
                                                        label="Status"
                                                        sort={sort}
                                                    />
                                                )}
                                            </th>
                                            <th className="px-4 py-3 text-left">
                                                {reorderMode ? (
                                                    <span className="font-medium">
                                                        Posts
                                                    </span>
                                                ) : (
                                                    <SortableHeader
                                                        column="posts_count"
                                                        label="Posts"
                                                        sort={sort}
                                                    />
                                                )}
                                            </th>
                                            <th className="px-4 py-3 text-right font-medium">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {systemNamespaces.map((ns) => (
                                            <SystemRow
                                                key={ns.id}
                                                namespace={ns}
                                            />
                                        ))}
                                        <SortableContext
                                            items={regularNamespaces.map(
                                                (ns) => ns.id,
                                            )}
                                            strategy={
                                                verticalListSortingStrategy
                                            }
                                        >
                                            {regularNamespaces.flatMap((ns) => [
                                                <SortableRow
                                                    key={ns.id}
                                                    namespace={ns}
                                                    isDndActive={reorderMode}
                                                    isExpanded={expandedIds.has(
                                                        ns.id,
                                                    )}
                                                    onToggle={() =>
                                                        toggleExpand(ns.id)
                                                    }
                                                />,
                                                ...(!reorderMode &&
                                                expandedIds.has(ns.id)
                                                    ? ns.children.map(
                                                          (child) => (
                                                              <ChildRow
                                                                  key={child.id}
                                                                  namespace={
                                                                      child
                                                                  }
                                                                  depth={1}
                                                                  expandedIds={
                                                                      expandedIds
                                                                  }
                                                                  onToggle={
                                                                      toggleExpand
                                                                  }
                                                              />
                                                          ),
                                                      )
                                                    : []),
                                            ])}
                                        </SortableContext>
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </DndContext>
                )}
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Namespaces', href: index.url() },
    ],
};
