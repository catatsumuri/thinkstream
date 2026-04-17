import { Form, Head, setLayoutProps } from '@inertiajs/react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import MarkdownEditor from '@/components/markdown-editor';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dashboard } from '@/routes';
import {
    index,
    namespace as namespaceRoute,
    edit,
    update,
} from '@/routes/admin/posts';

type Namespace = {
    id: number;
    slug: string;
    name: string;
};

type Post = {
    id: number;
    slug: string;
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
    const publishedAt = post.published_at
        ? new Date(post.published_at).toISOString().slice(0, 16)
        : '';

    const [isDraft, setIsDraft] = useState(post.is_draft);

    setLayoutProps({
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'Posts', href: index.url() },
            { title: namespace.name, href: namespaceRoute.url(namespace.id) },
            {
                title: post.title,
                href: edit.url({ namespace: namespace.id, post: post.slug }),
            },
        ],
    });

    return (
        <>
            <Head title={`Edit: ${post.title}`} />

            <div className="space-y-6 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">Edit Post</h1>
                    <p className="text-sm text-muted-foreground">
                        {namespace.slug}/{post.slug}
                    </p>
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
                                <InputError message={errors.slug} />
                            </div>

                            <MarkdownEditor
                                name="content"
                                defaultValue={post.content}
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
                                    onCheckedChange={(checked) =>
                                        setIsDraft(checked === true)
                                    }
                                />
                                <Label htmlFor="is_draft">Save as draft</Label>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="published_at">
                                    Publish date (optional)
                                </Label>
                                <Input
                                    id="published_at"
                                    name="published_at"
                                    type="datetime-local"
                                    defaultValue={publishedAt}
                                    className="w-fit"
                                    disabled={isDraft}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Leave blank to publish immediately.
                                </p>
                                <InputError message={errors.published_at} />
                            </div>

                            <div className="flex gap-3">
                                <Button type="submit" disabled={processing}>
                                    Save Changes
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
