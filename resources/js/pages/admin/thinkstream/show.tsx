import {
    Head,
    router,
    setLayoutProps,
    useForm,
    useHttp,
    usePage,
} from '@inertiajs/react';
import {
    BookmarkPlus,
    Brain,
    ExternalLink,
    ListChecks,
    PanelRightClose,
    PanelRightOpen,
    Pencil,
    Send,
    Sparkles,
    Trash2,
    Wand2,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
    destroyMany as thinkstreamDestroyMany,
    index as thinkstreamIndex,
    refineTitle as thinkstreamRefineTitle,
    saveToScrap as thinkstreamSaveToScrap,
    show as thinkstreamShow,
    store as thinkstreamStore,
    structureThoughts as thinkstreamStructureThoughts,
    update as thinkstreamUpdate,
    uploadImage as thinkstreamUploadImage,
} from '@/actions/App/Http/Controllers/Admin/ThinkstreamController';
import MarkdownContent from '@/components/markdown-content';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { createMarkdownComponents } from '@/lib/markdown-components';
import { getMarkdownLinkPasteResult } from '@/lib/markdown-link-paste';
import { timeAgo } from '@/lib/time';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';

const thoughtMarkdownComponents = createMarkdownComponents();

type Thought = {
    id: number;
    content: string;
    created_at: string;
    user: { id: number; name: string };
};

type Page = {
    id: number;
    title: string;
    created_at: string;
};

type ThoughtImageUpload = {
    key: string;
    url: string;
};

type PendingImageUpload = {
    key: string;
    target: 'thought' | 'edit';
    selectionStart: number;
    selectionEnd: number;
};

function hasThoughtsProp(props: unknown): props is { thoughts: Thought[] } {
    return (
        typeof props === 'object' &&
        props !== null &&
        'thoughts' in props &&
        Array.isArray(props.thoughts)
    );
}

export default function ThinkstreamShow({
    page,
    thoughts,
    aiEnabled,
}: {
    page: Page;
    thoughts: Thought[];
    aiEnabled: boolean;
}) {
    const { props } = usePage<{ thoughtImageUpload?: ThoughtImageUpload }>();
    const thoughtTextareaRef = useRef<HTMLTextAreaElement>(null);
    const editTextareaRef = useRef<HTMLTextAreaElement>(null);
    const pendingImageUploadsRef = useRef<PendingImageUpload[]>([]);
    const previousThoughtImageUploadKeyRef = useRef<string | undefined>(
        undefined,
    );
    const nextUploadKeyRef = useRef(0);
    const thoughtContentRef = useRef('');
    const editingContentRef = useRef('');

    const [pageTitle, setPageTitle] = useState(page.title);
    const { data, setData, post, processing, errors, reset } = useForm({
        content: '',
    });
    const [deleteProcessing, setDeleteProcessing] = useState(false);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingContent, setEditingContent] = useState('');
    const [editPreviewMode, setEditPreviewMode] = useState(false);
    const [editSaving, setEditSaving] = useState(false);
    const [structuredTitle, setStructuredTitle] = useState<string | null>(null);
    const [structuredContent, setStructuredContent] = useState<string | null>(
        null,
    );
    const [structuredMessage, setStructuredMessage] = useState<string | null>(
        null,
    );
    const [structuredExpanded, setStructuredExpanded] = useState(false);
    const [scrapUrl, setScrapUrl] = useState<string | null>(null);
    const [deleteCanvasOnSave, setDeleteCanvasOnSave] = useState(false);

    useEffect(() => {
        thoughtContentRef.current = data.content;
    }, [data.content]);

    useEffect(() => {
        editingContentRef.current = editingContent;
    }, [editingContent]);

    const {
        post: structurePost,
        processing: structuring,
        transform: transformStructure,
    } = useHttp({ ids: [] as number[] });

    const { post: refineTitlePost, processing: refiningTitle } = useHttp({});

    const {
        post: savePost,
        processing: saving,
        transform: transformSave,
    } = useHttp({
        content: '',
        title: '',
        delete_canvas: false,
        page_id: null as number | null,
    });

    setLayoutProps({
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'Thinkstream', href: thinkstreamIndex.url() },
            { title: pageTitle, href: thinkstreamShow.url(page.id) },
        ],
    });

    useEffect(() => {
        if (
            !props.thoughtImageUpload ||
            props.thoughtImageUpload.key ===
                previousThoughtImageUploadKeyRef.current
        ) {
            return;
        }

        previousThoughtImageUploadKeyRef.current = props.thoughtImageUpload.key;

        const pendingUploadIndex = pendingImageUploadsRef.current.findIndex(
            ({ key }) => key === props.thoughtImageUpload?.key,
        );

        if (pendingUploadIndex === -1) {
            return;
        }

        const [pendingUpload] = pendingImageUploadsRef.current.splice(
            pendingUploadIndex,
            1,
        );

        if (!pendingUpload) {
            return;
        }

        const markdown = `![image](${props.thoughtImageUpload.url})`;

        if (pendingUpload.target === 'thought') {
            setData(
                'content',
                thoughtContentRef.current.substring(
                    0,
                    pendingUpload.selectionStart,
                ) +
                    markdown +
                    thoughtContentRef.current.substring(
                        pendingUpload.selectionEnd,
                    ),
            );

            setTimeout(() => {
                const textarea = thoughtTextareaRef.current;

                if (!textarea) {
                    return;
                }

                const pos = pendingUpload.selectionStart + markdown.length;
                textarea.setSelectionRange(pos, pos);
                textarea.focus();
            }, 0);
        } else {
            setEditingContent(
                editingContentRef.current.substring(
                    0,
                    pendingUpload.selectionStart,
                ) +
                    markdown +
                    editingContentRef.current.substring(
                        pendingUpload.selectionEnd,
                    ),
            );

            setTimeout(() => {
                const textarea = editTextareaRef.current;

                if (!textarea) {
                    return;
                }

                const pos = pendingUpload.selectionStart + markdown.length;
                textarea.setSelectionRange(pos, pos);
                textarea.focus();
            }, 0);
        }
    }, [props.thoughtImageUpload, setData]);

    function handleImageUpload(file: File, target: 'thought' | 'edit') {
        if (!file.type.startsWith('image/')) {
            return;
        }

        const targetTextarea =
            target === 'thought'
                ? thoughtTextareaRef.current
                : editTextareaRef.current;
        const uploadKey = `thought-image-${nextUploadKeyRef.current++}`;

        pendingImageUploadsRef.current.push({
            key: uploadKey,
            target,
            selectionStart: targetTextarea?.selectionStart ?? 0,
            selectionEnd: targetTextarea?.selectionEnd ?? 0,
        });

        router.post(
            thinkstreamUploadImage.url(page.id),
            { image: file, upload_key: uploadKey },
            {
                preserveState: true,
                preserveScroll: true,
                onError: (uploadErrors) => {
                    pendingImageUploadsRef.current =
                        pendingImageUploadsRef.current.filter(
                            ({ key }) => key !== uploadKey,
                        );
                    alert(uploadErrors.image ?? 'Image upload failed.');
                },
            },
        );
    }

    function refineTitle() {
        refineTitlePost(thinkstreamRefineTitle.url(page.id), {
            onSuccess: (response) => {
                const { title } = response as { title: string };
                setPageTitle(title);
            },
        });
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(thinkstreamStore.url(page.id), {
            preserveScroll: true,
            onSuccess: () => reset('content'),
        });
    }

    function bulkDelete() {
        setDeleteProcessing(true);
        router.post(
            thinkstreamDestroyMany.url(page.id),
            { ids: Array.from(selected) },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSelected(new Set());
                    setDeleteDialogOpen(false);
                },
                onFinish: () => setDeleteProcessing(false),
            },
        );
    }

    function structureThoughts() {
        const ids = Array.from(selected);

        transformStructure(() => ({ ids }));
        structurePost(thinkstreamStructureThoughts.url(page.id), {
            onSuccess: (response) => {
                const { title, content, message } = response as {
                    title: string;
                    content: string;
                    message: string;
                };
                setStructuredTitle(title);
                setStructuredContent(content);
                setStructuredMessage(message ?? null);
                setScrapUrl(null);
            },
        });
    }

    function saveToScrap() {
        if (!structuredContent) {
            return;
        }

        const pageId = deleteCanvasOnSave ? page.id : null;
        const title = structuredTitle ?? pageTitle;
        const content = structuredContent;
        const deleteCanvas = deleteCanvasOnSave;

        transformSave(() => ({
            content,
            title,
            delete_canvas: deleteCanvas,
            page_id: pageId,
        }));

        savePost(thinkstreamSaveToScrap.url(), {
            onSuccess: (response) => {
                const { url } = response as { url: string };
                setScrapUrl(url);

                if (pageId !== null) {
                    router.visit(url);
                }
            },
        });
    }

    function toggleSelected(id: number) {
        setSelected((prev) => {
            const next = new Set(prev);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    }

    function toggleSelectAll() {
        setSelected((prev) => {
            if (prev.size === thoughts.length) {
                return new Set();
            }

            return new Set(thoughts.map((thought) => thought.id));
        });
    }

    function exitEditMode() {
        setEditMode(false);
        setSelected(new Set());
        setEditingId(null);
    }

    function startEditing(thought: Thought, e: React.MouseEvent) {
        e.stopPropagation();
        setEditPreviewMode(false);
        setEditingId(thought.id);
        setEditingContent(thought.content);
    }

    function saveEdit(thought: Thought) {
        const contentToSave = editingContent;

        setEditSaving(true);
        setEditingId(null);

        router.patch(
            thinkstreamUpdate.url([page.id, thought.id]),
            { content: contentToSave },
            {
                optimistic: (props) => {
                    if (!hasThoughtsProp(props)) {
                        return {};
                    }

                    return {
                        thoughts: props.thoughts.map((currentThought) =>
                            currentThought.id === thought.id
                                ? { ...currentThought, content: contentToSave }
                                : currentThought,
                        ),
                    };
                },
                preserveScroll: true,
                onError: () => {
                    setEditPreviewMode(false);
                    setEditingId(thought.id);
                    setEditingContent(contentToSave);
                },
                onFinish: () => setEditSaving(false),
            },
        );
    }

    function handleThoughtPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
        const imageItem = Array.from(e.clipboardData.items).find((item) =>
            item.type.startsWith('image/'),
        );

        if (imageItem) {
            e.preventDefault();
            const file = imageItem.getAsFile();

            if (file) {
                handleImageUpload(file, 'thought');
            }

            return;
        }

        const pasteResult = getMarkdownLinkPasteResult({
            currentValue: e.currentTarget.value,
            pastedText: e.clipboardData.getData('text/plain'),
            selectionStart: e.currentTarget.selectionStart,
            selectionEnd: e.currentTarget.selectionEnd,
        });

        if (!pasteResult) {
            return;
        }

        e.preventDefault();
        setData('content', pasteResult.nextValue);

        const textarea = e.currentTarget;

        setTimeout(() => {
            textarea.setSelectionRange(
                pasteResult.nextSelectionStart,
                pasteResult.nextSelectionEnd,
            );
        }, 0);
    }

    function handleEditingPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
        const imageItem = Array.from(e.clipboardData.items).find((item) =>
            item.type.startsWith('image/'),
        );

        if (imageItem) {
            e.preventDefault();
            const file = imageItem.getAsFile();

            if (file) {
                handleImageUpload(file, 'edit');
            }

            return;
        }

        const pasteResult = getMarkdownLinkPasteResult({
            currentValue: e.currentTarget.value,
            pastedText: e.clipboardData.getData('text/plain'),
            selectionStart: e.currentTarget.selectionStart,
            selectionEnd: e.currentTarget.selectionEnd,
        });

        if (!pasteResult) {
            return;
        }

        e.preventDefault();
        setEditingContent(pasteResult.nextValue);

        const textarea = e.currentTarget;

        setTimeout(() => {
            textarea.setSelectionRange(
                pasteResult.nextSelectionStart,
                pasteResult.nextSelectionEnd,
            );
        }, 0);
    }

    return (
        <>
            <Head title={pageTitle} />
            <div
                className={cn(
                    'flex min-h-0 gap-0',
                    structuredContent ? 'items-start' : '',
                )}
            >
                {/* Left: main content */}
                <div
                    className={cn(
                        'space-y-6 p-4',
                        structuredContent
                            ? structuredExpanded
                                ? 'hidden'
                                : 'w-1/2'
                            : 'w-full',
                    )}
                >
                    <Card className="border-border/60 shadow-none">
                        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                                    Canvas
                                </p>
                                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                                    {pageTitle}
                                </h1>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                {thoughts.length > 0 && (
                                    <Button
                                        type="button"
                                        variant={
                                            editMode ? 'secondary' : 'default'
                                        }
                                        data-test="thinkstream-select-thoughts-button"
                                        className="shrink-0"
                                        onClick={
                                            editMode
                                                ? exitEditMode
                                                : () => setEditMode(true)
                                        }
                                    >
                                        <ListChecks className="size-4" />
                                        {editMode
                                            ? 'Done Selecting'
                                            : 'Select Thoughts'}
                                    </Button>
                                )}
                                {aiEnabled && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        data-test="thinkstream-refine-title-button"
                                        className="shrink-0"
                                        disabled={
                                            refiningTitle ||
                                            thoughts.length === 0
                                        }
                                        onClick={refineTitle}
                                    >
                                        <Sparkles className="size-4" />
                                        {refiningTitle
                                            ? 'Polishing Title…'
                                            : 'Polish Title with AI'}
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {thoughts.length > 0 && editMode && (
                        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium">
                                            Selection Mode
                                        </p>
                                        <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                                            {selected.size} selected
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Choose thoughts to refine into Scrap or
                                        delete in bulk.
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        data-test="thinkstream-select-all-button"
                                        onClick={toggleSelectAll}
                                    >
                                        {selected.size === thoughts.length
                                            ? 'Clear Selection'
                                            : 'Select All'}
                                    </Button>
                                    {aiEnabled && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            data-test="thinkstream-refine-scrap-button"
                                            disabled={
                                                structuring ||
                                                selected.size === 0
                                            }
                                            onClick={structureThoughts}
                                        >
                                            {structuring ? (
                                                <Spinner className="size-4" />
                                            ) : (
                                                <Wand2 className="size-4" />
                                            )}
                                            {structuring
                                                ? 'Refining for Scrap…'
                                                : 'Refine for Scrap'}
                                        </Button>
                                    )}
                                    <Dialog
                                        open={deleteDialogOpen}
                                        onOpenChange={setDeleteDialogOpen}
                                    >
                                        <DialogTrigger asChild>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                disabled={selected.size === 0}
                                            >
                                                <Trash2 className="size-4" />
                                                Delete
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogTitle>
                                                Delete {selected.size} thought
                                                {selected.size !== 1 ? 's' : ''}
                                                ?
                                            </DialogTitle>
                                            <DialogDescription>
                                                This cannot be undone.
                                            </DialogDescription>
                                            <DialogFooter className="gap-2">
                                                <DialogClose asChild>
                                                    <Button variant="secondary">
                                                        Cancel
                                                    </Button>
                                                </DialogClose>
                                                <Button
                                                    variant="destructive"
                                                    disabled={deleteProcessing}
                                                    onClick={bulkDelete}
                                                >
                                                    Delete
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={exitEditMode}
                                    >
                                        Done
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {thoughts.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                            <Brain className="size-10 opacity-30" />
                            <p className="text-sm">No thoughts yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {thoughts.map((thought) => {
                                const isSelected = selected.has(thought.id);
                                const isEditing = editingId === thought.id;

                                return (
                                    <Card
                                        key={thought.id}
                                        data-test={`thinkstream-thought-card-${thought.id}`}
                                        onClick={() => {
                                            if (editMode && !isEditing) {
                                                toggleSelected(thought.id);
                                            }
                                        }}
                                        className={cn(
                                            'border shadow-none transition-colors',
                                            editMode &&
                                                !isEditing &&
                                                'cursor-pointer',
                                            isSelected
                                                ? 'border-primary/50 bg-primary/5'
                                                : 'border-border/60 hover:border-border',
                                        )}
                                    >
                                        <CardContent
                                            className={cn(
                                                'flex items-start gap-3 px-4',
                                                isEditing
                                                    ? 'py-6 sm:px-5 sm:py-8'
                                                    : 'py-3',
                                            )}
                                        >
                                            {editMode && (
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() =>
                                                        toggleSelected(
                                                            thought.id,
                                                        )
                                                    }
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                    className="mt-0.5 shrink-0"
                                                />
                                            )}
                                            <div className="min-w-0 flex-1">
                                                {isEditing ? (
                                                    <div
                                                        className="space-y-4"
                                                        onClick={(e) =>
                                                            e.stopPropagation()
                                                        }
                                                    >
                                                        <div
                                                            aria-label="Edit mode"
                                                            className="flex w-fit gap-1 rounded-lg bg-muted/50 p-0.5"
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setEditPreviewMode(
                                                                        false,
                                                                    )
                                                                }
                                                                aria-label="Write mode"
                                                                aria-pressed={
                                                                    !editPreviewMode
                                                                }
                                                                data-test="thinkstream-edit-write-tab"
                                                                className={cn(
                                                                    'rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                                                                    !editPreviewMode
                                                                        ? 'bg-card text-foreground shadow-sm'
                                                                        : 'text-muted-foreground hover:text-foreground',
                                                                )}
                                                            >
                                                                Write
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setEditPreviewMode(
                                                                        true,
                                                                    )
                                                                }
                                                                aria-label="Preview mode"
                                                                aria-pressed={
                                                                    editPreviewMode
                                                                }
                                                                data-test="thinkstream-edit-preview-tab"
                                                                className={cn(
                                                                    'rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                                                                    editPreviewMode
                                                                        ? 'bg-card text-foreground shadow-sm'
                                                                        : 'text-muted-foreground hover:text-foreground',
                                                                )}
                                                            >
                                                                Preview
                                                            </button>
                                                        </div>
                                                        {editPreviewMode ? (
                                                            <div
                                                                data-test="thinkstream-edit-preview-panel"
                                                                className="min-h-[24rem] overflow-y-auto rounded-md border px-4 py-3 sm:min-h-[30rem]"
                                                            >
                                                                <div className="prose prose-sm max-w-none text-[15px] leading-7 prose-neutral dark:prose-invert">
                                                                    <MarkdownContent
                                                                        content={
                                                                            editingContent
                                                                        }
                                                                        components={
                                                                            thoughtMarkdownComponents
                                                                        }
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <Textarea
                                                                ref={
                                                                    editTextareaRef
                                                                }
                                                                value={
                                                                    editingContent
                                                                }
                                                                onChange={(e) =>
                                                                    setEditingContent(
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                onPaste={
                                                                    handleEditingPaste
                                                                }
                                                                onDrop={(e) => {
                                                                    e.preventDefault();
                                                                    const imageFile =
                                                                        Array.from(
                                                                            e
                                                                                .dataTransfer
                                                                                .files,
                                                                        ).find(
                                                                            (
                                                                                f,
                                                                            ) =>
                                                                                f.type.startsWith(
                                                                                    'image/',
                                                                                ),
                                                                        );

                                                                    if (
                                                                        imageFile
                                                                    ) {
                                                                        handleImageUpload(
                                                                            imageFile,
                                                                            'edit',
                                                                        );
                                                                    }
                                                                }}
                                                                onDragOver={(
                                                                    e,
                                                                ) =>
                                                                    e.preventDefault()
                                                                }
                                                                rows={12}
                                                                data-test="thinkstream-edit-thought-textarea"
                                                                className="min-h-[24rem] resize-none px-4 py-3 text-[15px] leading-7 sm:min-h-[30rem]"
                                                                autoFocus
                                                            />
                                                        )}
                                                        <div className="flex justify-end gap-2 pt-2">
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                onClick={() => {
                                                                    setEditPreviewMode(
                                                                        false,
                                                                    );
                                                                    setEditingId(
                                                                        null,
                                                                    );
                                                                }}
                                                            >
                                                                Cancel
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                disabled={
                                                                    editSaving
                                                                }
                                                                onClick={() =>
                                                                    saveEdit(
                                                                        thought,
                                                                    )
                                                                }
                                                            >
                                                                Save
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {!editMode && (
                                                            <div className="mb-3 flex justify-end">
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    data-test="thinkstream-edit-thought-button"
                                                                    className="h-7 px-2.5 text-xs"
                                                                    onClick={(
                                                                        e,
                                                                    ) =>
                                                                        startEditing(
                                                                            thought,
                                                                            e,
                                                                        )
                                                                    }
                                                                >
                                                                    <Pencil className="size-3" />
                                                                    Edit
                                                                </Button>
                                                            </div>
                                                        )}
                                                        <div className="prose prose-sm max-w-none prose-neutral dark:prose-invert">
                                                            <MarkdownContent
                                                                content={
                                                                    thought.content
                                                                }
                                                                components={
                                                                    thoughtMarkdownComponents
                                                                }
                                                            />
                                                        </div>
                                                        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                                            <span>
                                                                {
                                                                    thought.user
                                                                        .name
                                                                }{' '}
                                                                ·{' '}
                                                                <span
                                                                    title={new Date(
                                                                        thought.created_at,
                                                                    ).toLocaleString()}
                                                                >
                                                                    {timeAgo(
                                                                        thought.created_at,
                                                                    )}
                                                                </span>
                                                            </span>
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}

                    <Card className="border-border/60 shadow-none">
                        <CardContent className="p-4">
                            <form onSubmit={submit} className="space-y-3">
                                <Textarea
                                    ref={thoughtTextareaRef}
                                    value={data.content}
                                    onChange={(e) =>
                                        setData('content', e.target.value)
                                    }
                                    onPaste={handleThoughtPaste}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        const imageFile = Array.from(
                                            e.dataTransfer.files,
                                        ).find((f) =>
                                            f.type.startsWith('image/'),
                                        );

                                        if (imageFile) {
                                            handleImageUpload(
                                                imageFile,
                                                'thought',
                                            );
                                        }
                                    }}
                                    onDragOver={(e) => e.preventDefault()}
                                    placeholder="Add the next thought..."
                                    rows={6}
                                    data-test="thinkstream-new-thought-textarea"
                                    className="resize-none"
                                />
                                {errors.content && (
                                    <p className="text-sm text-destructive">
                                        {errors.content}
                                    </p>
                                )}
                                <div className="flex justify-end">
                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={processing}
                                    >
                                        <Send className="size-4" />
                                        Post
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: structured document panel */}
                {structuredContent && (
                    <div
                        className={cn(
                            'p-4',
                            structuredExpanded
                                ? 'w-full'
                                : 'sticky top-0 w-1/2 border-l border-border/60',
                        )}
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <Sparkles className="size-4 text-primary" />
                                Refined for Scrap
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7"
                                    onClick={() =>
                                        setStructuredExpanded(
                                            (current) => !current,
                                        )
                                    }
                                    title={
                                        structuredExpanded
                                            ? 'Collapse panel'
                                            : 'Expand panel'
                                    }
                                    aria-label={
                                        structuredExpanded
                                            ? 'Collapse panel'
                                            : 'Expand panel'
                                    }
                                >
                                    {structuredExpanded ? (
                                        <PanelRightClose className="size-4" />
                                    ) : (
                                        <PanelRightOpen className="size-4" />
                                    )}
                                </Button>
                                {scrapUrl ? (
                                    <a
                                        href={scrapUrl}
                                        data-test="thinkstream-view-scrap-link"
                                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                                    >
                                        <ExternalLink className="size-3" />
                                        View in Scrap
                                    </a>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Checkbox
                                                checked={deleteCanvasOnSave}
                                                onCheckedChange={(checked) =>
                                                    setDeleteCanvasOnSave(
                                                        checked === true,
                                                    )
                                                }
                                            />
                                            <span>
                                                Delete canvas after saving
                                            </span>
                                        </label>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            data-test="thinkstream-save-scrap-button"
                                            className="h-7 text-xs"
                                            disabled={saving}
                                            onClick={saveToScrap}
                                        >
                                            <BookmarkPlus className="size-3.5" />
                                            {saving
                                                ? 'Saving…'
                                                : 'Save to Scrap'}
                                        </Button>
                                    </div>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7"
                                    onClick={() => {
                                        setStructuredExpanded(false);
                                        setStructuredTitle(null);
                                        setStructuredContent(null);
                                        setStructuredMessage(null);
                                        setScrapUrl(null);
                                    }}
                                >
                                    <X className="size-4" />
                                </Button>
                            </div>
                        </div>
                        {structuredTitle && (
                            <p className="mb-2 text-sm font-medium">
                                {structuredTitle}
                            </p>
                        )}
                        {structuredMessage && (
                            <p className="mb-3 text-xs text-muted-foreground">
                                {structuredMessage}
                            </p>
                        )}
                        <div className="prose prose-sm max-w-none prose-neutral dark:prose-invert">
                            <MarkdownContent
                                content={structuredContent}
                                components={thoughtMarkdownComponents}
                            />
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
