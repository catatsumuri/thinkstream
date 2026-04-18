import { Head, Form, setLayoutProps } from '@inertiajs/react';
import { useState } from 'react';
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
    create,
    store,
} from '@/routes/admin/posts';

type Namespace = {
    id: number;
    slug: string;
    name: string;
};

function toSlug(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

export default function Create({ namespace }: { namespace: Namespace }) {
    setLayoutProps({
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'Posts', href: index.url() },
            { title: namespace.name, href: namespaceRoute.url(namespace.id) },
            { title: 'New Post', href: create.url(namespace.id) },
        ],
    });

    const [slug, setSlug] = useState('');
    const [slugTouched, setSlugTouched] = useState(false);
    const [isDraft, setIsDraft] = useState(false);
    const [scheduleEnabled, setScheduleEnabled] = useState(false);
    const [publishedAt, setPublishedAt] = useState('');
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

    function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
        if (!slugTouched) {
            setSlug(toSlug(e.target.value));
        }
    }

    function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
        setSlugTouched(true);
        setSlug(e.target.value);
    }

    return (
        <>
            <Head title="New Post" />

            <div className="space-y-6 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">New Post</h1>
                    <p className="text-sm text-muted-foreground">
                        in <span className="font-medium">{namespace.name}</span>
                    </p>
                </div>

                <Form {...store.form(namespace.id)} className="space-y-6">
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    placeholder="Post title"
                                    onChange={handleTitleChange}
                                    required
                                />
                                <InputError message={errors.title} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="slug">Slug</Label>
                                <Input
                                    id="slug"
                                    name="slug"
                                    placeholder="my-post-slug"
                                    value={slug}
                                    onChange={handleSlugChange}
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Lowercase letters, numbers, and hyphens
                                    only.
                                </p>
                                <InputError message={errors.slug} />
                            </div>

                            <MarkdownEditor
                                name="content"
                                error={errors.content}
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
                                    {isDraft ? 'Save Draft' : 'Create Post'}
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <a href={namespaceRoute.url(namespace.id)}>
                                        Cancel
                                    </a>
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}
