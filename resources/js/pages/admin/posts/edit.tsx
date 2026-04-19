import { Form, Head, Link, setLayoutProps } from '@inertiajs/react';
import { ExternalLink } from 'lucide-react';
import { useMemo, useState } from 'react';
import InputError from '@/components/input-error';
import MarkdownEditor from '@/components/markdown-editor';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
}: {
    namespace: Namespace;
    post: Post;
}) {
    const initialPublishedAt = post.published_at
        ? new Date(post.published_at).toISOString().slice(0, 16)
        : '';

    const isFutureDate = post.published_at
        ? new Date(post.published_at) > new Date()
        : false;

    const { jumpTo, returnHeading } = useMemo(() => {
        if (typeof window === 'undefined') {
            return { jumpTo: undefined, returnHeading: null };
        }

        const params = new URLSearchParams(window.location.search);
        const jumpParam = params.get('jump');
        const n = Number(jumpParam);

        return {
            jumpTo: Number.isFinite(n) && jumpParam !== null ? n : undefined,
            returnHeading: params.get('return_heading'),
        };
    }, []);

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

    return (
        <>
            <Head title={`Edit: ${post.title}`} />

            <div className="space-y-6 p-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Edit Post</h1>
                        <p className="text-sm text-muted-foreground">
                            {namespace.slug}/{post.slug}
                        </p>
                    </div>
                    {!post.is_draft &&
                        post.published_at &&
                        new Date(post.published_at) <= new Date() && (
                            <Button variant="outline" size="sm" asChild>
                                <a
                                    href={`/${post.full_path}`}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <ExternalLink className="size-4" />
                                    View Live
                                </a>
                            </Button>
                        )}
                </div>

                <Form
                    {...update.form({
                        namespace: namespace.id,
                        post: post.slug,
                    })}
                    className="space-y-6"
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
                                <Input
                                    id="slug"
                                    name="slug"
                                    defaultValue={post.slug}
                                    placeholder="my-post-slug"
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Lowercase letters, numbers, and hyphens
                                    only.
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Must be unique among pages and child
                                    namespaces under /{namespace.full_path}.
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

                            <div className="flex gap-3">
                                <Button type="submit" disabled={processing}>
                                    Save Changes
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <Link
                                        href={show.url({
                                            namespace: namespace.id,
                                            post: post.slug,
                                        })}
                                    >
                                        Cancel
                                    </Link>
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}
