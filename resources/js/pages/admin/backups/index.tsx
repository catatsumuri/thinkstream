import { Form, Head, Link, setLayoutProps, usePage } from '@inertiajs/react';
import { Archive, Download, FolderOpen, RotateCcw, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import CreateBackupDialog from '@/components/create-backup-dialog';
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
import { dashboard } from '@/routes';
import { index as backupsIndex } from '@/routes/admin/backups';

type NamespaceSummary = {
    id: number;
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

export default function AdminBackupsIndex({
    namespaces,
    backups,
    create_backups_url,
    delete_backups_url,
    restore_backups_url,
}: {
    namespaces: NamespaceSummary[];
    backups: BackupRecord[];
    create_backups_url: string;
    delete_backups_url: string;
    restore_backups_url: string;
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

    const allSelected =
        backups.length > 0 && selectedKeys.length === backups.length;
    const allNamespacesSelected =
        namespaces.length > 0 &&
        selectedNamespaceIds.length === namespaces.length;
    const namespacesWithBackups = namespaces.filter(
        (namespace) => namespace.backup_count > 0,
    ).length;
    const canRestoreSelected = restoreConfirmation === 'RESTORE';
    const fallbackTab =
        errors?.keys || errors?.backup || errors?.confirmation
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
        setSelectedNamespaceIds(checked ? namespaces.map((n) => n.id) : []);
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
                                    Create
                                </TabsTrigger>
                                <TabsTrigger
                                    value="restore"
                                    data-test="admin-backups-tab-restore"
                                >
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
                                        ? `${selectedNamespaceIds.length} of ${namespaces.length} selected`
                                        : 'Select namespaces'}
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
                            {namespaces.map((namespace) => (
                                <div
                                    key={namespace.id}
                                    className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between"
                                >
                                    <div className="flex items-start gap-3">
                                        <Checkbox
                                            checked={selectedNamespaceIds.includes(
                                                namespace.id,
                                            )}
                                            onCheckedChange={(checked) =>
                                                toggleNamespaceId(
                                                    namespace.id,
                                                    Boolean(checked),
                                                )
                                            }
                                            aria-label={`Select ${namespace.name}`}
                                            className="mt-0.5"
                                        />
                                        <div className="space-y-1">
                                            <Link
                                                href={namespace.namespace_url}
                                                className="font-medium hover:underline"
                                            >
                                                {namespace.name}
                                            </Link>
                                            <p className="text-sm text-muted-foreground">
                                                /{namespace.full_path}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {namespace.backup_count} backup
                                                {namespace.backup_count === 1
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
                                                href={namespace.management_url}
                                            >
                                                <FolderOpen className="size-4" />
                                                Open Namespace
                                            </Link>
                                        </Button>

                                        <CreateBackupDialog
                                            action={namespace.create_backup_url}
                                            namespaceName={namespace.name}
                                        />
                                    </div>
                                </div>
                            ))}
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
                                            This will apply each selected backup
                                            in sequence. If multiple selected
                                            backups target the same namespace,
                                            the request will be rejected.
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
                                                    value={restoreConfirmation}
                                                    onChange={(event) =>
                                                        setRestoreConfirmation(
                                                            event.target.value,
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
                                                        disabled={processing}
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
