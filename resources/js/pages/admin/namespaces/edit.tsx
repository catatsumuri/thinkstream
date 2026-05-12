import { Head, router, setLayoutProps, useForm } from '@inertiajs/react';
import { ExternalLink, Sparkles, Trash2 } from 'lucide-react';
import { useState } from 'react';
import NamespaceController, {
    deleteCoverImage,
} from '@/actions/App/Http/Controllers/Admin/NamespaceController';
import CoverImageDropzone from '@/components/cover-image-dropzone';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
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
    parent_id: number | null;
    slug: string;
    full_path: string;
    name: string;
    description: string | null;
    is_published: boolean;
    is_system: boolean;
    display_mode: string | null;
    cover_image_url: string | null;
};

type AvailableParent = {
    id: number;
    name: string;
    full_path: string;
};

export default function Edit({
    ancestors,
    namespace,
    availableParents,
    aiEnabled,
}: {
    ancestors: Ancestor[];
    namespace: Namespace;
    availableParents: AvailableParent[];
    aiEnabled: boolean;
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

    const [generating, setGenerating] = useState(false);
    const [deletingCoverImage, setDeletingCoverImage] = useState(false);
    const [additionalPrompt, setAdditionalPrompt] = useState('');
    const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
    const [showDeleteCoverImageConfirm, setShowDeleteCoverImageConfirm] =
        useState(false);

    function generateCoverImage() {
        setShowGenerateConfirm(false);
        router.post(
            NamespaceController.generateCoverImage.url(namespace.id),
            { additional_prompt: additionalPrompt },
            {
                onStart: () => setGenerating(true),
                onFinish: () => setGenerating(false),
            },
        );
    }

    function handleDeleteCoverImageClick() {
        setShowDeleteCoverImageConfirm(true);
    }

    function confirmDeleteCoverImage() {
        setShowDeleteCoverImageConfirm(false);
        router.delete(deleteCoverImage.url(namespace.id), {
            onStart: () => setDeletingCoverImage(true),
            onFinish: () => setDeletingCoverImage(false),
        });
    }

    function handleGenerateClick() {
        if (namespace.cover_image_url) {
            setShowGenerateConfirm(true);
        } else {
            generateCoverImage();
        }
    }

    const { data, setData, post, processing, errors, transform } = useForm<{
        _method: string;
        parent_id: number | null;
        name: string;
        slug: string;
        description: string;
        is_published: boolean;
        display_mode: string;
        cover_image: File | null;
    }>({
        _method: 'put',
        parent_id: namespace.parent_id,
        name: namespace.name,
        slug: namespace.slug,
        description: namespace.description ?? '',
        is_published: namespace.is_published,
        display_mode: namespace.display_mode ?? 'default',
        cover_image: null,
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        transform((currentData) => ({
            ...currentData,
            display_mode:
                currentData.display_mode === 'default'
                    ? ''
                    : currentData.display_mode,
        }));
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
                        <Label htmlFor="parent_id">Parent Namespace</Label>
                        <Select
                            value={
                                data.parent_id === null
                                    ? 'none'
                                    : String(data.parent_id)
                            }
                            onValueChange={(v) =>
                                setData(
                                    'parent_id',
                                    v === 'none' ? null : Number(v),
                                )
                            }
                        >
                            <SelectTrigger id="parent_id" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">
                                    — None (root level) —
                                </SelectItem>
                                {availableParents.map((parent) => (
                                    <SelectItem
                                        key={parent.id}
                                        value={String(parent.id)}
                                    >
                                        {parent.full_path}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.parent_id} />
                    </div>

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
                        <div className="flex items-center justify-between gap-3">
                            <Label htmlFor="cover_image">Cover Image</Label>
                            <div className="flex items-center gap-2">
                                {namespace.cover_image_url &&
                                    !namespace.is_system && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={
                                                deletingCoverImage || processing
                                            }
                                            onClick={
                                                handleDeleteCoverImageClick
                                            }
                                        >
                                            {deletingCoverImage ? (
                                                <Spinner className="mr-1.5" />
                                            ) : (
                                                <Trash2 className="mr-1.5 size-3.5" />
                                            )}
                                            Remove
                                        </Button>
                                    )}
                                {aiEnabled && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={generating || processing}
                                        onClick={handleGenerateClick}
                                    >
                                        {generating ? (
                                            <Spinner className="mr-1.5" />
                                        ) : (
                                            <Sparkles className="mr-1.5 size-3.5" />
                                        )}
                                        {generating
                                            ? 'Generating…'
                                            : 'Generate with AI'}
                                    </Button>
                                )}
                            </div>
                        </div>
                        {aiEnabled && (
                            <Input
                                type="text"
                                value={additionalPrompt}
                                onChange={(e) =>
                                    setAdditionalPrompt(e.target.value)
                                }
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();

                                        if (!generating && !processing) {
                                            handleGenerateClick();
                                        }
                                    }
                                }}
                                placeholder="Optional: add style guidance, colors, mood… (any language)"
                                disabled={generating || processing}
                                maxLength={500}
                            />
                        )}
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

                    <div className="grid gap-2">
                        <Label htmlFor="display_mode">Display Mode</Label>
                        <Select
                            value={data.display_mode}
                            onValueChange={(v) => setData('display_mode', v)}
                        >
                            <SelectTrigger id="display_mode" className="w-full">
                                <SelectValue placeholder="Default" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="default">Default</SelectItem>
                                <SelectItem value="blog">Blog</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Blog mode displays posts as a card grid with
                            excerpts and tags.
                        </p>
                        <InputError message={errors.display_mode} />
                    </div>

                    <div className="flex items-center justify-between gap-2">
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
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            asChild
                        >
                            <a
                                href={`/${namespace.full_path}`}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <ExternalLink className="size-3.5" />
                                View Site
                            </a>
                        </Button>
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
            <Dialog
                open={showGenerateConfirm}
                onOpenChange={setShowGenerateConfirm}
            >
                <DialogContent>
                    <DialogTitle>Replace existing cover image?</DialogTitle>
                    <DialogDescription>
                        This namespace already has a cover image. Generating a
                        new one will permanently replace it.
                    </DialogDescription>
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button variant="secondary">Cancel</Button>
                        </DialogClose>
                        <Button onClick={generateCoverImage}>
                            Generate anyway
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog
                open={showDeleteCoverImageConfirm}
                onOpenChange={setShowDeleteCoverImageConfirm}
            >
                <DialogContent>
                    <DialogTitle>Remove cover image?</DialogTitle>
                    <DialogDescription>
                        This will permanently delete the cover image for this
                        namespace.
                    </DialogDescription>
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button variant="secondary">Cancel</Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            onClick={confirmDeleteCoverImage}
                        >
                            Remove
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
