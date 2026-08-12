import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { mainNavItems } from '@/config/navigation';
import { Link } from '@inertiajs/react';
import { Store } from 'lucide-react';

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader className="border-sidebar-border border-b py-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/pos" prefetch>
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                                    <Store className="size-5" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">MartHub POS</span>
                                    <span className="truncate text-xs text-slate-400">Cửa hàng chính</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent className="py-3">
                <NavMain items={mainNavItems} />
            </SidebarContent>
            <SidebarFooter className="border-sidebar-border border-t">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
