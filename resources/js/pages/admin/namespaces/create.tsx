import { Form, Head, Link, setLayoutProps } from '@inertiajs/react';
import { useRef, useState } from 'react';
import NamespaceController from '@/actions/App/Http/Controllers/Admin/NamespaceController';
import CoverImageDropzone from '@/components/cover-image-dropzone';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dashboard } from '@/routes';
import { create } from '@/routes/admin/namespaces';
import { namespace as namespaceRoute } from '@/routes/admin/posts';
import { index as postsIndex } from '@/routes/admin/posts';

function toSlug(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

type ParentNamespace = {
    id: number;
    name: string;
    full_path: string;
};

export default function Create({
    parentNamespace,
}: {
    parentNamespace?: ParentNamespace | null;
}) {
    const [slug, setSlug] = useState('');
    const [slugTouched, setSlugTouched] = useState(false);
    const composing = useRef(false);
    const createQuery = parentNamespace
        ? `?${new URLSearchParams({ parent: String(parentNamespace.id) }).toString()}`
        : '';
    const createHref = `${create.url()}${createQuery}`;
    const previewPath = parentNamespace
        ? `${parentNamespace.full_path}/${slug || 'your-slug'}`
        : slug || 'your-slug';
    const cancelHref = parentNamespace
        ? namespaceRoute.url(parentNamespace.id)
        : postsIndex.url();

    setLayoutProps({
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'Posts', href: postsIndex.url() },
            ...(parentNamespace
                ? [
                      {
                          title: parentNamespace.name,
                          href: namespaceRoute.url(parentNamespace.id),
                      },
                  ]
                : []),
            {
                title: parentNamespace
                    ? 'New Child Namespace'
                    : 'New Namespace',
                href: createHref,
            },
        ],
    });

    function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        if (!slugTouched && !composing.current) {
            setSlug(toSlug(e.target.value));
        }
    }

    function handleNameCompositionEnd(
        e: React.CompositionEvent<HTMLInputElement>,
    ) {
        composing.current = false;

        if (!slugTouched) {
            setSlug(toSlug((e.target as HTMLInputElement).value));
        }
    }

    function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
        setSlugTouched(true);
        setSlug(e.target.value);
    }

    return (
        <>
            <Head
                title={
                    parentNamespace ? 'New Child Namespace' : 'New Namespace'
                }
            />

            <div className="space-y-6 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">
                        {parentNamespace
                            ? 'New Child Namespace'
                            : 'New Namespace'}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {parentNamespace
                            ? `Create a child namespace inside ${parentNamespace.name}.`
                            : 'Create a namespace to group your posts'}
                    </p>
                </div>

                <Form
                    {...NamespaceController.store.form()}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            {parentNamespace && (
                                <>
                                    <input
                                        type="hidden"
                                        name="parent_id"
                                        value={String(parentNamespace.id)}
                                    />
                                    <div className="grid gap-2">
                                        <Label>Parent</Label>
                                        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                                            /{parentNamespace.full_path}
                                        </div>
                                        <InputError
                                            message={errors.parent_id}
                                        />
                                    </div>
                                </>
                            )}

                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    placeholder="Guides"
                                    onChange={handleNameChange}
                                    onCompositionStart={() => {
                                        composing.current = true;
                                    }}
                                    onCompositionEnd={handleNameCompositionEnd}
                                    required
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="slug">Slug</Label>
                                <Input
                                    id="slug"
                                    name="slug"
                                    placeholder="guides"
                                    value={slug}
                                    onChange={handleSlugChange}
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Lowercase letters, numbers, and hyphens
                                    only. Used in URLs.
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Must be unique among pages and child
                                    namespaces under{' '}
                                    {parentNamespace
                                        ? `/${parentNamespace.full_path}.`
                                        : '/ (the root).'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Path preview: /{previewPath}
                                </p>
                                <InputError message={errors.slug} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">Description</Label>
                                <textarea
                                    id="description"
                                    name="description"
                                    placeholder="Short summary for this namespace"
                                    rows={4}
                                    className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                />
                                <InputError message={errors.description} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="cover_image">Cover Image</Label>
                                <CoverImageDropzone
                                    id="cover_image"
                                    name="cover_image"
                                    error={errors.cover_image}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="hidden"
                                    name="is_published"
                                    value="0"
                                />
                                <input
                                    type="checkbox"
                                    id="is_published"
                                    name="is_published"
                                    value="1"
                                    defaultChecked
                                    className="h-4 w-4 rounded border-input"
                                />
                                <Label htmlFor="is_published">Published</Label>
                            </div>

                            <div className="flex gap-3">
                                <Button type="submit" disabled={processing}>
                                    {parentNamespace
                                        ? 'Create Child Namespace'
                                        : 'Create Namespace'}
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <Link href={cancelHref}>Cancel</Link>
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}
