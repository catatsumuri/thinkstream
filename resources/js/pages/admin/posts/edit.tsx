import { Form, Head, setLayoutProps } from '@inertiajs/react';
import { Check, Save } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import InputError from '@/components/input-error';
import MarkdownEditor from '@/components/markdown-editor';
import PostHeader from '@/components/post-header';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
};

type Post = {
    id: number;
    slug: string;
    full_path: string;
    title: string;
    content: string;
    is_draft: boolean;
    published_at: string | null;
};

export default function Edit({
    namespace,
    post,
    slugPrefix,
}: {
    namespace: Namespace;
    post: Post;
    slugPrefix: string;
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

    const [saved, setSaved] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [isDraft, setIsDraft] = useState(post.is_draft);
    const [scheduleEnabled, setScheduleEnabled] = useState(isFutureDate);
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

    return (
        <>
            <Head title={`Edit: ${post.title}`} />

            <div className="space-y-6 p-4">
                <PostHeader
                    namespace={namespace}
                    post={post}
                    mode="edit"
                    hasUnsavedChanges={hasUnsavedChanges}
                />

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
                    className="space-y-6"
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
                            <div className="grid gap-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    defaultValue={post.title}
                                    placeholder="Post title"
                                    required
                                />
                                <InputError message={errors.title} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="slug">Slug</Label>
                                <div className="flex rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                                    <span className="inline-flex items-center border-r border-input bg-muted/30 px-3 text-sm whitespace-nowrap text-muted-foreground">
                                        {slugPrefix}
                                    </span>
                                    <Input
                                        id="slug"
                                        name="slug"
                                        defaultValue={post.slug}
                                        placeholder="my-post-slug"
                                        className={cn(
                                            'rounded-l-none border-0 shadow-none focus-visible:border-0 focus-visible:ring-0',
                                        )}
                                        required
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Lowercase letters, numbers, and hyphens
                                    only.
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Must be unique among pages and child
                                    namespaces under /{namespace.full_path}.
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Path preview: /{slugPrefix}
                                    {post.slug}
                                </p>
                                <InputError message={errors.slug} />
                            </div>

                            <MarkdownEditor
                                name="content"
                                defaultValue={post.content}
                                error={errors.content}
                                uploadUrl={uploadImage.url({
                                    namespace: namespace.id,
                                    post: post.slug,
                                })}
                                jumpTo={jumpTo}
                            />

                            <div className="flex items-center gap-2">
                                <input
                                    type="hidden"
                                    name="is_draft"
                                    value={isDraft ? '1' : '0'}
                                />
                                <Checkbox
                                    id="is_draft"
                                    checked={isDraft}
                                    onCheckedChange={(checked) => {
                                        const nextIsDraft = checked === true;

                                        setIsDraft(nextIsDraft);

                                        if (nextIsDraft) {
                                            setRelativeTimeHint(null);
                                        }
                                    }}
                                />
                                <Label htmlFor="is_draft">Save as draft</Label>
                            </div>

                            <div className="grid gap-3">
                                <div className="flex items-center gap-3">
                                    <Switch
                                        id="schedule_toggle"
                                        checked={scheduleEnabled && !isDraft}
                                        onCheckedChange={(checked) => {
                                            setScheduleEnabled(checked);

                                            if (!checked) {
                                                setPublishedAt('');
                                                setRelativeTimeHint(null);
                                            }
                                        }}
                                        disabled={isDraft}
                                    />
                                    <Label htmlFor="schedule_toggle">
                                        Enable scheduled publishing
                                    </Label>
                                </div>
                                <input
                                    type="hidden"
                                    name="published_at"
                                    value={
                                        scheduleEnabled && !isDraft
                                            ? publishedAt
                                            : ''
                                    }
                                />
                                {scheduleEnabled && !isDraft && (
                                    <div className="flex flex-wrap items-center gap-3">
                                        <Input
                                            id="published_at"
                                            type="datetime-local"
                                            className="w-fit"
                                            value={publishedAt}
                                            onChange={(e) => {
                                                const nextValue =
                                                    e.target.value;

                                                setPublishedAt(nextValue);
                                                setRelativeTimeHint(
                                                    getRelativeTimeHint(
                                                        nextValue,
                                                        Date.now(),
                                                    ),
                                                );
                                            }}
                                        />
                                        {relativeTimeHint && (
                                            <p className="text-sm text-muted-foreground">
                                                {relativeTimeHint}
                                            </p>
                                        )}
                                    </div>
                                )}
                                <InputError message={errors.published_at} />
                            </div>

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
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}
