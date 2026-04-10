import { useState } from 'react';
import { Head } from '@inertiajs/react';
import { Form } from '@inertiajs/react';
import PostController from '@/actions/App/Http/Controllers/Admin/PostController';
import MarkdownEditor from '@/components/markdown-editor';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dashboard } from '@/routes';
import { index, create } from '@/routes/admin/posts';

function toSlug(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

export default function Create() {
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
                        Create a new markdown post
                    </p>
                </div>

                <Form {...PostController.store.form()} className="space-y-6">
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
                                    <a href={index.url()}>Cancel</a>
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

Create.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Posts', href: index.url() },
        { title: 'New Post', href: create.url() },
    ],
};
