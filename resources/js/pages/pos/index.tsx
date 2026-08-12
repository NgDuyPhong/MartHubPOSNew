import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    calculateCartTotals,
    filterCatalog,
    findBarcodeMatch,
    requiresOwnerOverride,
    usePosCart,
    type Customer,
    type Product,
    type ProductUnit,
    type SaleReceipt,
    type Shift,
    type Variant,
} from '@/features/pos';
import AppLayout from '@/layouts/app-layout';
import { formatMoney, formatQuantity } from '@/lib/format';
import { requestJson } from '@/lib/http/client';
import { firstValidationMessage } from '@/lib/http/errors';
import { cacheCatalog, pendingSales, queueSale, syncPendingSales, type PendingSale } from '@/lib/offline-sales';
import { Head, useForm } from '@inertiajs/react';
import { AlertTriangle, Banknote, Minus, Package, Plus, Printer, QrCode, Search, ShoppingCart, Trash2, UserRound, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function PosPage({
    catalog,
    categories,
    customers,
    activeShift,
    registers,
    expiryAlerts,
}: {
    catalog: Product[];
    categories: Array<{ id: number; name: string; color?: string }>;
    customers: Customer[];
    activeShift: Shift | null;
    registers: Array<{ id: number; name: string }>;
    expiryAlerts: number;
}) {
    const [query, setQuery] = useState('');
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const { cart, selectedKey, addLine, updateLine, removeLine, clearCart, selectLine } = usePosCart();
    const [online, setOnline] = useState(navigator.onLine);
    const [pendingCount, setPendingCount] = useState(0);
    const [checkoutExpanded, setCheckoutExpanded] = useState(false);
    const [openShiftOpen, setOpenShiftOpen] = useState(!activeShift);
    const [receipt, setReceipt] = useState<SaleReceipt | null>(null);
    const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);
    const [cash, setCash] = useState(0);
    const [qr, setQr] = useState(0);
    const [qrConfirmed, setQrConfirmed] = useState(false);
    const [customerId, setCustomerId] = useState<number | null>(null);
    const [ownerPin, setOwnerPin] = useState('');
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const checkoutRef = useRef<HTMLDivElement>(null);
    const confirmCheckoutRef = useRef<HTMLButtonElement>(null);
    const openShiftForm = useForm({ register_id: registers[0]?.id ?? 0, opening_cash: 0 });

    const products = useMemo(() => filterCatalog(catalog, query, categoryId), [catalog, categoryId, query]);
    const { subtotal, discount, total, paid, debt, changeAmount } = calculateCartTotals(cart, cash, qr);
    const overrideNeeded = requiresOwnerOverride(cart);

    const refreshPending = () => pendingSales().then((items) => setPendingCount(items.length));

    useEffect(() => {
        cacheCatalog(catalog);
        refreshPending();
        if (navigator.onLine) syncPendingSales().then(refreshPending);
        const goOnline = async () => {
            setOnline(true);
            const result = await syncPendingSales();
            await refreshPending();
            if (result.synced) setMessage(`Đã đồng bộ ${result.synced} hóa đơn offline.`);
        };
        const goOffline = () => setOnline(false);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, [catalog, clearCart]);

    useEffect(() => {
        const shortcuts = (event: KeyboardEvent) => {
            if (event.key === 'F3') {
                event.preventDefault();
                searchRef.current?.focus();
            }
            if (event.key === 'F8') {
                event.preventDefault();
                clearCart();
            }
            if (event.key === 'F9') {
                event.preventDefault();
                if (cart.length) {
                    setCash(total);
                    setCheckoutExpanded(true);
                    window.setTimeout(() => confirmCheckoutRef.current?.focus(), 0);
                }
            }
            if (event.key === 'F12') {
                event.preventDefault();
                if (cart.length) {
                    setCheckoutExpanded(true);
                    window.setTimeout(() => checkoutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0);
                }
            }
            if (event.key === 'Escape' && checkoutExpanded) {
                event.preventDefault();
                setCheckoutExpanded(false);
                searchRef.current?.focus();
            }
            if (event.key === 'Delete' && selectedKey) removeLine(selectedKey);
        };
        window.addEventListener('keydown', shortcuts);
        return () => window.removeEventListener('keydown', shortcuts);
    }, [cart.length, checkoutExpanded, clearCart, removeLine, selectedKey, total]);

    const addUnit = (product: Product, variant: Variant, productUnit: ProductUnit) => {
        setReceipt(null);
        setReceiptPreviewOpen(false);
        addLine(product, variant, productUnit);
        setQuery('');
        searchRef.current?.focus();
    };

    const addDefault = (product: Product) => {
        const variant = product.variants[0];
        if (!variant) return;
        const unit = variant.units.find((item) => item.is_default_sale) ?? variant.units[0];
        if (unit) addUnit(product, variant, unit);
    };

    const handleSearchKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter' || !query.trim()) return;
        const exact = findBarcodeMatch(catalog, query);
        if (exact) addUnit(exact.product, exact.variant, exact.unit);
        else if (products.length === 1) addDefault(products[0]);
    };

    const checkout = async () => {
        if (!activeShift || !cart.length) return;
        if (debt > 0 && !customerId) {
            setMessage('Cần chọn khách hàng khi hóa đơn còn nợ.');
            return;
        }
        if (qr > 0 && !qrConfirmed) {
            setMessage('Hãy xác nhận đã thấy tiền QR vào tài khoản.');
            return;
        }
        if (!online && overrideNeeded) {
            setMessage('Sửa giá/giảm giá cần PIN chủ cửa hàng và phải chờ đến khi online.');
            return;
        }

        const payload: PendingSale & { owner_pin?: string } = {
            idempotency_key: crypto.randomUUID(),
            shift_id: activeShift.id,
            customer_id: customerId,
            source: online ? 'online' : 'offline_sync',
            items: cart.map((line) => ({
                product_unit_id: line.productUnit.id,
                quantity: line.quantity,
                ...(line.unitPrice !== line.productUnit.sale_price ? { unit_price: line.unitPrice } : {}),
                ...(line.discount ? { discount_amount: line.discount } : {}),
            })),
            payments: [
                ...(cash > 0 ? [{ method: 'cash' as const, amount: cash }] : []),
                ...(qr > 0 ? [{ method: 'qr' as const, amount: qr, manually_confirmed: qrConfirmed }] : []),
            ],
            ...(ownerPin ? { owner_pin: ownerPin } : {}),
        };
        setProcessing(true);
        setMessage(null);
        try {
            const result = await requestJson<{ sale: SaleReceipt }>('/sales', { method: 'POST', body: payload });
            setReceipt(result.sale);
            clearCart();
            setCheckoutExpanded(false);
            setCash(0);
            setQr(0);
            setOwnerPin('');
            setCustomerId(null);
            setMessage('Thanh toán thành công. Bạn có thể quét đơn tiếp theo.');
            searchRef.current?.focus();
        } catch (error) {
            if (!navigator.onLine && !overrideNeeded) {
                const offlinePayload = { ...payload, source: 'offline_sync' as const };
                delete offlinePayload.owner_pin;
                await queueSale(offlinePayload);
                await refreshPending();
                clearCart();
                setCheckoutExpanded(false);
                setMessage('Đã lưu hóa đơn offline; hệ thống sẽ tự đồng bộ khi có mạng.');
                searchRef.current?.focus();
            } else setMessage(firstValidationMessage(error) ?? (error instanceof Error ? error.message : 'Không thể lưu hóa đơn.'));
        } finally {
            setProcessing(false);
        }
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Bán hàng', href: '/pos' }]}>
            <Head title="Bán hàng" />
            <div className="flex min-h-0 flex-1 flex-col bg-slate-100 p-3 lg:h-[calc(100vh-4rem)]">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 shadow-sm">
                    <div className="flex items-center gap-2 text-sm">
                        <Badge className={online ? 'bg-emerald-600' : 'bg-amber-600'}>
                            {online ? <Wifi className="mr-1 size-3" /> : <WifiOff className="mr-1 size-3" />}
                            {online ? 'Online' : 'Offline'}
                        </Badge>
                        <span className="font-medium">{activeShift ? `${activeShift.code} · ${activeShift.register.name}` : 'Chưa mở ca'}</span>
                        {pendingCount > 0 && <Badge variant="outline">{pendingCount} HĐ chờ đồng bộ</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        F3 tìm · F8 xóa giỏ · F9 tiền đủ · F12 thanh toán
                        {expiryAlerts > 0 && (
                            <Badge className="bg-orange-100 text-orange-800">
                                <AlertTriangle className="mr-1 size-3" />
                                {expiryAlerts} lô cận/hết hạn
                            </Badge>
                        )}
                    </div>
                </div>
                {message && (
                    <button
                        className="mb-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-left text-sm text-blue-800"
                        onClick={() => setMessage(null)}
                    >
                        {message}
                    </button>
                )}
                <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-5">
                    <section className="flex min-h-[420px] flex-col overflow-hidden rounded-lg border bg-white shadow-sm lg:col-span-2">
                        <div className="border-b p-3">
                            <div className="relative">
                                <Search className="absolute top-2.5 left-3 size-4 text-slate-400" />
                                <Input
                                    ref={searchRef}
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    onKeyDown={handleSearchKey}
                                    className="pl-9"
                                    autoFocus
                                    placeholder="Quét mã vạch hoặc tìm tên, SKU (F3)"
                                />
                            </div>
                            <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
                                <Button size="sm" variant={categoryId === null ? 'default' : 'outline'} onClick={() => setCategoryId(null)}>
                                    Tất cả
                                </Button>
                                {categories.map((category) => (
                                    <Button
                                        key={category.id}
                                        size="sm"
                                        variant={categoryId === category.id ? 'default' : 'outline'}
                                        onClick={() => setCategoryId(category.id)}
                                    >
                                        {category.name}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div className="grid flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto p-2 xl:grid-cols-3">
                            {products.map((product) => {
                                const variant = product.variants[0];
                                const unit = variant?.units.find((item) => item.is_default_sale) ?? variant?.units[0];
                                const stock = Number(variant?.balances[0]?.quantity_base ?? 0);
                                return (
                                    <button
                                        key={product.id}
                                        onClick={() => addDefault(product)}
                                        className="group flex min-h-32 flex-col rounded-lg border bg-white p-3 text-left transition hover:border-blue-500 hover:shadow-md"
                                    >
                                        {product.image_path ? (
                                            <img src={`/storage/${product.image_path}`} alt="" className="mb-2 size-12 rounded-md object-cover" />
                                        ) : (
                                            <div className="mb-2 flex size-9 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                                                <Package className="size-5" />
                                            </div>
                                        )}
                                        <span className="line-clamp-2 min-h-10 text-sm font-semibold">{product.name}</span>
                                        <span className="text-xs text-slate-500">
                                            {product.sku} · Tồn {formatQuantity(stock)}
                                        </span>
                                        <div className="mt-auto flex w-full items-end justify-between">
                                            <strong className="text-blue-700">{formatMoney(unit?.sale_price ?? 0)}đ</strong>
                                            <span className="text-xs">/{unit?.unit.name}</span>
                                        </div>
                                        {variant?.units.length > 1 && (
                                            <div className="mt-2 flex flex-wrap gap-1" onClick={(event) => event.stopPropagation()}>
                                                {variant.units.map((choice) => (
                                                    <span
                                                        key={choice.id}
                                                        role="button"
                                                        onClick={() => addUnit(product, variant, choice)}
                                                        className="rounded bg-slate-100 px-1.5 py-1 text-[11px] hover:bg-blue-100"
                                                    >
                                                        {choice.unit.name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                    <section className="flex min-h-[480px] flex-col overflow-hidden rounded-lg border bg-white shadow-sm lg:col-span-3">
                        <div className="flex items-center justify-between border-b px-4 py-3">
                            <div>
                                <h2 className="font-semibold">Hóa đơn hiện tại</h2>
                                <p className="text-xs text-slate-500">{cart.length} dòng sản phẩm</p>
                            </div>
                            <Button variant="ghost" size="sm" disabled={!cart.length} onClick={clearCart}>
                                <Trash2 className="mr-1 size-4" />
                                Xóa giỏ
                            </Button>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-3 py-2">Sản phẩm</th>
                                        <th className="w-28 px-2 py-2">SL</th>
                                        <th className="w-32 px-2 py-2">Đơn giá</th>
                                        <th className="w-28 px-2 py-2">Giảm</th>
                                        <th className="w-28 px-3 py-2 text-right">Thành tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cart.map((line) => (
                                        <tr
                                            key={line.key}
                                            onClick={() => selectLine(line.key)}
                                            className={`border-t ${selectedKey === line.key ? 'bg-blue-50' : ''}`}
                                        >
                                            <td className="px-3 py-2">
                                                <div className="font-medium">{line.product.name}</div>
                                                <div className="text-xs text-slate-500">
                                                    {line.productUnit.unit.name} · 1 {line.productUnit.unit.code} ={' '}
                                                    {Number(line.productUnit.conversion_to_base)} đơn vị gốc
                                                </div>
                                            </td>
                                            <td className="px-2 py-2">
                                                <div className="flex items-center">
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        className="size-7"
                                                        onClick={() =>
                                                            line.quantity <= 1
                                                                ? removeLine(line.key)
                                                                : updateLine(line.key, { quantity: line.quantity - 1 })
                                                        }
                                                    >
                                                        <Minus className="size-3" />
                                                    </Button>
                                                    <Input
                                                        className="h-7 w-12 rounded-none px-1 text-center"
                                                        type="number"
                                                        min="0.001"
                                                        value={line.quantity}
                                                        onChange={(event) =>
                                                            updateLine(line.key, { quantity: Math.max(0.001, Number(event.target.value)) })
                                                        }
                                                    />
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        className="size-7"
                                                        onClick={() => updateLine(line.key, { quantity: line.quantity + 1 })}
                                                    >
                                                        <Plus className="size-3" />
                                                    </Button>
                                                </div>
                                            </td>
                                            <td className="px-2">
                                                <Input
                                                    className="h-8 px-2 text-right"
                                                    type="number"
                                                    value={line.unitPrice}
                                                    disabled={!online}
                                                    onChange={(event) => updateLine(line.key, { unitPrice: Math.max(0, Number(event.target.value)) })}
                                                />
                                            </td>
                                            <td className="px-2">
                                                <Input
                                                    className="h-8 px-2 text-right"
                                                    type="number"
                                                    value={line.discount}
                                                    disabled={!online}
                                                    onChange={(event) => updateLine(line.key, { discount: Math.max(0, Number(event.target.value)) })}
                                                />
                                            </td>
                                            <td className="px-3 text-right font-semibold">
                                                {formatMoney(line.unitPrice * line.quantity - line.discount)}đ
                                            </td>
                                        </tr>
                                    ))}
                                    {!cart.length && (
                                        <tr>
                                            <td colSpan={5} className="py-20 text-center text-slate-400">
                                                <ShoppingCart className="mx-auto mb-2 size-10" />
                                                Quét mã hoặc chọn sản phẩm để bắt đầu
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div ref={checkoutRef} className="border-t bg-slate-50 p-4">
                            <div className="mb-3 grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="text-slate-500">Tạm tính</span>
                                    <div className="font-semibold">{formatMoney(subtotal)}đ</div>
                                </div>
                                <div>
                                    <span className="text-slate-500">Giảm giá</span>
                                    <div className="font-semibold text-orange-600">-{formatMoney(discount)}đ</div>
                                </div>
                                <div className="text-right">
                                    <span className="text-slate-500">Phải thu</span>
                                    <div className="text-2xl font-bold text-blue-700">{formatMoney(total)}đ</div>
                                </div>
                            </div>
                            {!checkoutExpanded ? (
                                <Button
                                    className="h-12 w-full bg-blue-600 text-base hover:bg-blue-700"
                                    disabled={!cart.length || !activeShift}
                                    onClick={() => setCheckoutExpanded(true)}
                                >
                                    <Banknote className="mr-2 size-5" />
                                    Thanh toán (F12)
                                </Button>
                            ) : (
                                <div className="space-y-3 rounded-lg border border-blue-200 bg-white p-3 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold">Thanh toán</h3>
                                            <p className="text-xs text-slate-500">Cash, QR hoặc ghi nợ phần còn lại</p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setCheckoutExpanded(false);
                                                searchRef.current?.focus();
                                            }}
                                        >
                                            Thu gọn
                                        </Button>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div className="space-y-3">
                                            <div>
                                                <Label className="flex items-center gap-2">
                                                    <Banknote className="size-4" />
                                                    Tiền mặt khách đưa
                                                </Label>
                                                <Input
                                                    autoFocus
                                                    type="number"
                                                    min="0"
                                                    value={cash}
                                                    onChange={(event) => setCash(Number(event.target.value))}
                                                />
                                            </div>
                                            <div>
                                                <Label className="flex items-center gap-2">
                                                    <QrCode className="size-4" />
                                                    Chuyển khoản / QR
                                                </Label>
                                                <Input type="number" min="0" value={qr} onChange={(event) => setQr(Number(event.target.value))} />
                                            </div>
                                            {qr > 0 && (
                                                <label className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
                                                    <input
                                                        type="checkbox"
                                                        className="mt-1"
                                                        checked={qrConfirmed}
                                                        onChange={(event) => setQrConfirmed(event.target.checked)}
                                                    />
                                                    Tôi đã kiểm tra thủ công và thấy tiền vào tài khoản ngân hàng.
                                                </label>
                                            )}
                                        </div>
                                        <div className="space-y-3 rounded-md bg-slate-50 p-3">
                                            <div className="flex justify-between">
                                                <span>Đã thanh toán</span>
                                                <strong>{formatMoney(paid)}đ</strong>
                                            </div>
                                            <div className="flex justify-between text-red-600">
                                                <span>Còn ghi nợ</span>
                                                <strong>{formatMoney(debt)}đ</strong>
                                            </div>
                                            <div>
                                                <Label>
                                                    <UserRound className="mr-1 inline size-4" />
                                                    Khách hàng {debt > 0 && '*'}
                                                </Label>
                                                <select
                                                    value={customerId ?? ''}
                                                    onChange={(event) => setCustomerId(event.target.value ? Number(event.target.value) : null)}
                                                    className="mt-1 h-10 w-full rounded-md border bg-white px-3"
                                                >
                                                    <option value="">Khách lẻ</option>
                                                    {customers.map((customer) => (
                                                        <option key={customer.id} value={customer.id}>
                                                            {customer.name}
                                                            {customer.phone ? ` · ${customer.phone}` : ''} · Nợ {formatMoney(customer.balance)}đ
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            {overrideNeeded && (
                                                <div>
                                                    <Label>PIN chủ cửa hàng</Label>
                                                    <Input
                                                        type="password"
                                                        inputMode="numeric"
                                                        value={ownerPin}
                                                        disabled={!online}
                                                        onChange={(event) => setOwnerPin(event.target.value)}
                                                        placeholder={online ? 'Bắt buộc do có sửa giá/giảm giá' : 'Chỉ duyệt khi online'}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                                        <div className="text-sm">
                                            <span className="text-slate-500">Tiền thừa:</span>{' '}
                                            <strong className="text-emerald-700">{formatMoney(changeAmount)}đ</strong>
                                            <span className="ml-3 text-slate-500">Còn nợ:</span>{' '}
                                            <strong className="text-red-600">{formatMoney(debt)}đ</strong>
                                        </div>
                                        <Button ref={confirmCheckoutRef} onClick={checkout} disabled={processing || !cart.length}>
                                            {processing ? 'Đang lưu...' : online ? 'Xác nhận thanh toán · Enter' : 'Lưu hóa đơn offline'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>

            <Dialog open={openShiftOpen} onOpenChange={setOpenShiftOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Mở ca bán hàng</DialogTitle>
                        <DialogDescription>Cần ghi nhận tiền đầu ca trước khi phát sinh hóa đơn.</DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            openShiftForm.post('/shifts', {
                                preserveScroll: true,
                                onSuccess: () => {
                                    setOpenShiftOpen(false);
                                    openShiftForm.reset();
                                    searchRef.current?.focus();
                                },
                            });
                        }}
                        className="space-y-4"
                    >
                        <div>
                            <Label>Quầy</Label>
                            <select
                                name="register_id"
                                value={openShiftForm.data.register_id}
                                onChange={(event) => openShiftForm.setData('register_id', Number(event.target.value))}
                                className="mt-1 h-10 w-full rounded-md border bg-white px-3"
                                required
                            >
                                {registers.map((register) => (
                                    <option key={register.id} value={register.id}>
                                        {register.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label>Tiền đầu ca</Label>
                            <Input
                                name="opening_cash"
                                type="number"
                                min="0"
                                value={openShiftForm.data.opening_cash}
                                onChange={(event) => openShiftForm.setData('opening_cash', Number(event.target.value))}
                                required
                            />
                        </div>
                        {Object.keys(openShiftForm.errors).length > 0 && (
                            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {Object.values(openShiftForm.errors)[0]}
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="submit" disabled={openShiftForm.processing}>
                                {openShiftForm.processing ? 'Đang mở ca...' : 'Mở ca'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {receipt && (
                <div className="fixed inset-x-0 bottom-4 z-20 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-lg">
                    <div>
                        <div className="font-semibold">Đã lưu hóa đơn {receipt.invoice_number}</div>
                        <div>
                            {formatMoney(receipt.total)}đ · Đã thu {formatMoney(receipt.paid_amount)}đ
                            {receipt.debt_amount > 0 ? ` · Còn nợ ${formatMoney(receipt.debt_amount)}đ` : ''}
                        </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                        <Button size="sm" variant="outline" onClick={() => setReceiptPreviewOpen(true)}>
                            Xem hóa đơn
                        </Button>
                        <Button size="sm" onClick={() => setReceiptPreviewOpen(true)}>
                            <Printer className="mr-2 size-4" />
                            In
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setReceipt(null)}>
                            Đóng
                        </Button>
                    </div>
                </div>
            )}
            <Dialog open={receiptPreviewOpen} onOpenChange={setReceiptPreviewOpen}>
                <DialogContent className="max-w-sm">
                    <div data-receipt className="bg-white text-black">
                        <DialogHeader>
                            <DialogTitle className="text-center">MART HUB MINI MART</DialogTitle>
                            <DialogDescription className="text-center">HÓA ĐƠN BÁN HÀNG · Khổ 58mm</DialogDescription>
                        </DialogHeader>
                        {receipt && (
                            <div className="mt-3 space-y-2 text-xs">
                                <div className="border-y border-dashed py-2">
                                    <div>Số HĐ: {receipt.invoice_number}</div>
                                    <div>Thời gian: {new Date(receipt.sold_at).toLocaleString('vi-VN')}</div>
                                </div>
                                {receipt.items.map((item) => (
                                    <div key={item.id}>
                                        <div className="font-medium">{item.product_name}</div>
                                        <div className="flex justify-between">
                                            <span>
                                                {Number(item.quantity)} {item.unit_name} × {formatMoney(item.unit_price)}
                                            </span>
                                            <span>{formatMoney(item.line_total)}đ</span>
                                        </div>
                                    </div>
                                ))}
                                <div className="space-y-1 border-t border-dashed pt-2">
                                    <div className="flex justify-between">
                                        <span>Tổng tiền</span>
                                        <strong>{formatMoney(receipt.total)}đ</strong>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Đã thu</span>
                                        <span>{formatMoney(receipt.paid_amount)}đ</span>
                                    </div>
                                    {receipt.debt_amount > 0 && (
                                        <div className="flex justify-between">
                                            <span>Còn nợ</span>
                                            <span>{formatMoney(receipt.debt_amount)}đ</span>
                                        </div>
                                    )}
                                    <div className="text-center">Cảm ơn quý khách!</div>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter data-print-hidden>
                        <Button variant="outline" onClick={() => setReceiptPreviewOpen(false)}>
                            Đóng
                        </Button>
                        <Button onClick={() => window.print()}>
                            <Printer className="mr-2 size-4" />
                            In hóa đơn
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
