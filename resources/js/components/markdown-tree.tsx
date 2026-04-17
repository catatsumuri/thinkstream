import { ChevronRight, File, Folder, FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type TreeNode = {
    type: 'folder' | 'file';
    name: string;
    defaultOpen?: boolean;
    openable?: boolean;
    children?: TreeNode[];
};

function parseTree(json: string | undefined): TreeNode[] {
    try {
        return json ? (JSON.parse(json) as TreeNode[]) : [];
    } catch {
        return [];
    }
}

function TreeNodeRow({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
    const [open, setOpen] = useState(node.defaultOpen ?? false);
    const canToggle = node.openable !== false;
    const indent = depth * 16 + 8;

    if (node.type === 'file') {
        return (
            <div
                className="flex items-center gap-2 py-0.5 pr-3 text-sm"
                style={{ paddingLeft: `${indent + 20}px` }}
            >
                <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="font-mono text-xs text-foreground">
                    {node.name}
                </span>
            </div>
        );
    }

    return (
        <div>
            <button
                type="button"
                onClick={() => canToggle && setOpen((o) => !o)}
                className={cn(
                    'flex w-full items-center gap-1.5 py-0.5 pr-3 text-left',
                    canToggle
                        ? 'cursor-pointer rounded-sm hover:bg-muted/50'
                        : 'cursor-default',
                )}
                style={{ paddingLeft: `${indent}px` }}
            >
                <ChevronRight
                    className={cn(
                        'h-3 w-3 shrink-0 text-muted-foreground/60 transition-transform',
                        open && 'rotate-90',
                        !canToggle && 'invisible',
                    )}
                />
                {open ? (
                    <FolderOpen className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                ) : (
                    <Folder className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                )}
                <span className="font-mono text-xs font-medium text-foreground">
                    {node.name}
                </span>
            </button>
            {open &&
                node.children?.map((child, i) => (
                    <TreeNodeRow key={i} node={child} depth={depth + 1} />
                ))}
        </div>
    );
}

interface MarkdownTreeProps {
    'data-tree'?: string;
    children?: React.ReactNode;
}

export function MarkdownTree({ 'data-tree': json }: MarkdownTreeProps) {
    const nodes = parseTree(json);

    if (nodes.length === 0) {
        return null;
    }

    return (
        <div
            className="not-prose my-6 overflow-hidden rounded-lg border border-border bg-background py-2"
            data-test="markdown-tree"
        >
            {nodes.map((node, i) => (
                <TreeNodeRow key={i} node={node} />
            ))}
        </div>
    );
}
