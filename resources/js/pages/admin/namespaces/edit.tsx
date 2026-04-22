import { Head, setLayoutProps, useForm } from '@inertiajs/react';
import NamespaceController from '@/actions/App/Http/Controllers/Admin/NamespaceController';
import CoverImageDropzone from '@/components/cover-image-dropzone';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dashboard } from '@/routes';
import {
    index as namespacesIndex,
    namespace as namespaceRoute,
} from '@/routes/admin/posts';

type Ancestor = {
    id: number;
    name: string;
};

type Namespace = {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    is_published: boolean;
    cover_image_url: string | null;
};

export default function Edit({
    ancestors,
    namespace,
}: {
    ancestors: Ancestor[];
    namespace: Namespace;
}) {
    setLayoutProps({
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'Namespaces', href: namespacesIndex.url() },
            ...ancestors.map((ancestor) => ({
                title: ancestor.name,
                href: namespaceRoute.url(ancestor.id),
            })),
            { title: namespace.name, href: namespaceRoute.url(namespace.id) },
            { title: 'Edit' },
        ],
    });

    const { data, setData, post, processing, errors } = useForm<{
        _method: string;
        name: string;
        slug: string;
        description: string;
        is_published: boolean;
        cover_image: File | null;
    }>({
        _method: 'put',
        name: namespace.name,
        slug: namespace.slug,
        description: namespace.description ?? '',
        is_published: namespace.is_published,
        cover_image: null,
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(NamespaceController.update.url(namespace.id));
    }

    return (
        <>
            <Head title={`Edit: ${namespace.name}`} />

            <div className="space-y-6 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">Edit Namespace</h1>
                    <p className="text-sm text-muted-foreground">
                        {namespace.slug}
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            name="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="Guides"
                            required
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="slug">Slug</Label>
                        <Input
                            id="slug"
                            name="slug"
                            value={data.slug}
                            onChange={(e) => setData('slug', e.target.value)}
                            placeholder="guides"
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            Lowercase letters, numbers, and hyphens only. Used
                            in URLs.
                        </p>
                        <InputError message={errors.slug} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <textarea
                            id="description"
                            name="description"
                            value={data.description}
                            onChange={(e) =>
                                setData('description', e.target.value)
                            }
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
                            currentImageUrl={namespace.cover_image_url}
                            onChange={(file) => setData('cover_image', file)}
                            error={errors.cover_image}
                        />
                        <p className="text-xs text-muted-foreground">
                            Saved with 16:9 cropping. Recommended size is at
                            least 1600x900.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="is_published"
                            checked={data.is_published}
                            onChange={(e) =>
                                setData('is_published', e.target.checked)
                            }
                            className="h-4 w-4 rounded border-input"
                        />
                        <Label htmlFor="is_published">Published</Label>
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
                </form>
            </div>
        </>
    );
}
