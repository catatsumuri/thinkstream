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
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
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
    Pencil,
    Upload,
    Trash2,
} from 'lucide-react';
import { startTransition, useEffect, useRef, useState } from 'react';
import NamespaceController from '@/actions/App/Http/Controllers/Admin/NamespaceController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
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
import { create as namespaceCreate } from '@/routes/admin/namespaces';
import { index, namespace as namespaceRoute } from '@/routes/admin/posts';

type Namespace = {
    id: number;
    slug: string;
    full_path: string;
    name: string;
    is_published: boolean;
    posts_count: number;
    children: Namespace[];
};

type Sort = {
    column: string;
    direction: 'asc' | 'desc';
};

type RestorePreview = {
    token: string;
    root: {
        name: string;
        slug: string;
        full_path: string;
        status: 'existing' | 'new';
    };
    totals: {
        namespace_count: number;
        existing_namespace_count: number;
        new_namespace_count: number;
        post_count: number;
        existing_post_count: number;
        new_post_count: number;
    };
    namespaces: Array<{
        name: string;
        slug: string;
        full_path: string;
        status: 'existing' | 'new';
        post_count: number;
        existing_post_count: number;
        new_post_count: number;
    }>;
    stream_url: string;
};

type RestoreLog = {
    id: string;
    type: 'info' | 'success' | 'error';
    message: string;
};

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

function RestoreNamespacesDialog({
    restoreUploadUrl,
    restorePreview,
}: {
    restoreUploadUrl: string;
    restorePreview: RestorePreview | null;
}) {
    const [open, setOpen] = useState(false);
    const [logs, setLogs] = useState<RestoreLog[]>([]);
    const [isRestoring, setIsRestoring] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [isDraggingBackup, setIsDraggingBackup] = useState(false);
    const eventSourceRef = useRef<EventSource | null>(null);
    const backupInputRef = useRef<HTMLInputElement | null>(null);
    const dragCounterRef = useRef(0);
    const uploadForm = useForm<{ backup: File | null }>({ backup: null });

    useEffect(() => {
        if (restorePreview) {
            setOpen(true);
            setLogs([]);
            setIsRestoring(false);
            setIsComplete(false);
        }
    }, [restorePreview?.token]);

    useEffect(() => {
        return () => {
            eventSourceRef.current?.close();
        };
    }, []);

    const hasOverwriteTargets =
        (restorePreview?.totals.existing_namespace_count ?? 0) > 0 ||
        (restorePreview?.totals.existing_post_count ?? 0) > 0;

    function clearPreview() {
        router.get(index.url(), undefined, {
            preserveScroll: true,
            replace: true,
        });
    }

    function handleOpenChange(nextOpen: boolean) {
        if (isRestoring) {
            return;
        }

        setOpen(nextOpen);

        if (!nextOpen && restorePreview) {
            clearPreview();
        }
    }

    function uploadBackup() {
        uploadForm.post(restoreUploadUrl, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => uploadForm.reset('backup'),
        });
    }

    function handleBackupFile(file: File | null) {
        if (!file) {
            return;
        }

        const isZipFile =
            file.type === 'application/zip' || file.name.endsWith('.zip');

        if (!isZipFile) {
            return;
        }

        uploadForm.setData('backup', file);

        if (backupInputRef.current) {
            const transfer = new DataTransfer();
            transfer.items.add(file);
            backupInputRef.current.files = transfer.files;
        }
    }

    function handleDragEnter(event: React.DragEvent<HTMLDivElement>) {
        event.preventDefault();
        dragCounterRef.current++;
        setIsDraggingBackup(true);
    }

    function handleDragLeave() {
        dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);

        if (dragCounterRef.current === 0) {
            setIsDraggingBackup(false);
        }
    }

    function handleDrop(event: React.DragEvent<HTMLDivElement>) {
        event.preventDefault();
        dragCounterRef.current = 0;
        setIsDraggingBackup(false);

        handleBackupFile(event.dataTransfer.files[0] ?? null);
    }

    function startRestore() {
        if (!restorePreview || isRestoring) {
            return;
        }

        setLogs([]);
        setIsRestoring(true);
        setIsComplete(false);

        const eventSource = new EventSource(restorePreview.stream_url);
        eventSourceRef.current = eventSource;

        eventSource.addEventListener('update', (event) => {
            if (!(event instanceof MessageEvent)) {
                return;
            }

            if (event.data === '</stream>') {
                eventSource.close();
                eventSourceRef.current = null;
                setIsRestoring(false);
                setIsComplete(true);

                return;
            }

            try {
                const payload = JSON.parse(event.data) as RestoreLog;

                startTransition(() => {
                    setLogs((current) => [...current, payload]);
                });
            } catch {
                startTransition(() => {
                    setLogs((current) => [
                        ...current,
                        {
                            id: crypto.randomUUID(),
                            type: 'error',
                            message: 'Failed to parse restore progress output.',
                        },
                    ]);
                });
            }
        });

        eventSource.onerror = () => {
            eventSource.close();
            eventSourceRef.current = null;
            setIsRestoring(false);
            setIsComplete(true);
            setLogs((current) => [
                ...current,
                {
                    id: crypto.randomUUID(),
                    type: 'error',
                    message: 'The restore stream disconnected unexpectedly.',
                },
            ]);
        };
    }

    const hasErrors = Object.keys(uploadForm.errors).length > 0;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Upload className="size-4" />
                    Restore Zip
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
                <DialogTitle>Restore Namespaces From Zip</DialogTitle>
                <DialogDescription className="space-y-2">
                    <p>
                        Upload a namespace backup zip from the root namespace
                        dashboard.
                    </p>
                    {hasOverwriteTargets ? (
                        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            Existing namespaces and posts matched by backup path
                            will be overwritten by this restore.
                        </div>
                    ) : (
                        <p>
                            Existing namespaces and posts will be overwritten
                            when their backup paths match.
                        </p>
                    )}
                </DialogDescription>

                {restorePreview ? (
                    <div className="space-y-5">
                        <div className="rounded-lg border bg-muted/30 p-4">
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="font-medium">
                                    Root namespace:
                                </span>
                                <span>{restorePreview.root.name}</span>
                                <span className="text-muted-foreground">
                                    /{restorePreview.root.full_path}
                                </span>
                                <span className="rounded-full bg-background px-2 py-0.5 text-xs">
                                    {restorePreview.root.status}
                                </span>
                            </div>
                            <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                                <div>
                                    {restorePreview.totals.namespace_count}{' '}
                                    namespaces
                                </div>
                                <div>
                                    {restorePreview.totals.new_namespace_count}{' '}
                                    new /{' '}
                                    {
                                        restorePreview.totals
                                            .existing_namespace_count
                                    }{' '}
                                    existing
                                </div>
                                <div>
                                    {restorePreview.totals.post_count} posts (
                                    {restorePreview.totals.new_post_count} new /{' '}
                                    {restorePreview.totals.existing_post_count}{' '}
                                    existing)
                                </div>
                            </div>
                        </div>

                        <div className="max-h-56 overflow-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="px-4 py-2 text-left font-medium">
                                            Namespace
                                        </th>
                                        <th className="px-4 py-2 text-left font-medium">
                                            Status
                                        </th>
                                        <th className="px-4 py-2 text-left font-medium">
                                            Posts
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {restorePreview.namespaces.map((item) => (
                                        <tr
                                            key={item.full_path}
                                            className="border-b last:border-0"
                                        >
                                            <td className="px-4 py-2">
                                                <div className="font-medium">
                                                    {item.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    /{item.full_path}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize">
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-muted-foreground">
                                                {item.post_count} total /{' '}
                                                {item.new_post_count} new /{' '}
                                                {item.existing_post_count}{' '}
                                                existing
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="rounded-lg border bg-black p-3 font-mono text-xs text-green-400">
                            {logs.length === 0 ? (
                                <div className="text-muted">
                                    {isRestoring
                                        ? 'Waiting for restore output...'
                                        : 'No restore output yet.'}
                                </div>
                            ) : (
                                <div className="max-h-56 space-y-1 overflow-auto">
                                    {logs.map((log) => (
                                        <div key={log.id}>
                                            [{log.type}] {log.message}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <DialogFooter className="gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setOpen(false);
                                    clearPreview();
                                }}
                                disabled={isRestoring}
                            >
                                {isComplete ? 'Close' : 'Cancel'}
                            </Button>
                            <Button
                                onClick={startRestore}
                                disabled={isRestoring || isComplete}
                            >
                                <Upload className="size-4" />
                                {isRestoring
                                    ? 'Restoring...'
                                    : isComplete
                                      ? 'Restore Complete'
                                      : 'Run Restore'}
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            uploadBackup();
                        }}
                        className="space-y-4"
                    >
                        <div
                            onClick={() => backupInputRef.current?.click()}
                            onDragEnter={handleDragEnter}
                            onDragOver={(event) => event.preventDefault()}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={cn(
                                'cursor-pointer rounded-lg border border-dashed p-8 transition-colors',
                                isDraggingBackup
                                    ? 'border-ring bg-ring/8'
                                    : 'border-input bg-muted/30 hover:border-ring/60 hover:bg-muted/50',
                            )}
                        >
                            <div className="flex flex-col items-center gap-3 text-center">
                                <div
                                    className={cn(
                                        'rounded-full border-2 border-dashed p-4 transition-colors',
                                        isDraggingBackup
                                            ? 'border-ring text-ring'
                                            : 'border-muted-foreground/30 text-muted-foreground',
                                    )}
                                >
                                    <Upload className="size-8" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">
                                        {isDraggingBackup
                                            ? 'Drop zip to upload'
                                            : uploadForm.data.backup
                                              ? uploadForm.data.backup.name
                                              : 'Drop zip here'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {uploadForm.data.backup
                                            ? 'Click or drop another zip to replace the current selection.'
                                            : 'or click to browse for a backup zip'}
                                    </p>
                                </div>
                                <p className="text-xs text-muted-foreground/80">
                                    ZIP archive only
                                </p>
                            </div>
                        </div>
                        <input
                            ref={backupInputRef}
                            type="file"
                            name="backup"
                            accept=".zip,application/zip"
                            className="sr-only"
                            onChange={(event) =>
                                handleBackupFile(
                                    event.currentTarget.files?.[0] ?? null,
                                )
                            }
                        />
                        {uploadForm.progress && (
                            <p className="text-sm text-muted-foreground">
                                Uploading... {uploadForm.progress.percentage}%
                            </p>
                        )}
                        {uploadForm.data.backup && (
                            <button
                                type="button"
                                onClick={() => {
                                    uploadForm.setData('backup', null);

                                    if (backupInputRef.current) {
                                        const transfer = new DataTransfer();
                                        backupInputRef.current.files =
                                            transfer.files;
                                    }
                                }}
                                className="text-xs text-muted-foreground hover:text-destructive"
                            >
                                Clear selection
                            </button>
                        )}
                        {hasErrors && (
                            <InputError message={uploadForm.errors.backup} />
                        )}
                        <DialogFooter className="gap-2">
                            <DialogClose asChild>
                                <Button variant="secondary">Cancel</Button>
                            </DialogClose>
                            <Button
                                type="submit"
                                disabled={
                                    uploadForm.processing ||
                                    uploadForm.data.backup === null
                                }
                            >
                                <Upload className="size-4" />
                                Upload Zip
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
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
    restore_upload_url,
    restore_preview,
}: {
    namespaces: Namespace[];
    sort: Sort;
    restore_upload_url: string;
    restore_preview: RestorePreview | null;
}) {
    const [namespaces, setNamespaces] = useState(initialNamespaces);
    const [reorderMode, setReorderMode] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

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
            <Head title="Namespaces" />

            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Namespaces</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage namespaces and their posts
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <RestoreNamespacesDialog
                            restoreUploadUrl={restore_upload_url}
                            restorePreview={restore_preview}
                        />
                        <Button
                            variant={reorderMode ? 'secondary' : 'outline'}
                            onClick={handleReorderToggle}
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
                        <Button asChild>
                            <Link href={namespaceCreate.url()}>
                                <FolderPlus className="size-4" />
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
                                <FolderPlus className="size-4" />
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
                                        {namespaces.flatMap((ns) => [
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
                                                ? ns.children.map((child) => (
                                                      <ChildRow
                                                          key={child.id}
                                                          namespace={child}
                                                          depth={1}
                                                          expandedIds={
                                                              expandedIds
                                                          }
                                                          onToggle={
                                                              toggleExpand
                                                          }
                                                      />
                                                  ))
                                                : []),
                                        ])}
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
        { title: 'Namespaces', href: index.url() },
    ],
};
