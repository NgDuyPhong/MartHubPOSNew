import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { Boxes, ClipboardList, FileText, Gauge, PackagePlus, ShoppingCart, Store, Users, WalletCards } from 'lucide-react';

const mainNavItems: NavItem[] = [
    { title: 'Bán hàng', url: '/pos', icon: ShoppingCart },
    { title: 'Tổng quan', url: '/dashboard', icon: Gauge },
    { title: 'Hóa đơn', url: '/sales', icon: FileText },
    { title: 'Sản phẩm', url: '/products', icon: Boxes },
    { title: 'Nhập kho', url: '/stock-receipts', icon: PackagePlus },
    { title: 'Tồn kho', url: '/inventory', icon: ClipboardList },
    { title: 'Khách & nợ', url: '/customers', icon: Users },
    { title: 'Ca / két', url: '/shifts', icon: WalletCards },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader className="border-b border-sidebar-border py-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/pos" prefetch>
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-white"><Store className="size-5" /></div>
                                <div className="grid flex-1 text-left text-sm leading-tight"><span className="truncate font-semibold">MartHub POS</span><span className="truncate text-xs text-slate-400">Cửa hàng chính</span></div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent className="py-3"><NavMain items={mainNavItems} /></SidebarContent>
            <SidebarFooter className="border-t border-sidebar-border"><NavUser /></SidebarFooter>
        </Sidebar>
    );
}
