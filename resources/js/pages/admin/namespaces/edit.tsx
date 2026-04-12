import { Head, setLayoutProps } from '@inertiajs/react';
import { Form } from '@inertiajs/react';
import NamespaceController from '@/actions/App/Http/Controllers/Admin/NamespaceController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dashboard } from '@/routes';
import { edit } from '@/routes/admin/namespaces';
import { index as postsIndex } from '@/routes/admin/posts';

type Namespace = {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    is_published: boolean;
};

export default function Edit({ namespace }: { namespace: Namespace }) {
    setLayoutProps({
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'Posts', href: postsIndex.url() },
            { title: namespace.name, href: edit.url(namespace.slug) },
        ],
    });

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

                <Form
                    {...NamespaceController.update.form(namespace.slug)}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    defaultValue={namespace.name}
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
                                    defaultValue={namespace.slug}
                                    placeholder="guides"
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Lowercase letters, numbers, and hyphens
                                    only. Used in URLs.
                                </p>
                                <InputError message={errors.slug} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">Description</Label>
                                <textarea
                                    id="description"
                                    name="description"
                                    defaultValue={namespace.description ?? ''}
                                    placeholder="Short summary for this namespace"
                                    rows={4}
                                    className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                />
                                <InputError message={errors.description} />
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
                                    defaultChecked={namespace.is_published}
                                    className="h-4 w-4 rounded border-input"
                                />
                                <Label htmlFor="is_published">Published</Label>
                            </div>

                            <div className="flex gap-3">
                                <Button type="submit" disabled={processing}>
                                    Save Changes
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <a href={postsIndex.url()}>Cancel</a>
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}
