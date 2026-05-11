import { Head, Link } from '@inertiajs/react';
import { Form } from '@inertiajs/react';
import { FolderPlus } from 'lucide-react';
import { useState } from 'react';
import NamespaceController from '@/actions/App/Http/Controllers/Admin/NamespaceController';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { dashboard } from '@/routes';
import { create } from '@/routes/admin/namespaces';
import { index } from '@/routes/admin/posts';

type Namespace = {
    id: number;
    slug: string;
    name: string;
    posts_count: number;
};

export default function Index({ namespaces }: { namespaces: Namespace[] }) {
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

    return (
        <>
            <Head title="Namespaces" />

            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Namespaces</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage namespaces for your posts
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={create.url()}>
                            <FolderPlus className="size-4" />
                            New Namespace
                        </Link>
                    </Button>
                </div>

                {namespaces.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-12 text-center">
                        <p className="text-muted-foreground">
                            No namespaces yet.
                        </p>
                        <Button asChild className="mt-4">
                            <Link href={create.url()}>
                                <FolderPlus className="size-4" />
                                Create your first namespace
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <div className="rounded-xl border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="px-4 py-3 text-left font-medium">
                                        Name
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium">
                                        Slug
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium">
                                        Posts
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {namespaces.map((ns) => (
                                    <tr
                                        key={ns.id}
                                        className="border-b last:border-0"
                                    >
                                        <td className="px-4 py-3 font-medium">
                                            {ns.name}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {ns.slug}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {ns.posts_count}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    asChild
                                                >
                                                    <Link
                                                        href={NamespaceController.edit.url(
                                                            ns.id,
                                                        )}
                                                    >
                                                        Edit
                                                    </Link>
                                                </Button>
                                                <Dialog
                                                    open={
                                                        confirmDeleteId ===
                                                        ns.id
                                                    }
                                                    onOpenChange={(open) =>
                                                        setConfirmDeleteId(
                                                            open ? ns.id : null,
                                                        )
                                                    }
                                                >
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                        >
                                                            Delete
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogTitle>
                                                            Delete namespace?
                                                        </DialogTitle>
                                                        <DialogDescription className="space-y-2">
                                                            <p>
                                                                This will
                                                                permanently
                                                                delete{' '}
                                                                <strong>
                                                                    {ns.name}
                                                                </strong>{' '}
                                                                and all of its
                                                                posts and child
                                                                namespaces.
                                                            </p>
                                                        </DialogDescription>
                                                        <Form
                                                            {...NamespaceController.destroy.form(
                                                                ns.id,
                                                            )}
                                                            onSuccess={() =>
                                                                setConfirmDeleteId(
                                                                    null,
                                                                )
                                                            }
                                                        >
                                                            {({
                                                                processing,
                                                            }) => (
                                                                <DialogFooter className="gap-2">
                                                                    <DialogClose
                                                                        asChild
                                                                    >
                                                                        <Button variant="secondary">
                                                                            Cancel
                                                                        </Button>
                                                                    </DialogClose>
                                                                    <Button
                                                                        variant="destructive"
                                                                        disabled={
                                                                            processing
                                                                        }
                                                                        asChild
                                                                    >
                                                                        <button type="submit">
                                                                            Delete
                                                                        </button>
                                                                    </Button>
                                                                </DialogFooter>
                                                            )}
                                                        </Form>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Namespaces', href: index.url() },
    ],
};
