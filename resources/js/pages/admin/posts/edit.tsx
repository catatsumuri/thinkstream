import { Form, Head, setLayoutProps } from '@inertiajs/react';
import PostController from '@/actions/App/Http/Controllers/Admin/PostController';
import MarkdownEditor from '@/components/markdown-editor';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dashboard } from '@/routes';
import { index, edit } from '@/routes/admin/posts';

type Post = {
    id: number;
    title: string;
    slug: string;
    content: string;
    published_at: string | null;
};

export default function Edit({ post }: { post: Post }) {
    const publishedAt = post.published_at
        ? new Date(post.published_at).toISOString().slice(0, 16)
        : '';

    setLayoutProps({
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'Posts', href: index.url() },
            { title: post.title, href: edit.url(post.slug) },
        ],
    });

    return (
        <>
            <Head title={`Edit: ${post.title}`} />

            <div className="space-y-6 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">Edit Post</h1>
                    <p className="text-sm text-muted-foreground">{post.slug}</p>
                </div>

                <Form
                    {...PostController.update.form(post.slug)}
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
                                />
                                <InputError message={errors.published_at} />
                            </div>

                            <div className="flex gap-3">
                                <Button type="submit" disabled={processing}>
                                    Save Changes
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
