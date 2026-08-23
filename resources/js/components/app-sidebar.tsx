import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { mainNavItems } from '@/config/navigation';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Store } from 'lucide-react';

export function AppSidebar() {
    const { props } = usePage<SharedData>();
    const legacyImportEnabled = props.features?.legacyProductImportEnabled !== false;
    const capabilities = props.auth.capabilities ?? [];
    const canAccess = (capability?: string) => !capability || capabilities.includes('*') || capabilities.includes(capability);

    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader className="border-sidebar-border border-b py-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/pos" prefetch>
                                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                                    <Store className="size-5" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">MartHub POS</span>
                                    <span className="text-muted-foreground truncate text-xs">Cửa hàng chính</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent className="py-3">
                <NavMain
                    items={mainNavItems.filter((item) => (legacyImportEnabled || item.url !== '/legacy-imports') && canAccess(item.capability))}
                />
            </SidebarContent>
            <SidebarFooter className="border-sidebar-border border-t">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
