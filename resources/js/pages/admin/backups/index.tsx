import {
    Form,
    Head,
    Link,
    router,
    setLayoutProps,
    useForm,
    usePage,
} from '@inertiajs/react';
import {
    Archive,
    Download,
    FolderOpen,
    RotateCcw,
    Trash2,
    Upload,
} from 'lucide-react';
import { startTransition, useEffect, useId, useRef, useState } from 'react';
import CreateBackupDialog from '@/components/create-backup-dialog';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { matchesDeleteConfirmation } from '@/lib/delete-confirmation';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { index as backupsIndex } from '@/routes/admin/backups';

type NamespaceSummary = {
    id: number;
    parent_id: number | null;
    name: string;
    slug: string;
    full_path: string;
    backup_count: number;
    create_backup_url: string;
    management_url: string;
    namespace_url: string;
};

type BackupRecord = {
    key: string;
    filename: string;
    label: string;
    description: string | null;
    created_at: string;
    size_bytes: number;
    size_human: string;
    download_url: string;
    restore_url: string;
    namespace: {
        id: number | null;
        name: string | null;
        slug: string | null;
        full_path: string | null;
        management_url: string | null;
        namespace_url: string | null;
    };
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

function BackupDescriptionCell({
    description,
}: {
    description: string | null;
}) {
    if (!description) {
        return (
            <div className="rounded-lg border border-dashed border-border/80 bg-muted/35 px-3 py-2 text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                No note
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-amber-200/70 bg-amber-50/70 px-3 py-2 text-sm leading-6 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/25 dark:text-amber-100">
            {description}
        </div>
    );
}

function RestoreBackupDialog({ backup }: { backup: BackupRecord }) {
    const [confirmation, setConfirmation] = useState('');
    const matches = matchesDeleteConfirmation(confirmation, backup.label);

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <RotateCcw className="size-4" />
                    Restore
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>
                    Restore backup &ldquo;{backup.filename}&rdquo;?
                </DialogTitle>
                <DialogDescription className="space-y-3">
                    <p>
                        This will overwrite content in{' '}
                        <span className="font-semibold">{backup.label}</span>{' '}
                        using the selected backup.
                    </p>
                    {backup.description && (
                        <p>
                            Backup note:{' '}
                            <span className="font-medium">
                                {backup.description}
                            </span>
                        </p>
                    )}
                    <p>
                        Type{' '}
                        <span className="font-semibold">{backup.label}</span> to
                        confirm.
                    </p>
                </DialogDescription>
                <Form action={backup.restore_url} method="post">
                    {({ processing, errors }) => (
                        <div className="space-y-4">
                            <Input
                                name="confirmation"
                                value={confirmation}
                                onChange={(event) =>
                                    setConfirmation(event.target.value)
                                }
                                autoComplete="off"
                                placeholder={backup.label}
                            />
                            {errors.confirmation && (
                                <p className="text-sm text-destructive">
                                    {errors.confirmation}
                                </p>
                            )}
                            {errors.backup && (
                                <p className="text-sm text-destructive">
                                    {errors.backup}
                                </p>
                            )}
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
                                    <button type="submit">
                                        Restore Backup
                                    </button>
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function RestorePreviewPanel({
    restorePreview,
    hasOverwriteTargets,
    clearPreview,
}: {
    restorePreview: RestorePreview;
    hasOverwriteTargets: boolean;
    clearPreview: () => void;
}) {
    const [logs, setLogs] = useState<RestoreLog[]>([]);
    const [isRestoring, setIsRestoring] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        return () => {
            eventSourceRef.current?.close();
        };
    }, []);

    function startRestore() {
        if (isRestoring) {
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

    return (
        <div className="space-y-5">
            <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">Root namespace:</span>
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
                        {restorePreview.totals.namespace_count} namespaces
                    </div>
                    <div>
                        {restorePreview.totals.new_namespace_count} new /{' '}
                        {restorePreview.totals.existing_namespace_count}{' '}
                        existing
                    </div>
                    <div>
                        {restorePreview.totals.post_count} posts (
                        {restorePreview.totals.new_post_count} new /{' '}
                        {restorePreview.totals.existing_post_count} existing)
                    </div>
                </div>
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
                                    {item.existing_post_count} existing
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <DialogDescription className="space-y-2">
                {hasOverwriteTargets ? (
                    <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        Existing namespaces and posts matched by backup path
                        will be overwritten by this restore.
                    </div>
                ) : (
                    <p>
                        Existing namespaces and posts will be overwritten when
                        their backup paths match.
                    </p>
                )}
            </DialogDescription>

            <DialogFooter className="gap-2">
                <Button
                    variant="secondary"
                    onClick={clearPreview}
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
    );
}

function RestoreNamespacesDialog({
    restoreUploadUrl,
    restorePreview,
}: {
    restoreUploadUrl: string;
    restorePreview: RestorePreview | null;
}) {
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [isDraggingBackup, setIsDraggingBackup] = useState(false);
    const backupInputRef = useRef<HTMLInputElement | null>(null);
    const dragCounterRef = useRef(0);
    const uploadForm = useForm<{ backup: File | null }>({ backup: null });

    const hasOverwriteTargets =
        (restorePreview?.totals.existing_namespace_count ?? 0) > 0 ||
        (restorePreview?.totals.existing_post_count ?? 0) > 0;
    const open = restorePreview !== null || isUploadDialogOpen;

    function clearPreview() {
        router.get(backupsIndex.url(), undefined, {
            preserveScroll: true,
            replace: true,
        });
    }

    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen && restorePreview) {
            clearPreview();

            return;
        }

        setIsUploadDialogOpen(nextOpen);
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

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Upload className="size-4" />
                    Restore ZIP
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
                <DialogTitle>Restore Namespaces From ZIP</DialogTitle>
                <DialogDescription className="space-y-2">
                    <p>
                        Upload a namespace backup zip from the backups
                        dashboard.
                    </p>
                </DialogDescription>

                {restorePreview ? (
                    <RestorePreviewPanel
                        key={restorePreview.token}
                        restorePreview={restorePreview}
                        hasOverwriteTargets={hasOverwriteTargets}
                        clearPreview={clearPreview}
                    />
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
                        {uploadForm.errors.backup && (
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
                                Upload ZIP
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default function AdminBackupsIndex({
    namespaces,
    backups,
    create_backups_url,
    delete_backups_url,
    restore_backups_url,
    restore_upload_url,
    restore_preview,
}: {
    namespaces: NamespaceSummary[];
    backups: BackupRecord[];
    create_backups_url: string;
    delete_backups_url: string;
    restore_backups_url: string;
    restore_upload_url: string;
    restore_preview: RestorePreview | null;
}) {
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
    const [restoreConfirmation, setRestoreConfirmation] = useState('');
    const [selectedNamespaceIds, setSelectedNamespaceIds] = useState<number[]>(
        [],
    );
    const [isCreateManyDialogOpen, setIsCreateManyDialogOpen] = useState(false);
    const [createManyDescription, setCreateManyDescription] = useState('');
    const createDescriptionId = useId();
    const { errors } = usePage<{ errors?: Record<string, string> }>().props;

    setLayoutProps({
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'Backups', href: backupsIndex.url() },
        ],
    });

    const rootNamespaces = namespaces.filter((n) => n.parent_id === null);
    const allSelected =
        backups.length > 0 && selectedKeys.length === backups.length;
    const allNamespacesSelected =
        rootNamespaces.length > 0 &&
        selectedNamespaceIds.length === rootNamespaces.length;
    const namespacesWithBackups = namespaces.filter(
        (namespace) => namespace.backup_count > 0,
    ).length;
    const canRestoreSelected = restoreConfirmation === 'RESTORE';
    const fallbackTab =
        restore_preview ||
        errors?.keys ||
        errors?.backup ||
        errors?.confirmation
            ? 'restore'
            : 'create';
    const [activeTab, setActiveTab] = useState(fallbackTab);

    function toggleKey(key: string, checked: boolean) {
        setSelectedKeys((current) =>
            checked
                ? [...current, key]
                : current.filter((value) => value !== key),
        );
    }

    function toggleAll(checked: boolean) {
        setSelectedKeys(checked ? backups.map((backup) => backup.key) : []);
    }

    function toggleNamespaceId(id: number, checked: boolean) {
        setSelectedNamespaceIds((current) =>
            checked ? [...current, id] : current.filter((v) => v !== id),
        );
    }

    function toggleAllNamespaces(checked: boolean) {
        setSelectedNamespaceIds(checked ? rootNamespaces.map((n) => n.id) : []);
    }

    return (
        <>
            <Head title="Backups" />

            <div className="space-y-6 p-4">
                <section className="rounded-xl border p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-amber-100 p-2 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                <Archive className="size-5" />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-2xl font-semibold">
                                    Backups
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    Manage backup archives across all
                                    namespaces.
                                </p>
                            </div>
                        </div>

                        <div className="grid min-w-60 gap-2 text-sm text-muted-foreground">
                            <div>{backups.length} backups total</div>
                            <div>
                                {namespacesWithBackups} namespaces with backups
                            </div>
                            <div>{namespaces.length} namespaces managed</div>
                        </div>
                    </div>
                </section>

                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="rounded-xl border p-0"
                    data-test="admin-backups-tabs"
                >
                    <div className="border-b p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    Backup Actions
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Switch between creating backups and
                                    restoring existing archives.
                                </p>
                            </div>

                            <TabsList variant="line">
                                <TabsTrigger
                                    value="create"
                                    data-test="admin-backups-tab-create"
                                >
                                    <Archive className="size-4" />
                                    Create
                                </TabsTrigger>
                                <TabsTrigger
                                    value="restore"
                                    data-test="admin-backups-tab-restore"
                                >
                                    <RotateCcw className="size-4" />
                                    Restore
                                </TabsTrigger>
                            </TabsList>
                        </div>
                    </div>

                    <TabsContent
                        value="create"
                        className="m-0"
                        data-test="admin-backups-panel-create"
                    >
                        <div className="flex items-center justify-between gap-3 border-b p-4">
                            <div className="flex items-center gap-3">
                                <Checkbox
                                    checked={allNamespacesSelected}
                                    onCheckedChange={(checked) =>
                                        toggleAllNamespaces(Boolean(checked))
                                    }
                                    aria-label="Select all namespaces"
                                />
                                <span className="text-sm text-muted-foreground">
                                    {selectedNamespaceIds.length > 0
                                        ? `${selectedNamespaceIds.length} of ${rootNamespaces.length} root namespaces selected`
                                        : 'Select root namespaces'}
                                </span>
                            </div>

                            <Dialog
                                open={isCreateManyDialogOpen}
                                onOpenChange={setIsCreateManyDialogOpen}
                            >
                                <DialogTrigger asChild>
                                    <Button
                                        size="sm"
                                        disabled={
                                            selectedNamespaceIds.length === 0
                                        }
                                        data-test="create-backup-for-selected-trigger"
                                    >
                                        <Archive className="size-4" />
                                        Create Backup for Selected
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogTitle>
                                        Create backups for{' '}
                                        {selectedNamespaceIds.length} namespace
                                        {selectedNamespaceIds.length === 1
                                            ? ''
                                            : 's'}
                                        ?
                                    </DialogTitle>
                                    <DialogDescription className="space-y-3">
                                        <p>
                                            A backup archive will be created for
                                            each selected namespace.
                                        </p>
                                        <p>
                                            Add an optional note to help
                                            identify these archives later.
                                        </p>
                                    </DialogDescription>
                                    <Form
                                        action={create_backups_url}
                                        method="post"
                                        onSuccess={() => {
                                            setIsCreateManyDialogOpen(false);
                                            setSelectedNamespaceIds([]);
                                            setCreateManyDescription('');
                                        }}
                                    >
                                        {({ processing, errors }) => (
                                            <div className="space-y-4">
                                                {selectedNamespaceIds.map(
                                                    (id) => (
                                                        <input
                                                            key={id}
                                                            type="hidden"
                                                            name="namespace_ids[]"
                                                            value={id}
                                                        />
                                                    ),
                                                )}
                                                <div className="grid gap-2">
                                                    <Label
                                                        htmlFor={
                                                            createDescriptionId
                                                        }
                                                    >
                                                        Description
                                                    </Label>
                                                    <textarea
                                                        id={createDescriptionId}
                                                        name="description"
                                                        value={
                                                            createManyDescription
                                                        }
                                                        onChange={(event) =>
                                                            setCreateManyDescription(
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="Optional note for these backups"
                                                        rows={4}
                                                        className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                                    />
                                                    <p className="text-xs text-muted-foreground">
                                                        Shown in backup restore
                                                        lists. Leave blank if
                                                        you do not need a note.
                                                    </p>
                                                </div>
                                                {errors.description && (
                                                    <p className="text-sm text-destructive">
                                                        {errors.description}
                                                    </p>
                                                )}
                                                {errors.backup && (
                                                    <p className="text-sm text-destructive">
                                                        {errors.backup}
                                                    </p>
                                                )}
                                                <DialogFooter className="gap-2">
                                                    <DialogClose asChild>
                                                        <Button
                                                            variant="secondary"
                                                            onClick={() =>
                                                                setCreateManyDescription(
                                                                    '',
                                                                )
                                                            }
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </DialogClose>
                                                    <Button
                                                        type="submit"
                                                        disabled={processing}
                                                    >
                                                        <Archive className="size-4" />
                                                        Create Backups
                                                    </Button>
                                                </DialogFooter>
                                            </div>
                                        )}
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <div className="divide-y">
                            {namespaces.map((namespace) => {
                                const isRoot = namespace.parent_id === null;
                                const depth =
                                    namespace.full_path.split('/').length - 1;

                                return (
                                    <div
                                        key={namespace.id}
                                        className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between"
                                        style={{
                                            paddingLeft: `${16 + depth * 24}px`,
                                        }}
                                    >
                                        <div className="flex items-start gap-3">
                                            {isRoot ? (
                                                <Checkbox
                                                    checked={selectedNamespaceIds.includes(
                                                        namespace.id,
                                                    )}
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        toggleNamespaceId(
                                                            namespace.id,
                                                            Boolean(checked),
                                                        )
                                                    }
                                                    aria-label={`Select ${namespace.name}`}
                                                    className="mt-0.5"
                                                />
                                            ) : (
                                                <div className="mt-0.5 size-4 shrink-0" />
                                            )}
                                            <div className="space-y-1">
                                                <Link
                                                    href={
                                                        namespace.namespace_url
                                                    }
                                                    className="font-medium hover:underline"
                                                >
                                                    {namespace.name}
                                                </Link>
                                                <p className="text-sm text-muted-foreground">
                                                    /{namespace.full_path}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {namespace.backup_count}{' '}
                                                    backup
                                                    {namespace.backup_count ===
                                                    1
                                                        ? ''
                                                        : 's'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                            >
                                                <Link
                                                    href={
                                                        namespace.management_url
                                                    }
                                                >
                                                    <FolderOpen className="size-4" />
                                                    Open Namespace
                                                </Link>
                                            </Button>

                                            <CreateBackupDialog
                                                action={
                                                    namespace.create_backup_url
                                                }
                                                namespaceName={namespace.name}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </TabsContent>

                    <TabsContent
                        value="restore"
                        className="m-0"
                        data-test="admin-backups-panel-restore"
                    >
                        <div className="flex items-center justify-between gap-3 border-b p-4">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    Backup Files
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Download, restore, or delete existing backup
                                    archives.
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <RestoreNamespacesDialog
                                    restoreUploadUrl={restore_upload_url}
                                    restorePreview={restore_preview}
                                />

                                <Dialog
                                    open={isRestoreDialogOpen}
                                    onOpenChange={setIsRestoreDialogOpen}
                                >
                                    <DialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={selectedKeys.length === 0}
                                        >
                                            <RotateCcw className="size-4" />
                                            Restore Selected
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogTitle>
                                            Restore selected backups?
                                        </DialogTitle>
                                        <DialogDescription className="space-y-3">
                                            <p>
                                                This will apply each selected
                                                backup in sequence. If multiple
                                                selected backups target the same
                                                namespace, the request will be
                                                rejected.
                                            </p>
                                            <p>
                                                Type{' '}
                                                <span className="font-semibold">
                                                    RESTORE
                                                </span>{' '}
                                                to confirm.
                                            </p>
                                        </DialogDescription>
                                        <Form
                                            action={restore_backups_url}
                                            method="post"
                                            onSuccess={() => {
                                                setIsRestoreDialogOpen(false);
                                                setSelectedKeys([]);
                                                setRestoreConfirmation('');
                                            }}
                                        >
                                            {({ processing, errors }) => (
                                                <div className="space-y-4">
                                                    {selectedKeys.map((key) => (
                                                        <input
                                                            key={key}
                                                            type="hidden"
                                                            name="keys[]"
                                                            value={key}
                                                        />
                                                    ))}
                                                    <Input
                                                        value={
                                                            restoreConfirmation
                                                        }
                                                        onChange={(event) =>
                                                            setRestoreConfirmation(
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        autoComplete="off"
                                                        placeholder="RESTORE"
                                                    />
                                                    {errors.keys && (
                                                        <p className="text-sm text-destructive">
                                                            {errors.keys}
                                                        </p>
                                                    )}
                                                    {errors.backup && (
                                                        <p className="text-sm text-destructive">
                                                            {errors.backup}
                                                        </p>
                                                    )}
                                                    <DialogFooter className="gap-2">
                                                        <DialogClose asChild>
                                                            <Button
                                                                variant="secondary"
                                                                onClick={() =>
                                                                    setRestoreConfirmation(
                                                                        '',
                                                                    )
                                                                }
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </DialogClose>
                                                        <Button
                                                            variant="destructive"
                                                            disabled={
                                                                processing ||
                                                                !canRestoreSelected
                                                            }
                                                            asChild
                                                        >
                                                            <button type="submit">
                                                                Restore Selected
                                                            </button>
                                                        </Button>
                                                    </DialogFooter>
                                                </div>
                                            )}
                                        </Form>
                                    </DialogContent>
                                </Dialog>

                                <Dialog
                                    open={isDeleteDialogOpen}
                                    onOpenChange={setIsDeleteDialogOpen}
                                >
                                    <DialogTrigger asChild>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            disabled={selectedKeys.length === 0}
                                        >
                                            <Trash2 className="size-4" />
                                            Delete Selected
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogTitle>
                                            Delete selected backups?
                                        </DialogTitle>
                                        <DialogDescription className="space-y-3">
                                            <p>
                                                This will permanently remove the
                                                selected backup files.
                                            </p>
                                            <p>
                                                {selectedKeys.length} backup
                                                {selectedKeys.length === 1
                                                    ? ''
                                                    : 's'}{' '}
                                                will be deleted.
                                            </p>
                                        </DialogDescription>
                                        <Form
                                            action={delete_backups_url}
                                            method="post"
                                            onSuccess={() => {
                                                setIsDeleteDialogOpen(false);
                                                setSelectedKeys([]);
                                            }}
                                        >
                                            {({ processing }) => (
                                                <div className="space-y-4">
                                                    {selectedKeys.map((key) => (
                                                        <input
                                                            key={key}
                                                            type="hidden"
                                                            name="keys[]"
                                                            value={key}
                                                        />
                                                    ))}
                                                    <DialogFooter className="gap-2">
                                                        <DialogClose asChild>
                                                            <Button variant="secondary">
                                                                Cancel
                                                            </Button>
                                                        </DialogClose>
                                                        <Button
                                                            variant="destructive"
                                                            disabled={
                                                                processing
                                                            }
                                                            asChild
                                                        >
                                                            <button type="submit">
                                                                Delete Selected
                                                            </button>
                                                        </Button>
                                                    </DialogFooter>
                                                </div>
                                            )}
                                        </Form>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>

                        {backups.length === 0 ? (
                            <div className="p-6 text-sm text-muted-foreground">
                                No backups found yet.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="w-10 px-4 py-3 text-left font-medium">
                                                <Checkbox
                                                    checked={allSelected}
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        toggleAll(
                                                            Boolean(checked),
                                                        )
                                                    }
                                                    aria-label="Select all backups"
                                                />
                                            </th>
                                            <th className="px-4 py-3 text-left font-medium">
                                                File
                                            </th>
                                            <th className="px-4 py-3 text-left font-medium">
                                                Namespace
                                            </th>
                                            <th className="px-4 py-3 text-left font-medium">
                                                Description
                                            </th>
                                            <th className="px-4 py-3 text-left font-medium">
                                                Created
                                            </th>
                                            <th className="px-4 py-3 text-left font-medium">
                                                Size
                                            </th>
                                            <th className="px-4 py-3 text-right font-medium">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {backups.map((backup) => (
                                            <tr
                                                key={backup.key}
                                                className="border-b last:border-b-0"
                                            >
                                                <td className="px-4 py-3 align-top">
                                                    <Checkbox
                                                        checked={selectedKeys.includes(
                                                            backup.key,
                                                        )}
                                                        onCheckedChange={(
                                                            checked,
                                                        ) =>
                                                            toggleKey(
                                                                backup.key,
                                                                Boolean(
                                                                    checked,
                                                                ),
                                                            )
                                                        }
                                                        aria-label={`Select ${backup.filename}`}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <div className="font-medium">
                                                        {backup.filename}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <div className="space-y-1">
                                                        {backup.namespace
                                                            .management_url ? (
                                                            <Link
                                                                href={
                                                                    backup
                                                                        .namespace
                                                                        .management_url
                                                                }
                                                                className="font-medium hover:underline"
                                                            >
                                                                {backup
                                                                    .namespace
                                                                    .name ??
                                                                    backup.label}
                                                            </Link>
                                                        ) : (
                                                            <div className="font-medium">
                                                                {backup
                                                                    .namespace
                                                                    .name ??
                                                                    backup.label}
                                                            </div>
                                                        )}
                                                        <p className="text-muted-foreground">
                                                            {backup.namespace
                                                                .full_path
                                                                ? `/${backup.namespace.full_path}`
                                                                : 'Namespace not found in current content tree'}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <BackupDescriptionCell
                                                        description={
                                                            backup.description
                                                        }
                                                    />
                                                </td>
                                                <td className="px-4 py-3 align-top text-muted-foreground">
                                                    {new Date(
                                                        backup.created_at,
                                                    ).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 align-top text-muted-foreground">
                                                    {backup.size_human}
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            asChild
                                                        >
                                                            <a
                                                                href={
                                                                    backup.download_url
                                                                }
                                                            >
                                                                <Download className="size-4" />
                                                                Download
                                                            </a>
                                                        </Button>
                                                        <RestoreBackupDialog
                                                            backup={backup}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}
