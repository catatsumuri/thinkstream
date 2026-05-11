import { Form, Head, Link, setLayoutProps } from '@inertiajs/react';
import { History, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { dashboard } from '@/routes';
import {
    edit,
    index,
    namespace as namespaceRoute,
    show,
} from '@/routes/admin/posts';
import { restore } from '@/routes/admin/posts/revisions';

type Namespace = {
    id: number;
    slug: string;
    name: string;
    ancestors: { id: number; name: string }[];
};

type Post = {
    id: number;
    slug: string;
    title: string;
};

type Revision = {
    id: number;
    title: string;
    content: string | null;
    created_at: string;
    user?: {
        id: number;
        name: string;
    };
    is_current?: boolean;
};

type DiffLine = {
    type: 'add' | 'remove' | 'same';
    text: string;
};

function buildLineDiff(previous: string, next: string): DiffLine[] {
    const previousLines = previous.split('\n');
    const nextLines = next.split('\n');
    const matrix = Array.from({ length: previousLines.length + 1 }, () =>
        Array(nextLines.length + 1).fill(0),
    );

    for (let i = 1; i <= previousLines.length; i += 1) {
        for (let j = 1; j <= nextLines.length; j += 1) {
            if (previousLines[i - 1] === nextLines[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1] + 1;
            } else {
                matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
            }
        }
    }

    const diff: DiffLine[] = [];
    let i = previousLines.length;
    let j = nextLines.length;

    while (i > 0 && j > 0) {
        if (previousLines[i - 1] === nextLines[j - 1]) {
            diff.unshift({ type: 'same', text: previousLines[i - 1] });
            i -= 1;
            j -= 1;
        } else if (matrix[i - 1][j] >= matrix[i][j - 1]) {
            diff.unshift({ type: 'remove', text: previousLines[i - 1] });
            i -= 1;
        } else {
            diff.unshift({ type: 'add', text: nextLines[j - 1] });
            j -= 1;
        }
    }

    while (i > 0) {
        diff.unshift({ type: 'remove', text: previousLines[i - 1] });
        i -= 1;
    }

    while (j > 0) {
        diff.unshift({ type: 'add', text: nextLines[j - 1] });
        j -= 1;
    }

    return diff;
}

export default function Revisions({
    namespace,
    post,
    revisions: revisionList,
}: {
    namespace: Namespace;
    post: Post;
    revisions: Revision[];
}) {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    setLayoutProps({
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'Namespaces', href: index.url() },
            ...namespace.ancestors.map((ancestor) => ({
                title: ancestor.name,
                href: namespaceRoute.url(ancestor.id),
            })),
            { title: namespace.name, href: namespaceRoute.url(namespace.id) },
            {
                title: post.title,
                href: show.url({ namespace: namespace.id, post: post.slug }),
            },
            {
                title: 'Edit',
                href: edit.url({ namespace: namespace.id, post: post.slug }),
            },
            { title: 'Revision History' },
        ],
    });

    const toggleRevision = (revisionId: number) => {
        setSelectedIds((current) => {
            if (current.includes(revisionId)) {
                return current.filter((id) => id !== revisionId);
            }

            if (current.length >= 2) {
                return [current[1], revisionId];
            }

            return [...current, revisionId];
        });
    };

    const selectedRevisions = revisionList.filter((revision) =>
        selectedIds.includes(revision.id),
    );

    const [olderRevision, newerRevision] = [...selectedRevisions].sort(
        (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    const diffLines =
        olderRevision && newerRevision
            ? buildLineDiff(
                  olderRevision.content ?? '',
                  newerRevision.content ?? '',
              )
            : [];

    return (
        <>
            <Head title={`Revision History: ${post.title}`} />

            <div className="space-y-4 p-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <History className="size-5" />
                        <h1 className="text-2xl font-semibold">
                            Revision History
                        </h1>
                    </div>
                    <Button asChild variant="outline" size="sm">
                        <Link
                            href={edit.url({
                                namespace: namespace.id,
                                post: post.slug,
                            })}
                        >
                            Back to Edit
                        </Link>
                    </Button>
                </div>

                <Card className="space-y-3 p-4">
                    <p className="text-sm text-muted-foreground">
                        Select two versions to view the diff.
                    </p>
                    {selectedRevisions.length !== 2 ? (
                        <div className="rounded-md border border-dashed border-muted-foreground/40 p-4 text-sm text-muted-foreground">
                            {selectedRevisions.length === 0
                                ? 'No versions selected.'
                                : 'Select one more version.'}
                        </div>
                    ) : (
                        <div className="rounded-md border p-4">
                            <div className="mb-3 flex flex-col gap-1 text-sm">
                                <span className="font-semibold">
                                    {olderRevision.title || 'Untitled'} →{' '}
                                    {newerRevision.title || 'Untitled'}
                                </span>
                                <span className="text-muted-foreground">
                                    {new Date(
                                        olderRevision.created_at,
                                    ).toLocaleString()}{' '}
                                    →{' '}
                                    {new Date(
                                        newerRevision.created_at,
                                    ).toLocaleString()}
                                </span>
                            </div>
                            <div className="max-h-[420px] overflow-auto font-mono text-xs leading-relaxed">
                                {diffLines.map((line, index) => (
                                    <div
                                        key={`${line.type}-${index}`}
                                        className={`grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-1 ${
                                            line.type === 'add'
                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                                                : line.type === 'remove'
                                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                                                  : 'text-muted-foreground'
                                        }`}
                                    >
                                        <span className="text-center">
                                            {line.type === 'add'
                                                ? '+'
                                                : line.type === 'remove'
                                                  ? '-'
                                                  : ' '}
                                        </span>
                                        <span className="break-words whitespace-pre-wrap">
                                            {line.text || ' '}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>

                <Card className="divide-y">
                    {revisionList.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground">
                            No revision history yet.
                        </div>
                    ) : (
                        revisionList.map((revision) => (
                            <div
                                key={revision.id}
                                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="flex min-w-0 flex-col gap-1">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(
                                                revision.id,
                                            )}
                                            onChange={() =>
                                                toggleRevision(revision.id)
                                            }
                                            className="size-4 accent-foreground"
                                        />
                                        <span className="truncate font-medium">
                                            {revision.title || 'Untitled'}
                                        </span>
                                        {revision.is_current && (
                                            <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                                Current
                                            </span>
                                        )}
                                    </label>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-6">
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(
                                                revision.created_at,
                                            ).toLocaleString()}
                                        </span>
                                        {revision.user && (
                                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <UserRound className="size-3" />
                                                by {revision.user.name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {!revision.is_current && (
                                    <Form
                                        {...restore.form({
                                            namespace: namespace.id,
                                            post: post.slug,
                                            revision: revision.id,
                                        })}
                                    >
                                        {({ processing }) => (
                                            <Button
                                                type="submit"
                                                variant="outline"
                                                size="sm"
                                                disabled={processing}
                                            >
                                                Restore
                                            </Button>
                                        )}
                                    </Form>
                                )}
                            </div>
                        ))
                    )}
                </Card>
            </div>
        </>
    );
}
