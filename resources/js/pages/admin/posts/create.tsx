import { Head, Form, setLayoutProps } from '@inertiajs/react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import MarkdownEditor from '@/components/markdown-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
            { title: namespace.name, href: namespaceRoute.url(namespace.slug) },
            { title: 'New Post', href: create.url(namespace.slug) },
        ],
    });

    const [slug, setSlug] = useState('');
    const [slugTouched, setSlugTouched] = useState(false);

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

                <Form {...store.form(namespace.slug)} className="space-y-6">
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

                            <div className="grid gap-2">
                                <Label htmlFor="published_at">
                                    Publish date (optional)
                                </Label>
                                <Input
                                    id="published_at"
                                    name="published_at"
                                    type="datetime-local"
                                    className="w-fit"
                                />
                                <InputError message={errors.published_at} />
                            </div>

                            <div className="flex gap-3">
                                <Button type="submit" disabled={processing}>
                                    Create Post
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <a
                                        href={namespaceRoute.url(
                                            namespace.slug,
                                        )}
                                    >
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
