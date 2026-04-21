import { Form, Link } from '@inertiajs/react';
import {
    ArrowRightLeft,
    CheckCircle2,
    Clock,
    FileText,
    FilePen,
    History,
    ArrowLeft,
    Pencil,
    Trash2,
} from 'lucide-react';
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
import ViewContextBadge from '@/components/view-context-badge';
import { destroy, edit, revisions, show } from '@/routes/admin/posts';

type Namespace = {
    id: number;
    name: string;
    slug: string;
    full_path: string;
};

type Post = {
    id: number;
    title: string;
    slug: string;
    full_path: string;
    is_draft: boolean;
    published_at: string | null;
};

function scheduledHint(publishedAt: string): string {
    const diff = new Date(publishedAt).getTime() - Date.now();
    const minutes = Math.round(diff / 60000);

    if (minutes < 60) {
        return `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }

    const hours = Math.round(diff / 3600000);

    if (hours < 24) {
        return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
    }

    const days = Math.round(diff / 86400000);

    return `in ${days} day${days !== 1 ? 's' : ''}`;
}

export default function PostHeader({
    namespace,
    post,
    mode = 'show',
}: {
    namespace: Namespace;
    post: Post;
    mode?: 'show' | 'edit';
}) {
    const siteUrl = `/${post.full_path}`;

    return (
        <div className="rounded-xl border border-sky-200/80 bg-sky-50/70 p-5 dark:border-sky-900/80 dark:bg-sky-950/20">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold tracking-wider text-sky-700 uppercase dark:text-sky-300">
                        Manage Post
                    </p>
                    <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h1 className="flex items-center gap-2 text-2xl font-semibold">
                            <FileText className="size-5 shrink-0 text-sky-700 dark:text-sky-300" />
                            <Link
                                href={show.url({
                                    namespace: namespace.id,
                                    post: post.slug,
                                })}
                                className="hover:underline"
                            >
                                {post.title}
                            </Link>
                        </h1>
                        <div className="flex items-center gap-2">
                            <p className="text-sm text-sky-800/70 dark:text-sky-200/70">
                                /{post.full_path}
                            </p>
                            <Link
                                href={revisions.url({
                                    namespace: namespace.id,
                                    post: post.slug,
                                })}
                                className="text-sky-700/70 transition-colors hover:text-sky-900 dark:text-sky-300/70 dark:hover:text-sky-100"
                            >
                                <History className="size-3.5" />
                            </Link>
                            <Dialog>
                                <DialogTrigger className="text-destructive/60 transition-colors hover:text-destructive">
                                    <Trash2 className="size-3.5" />
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogTitle>
                                        Delete &ldquo;{post.title}&rdquo;?
                                    </DialogTitle>
                                    <DialogDescription>
                                        This action cannot be undone. The post
                                        and all its revisions will be
                                        permanently deleted.
                                    </DialogDescription>
                                    <Form
                                        {...destroy.form({
                                            namespace: namespace.id,
                                            post: post.slug,
                                        })}
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
                    </div>
                    <div className="mt-2">
                        {post.is_draft ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                <FilePen className="size-3" />
                                Draft
                            </span>
                        ) : !post.published_at ||
                          new Date(post.published_at) > new Date() ? (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                    <Clock className="size-3" />
                                    Scheduled
                                </span>
                                {post.published_at && (
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(
                                            post.published_at,
                                        ).toLocaleString(undefined, {
                                            dateStyle: 'medium',
                                            timeStyle: 'short',
                                        })}
                                        {' · '}
                                        {scheduledHint(post.published_at)}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                <CheckCircle2 className="size-3" />
                                Published
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link href={siteUrl}>
                                <ArrowRightLeft className="size-4" />
                                View Site
                            </Link>
                        </Button>
                        <ViewContextBadge label="Admin View" variant="admin" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {mode === 'show' ? (
                            <Button variant="outline" asChild>
                                <Link
                                    href={edit.url({
                                        namespace: namespace.id,
                                        post: post.slug,
                                    })}
                                >
                                    <Pencil className="size-4" />
                                    Edit
                                </Link>
                            </Button>
                        ) : (
                            <Button variant="outline" asChild>
                                <Link
                                    href={show.url({
                                        namespace: namespace.id,
                                        post: post.slug,
                                    })}
                                >
                                    <ArrowLeft className="size-4" />
                                    View Post
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
