import { Link } from '@inertiajs/react';
import {
    ArrowRightLeft,
    List,
    PanelLeftClose,
    PanelLeftOpen,
    PanelRightClose,
    PanelRightOpen,
} from 'lucide-react';
import DocsSearchTrigger from '@/components/docs-search-trigger';
import SearchPopover from '@/components/search-popover';
import { Button } from '@/components/ui/button';
import ViewContextBadge from '@/components/view-context-badge';
import { login } from '@/routes';

type AuthUser = {
    id: number;
    name: string;
} | null;

type Props = {
    authUser: AuthUser;
    currentUrl: string;
    defaultNamespace: string;
    manageHref: string;
    hasNav?: boolean;
    navVisible?: boolean;
    onToggleNav?: () => void;
    hasHeadings?: boolean;
    tocVisible?: boolean;
    onToggleToc?: () => void;
    onOpenMobileNav?: () => void;
    onOpenMobileToc?: () => void;
};

export default function DocsHeaderActions({
    authUser,
    currentUrl,
    defaultNamespace,
    manageHref,
    hasNav = false,
    navVisible = true,
    onToggleNav,
    hasHeadings = false,
    tocVisible = true,
    onToggleToc,
    onOpenMobileNav,
    onOpenMobileToc,
}: Props) {
    return (
        <div className="flex shrink-0 items-center gap-2 lg:gap-4">
            {onOpenMobileNav && hasNav && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 lg:hidden"
                    onClick={onOpenMobileNav}
                    aria-label="Open navigation"
                >
                    <PanelLeftOpen className="size-4" />
                </Button>
            )}

            {onOpenMobileToc && hasHeadings && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 lg:hidden"
                    onClick={onOpenMobileToc}
                    aria-label="Open table of contents"
                >
                    <List className="size-4" />
                </Button>
            )}

            {hasNav && onToggleNav && (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-test="docs-nav-toggle"
                    onClick={onToggleNav}
                    className="hidden h-8 gap-1.5 px-2.5 text-muted-foreground lg:flex"
                >
                    {navVisible ? (
                        <PanelLeftClose size={15} />
                    ) : (
                        <PanelLeftOpen size={15} />
                    )}
                    <span className="text-xs">Nav</span>
                </Button>
            )}

            {hasHeadings && onToggleToc && (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-test="docs-toc-toggle"
                    onClick={onToggleToc}
                    className="hidden h-8 gap-1.5 px-2.5 text-muted-foreground lg:flex"
                >
                    {tocVisible ? (
                        <PanelRightClose size={15} />
                    ) : (
                        <PanelRightOpen size={15} />
                    )}
                    <span className="text-xs">TOC</span>
                </Button>
            )}

            <SearchPopover
                align="right"
                defaultNamespace={defaultNamespace}
                trigger={<DocsSearchTrigger />}
            />

            {authUser ? (
                <div className="hidden flex-wrap items-center gap-2 sm:flex">
                    <Button asChild variant="default" size="sm">
                        <Link
                            href={manageHref}
                            className="inline-flex items-center gap-1.5"
                        >
                            <ArrowRightLeft className="size-4" />
                            <span className="hidden lg:inline">Manage</span>
                        </Link>
                    </Button>
                    <ViewContextBadge label="Site View" variant="site" />
                </div>
            ) : (
                <Button asChild variant="outline" size="sm">
                    <Link
                        href={login.url({
                            query: { intended: currentUrl },
                        })}
                    >
                        Login
                    </Link>
                </Button>
            )}
        </div>
    );
}
