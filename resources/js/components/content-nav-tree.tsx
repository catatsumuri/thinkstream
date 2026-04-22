import { Link } from '@inertiajs/react';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { useEffect, useRef } from 'react';
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
    depth = 0,
}: {
    currentPath: string;
    node: ContentNavNode;
    depth?: number;
}) {
    const inCurrentBranch = isCurrentBranch(currentPath, node.full_path);
    const hasChildren = node.children.length > 0 || node.posts.length > 0;

    return (
        <div className="space-y-1">
            <Link
                href={contentPath.url(node.full_path)}
                data-active={
                    currentPath === node.full_path ? 'true' : undefined
                }
                className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors ${
                    currentPath === node.full_path
                        ? 'bg-accent font-medium text-accent-foreground'
                        : inCurrentBranch
                          ? 'text-foreground'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                }`}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
                {hasChildren ? (
                    inCurrentBranch ? (
                        <ChevronDown className="size-4 shrink-0" />
                    ) : (
                        <ChevronRight className="size-4 shrink-0" />
                    )
                ) : (
                    <span className="size-4 shrink-0" />
                )}
                <span className="truncate">{node.name}</span>
            </Link>

            {hasChildren && (
                <div className="space-y-1">
                    {node.children.map((child) => (
                        <TreeNode
                            key={child.full_path}
                            currentPath={currentPath}
                            node={child}
                            depth={depth + 1}
                        />
                    ))}

                    {node.posts.map((post) => (
                        <Link
                            key={post.full_path}
                            href={contentPath.url(post.full_path)}
                            data-active={
                                currentPath === post.full_path
                                    ? 'true'
                                    : undefined
                            }
                            className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors ${
                                currentPath === post.full_path
                                    ? 'bg-accent font-medium text-accent-foreground'
                                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                            }`}
                            style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
                        >
                            <FileText className="size-4 shrink-0" />
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
}: {
    currentPath: string;
    root: ContentNavNode;
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
        <nav ref={navRef} className="space-y-1 text-sm">
            <TreeNode currentPath={currentPath} node={root} />
        </nav>
    );
}
