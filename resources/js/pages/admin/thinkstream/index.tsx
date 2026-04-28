import { Head, Link, router, setLayoutProps } from '@inertiajs/react';
import { Brain, MessagesSquare, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import {
    destroyPage as thinkstreamDestroyPage,
    index as thinkstreamIndex,
    show as thinkstreamShow,
    storePage as thinkstreamStorePage,
} from '@/actions/App/Http/Controllers/Admin/ThinkstreamController';

type Page = {
    id: number;
    title: string;
    created_at: string;
    thoughts_count: number;
};

export default function ThinkstreamIndex({ pages }: { pages: Page[] }) {
    const [creating, setCreating] = useState(false);

    setLayoutProps({
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'Thinkstream', href: thinkstreamIndex.url() },
        ],
    });

    function createCanvas() {
        setCreating(true);
        router.post(
            thinkstreamStorePage.url(),
            {},
            {
                onFinish: () => setCreating(false),
            },
        );
    }

    return (
        <>
            <Head title="Thinkstream" />
            <div className="p-4">
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Brain className="size-4" />
                        {pages.length} canvas{pages.length !== 1 ? 'es' : ''}
                    </div>
                    <Button
                        size="sm"
                        disabled={creating}
                        onClick={createCanvas}
                    >
                        <Plus className="size-4" />
                        New Canvas
                    </Button>
                </div>

                {pages.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-24 text-muted-foreground">
                        <Brain className="size-12 opacity-20" />
                        <p className="text-sm">No canvases yet.</p>
                        <Button
                            size="sm"
                            disabled={creating}
                            onClick={createCanvas}
                        >
                            <Plus className="size-4" />
                            Create your first canvas
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {pages.map((page) => (
                            <Card
                                key={page.id}
                                className="border-border/60 shadow-none transition-colors hover:border-border"
                            >
                                <CardContent className="flex items-center gap-4 px-4 py-3">
                                    <Link
                                        href={thinkstreamShow.url(page.id)}
                                        className="min-w-0 flex-1"
                                    >
                                        <p className="truncate font-medium">
                                            {page.title}
                                        </p>
                                        <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <MessagesSquare className="size-3" />
                                                {page.thoughts_count} thought
                                                {page.thoughts_count !== 1
                                                    ? 's'
                                                    : ''}
                                            </span>
                                            <span>·</span>
                                            <span
                                                title={new Date(
                                                    page.created_at,
                                                ).toLocaleString()}
                                            >
                                                {timeAgo(page.created_at)}
                                            </span>
                                        </p>
                                    </Link>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogTitle>
                                                Delete canvas?
                                            </DialogTitle>
                                            <DialogDescription>
                                                This will permanently delete
                                                &ldquo;{page.title}&rdquo; and
                                                all {page.thoughts_count}{' '}
                                                thought
                                                {page.thoughts_count !== 1
                                                    ? 's'
                                                    : ''}{' '}
                                                in it. This cannot be undone.
                                            </DialogDescription>
                                            <DialogFooter className="gap-2">
                                                <DialogClose asChild>
                                                    <Button variant="secondary">
                                                        Cancel
                                                    </Button>
                                                </DialogClose>
                                                <Button
                                                    variant="destructive"
                                                    onClick={() =>
                                                        router.delete(
                                                            thinkstreamDestroyPage.url(
                                                                page.id,
                                                            ),
                                                        )
                                                    }
                                                >
                                                    Delete
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
