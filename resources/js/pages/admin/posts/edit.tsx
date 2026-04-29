import { Form, Head, Link, setLayoutProps, useHttp } from '@inertiajs/react';
import {
    ArrowLeft,
    Calendar,
    Check,
    Expand,
    Eye,
    EyeOff,
    FolderSync,
    Link2,
    Minimize2,
    Save,
    Sparkles,
    Tag,
} from 'lucide-react';
import { Languages } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import PostController from '@/actions/App/Http/Controllers/Admin/PostController';
import InputError from '@/components/input-error';
import MarkdownEditor from '@/components/markdown-editor';
import type { MarkdownEditorRef } from '@/components/markdown-editor';
import TagInput from '@/components/tag-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import ViewContextBadge from '@/components/view-context-badge';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import {
    index,
    namespace as namespaceRoute,
    show,
    update,
    uploadImage,
} from '@/routes/admin/posts';

type Namespace = {
    id: number;
    slug: string;
    full_path: string;
    name: string;
    is_system: boolean;
};

type Post = {
    id: number;
    slug: string;
    full_path: string;
    title: string;
    content: string;
    is_draft: boolean;
    published_at: string | null;
    reference_title: string | null;
    reference_url: string | null;
    tags: string[];
    is_syncing: boolean;
    sync_file_path: string | null;
};

export default function Edit({
    namespace,
    post,
    slugPrefix,
    availableTags,
    aiEnabled,
}: {
    namespace: Namespace;
    post: Post;
    slugPrefix: string;
    availableTags: string[];
    aiEnabled: boolean;
}) {
    const initialPublishedAt = post.published_at
        ? new Date(post.published_at).toISOString().slice(0, 16)
        : '';

    const isFutureDate = post.published_at
        ? new Date(post.published_at) > new Date()
        : false;

    const { jumpTo, returnHeading, returnTo } = useMemo(() => {
        if (typeof window === 'undefined') {
            return { jumpTo: undefined, returnHeading: null, returnTo: null };
        }

        const params = new URLSearchParams(window.location.search);
        const jumpParam = params.get('jump');
        const n = Number(jumpParam);

        return {
            jumpTo: Number.isFinite(n) && jumpParam !== null ? n : undefined,
            returnHeading: params.get('return_heading'),
            returnTo: params.get('return_to'),
        };
    }, []);

    const editorRef = useRef<MarkdownEditorRef>(null);
    const [hasSelection, setHasSelection] = useState(false);
    const {
        setData: setStructureData,
        post: structurePost,
        processing: structuring,
    } = useHttp({ content: '' });
    const {
        setData: setTranslateData,
        post: translatePost,
        processing: translating,
    } = useHttp({ content: '' });

    function runSelectionAction(
        post: (url: string, options: object) => Promise<unknown>,
        url: string,
    ) {
        const selection = editorRef.current?.getSelection();

        if (!selection) {
            return;
        }

        post(url, {
            onSuccess: (response: unknown) => {
                const { content, message } = response as {
                    content: string;
                    message: string;
                };
                editorRef.current?.replaceRange(
                    selection.start,
                    selection.end,
                    content,
                );
                toast.success(message);
            },
            onError: (errors: Record<string, string>) => {
                toast.error(errors.content ?? 'Failed to process content.');
            },
        }).catch(() => {
            toast.error('AI request failed. Try selecting less content.');
        });
    }

    function structureMarkdown() {
        runSelectionAction(
            structurePost,
            PostController.structureMarkdown.url({
                namespace: namespace.id,
                post: post.slug,
            }),
        );
    }

    function translateMarkdown() {
        runSelectionAction(
            translatePost,
            PostController.translateMarkdown.url({
                namespace: namespace.id,
                post: post.slug,
            }),
        );
    }

    const [metaPanelOpen, setMetaPanelOpen] = useState(true);
    const [slug, setSlug] = useState(post.slug);

    const [saved, setSaved] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [isDraft, setIsDraft] = useState(post.is_draft);
    const [scheduleEnabled, setScheduleEnabled] = useState(isFutureDate);
    const [currentTags, setCurrentTags] = useState<string[]>(post.tags);
    const [publishedAt, setPublishedAt] = useState(
        isFutureDate ? initialPublishedAt : '',
    );
    const [relativeTimeHint, setRelativeTimeHint] = useState<string | null>(
        null,
    );

    function getRelativeTimeHint(value: string, now: number): string | null {
        if (!value) {
            return null;
        }

        const diff = new Date(value).getTime() - now;

        if (diff <= 0) {
            return 'This date is in the past.';
        }

        const minutes = Math.round(diff / 60000);

        if (minutes < 60) {
            return `Publishes in ${minutes} minute${minutes !== 1 ? 's' : ''}.`;
        }

        const hours = Math.round(diff / 3600000);

        if (hours < 24) {
            return `Publishes in ${hours} hour${hours !== 1 ? 's' : ''}.`;
        }

        const days = Math.round(diff / 86400000);

        return `Publishes in ${days} day${days !== 1 ? 's' : ''}.`;
    }

    setLayoutProps({
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'Namespaces', href: index.url() },
            { title: namespace.name, href: namespaceRoute.url(namespace.id) },
            {
                title: post.title,
                href: show.url({ namespace: namespace.id, post: post.slug }),
            },
            { title: 'Edit' },
        ],
    });

    useEffect(() => {
        if (!hasUnsavedChanges) {
            return;
        }

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [hasUnsavedChanges]);

    function confirmNavigation(): boolean {
        if (!hasUnsavedChanges) {
            return true;
        }

        return window.confirm(
            'You have unsaved changes. Leave this page without saving?',
        );
    }

    return (
        <>
            <Head title={`Edit: ${post.title}`} />

            <div>
                <Form
                    {...update.form({
                        namespace: namespace.id,
                        post: post.slug,
                    })}
                    options={{ preserveScroll: true }}
                    onSuccess={() => {
                        setHasUnsavedChanges(false);
                        setSaved(true);

                        if (savedTimer.current) {
                            clearTimeout(savedTimer.current);
                        }

                        savedTimer.current = setTimeout(
                            () => setSaved(false),
                            2500,
                        );
                    }}
                    className=""
                    onInputCapture={() => setHasUnsavedChanges(true)}
                    onChangeCapture={() => setHasUnsavedChanges(true)}
                >
                    {({ processing, errors }) => (
                        <>
                            {returnHeading && (
                                <input
                                    type="hidden"
                                    name="return_heading"
                                    value={returnHeading}
                                />
                            )}
                            {returnTo && (
                                <input
                                    type="hidden"
                                    name="return_to"
                                    value={returnTo}
                                />
                            )}

                            {post.is_syncing && (
                                <div className="flex items-start gap-3 border-b border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950/40">
                                    <FolderSync className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                                    <div>
                                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                            Sync mode active — editing disabled
                                        </p>
                                        {post.sync_file_path && (
                                            <p className="mt-0.5 font-mono text-xs text-blue-600 dark:text-blue-400">
                                                {post.sync_file_path}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            <fieldset
                                disabled={post.is_syncing}
                                className="contents"
                            >
                                <div className="flex flex-col xl:flex-row">
                                    {/* Main content */}
                                    <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">
                                        <div className="mb-4 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <Button
                                                    variant="outline"
                                                    asChild
                                                >
                                                    <Link
                                                        data-test="view-post-link"
                                                        href={show.url({
                                                            namespace:
                                                                namespace.id,
                                                            post: post.slug,
                                                        })}
                                                        onClick={(event) => {
                                                            if (
                                                                !confirmNavigation()
                                                            ) {
                                                                event.preventDefault();
                                                            }
                                                        }}
                                                    >
                                                        <ArrowLeft className="size-4" />
                                                        View Post
                                                    </Link>
                                                </Button>
                                                <ViewContextBadge
                                                    label="Admin View"
                                                    variant="admin"
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                data-test="edit-meta-panel-toggle"
                                                aria-expanded={metaPanelOpen}
                                                onClick={() =>
                                                    setMetaPanelOpen(
                                                        (value) => !value,
                                                    )
                                                }
                                                title={
                                                    metaPanelOpen
                                                        ? 'Hide metadata panel'
                                                        : 'Show metadata panel'
                                                }
                                            >
                                                {metaPanelOpen ? (
                                                    <Expand className="size-4" />
                                                ) : (
                                                    <Minimize2 className="size-4" />
                                                )}
                                            </Button>
                                        </div>

                                        {/* Borderless title */}
                                        <div className="mb-4">
                                            <input
                                                type="text"
                                                id="title"
                                                name="title"
                                                defaultValue={post.title}
                                                placeholder="Post title..."
                                                className="w-full border-0 border-b-2 border-border/40 bg-transparent pb-1 text-2xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground/40 focus:border-ring focus:outline-none sm:text-3xl lg:text-4xl"
                                                required
                                            />
                                            <InputError
                                                message={errors.title}
                                            />
                                        </div>

                                        {/* Inline monospace slug */}
                                        <div className="mb-2 flex flex-wrap items-center gap-1 font-mono text-sm">
                                            <span className="text-muted-foreground/50">
                                                /{slugPrefix}
                                            </span>
                                            <Input
                                                id="slug"
                                                name="slug"
                                                value={slug}
                                                onChange={(event) =>
                                                    setSlug(event.target.value)
                                                }
                                                placeholder="slug"
                                                required
                                                className="w-auto min-w-0 border-0 border-b-2 border-dashed border-input bg-transparent px-1 py-0.5 shadow-none focus-visible:border-ring focus-visible:ring-0"
                                            />
                                            <InputError message={errors.slug} />
                                        </div>
                                        <div className="mb-8 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                                                /{slugPrefix}
                                                {slug || 'slug'}
                                            </code>
                                            <span className="text-xs text-muted-foreground">
                                                Lowercase, numbers, hyphens ·
                                                unique under /
                                                {namespace.full_path}
                                            </span>
                                        </div>

                                        <MarkdownEditor
                                            ref={editorRef}
                                            name="content"
                                            defaultValue={post.content}
                                            error={errors.content}
                                            uploadUrl={uploadImage.url({
                                                namespace: namespace.id,
                                                post: post.slug,
                                            })}
                                            jumpTo={jumpTo}
                                            disabled={
                                                structuring || translating
                                            }
                                            onSelectionChange={
                                                aiEnabled && !post.is_syncing
                                                    ? (has) => {
                                                          setHasSelection(has);

                                                          if (has) {
                                                              const sel =
                                                                  editorRef.current?.getSelection();

                                                              if (sel) {
                                                                  setStructureData(
                                                                      'content',
                                                                      sel.text,
                                                                  );

                                                                  setTranslateData(
                                                                      'content',
                                                                      sel.text,
                                                                  );
                                                              }
                                                          }
                                                      }
                                                    : undefined
                                            }
                                            toolbar={
                                                aiEnabled &&
                                                !post.is_syncing ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={
                                                                !hasSelection ||
                                                                structuring ||
                                                                translating
                                                            }
                                                            title={
                                                                !hasSelection
                                                                    ? 'Select text in the editor to structure it'
                                                                    : undefined
                                                            }
                                                            onClick={
                                                                structureMarkdown
                                                            }
                                                        >
                                                            {structuring ? (
                                                                <Spinner className="mr-1.5" />
                                                            ) : (
                                                                <Sparkles className="mr-1.5 size-3.5" />
                                                            )}
                                                            {structuring
                                                                ? 'Structuring…'
                                                                : 'Structure'}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={
                                                                !hasSelection ||
                                                                structuring ||
                                                                translating
                                                            }
                                                            title={
                                                                !hasSelection
                                                                    ? 'Select text in the editor to translate it'
                                                                    : undefined
                                                            }
                                                            onClick={
                                                                translateMarkdown
                                                            }
                                                        >
                                                            {translating ? (
                                                                <Spinner className="mr-1.5" />
                                                            ) : (
                                                                <Languages className="mr-1.5 size-3.5" />
                                                            )}
                                                            {translating
                                                                ? 'Translating…'
                                                                : 'Translate'}
                                                        </Button>
                                                    </div>
                                                ) : undefined
                                            }
                                        />
                                    </main>

                                    {/* Sidebar */}
                                    <aside
                                        data-test="edit-meta-panel"
                                        className={cn(
                                            'w-full shrink-0 border-t border-border px-4 py-6 xl:w-80 xl:border-t-0 xl:border-l xl:py-8 xl:pr-6',
                                            !metaPanelOpen && 'hidden',
                                        )}
                                    >
                                        <div className="sticky top-20 space-y-5">
                                            {/* Status card */}
                                            <div className="overflow-hidden rounded-xl border border-border bg-card">
                                                <div className="border-b border-border px-4 py-3">
                                                    <h3 className="text-sm font-semibold">
                                                        Status
                                                    </h3>
                                                </div>
                                                <div className="p-4">
                                                    <input
                                                        type="hidden"
                                                        name="is_draft"
                                                        value={
                                                            namespace.is_system
                                                                ? '1'
                                                                : isDraft
                                                                  ? '1'
                                                                  : '0'
                                                        }
                                                    />
                                                    {namespace.is_system ? (
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex size-9 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                                                                <EyeOff className="size-4 text-violet-600 dark:text-violet-400" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium">
                                                                    Always
                                                                    private
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    System
                                                                    namespace —
                                                                    cannot be
                                                                    published
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div
                                                                    className={cn(
                                                                        'flex size-9 items-center justify-center rounded-lg',
                                                                        isDraft
                                                                            ? 'bg-amber-100 dark:bg-amber-900/30'
                                                                            : 'bg-green-100 dark:bg-green-900/30',
                                                                    )}
                                                                >
                                                                    {isDraft ? (
                                                                        <EyeOff className="size-4 text-amber-700 dark:text-amber-400" />
                                                                    ) : (
                                                                        <Eye className="size-4 text-green-700 dark:text-green-400" />
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-medium">
                                                                        {isDraft
                                                                            ? 'Draft'
                                                                            : 'Published'}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {isDraft
                                                                            ? 'Not visible'
                                                                            : 'Visible to everyone'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <Switch
                                                                checked={
                                                                    !isDraft
                                                                }
                                                                onCheckedChange={(
                                                                    checked,
                                                                ) => {
                                                                    setIsDraft(
                                                                        !checked,
                                                                    );

                                                                    if (
                                                                        !checked
                                                                    ) {
                                                                        setRelativeTimeHint(
                                                                            null,
                                                                        );
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    )}

                                                    {!namespace.is_system &&
                                                        !isDraft && (
                                                            <div className="mt-4 border-t border-border pt-4">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <Calendar className="size-4 text-muted-foreground" />
                                                                        <Label className="text-sm font-normal">
                                                                            Schedule
                                                                        </Label>
                                                                    </div>
                                                                    <Switch
                                                                        id="schedule_toggle"
                                                                        checked={
                                                                            scheduleEnabled
                                                                        }
                                                                        onCheckedChange={(
                                                                            checked,
                                                                        ) => {
                                                                            setScheduleEnabled(
                                                                                checked,
                                                                            );

                                                                            if (
                                                                                !checked
                                                                            ) {
                                                                                setPublishedAt(
                                                                                    '',
                                                                                );
                                                                                setRelativeTimeHint(
                                                                                    null,
                                                                                );
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>
                                                                <input
                                                                    type="hidden"
                                                                    name="published_at"
                                                                    value={
                                                                        scheduleEnabled
                                                                            ? publishedAt
                                                                            : ''
                                                                    }
                                                                />
                                                                {scheduleEnabled && (
                                                                    <div className="mt-3 space-y-2">
                                                                        <Input
                                                                            id="published_at"
                                                                            type="datetime-local"
                                                                            className="text-sm"
                                                                            value={
                                                                                publishedAt
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) => {
                                                                                const nextValue =
                                                                                    e
                                                                                        .target
                                                                                        .value;
                                                                                setPublishedAt(
                                                                                    nextValue,
                                                                                );
                                                                                setRelativeTimeHint(
                                                                                    getRelativeTimeHint(
                                                                                        nextValue,
                                                                                        Date.now(),
                                                                                    ),
                                                                                );
                                                                            }}
                                                                        />
                                                                        {relativeTimeHint && (
                                                                            <p className="text-xs text-muted-foreground">
                                                                                {
                                                                                    relativeTimeHint
                                                                                }
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                <InputError
                                                                    message={
                                                                        errors.published_at
                                                                    }
                                                                />
                                                            </div>
                                                        )}
                                                    {(namespace.is_system ||
                                                        isDraft) && (
                                                        <input
                                                            type="hidden"
                                                            name="published_at"
                                                            value=""
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Tags card */}
                                            <div className="overflow-hidden rounded-xl border border-border bg-card">
                                                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                                                    <h3 className="text-sm font-semibold">
                                                        Tags
                                                    </h3>
                                                    <Tag className="size-3.5 text-muted-foreground" />
                                                </div>
                                                <div className="p-4">
                                                    <TagInput
                                                        tags={currentTags}
                                                        onChange={(next) => {
                                                            setCurrentTags(
                                                                next,
                                                            );
                                                            setHasUnsavedChanges(
                                                                true,
                                                            );
                                                        }}
                                                        availableTags={
                                                            availableTags
                                                        }
                                                    />
                                                    <p className="mt-2 text-xs text-muted-foreground">
                                                        Lowercase letters,
                                                        numbers, and hyphens
                                                        only. Press Enter or
                                                        comma to add.
                                                    </p>
                                                    <InputError
                                                        message={
                                                            errors['tags'] ??
                                                            errors['tags.0']
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            {/* Reference card */}
                                            <div className="overflow-hidden rounded-xl border border-dashed border-border bg-muted/20">
                                                <div className="flex items-center justify-between border-b border-dashed border-border px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-sm font-semibold">
                                                            Reference
                                                        </h3>
                                                        <span className="text-xs text-muted-foreground">
                                                            (optional)
                                                        </span>
                                                    </div>
                                                    <Link2 className="size-3.5 text-muted-foreground" />
                                                </div>
                                                <div className="space-y-4 p-4">
                                                    <div className="space-y-1.5">
                                                        <Label
                                                            htmlFor="reference_title"
                                                            className="text-xs text-muted-foreground"
                                                        >
                                                            Title
                                                        </Label>
                                                        <Input
                                                            id="reference_title"
                                                            name="reference_title"
                                                            placeholder="Reference title"
                                                            defaultValue={
                                                                post.reference_title ??
                                                                ''
                                                            }
                                                        />
                                                        <InputError
                                                            message={
                                                                errors.reference_title
                                                            }
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label
                                                            htmlFor="reference_url"
                                                            className="text-xs text-muted-foreground"
                                                        >
                                                            URL
                                                        </Label>
                                                        <Input
                                                            id="reference_url"
                                                            name="reference_url"
                                                            type="url"
                                                            placeholder="https://example.com"
                                                            defaultValue={
                                                                post.reference_url ??
                                                                ''
                                                            }
                                                        />
                                                        <InputError
                                                            message={
                                                                errors.reference_url
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </aside>
                                </div>

                                {!post.is_syncing && (
                                    <div className="fixed right-6 bottom-6 z-50">
                                        <Button
                                            data-test="save-post-button"
                                            type="submit"
                                            disabled={
                                                processing ||
                                                (!hasUnsavedChanges && !saved)
                                            }
                                            size="lg"
                                            className={`gap-2.5 rounded-full px-6 shadow-xl transition-all hover:scale-105 active:scale-95 disabled:scale-100 disabled:shadow-none ${saved ? 'bg-green-600 shadow-green-600/30 hover:bg-green-600' : hasUnsavedChanges ? 'shadow-primary/30' : 'bg-muted text-muted-foreground hover:bg-muted'}`}
                                        >
                                            {saved ? (
                                                <>
                                                    <Check className="size-4.5" />
                                                    Saved
                                                </>
                                            ) : hasUnsavedChanges ? (
                                                <>
                                                    <Save className="size-4.5" />
                                                    Unsaved · Save Changes
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="size-4.5" />
                                                    Save Changes
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </fieldset>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}
