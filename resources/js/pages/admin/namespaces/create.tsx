import { Head } from '@inertiajs/react';
import { Form } from '@inertiajs/react';
import { useRef, useState } from 'react';
import NamespaceController from '@/actions/App/Http/Controllers/Admin/NamespaceController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dashboard } from '@/routes';
import { create } from '@/routes/admin/namespaces';
import { index as postsIndex } from '@/routes/admin/posts';

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
    const composing = useRef(false);

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
            <Head title="New Namespace" />

            <div className="space-y-6 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">New Namespace</h1>
                    <p className="text-sm text-muted-foreground">
                        Create a namespace to group your posts
                    </p>
                </div>

                <Form
                    {...NamespaceController.store.form()}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
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
                                <Input
                                    id="cover_image"
                                    name="cover_image"
                                    type="file"
                                    accept="image/*"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Optional. JPEG, PNG, GIF, or WebP. Max 2MB.
                                </p>
                                <InputError message={errors.cover_image} />
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
                                    Create Namespace
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

Create.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Posts', href: postsIndex.url() },
        { title: 'New Namespace', href: create.url() },
    ],
};
