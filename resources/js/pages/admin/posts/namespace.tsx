import type { DragEndEvent } from '@dnd-kit/core';
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Form, Head, Link, router, setLayoutProps } from '@inertiajs/react';
import {
    ArrowUpDown,
    Check,
    CheckCircle2,
    Clock,
    ExternalLink,
    FilePlus2,
    FilePen,
    FileText,
    FolderPlus,
    FolderOpen,
    GripVertical,
    Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { destroy as destroyNamespace } from '@/actions/App/Http/Controllers/Admin/NamespaceController';
import NamespaceHeader from '@/components/namespace-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { timeAgo } from '@/lib/time';
import { dashboard } from '@/routes';
import { create as namespaceCreate } from '@/routes/admin/namespaces';
import {
    create,
    index,
    namespace as namespaceRoute,
    reorderNamespaces,
    reorderPosts,
} from '@/routes/admin/posts';

type Namespace = {
    id: number;
    slug: string;
    full_path: string;
    name: string;
    description?: string | null;
    cover_image_url?: string | null;
    backup_count?: number;
    backup_management_url?: string | null;
    is_published: boolean;
};

type ChildNamespace = {
    id: number;
    slug: string;
    full_path: string;
    name: string;
    is_published: boolean;
    posts_count: number;
};

type Post = {
    id: number;
    title: string;
    slug: string;
    full_path: string;
    is_draft: boolean;
    published_at: string | null;
    created_at: string;
    canonical_url: string | null;
    admin_url: string;
    tags: Array<{ id: number; name: string }>;
};

type Ancestor = {
    id: number;
    name: string;
};

function SortableChildRow({
    child,
    reorderMode,
}: {
    child: ChildNamespace;
    reorderMode: boolean;
}) {
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: child.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <tr ref={setNodeRef} style={style} className="border-b last:border-0">
            <td className="w-8 px-2 py-3">
                {reorderMode && (
                    <button
                        {...attributes}
                        {...listeners}
                        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
                    >
                        <GripVertical className="size-4" />
                    </button>
                )}
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                    <FolderOpen className="size-4 text-muted-foreground" />
                    <Link
                        href={namespaceRoute.url(child.id)}
                        className="font-medium text-primary hover:underline"
                    >
                        {child.name}
                    </Link>
                </div>
            </td>
            <td className="px-4 py-3 text-muted-foreground">
                /{child.full_path}
            </td>
            <td className="px-4 py-3">
                {child.is_published ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle2 className="size-3" />
                        Published
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        <FilePen className="size-3" />
                        Draft
                    </span>
                )}
            </td>
            <td className="px-4 py-3 text-muted-foreground">
                {child.posts_count} {child.posts_count === 1 ? 'post' : 'posts'}
            </td>
            <td className="px-4 py-3 text-right">
                <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                    <DialogTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogTitle>Delete namespace?</DialogTitle>
                        <DialogDescription className="space-y-2">
                            <p>
                                This will permanently delete{' '}
                                <strong>{child.name}</strong> and all of its
                                posts and child namespaces.
                            </p>
                        </DialogDescription>
                        <Form
                            {...destroyNamespace.form(child.id)}
                            onSuccess={() => setIsDeleteOpen(false)}
                        >
                            {({ processing }) => (
                                <DialogFooter className="gap-2">
                                    <DialogClose asChild>
                                        <Button variant="secondary">
                                            Cancel
                                        </Button>
                                    </DialogClose>
                                    <Button
                                        variant="destructive"
                                        disabled={processing}
                                        asChild
                                    >
                                        <button type="submit">Delete</button>
                                    </Button>
                                </DialogFooter>
                            )}
                        </Form>
                    </DialogContent>
                </Dialog>
            </td>
        </tr>
    );
}

function SortablePostRow({
    post,
    namespaceFullPath,
    reorderMode,
    selected,
    onSelectedChange,
}: {
    post: Post;
    namespaceFullPath: string;
    reorderMode: boolean;
    selected: boolean;
    onSelectedChange: (checked: boolean) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: post.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <tr ref={setNodeRef} style={style} className="border-b last:border-0">
            <td className="w-8 px-2 py-3">
                {reorderMode ? (
                    <button
                        {...attributes}
                        {...listeners}
                        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
                    >
                        <GripVertical className="size-4" />
                    </button>
                ) : (
                    <Checkbox
                        checked={selected}
                        onCheckedChange={(checked) =>
                            onSelectedChange(Boolean(checked))
                        }
                        aria-label={`Select post ${post.title}`}
                    />
                )}
            </td>
            <td className="px-4 py-3 font-medium">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground" />
                        <Link href={post.admin_url} className="hover:underline">
                            {post.title}
                        </Link>
                    </div>
                    {post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pl-6">
                            {post.tags.map((tag) => (
                                <Badge
                                    key={tag.id}
                                    variant="outline"
                                    className="py-0 text-xs"
                                >
                                    {tag.name}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            </td>
            <td className="px-4 py-3 text-muted-foreground">
                <div className="flex items-center gap-2">
                    <span>
                        /{namespaceFullPath}/{post.slug}
                    </span>
                    <a
                        href={`/${post.full_path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ExternalLink className="size-3.5" />
                    </a>
                </div>
            </td>
            <td className="px-4 py-3">
                {post.is_draft ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        <FilePen className="size-3" />
                        Draft
                    </span>
                ) : post.published_at &&
                  new Date(post.published_at) > new Date() ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <Clock className="size-3" />
                        Scheduled
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle2 className="size-3" />
                        Published
                    </span>
                )}
            </td>
            <td
                className="px-4 py-3 text-muted-foreground"
                suppressHydrationWarning
            >
                {new Date(post.created_at).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                })}
                <span className="ml-1.5 text-xs opacity-60">
                    ({timeAgo(post.created_at)})
                </span>
            </td>
        </tr>
    );
}

export default function Namespace({
    namespace,
    ancestors,
    children: initialChildren,
    posts: initialPosts,
    delete_posts_url,
}: {
    namespace: Namespace;
    ancestors: Ancestor[];
    children: ChildNamespace[];
    posts: Post[];
    delete_posts_url: string;
}) {
    const [children, setChildren] = useState(initialChildren);
    const [posts, setPosts] = useState(initialPosts);
    const [namespacesReorderMode, setNamespacesReorderMode] = useState(false);
    const [postsReorderMode, setPostsReorderMode] = useState(false);
    const [selectedPostIds, setSelectedPostIds] = useState<number[]>([]);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    useEffect(() => {
        setChildren(initialChildren);
    }, [initialChildren]);
    useEffect(() => {
        setPosts(initialPosts);
    }, [initialPosts]);
    useEffect(() => {
        setSelectedPostIds((current) =>
            current.filter((id) => initialPosts.some((post) => post.id === id)),
        );
    }, [initialPosts]);

    const childNamespaceCreateUrl = `${namespaceCreate.url()}?${new URLSearchParams({ parent: String(namespace.id) }).toString()}`;

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    function handleNamespaceDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        const oldIndex = children.findIndex((c) => c.id === active.id);
        const newIndex = children.findIndex((c) => c.id === over.id);
        const reordered = arrayMove(children, oldIndex, newIndex);
        setChildren(reordered);
        router.patch(
            reorderNamespaces.url(namespace.id),
            { slugs: reordered.map((c) => c.slug) },
            { preserveScroll: true },
        );
    }

    function handlePostDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        const oldIndex = posts.findIndex((p) => p.id === active.id);
        const newIndex = posts.findIndex((p) => p.id === over.id);
        const reordered = arrayMove(posts, oldIndex, newIndex);
        setPosts(reordered);
        router.patch(
            reorderPosts.url(namespace.id),
            { slugs: reordered.map((p) => p.slug) },
            { preserveScroll: true },
        );
    }

    const allPostsSelected =
        posts.length > 0 && selectedPostIds.length === posts.length;

    function togglePostSelection(postId: number, checked: boolean) {
        setSelectedPostIds((current) =>
            checked
                ? [...current, postId]
                : current.filter((id) => id !== postId),
        );
    }

    function toggleAllPosts(checked: boolean) {
        setSelectedPostIds(checked ? posts.map((post) => post.id) : []);
    }

    setLayoutProps({
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'Namespaces', href: index.url() },
            ...ancestors.map((ancestor) => ({
                title: ancestor.name,
                href: namespaceRoute.url(ancestor.id),
            })),
            { title: namespace.name, href: namespaceRoute.url(namespace.id) },
        ],
    });

    return (
        <>
            <Head title={`Posts — ${namespace.name}`} />

            <div className="space-y-6 p-4">
                <NamespaceHeader
                    namespace={namespace}
                    childNamespacesCount={children.length}
                    postsCount={posts.length}
                    namespacesReorderMode={namespacesReorderMode}
                    postsReorderMode={postsReorderMode}
                />

                {children.length > 0 && (
                    <div className="space-y-3">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleNamespaceDragEnd}
                        >
                            <Card className="gap-0 py-0 shadow-sm">
                                <div className="flex flex-col gap-2 border-b px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold">
                                            Child namespaces
                                        </h2>
                                        <p className="text-sm text-muted-foreground">
                                            Reorder the local namespace tree or
                                            open a child namespace for deeper
                                            editing.
                                        </p>
                                    </div>
                                    <Button
                                        variant={
                                            namespacesReorderMode
                                                ? 'secondary'
                                                : 'outline'
                                        }
                                        size="sm"
                                        onClick={() =>
                                            setNamespacesReorderMode((v) => !v)
                                        }
                                    >
                                        {namespacesReorderMode ? (
                                            <>
                                                <Check className="size-4" />
                                                Done
                                            </>
                                        ) : (
                                            <>
                                                <ArrowUpDown className="size-4" />
                                                Reorder
                                            </>
                                        )}
                                    </Button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <tbody>
                                            <SortableContext
                                                items={children.map(
                                                    (c) => c.id,
                                                )}
                                                strategy={
                                                    verticalListSortingStrategy
                                                }
                                            >
                                                {children.map((child) => (
                                                    <SortableChildRow
                                                        key={child.id}
                                                        child={child}
                                                        reorderMode={
                                                            namespacesReorderMode
                                                        }
                                                    />
                                                ))}
                                            </SortableContext>
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </DndContext>
                    </div>
                )}

                {posts.length === 0 ? (
                    <Card className="border-dashed py-0 shadow-none">
                        <CardContent className="flex flex-col items-center px-6 py-14 text-center">
                            <h2 className="text-xl font-semibold">
                                No posts in this namespace yet
                            </h2>
                            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                                Start with a post or branch this area into child
                                namespaces if the content needs another layer.
                            </p>
                            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                                <Button variant="outline" asChild>
                                    <Link href={childNamespaceCreateUrl}>
                                        <FolderPlus className="size-4" />
                                        Create a child namespace
                                    </Link>
                                </Button>
                                <Button asChild>
                                    <Link href={create.url(namespace.id)}>
                                        <FilePlus2 className="size-4" />
                                        Create your first post
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handlePostDragEnd}
                        >
                            <Card className="gap-0 py-0 shadow-sm">
                                <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="space-y-1">
                                        <h2 className="text-lg font-semibold">
                                            Posts
                                        </h2>
                                        <p className="text-sm text-muted-foreground">
                                            {postsReorderMode
                                                ? 'Drag posts to set the manual order inside this namespace.'
                                                : `${selectedPostIds.length} selected. Open a post to edit it, or use bulk delete for cleanup.`}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {!postsReorderMode && (
                                            <Dialog
                                                open={isDeleteDialogOpen}
                                                onOpenChange={
                                                    setIsDeleteDialogOpen
                                                }
                                            >
                                                <DialogTrigger asChild>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        disabled={
                                                            selectedPostIds.length ===
                                                            0
                                                        }
                                                    >
                                                        <Trash2 className="size-4" />
                                                        Delete Selected
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogTitle>
                                                        Delete selected posts?
                                                    </DialogTitle>
                                                    <DialogDescription className="space-y-3">
                                                        <p>
                                                            This will
                                                            permanently delete
                                                            the selected posts.
                                                        </p>
                                                        <p>
                                                            {
                                                                selectedPostIds.length
                                                            }{' '}
                                                            post
                                                            {selectedPostIds.length ===
                                                            1
                                                                ? ''
                                                                : 's'}{' '}
                                                            will be deleted.
                                                        </p>
                                                    </DialogDescription>
                                                    <Form
                                                        action={
                                                            delete_posts_url
                                                        }
                                                        method="post"
                                                        onSuccess={() => {
                                                            setIsDeleteDialogOpen(
                                                                false,
                                                            );
                                                            setSelectedPostIds(
                                                                [],
                                                            );
                                                        }}
                                                    >
                                                        {({ processing }) => (
                                                            <div className="space-y-4">
                                                                {selectedPostIds.map(
                                                                    (id) => (
                                                                        <input
                                                                            key={
                                                                                id
                                                                            }
                                                                            type="hidden"
                                                                            name="ids[]"
                                                                            value={
                                                                                id
                                                                            }
                                                                        />
                                                                    ),
                                                                )}
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
                                                                            Selected
                                                                        </button>
                                                                    </Button>
                                                                </DialogFooter>
                                                            </div>
                                                        )}
                                                    </Form>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                        <Button
                                            variant={
                                                postsReorderMode
                                                    ? 'secondary'
                                                    : 'outline'
                                            }
                                            size="sm"
                                            onClick={() =>
                                                setPostsReorderMode((value) => {
                                                    const next = !value;

                                                    if (next) {
                                                        setSelectedPostIds([]);
                                                    }

                                                    return next;
                                                })
                                            }
                                        >
                                            {postsReorderMode ? (
                                                <>
                                                    <Check className="size-4" />
                                                    Done
                                                </>
                                            ) : (
                                                <>
                                                    <ArrowUpDown className="size-4" />
                                                    Reorder
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th className="w-8 px-2 py-3">
                                                    {!postsReorderMode && (
                                                        <Checkbox
                                                            checked={
                                                                allPostsSelected
                                                            }
                                                            onCheckedChange={(
                                                                checked,
                                                            ) =>
                                                                toggleAllPosts(
                                                                    Boolean(
                                                                        checked,
                                                                    ),
                                                                )
                                                            }
                                                            aria-label="Select all posts"
                                                        />
                                                    )}
                                                </th>
                                                <th className="px-4 py-3 text-left font-medium">
                                                    Title
                                                </th>
                                                <th className="px-4 py-3 text-left font-medium">
                                                    Slug
                                                </th>
                                                <th className="px-4 py-3 text-left font-medium">
                                                    Status
                                                </th>
                                                <th className="px-4 py-3 text-left font-medium">
                                                    Created
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <SortableContext
                                                items={posts.map((p) => p.id)}
                                                strategy={
                                                    verticalListSortingStrategy
                                                }
                                            >
                                                {posts.map((post) => (
                                                    <SortablePostRow
                                                        key={post.id}
                                                        post={post}
                                                        namespaceFullPath={
                                                            namespace.full_path
                                                        }
                                                        reorderMode={
                                                            postsReorderMode
                                                        }
                                                        selected={selectedPostIds.includes(
                                                            post.id,
                                                        )}
                                                        onSelectedChange={(
                                                            checked,
                                                        ) =>
                                                            togglePostSelection(
                                                                post.id,
                                                                checked,
                                                            )
                                                        }
                                                    />
                                                ))}
                                            </SortableContext>
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </DndContext>
                    </div>
                )}
            </div>
        </>
    );
}
