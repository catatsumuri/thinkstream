import { Form, useForm } from '@inertiajs/react';
import { Head, Link, router, setLayoutProps } from '@inertiajs/react';
import {
    Archive,
    Brain,
    Download,
    MessagesSquare,
    Plus,
    RotateCcw,
    Trash2,
} from 'lucide-react';
import { useRef, useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { matchesDeleteConfirmation } from '@/lib/delete-confirmation';
import { timeAgo } from '@/lib/time';
import { dashboard } from '@/routes';
import {
    backup as thinkstreamBackup,
    backupDownload as thinkstreamBackupDownload,
    backupRestore as thinkstreamBackupRestore,
    backupRestoreUpload as thinkstreamBackupRestoreUpload,
    destroyPage as thinkstreamDestroyPage,
    index as thinkstreamIndex,
    show as thinkstreamShow,
    storePage as thinkstreamStorePage,
} from '@/actions/App/Http/Controllers/Admin/ThinkstreamController';

type Page = {
    id: number;
    title: string;
    created_at: string;
    thoughts_count: number;
};

type LatestBackup = {
    created_at: string;
    size_human: string;
    description: string | null;
    download_url: string;
};

function BackupDialog() {
    const [description, setDescription] = useState('');
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    function save() {
        setSaving(true);
        router.post(
            thinkstreamBackup.url(),
            { description: description || null },
            {
                onSuccess: () => {
                    setOpen(false);
                    setDescription('');
                },
                onFinish: () => setSaving(false),
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <Archive className="size-4" />
                    Backup
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>Create Backup</DialogTitle>
                <DialogDescription>
                    Save a ZIP snapshot of all your canvases and thoughts.
                </DialogDescription>
                <div className="space-y-3">
                    <Textarea
                        placeholder="Note (optional)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        maxLength={2000}
                    />
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button variant="secondary" disabled={saving}>
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button onClick={save} disabled={saving}>
                            <Archive className="size-4" />
                            Save Backup
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function RestoreDialog({ backup }: { backup: LatestBackup | null }) {
    const [open, setOpen] = useState(false);
    const [savedConfirmation, setSavedConfirmation] = useState('');
    const savedMatches = matchesDeleteConfirmation(
        savedConfirmation,
        'restore',
    );

    const uploadForm = useForm<{ file: File | null; confirmation: string }>({
        file: null,
        confirmation: '',
    });
    const uploadMatches = matchesDeleteConfirmation(
        uploadForm.data.confirmation,
        'restore',
    );
    const fileInputRef = useRef<HTMLInputElement>(null);

    function resetState() {
        setSavedConfirmation('');
        uploadForm.reset();
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    function submitUpload() {
        uploadForm.post(thinkstreamBackupRestoreUpload.url(), {
            forceFormData: true,
            onSuccess: () => setOpen(false),
        });
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                setOpen(v);
                if (!v) resetState();
            }}
        >
            <DialogTrigger asChild>
                <Button
                    size="sm"
                    variant="outline"
                    data-test="thinkstream-restore-trigger"
                >
                    <RotateCcw className="size-4" />
                    Restore
                </Button>
            </DialogTrigger>
            <DialogContent data-test="thinkstream-restore-dialog">
                <DialogTitle>Restore from backup</DialogTitle>
                <Tabs defaultValue="saved">
                    <TabsList className="mb-4 w-full">
                        <TabsTrigger value="saved" className="flex-1">
                            Saved backup
                        </TabsTrigger>
                        <TabsTrigger value="upload" className="flex-1">
                            Upload file
                        </TabsTrigger>
                    </TabsList>

                    {/* ── Saved backup tab ── */}
                    <TabsContent value="saved">
                        {backup ? (
                            <>
                                <DialogDescription asChild>
                                    <div className="space-y-3">
                                        <p>
                                            This will permanently replace all
                                            your current canvases and thoughts
                                            with the saved backup snapshot. This
                                            cannot be undone.
                                        </p>
                                        {backup.description && (
                                            <p>
                                                Backup note:{' '}
                                                <span className="font-medium">
                                                    {backup.description}
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                </DialogDescription>
                                <Form
                                    action={thinkstreamBackupRestore.url()}
                                    method="post"
                                    onSuccess={() => setOpen(false)}
                                >
                                    {({ processing, errors }) => (
                                        <div className="mt-4 space-y-4">
                                            {errors.backup && (
                                                <p className="text-sm text-destructive">
                                                    {errors.backup}
                                                </p>
                                            )}
                                            <div className="space-y-1.5">
                                                <label className="text-sm text-muted-foreground">
                                                    Type{' '}
                                                    <span className="font-semibold text-foreground">
                                                        restore
                                                    </span>{' '}
                                                    to confirm
                                                </label>
                                                <Input
                                                    name="confirmation"
                                                    value={savedConfirmation}
                                                    onChange={(e) =>
                                                        setSavedConfirmation(
                                                            e.target.value,
                                                        )
                                                    }
                                                    autoComplete="off"
                                                    placeholder="restore"
                                                />
                                                {errors.confirmation && (
                                                    <p className="text-sm text-destructive">
                                                        {errors.confirmation}
                                                    </p>
                                                )}
                                            </div>
                                            <DialogFooter className="gap-2">
                                                <DialogClose asChild>
                                                    <Button variant="secondary">
                                                        Cancel
                                                    </Button>
                                                </DialogClose>
                                                <Button
                                                    variant="destructive"
                                                    disabled={
                                                        processing ||
                                                        !savedMatches
                                                    }
                                                    asChild
                                                >
                                                    <button
                                                        type="submit"
                                                        data-test="thinkstream-restore-submit"
                                                    >
                                                        Restore Backup
                                                    </button>
                                                </Button>
                                            </DialogFooter>
                                        </div>
                                    )}
                                </Form>
                            </>
                        ) : (
                            <p className="py-4 text-sm text-muted-foreground">
                                No backup saved yet. Create one with the Backup
                                button, or upload a file.
                            </p>
                        )}
                    </TabsContent>

                    {/* ── Upload file tab ── */}
                    <TabsContent value="upload">
                        <DialogDescription>
                            Upload a Thinkstream backup ZIP. It will overwrite
                            your saved backup and restore your canvases
                            immediately. This cannot be undone.
                        </DialogDescription>
                        <div className="mt-4 space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-sm text-muted-foreground">
                                    Backup file
                                </label>
                                <Input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".zip"
                                    onChange={(e) =>
                                        uploadForm.setData(
                                            'file',
                                            e.target.files?.[0] ?? null,
                                        )
                                    }
                                />
                                {uploadForm.errors.file && (
                                    <p className="text-sm text-destructive">
                                        {uploadForm.errors.file}
                                    </p>
                                )}
                            </div>
                            <div className="mt-6 space-y-1.5">
                                <label className="text-sm text-muted-foreground">
                                    Type{' '}
                                    <span className="font-semibold text-foreground">
                                        restore
                                    </span>{' '}
                                    to confirm
                                </label>
                                <Input
                                    name="confirmation"
                                    value={uploadForm.data.confirmation}
                                    onChange={(e) =>
                                        uploadForm.setData(
                                            'confirmation',
                                            e.target.value,
                                        )
                                    }
                                    autoComplete="off"
                                    placeholder="restore"
                                />
                                {uploadForm.errors.confirmation && (
                                    <p className="text-sm text-destructive">
                                        {uploadForm.errors.confirmation}
                                    </p>
                                )}
                            </div>
                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button variant="secondary">Cancel</Button>
                                </DialogClose>
                                <Button
                                    variant="destructive"
                                    disabled={
                                        uploadForm.processing ||
                                        !uploadMatches ||
                                        !uploadForm.data.file
                                    }
                                    onClick={submitUpload}
                                >
                                    Restore from File
                                </Button>
                            </DialogFooter>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

function LatestBackupBar({ backup }: { backup: LatestBackup }) {
    return (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-dashed px-4 py-3 text-sm">
            <Archive className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
                <span className="text-muted-foreground">Latest backup: </span>
                <span
                    className="font-medium"
                    suppressHydrationWarning
                    title={new Date(backup.created_at).toLocaleString()}
                >
                    {timeAgo(backup.created_at)}
                </span>
                <span className="mx-2 text-muted-foreground">·</span>
                <span className="text-muted-foreground">
                    {backup.size_human}
                </span>
                {backup.description && (
                    <>
                        <span className="mx-2 text-muted-foreground">·</span>
                        <span className="truncate text-muted-foreground italic">
                            {backup.description}
                        </span>
                    </>
                )}
            </div>
            <Button size="sm" variant="outline" asChild>
                <a href={thinkstreamBackupDownload.url()}>
                    <Download className="size-4" />
                    Download
                </a>
            </Button>
        </div>
    );
}

export default function ThinkstreamIndex({
    pages,
    latest_backup,
}: {
    pages: Page[];
    latest_backup: LatestBackup | null;
}) {
    const [creating, setCreating] = useState(false);

    setLayoutProps({
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'Thinkstream', href: thinkstreamIndex.url() },
        ],
    });

    function createCanvas() {
        setCreating(true);
        router.post(
            thinkstreamStorePage.url(),
            {},
            {
                onFinish: () => setCreating(false),
            },
        );
    }

    return (
        <>
            <Head title="Thinkstream" />
            <div className="p-4">
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Brain className="size-4" />
                        {pages.length} canvas{pages.length !== 1 ? 'es' : ''}
                    </div>
                    <div className="flex items-center gap-2">
                        <RestoreDialog backup={latest_backup} />
                        <BackupDialog />
                        <Button
                            size="sm"
                            disabled={creating}
                            onClick={createCanvas}
                        >
                            <Plus className="size-4" />
                            New Canvas
                        </Button>
                    </div>
                </div>

                {latest_backup && <LatestBackupBar backup={latest_backup} />}

                {pages.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-24 text-muted-foreground">
                        <Brain className="size-12 opacity-20" />
                        <p className="text-sm">No canvases yet.</p>
                        <Button
                            size="sm"
                            disabled={creating}
                            onClick={createCanvas}
                        >
                            <Plus className="size-4" />
                            Create your first canvas
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {pages.map((page) => (
                            <Card
                                key={page.id}
                                className="border-border/60 shadow-none transition-colors hover:border-border"
                            >
                                <CardContent className="flex items-center gap-4 px-4 py-3">
                                    <Link
                                        href={thinkstreamShow.url(page.id)}
                                        className="min-w-0 flex-1"
                                    >
                                        <p className="truncate font-medium">
                                            {page.title}
                                        </p>
                                        <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <MessagesSquare className="size-3" />
                                                {page.thoughts_count} thought
                                                {page.thoughts_count !== 1
                                                    ? 's'
                                                    : ''}
                                            </span>
                                            <span>·</span>
                                            <span
                                                title={new Date(
                                                    page.created_at,
                                                ).toLocaleString()}
                                            >
                                                {timeAgo(page.created_at)}
                                            </span>
                                        </p>
                                    </Link>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogTitle>
                                                Delete canvas?
                                            </DialogTitle>
                                            <DialogDescription>
                                                This will permanently delete
                                                &ldquo;{page.title}&rdquo; and
                                                all {page.thoughts_count}{' '}
                                                thought
                                                {page.thoughts_count !== 1
                                                    ? 's'
                                                    : ''}{' '}
                                                in it. This cannot be undone.
                                            </DialogDescription>
                                            <DialogFooter className="gap-2">
                                                <DialogClose asChild>
                                                    <Button variant="secondary">
                                                        Cancel
                                                    </Button>
                                                </DialogClose>
                                                <Button
                                                    variant="destructive"
                                                    onClick={() =>
                                                        router.delete(
                                                            thinkstreamDestroyPage.url(
                                                                page.id,
                                                            ),
                                                        )
                                                    }
                                                >
                                                    Delete
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
