import { Link } from '@inertiajs/react';
import { ChevronDown, ChevronRight, FileText, FolderOpen } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { path as contentPath } from '@/routes/posts';

export type ContentNavNode = {
    name: string;
    full_path: string;
    children: ContentNavNode[];
    posts: Array<{
        title: string;
        full_path: string;
    }>;
};

function isCurrentBranch(currentPath: string, fullPath: string): boolean {
    return currentPath === fullPath || currentPath.startsWith(`${fullPath}/`);
}

function TreeNode({
    currentPath,
    node,
    onNavigate,
    renderSelf = true,
}: {
    currentPath: string;
    node: ContentNavNode;
    onNavigate?: () => void;
    renderSelf?: boolean;
}) {
    const inCurrentBranch = isCurrentBranch(currentPath, node.full_path);
    const hasChildren = node.children.length > 0 || node.posts.length > 0;
    const [isExpanded, setIsExpanded] = useState(inCurrentBranch);
    const expanded = isExpanded || inCurrentBranch;

    return (
        <div className="space-y-1.5">
            {renderSelf && (
                <div
                    className={cn(
                        'group flex items-center gap-1.5 rounded-md text-sm leading-5 transition-colors',
                        currentPath === node.full_path
                            ? 'bg-primary/10 text-primary'
                            : inCurrentBranch
                              ? 'text-foreground hover:bg-accent'
                              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                >
                    {hasChildren ? (
                        <button
                            type="button"
                            onClick={() => {
                                setIsExpanded((value) => !value);
                            }}
                            className="flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground"
                            aria-label={
                                expanded
                                    ? `Collapse ${node.name}`
                                    : `Expand ${node.name}`
                            }
                        >
                            {expanded ? (
                                <ChevronDown className="size-3.5" />
                            ) : (
                                <ChevronRight className="size-3.5" />
                            )}
                        </button>
                    ) : (
                        <span
                            aria-hidden="true"
                            className="flex size-6 shrink-0 items-center justify-center"
                        >
                            <span className="size-3.5" />
                        </span>
                    )}
                    <Link
                        href={contentPath.url(node.full_path)}
                        onClick={() => onNavigate?.()}
                        data-active={
                            currentPath === node.full_path ? 'true' : undefined
                        }
                        title={node.name}
                        className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1.5 pr-2"
                    >
                        <FolderOpen
                            className={cn(
                                'size-4 shrink-0 transition-colors',
                                currentPath === node.full_path
                                    ? 'text-primary'
                                    : inCurrentBranch
                                      ? 'text-primary/80'
                                      : 'text-muted-foreground/70 group-hover:text-foreground/80',
                            )}
                        />
                        <span className="truncate">{node.name}</span>
                    </Link>
                </div>
            )}

            {hasChildren && expanded && (
                <div
                    className={cn(
                        'space-y-1.5',
                        renderSelf && 'ml-2 border-l border-border/60 pl-2',
                    )}
                >
                    {node.children.map((child) => (
                        <TreeNode
                            key={child.full_path}
                            currentPath={currentPath}
                            node={child}
                            onNavigate={onNavigate}
                        />
                    ))}

                    {node.posts.map((post) => (
                        <Link
                            key={post.full_path}
                            href={contentPath.url(post.full_path)}
                            onClick={() => onNavigate?.()}
                            data-active={
                                currentPath === post.full_path
                                    ? 'true'
                                    : undefined
                            }
                            className={cn(
                                'group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm leading-5 transition-colors',
                                currentPath === post.full_path
                                    ? 'bg-primary/10 font-medium text-primary'
                                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                            )}
                            title={post.title}
                        >
                            <FileText
                                className={cn(
                                    'size-4 shrink-0 transition-colors',
                                    currentPath === post.full_path
                                        ? 'text-primary'
                                        : 'text-muted-foreground/60 group-hover:text-foreground/70',
                                )}
                            />
                            <span className="truncate">{post.title}</span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function ContentNavTree({
    currentPath,
    root,
    onNavigate,
    showRoot = false,
}: {
    currentPath: string;
    root: ContentNavNode;
    onNavigate?: () => void;
    showRoot?: boolean;
}) {
    const navRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const active = navRef.current?.querySelector(
            '[data-active="true"]',
        ) as HTMLElement | null;

        if (!active || !navRef.current) {
            return;
        }

        const container = navRef.current.closest(
            '.overflow-y-auto',
        ) as HTMLElement | null;

        if (!container) {
            return;
        }

        const containerRect = container.getBoundingClientRect();
        const activeRect = active.getBoundingClientRect();
        container.scrollTop += activeRect.top - containerRect.top - 16;
    }, [currentPath]);

    return (
        <nav ref={navRef} className="space-y-1.5 text-sm">
            <TreeNode
                currentPath={currentPath}
                node={root}
                onNavigate={onNavigate}
                renderSelf={showRoot}
            />
        </nav>
    );
}
