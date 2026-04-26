import { Form, Head, Link, setLayoutProps } from '@inertiajs/react';
import { Archive, Download, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
import { matchesDeleteConfirmation } from '@/lib/delete-confirmation';
import { dashboard } from '@/routes';
import {
    backups as backupsRoute,
    index,
    namespace as namespaceRoute,
} from '@/routes/admin/posts';

type Namespace = {
    id: number;
    name: string;
    slug: string;
    full_path: string;
    backup_count: number;
};

type Backup = {
    filename: string;
    created_at: string;
    size_bytes: number;
    size_human: string;
    description: string | null;
    download_url: string;
    restore_url: string;
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

function RestoreBackupDialog({
    backup,
    namespaceName,
}: {
    backup: Backup;
    namespaceName: string;
}) {
    const [confirmation, setConfirmation] = useState('');
    const matches = matchesDeleteConfirmation(confirmation, namespaceName);

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
                        This will overwrite content in the target namespace
                        using the selected backup. Treat this as a destructive
                        operation.
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
                        <span className="font-semibold">{namespaceName}</span>{' '}
                        to confirm.
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
                                placeholder={namespaceName}
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

export default function Backups({
    namespace,
    backups,
    create_backup_url,
    delete_backups_url,
}: {
    namespace: Namespace;
    backups: Backup[];
    create_backup_url: string;
    delete_backups_url: string;
}) {
    const [selectedFilenames, setSelectedFilenames] = useState<string[]>([]);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    setLayoutProps({
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'Namespaces', href: index.url() },
            { title: namespace.name, href: namespaceRoute.url(namespace.id) },
            { title: 'Backups', href: backupsRoute.url(namespace.id) },
        ],
    });

    const allSelected =
        backups.length > 0 && selectedFilenames.length === backups.length;

    function toggleFilename(filename: string, checked: boolean) {
        setSelectedFilenames((current) =>
            checked
                ? [...current, filename]
                : current.filter((value) => value !== filename),
        );
    }

    function toggleAll(checked: boolean) {
        setSelectedFilenames(
            checked ? backups.map((backup) => backup.filename) : [],
        );
    }

    return (
        <>
            <Head title={`Backups — ${namespace.name}`} />

            <div className="space-y-6 p-4">
                <div className="rounded-xl border p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-amber-100 p-2 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                <Archive className="size-5" />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-2xl font-semibold">
                                    Backup Management
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    /{namespace.full_path}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {namespace.backup_count} backup
                                    {namespace.backup_count === 1
                                        ? ''
                                        : 's'}{' '}
                                    found for this namespace.
                                </p>
                            </div>
                        </div>
                        <CreateBackupDialog
                            action={create_backup_url}
                            namespaceName={namespace.name}
                            triggerLabel="Create Backup"
                            triggerSize="default"
                        />
                    </div>
                </div>

                <div className="rounded-xl border">
                    {backups.length === 0 ? (
                        <div className="p-6 text-sm text-muted-foreground">
                            No backups found for this namespace.
                        </div>
                    ) : (
                        <div className="space-y-4 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm text-muted-foreground">
                                    {selectedFilenames.length} selected
                                </p>
                                <Dialog
                                    open={isDeleteDialogOpen}
                                    onOpenChange={setIsDeleteDialogOpen}
                                >
                                    <DialogTrigger asChild>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            disabled={
                                                selectedFilenames.length === 0
                                            }
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
                                                {selectedFilenames.length}{' '}
                                                backup
                                                {selectedFilenames.length === 1
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
                                                setSelectedFilenames([]);
                                            }}
                                        >
                                            {({ processing }) => (
                                                <div className="space-y-4">
                                                    {selectedFilenames.map(
                                                        (filename) => (
                                                            <input
                                                                key={filename}
                                                                type="hidden"
                                                                name="filenames[]"
                                                                value={filename}
                                                            />
                                                        ),
                                                    )}
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

                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="w-10 px-4 py-3 text-left font-medium">
                                            <Checkbox
                                                checked={allSelected}
                                                onCheckedChange={(checked) =>
                                                    toggleAll(Boolean(checked))
                                                }
                                                aria-label="Select all backups"
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium">
                                            File
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
                                            key={backup.filename}
                                            className="border-b last:border-0"
                                        >
                                            <td className="px-4 py-3">
                                                <Checkbox
                                                    checked={selectedFilenames.includes(
                                                        backup.filename,
                                                    )}
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        toggleFilename(
                                                            backup.filename,
                                                            Boolean(checked),
                                                        )
                                                    }
                                                    aria-label={`Select backup ${backup.filename}`}
                                                />
                                            </td>
                                            <td className="px-4 py-3 font-medium">
                                                {backup.filename}
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <BackupDescriptionCell
                                                    description={
                                                        backup.description
                                                    }
                                                />
                                            </td>
                                            <td
                                                className="px-4 py-3 text-muted-foreground"
                                                suppressHydrationWarning
                                            >
                                                {new Date(
                                                    backup.created_at,
                                                ).toLocaleString(undefined, {
                                                    dateStyle: 'medium',
                                                    timeStyle: 'short',
                                                })}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {backup.size_human}
                                            </td>
                                            <td className="px-4 py-3 text-right">
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
                                                        namespaceName={
                                                            namespace.name
                                                        }
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div>
                    <Button asChild variant="outline">
                        <Link href={namespaceRoute.url(namespace.id)}>
                            Back to Manage Namespace
                        </Link>
                    </Button>
                </div>
            </div>
        </>
    );
}
