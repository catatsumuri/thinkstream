import { Link } from '@inertiajs/react';
import { Archive, Globe, LayoutGrid, NotebookPen } from 'lucide-react';
import { index as adminPostsIndex } from '@/actions/App/Http/Controllers/Admin/PostController';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { dashboard, home } from '@/routes';
import { index as adminBackupsIndex } from '@/routes/admin/backups';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Namespaces',
        href: adminPostsIndex.url(),
        icon: NotebookPen,
    },
    {
        title: 'Backups',
        href: adminBackupsIndex.url(),
        icon: Archive,
    },
    {
        title: 'Site',
        href: home(),
        icon: Globe,
    },
];

const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    const { currentUrl } = useCurrentUrl();
    const postsIndexUrl = adminPostsIndex.url();
    const backupsIndexUrl = adminBackupsIndex.url();
    const isPostsActive =
        currentUrl === postsIndexUrl ||
        currentUrl.startsWith(`${postsIndexUrl}/`);
    const isBackupsActive =
        currentUrl === backupsIndexUrl ||
        currentUrl.startsWith(`${backupsIndexUrl}/`);
    const resolvedMainNavItems = mainNavItems.map((item) => ({
        ...item,
        isActive:
            item.href === postsIndexUrl
                ? isPostsActive
                : item.href === backupsIndexUrl
                  ? isBackupsActive
                  : item.isActive,
    }));

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={resolvedMainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
