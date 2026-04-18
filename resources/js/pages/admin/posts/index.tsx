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
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    ChevronsUpDown,
    ExternalLink,
    FilePen,
    GripVertical,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import NamespaceController from '@/actions/App/Http/Controllers/Admin/NamespaceController';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';
import { create as namespaceCreate } from '@/routes/admin/namespaces';
import { index, namespace as namespaceRoute } from '@/routes/admin/posts';

type Namespace = {
    id: number;
    slug: string;
    full_path: string;
    name: string;
    is_published: boolean;
    posts_count: number;
};

type Sort = {
    column: string;
    direction: 'asc' | 'desc';
};

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
}: {
    namespace: Namespace;
    isDndActive: boolean;
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
                {isDndActive && (
                    <button
                        {...attributes}
                        {...listeners}
                        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
                    >
                        <GripVertical className="size-4" />
                    </button>
                )}
            </td>
            <td className="px-4 py-3 font-medium">
                <Link
                    href={namespaceRoute.url(namespace.id)}
                    className="text-primary hover:underline"
                >
                    {namespace.name}
                </Link>
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
                        <Link href={NamespaceController.edit.url(namespace.id)}>
                            Edit
                        </Link>
                    </Button>
                    <Form {...NamespaceController.destroy.form(namespace.id)}>
                        {({ processing }) => (
                            <Button
                                type="submit"
                                variant="destructive"
                                size="sm"
                                disabled={processing}
                            >
                                Delete
                            </Button>
                        )}
                    </Form>
                </div>
            </td>
        </tr>
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

        const oldIndex = namespaces.findIndex((ns) => ns.id === active.id);
        const newIndex = namespaces.findIndex((ns) => ns.id === over.id);
        const reordered = arrayMove(namespaces, oldIndex, newIndex);

        setNamespaces(reordered);
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
            <Head title="Posts" />

            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Posts</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage namespaces and their posts
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant={reorderMode ? 'secondary' : 'outline'}
                            onClick={handleReorderToggle}
                        >
                            {reorderMode ? 'Done' : 'Reorder'}
                        </Button>
                        <Button asChild>
                            <Link href={namespaceCreate.url()}>
                                New Namespace
                            </Link>
                        </Button>
                    </div>
                </div>

                {namespaces.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-12 text-center">
                        <p className="text-muted-foreground">
                            No namespaces yet.
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Create a namespace to start adding posts.
                        </p>
                        <Button asChild className="mt-4">
                            <Link href={namespaceCreate.url()}>
                                Create your first namespace
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="rounded-xl border">
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
                                    <SortableContext
                                        items={namespaces.map((ns) => ns.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {namespaces.map((ns) => (
                                            <SortableRow
                                                key={ns.id}
                                                namespace={ns}
                                                isDndActive={reorderMode}
                                            />
                                        ))}
                                    </SortableContext>
                                </tbody>
                            </table>
                        </div>
                    </DndContext>
                )}
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Posts', href: index.url() },
    ],
};
