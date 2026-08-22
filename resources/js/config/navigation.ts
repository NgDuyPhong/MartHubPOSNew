import { type NavItem } from '@/types';
import { Boxes, ClipboardList, Database, FileText, FolderTree, Gauge, PackagePlus, Ruler, ShoppingCart, Users, WalletCards } from 'lucide-react';

/** Primary navigation shared by the authenticated POS shell. */
export const mainNavItems: NavItem[] = [
    { title: 'Bán hàng', url: '/pos', icon: ShoppingCart, capability: 'pos.sell' },
    { title: 'Tổng quan', url: '/dashboard', icon: Gauge, capability: 'report.view' },
    { title: 'Hóa đơn', url: '/sales', icon: FileText, capability: 'sales.view' },
    { title: 'Sản phẩm', url: '/products', icon: Boxes, capability: 'catalog.manage' },
    { title: 'Danh mục', url: '/categories', icon: FolderTree, capability: 'catalog.manage' },
    { title: 'Đơn vị', url: '/units', icon: Ruler, capability: 'catalog.manage' },
    { title: 'Nhập kho', url: '/stock-receipts', icon: PackagePlus, capability: 'inventory.receive' },
    { title: 'Tồn kho', url: '/inventory', icon: ClipboardList, capability: 'inventory.view' },
    { title: 'Khách & nợ', url: '/customers', icon: Users, capability: 'customer.view' },
    { title: 'Ca / két', url: '/shifts', icon: WalletCards, capability: 'shift.view' },
    { title: 'Import sản phẩm cũ', url: '/legacy-imports', icon: Database, capability: 'import.legacy' },
];
