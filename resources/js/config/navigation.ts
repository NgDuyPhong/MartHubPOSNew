import { type NavItem } from '@/types';
import { Boxes, ClipboardList, Database, FileText, Gauge, PackagePlus, ShoppingCart, Users, WalletCards } from 'lucide-react';

/** Primary navigation shared by the authenticated POS shell. */
export const mainNavItems: NavItem[] = [
    { title: 'Bán hàng', url: '/pos', icon: ShoppingCart },
    { title: 'Tổng quan', url: '/dashboard', icon: Gauge },
    { title: 'Hóa đơn', url: '/sales', icon: FileText },
    { title: 'Sản phẩm', url: '/products', icon: Boxes },
    { title: 'Nhập kho', url: '/stock-receipts', icon: PackagePlus },
    { title: 'Tồn kho', url: '/inventory', icon: ClipboardList },
    { title: 'Khách & nợ', url: '/customers', icon: Users },
    { title: 'Ca / két', url: '/shifts', icon: WalletCards },
    { title: 'Import sản phẩm cũ', url: '/legacy-imports', icon: Database },
];
