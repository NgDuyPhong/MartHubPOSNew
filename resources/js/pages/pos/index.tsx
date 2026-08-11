import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { cacheCatalog, pendingSales, queueSale, syncPendingSales, type PendingSale } from '@/lib/offline-sales';
import { Head, router } from '@inertiajs/react';
import { AlertTriangle, Banknote, CheckCircle2, Minus, Package, Plus, Printer, QrCode, Search, ShoppingCart, Trash2, UserRound, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type ProductUnit = { id: number; conversion_to_base: string; sale_price: number; is_default_sale: boolean; unit: { code: string; name: string }; barcodes: Array<{ value: string }> };
type Variant = { id: number; name: string; units: ProductUnit[]; balances: Array<{ quantity_base: string }> };
type Product = { id: number; sku: string; name: string; image_path?: string; category_id: number | null; category?: { name: string; color?: string }; variants: Variant[] };
type Customer = { id: number; code: string; name: string; phone?: string; balance: number };
type Shift = { id: number; code: string; opening_cash: number; register: { name: string } };
type CartLine = { key: string; product: Product; variant: Variant; productUnit: ProductUnit; quantity: number; unitPrice: number; discount: number };
type SaleReceipt = { invoice_number: string; sold_at: string; subtotal: number; discount_amount: number; total: number; paid_amount: number; debt_amount: number; change_amount: number; items: Array<{ id: number; product_name: string; quantity: string; unit_name: string; unit_price: number; line_total: number }> };

const money = new Intl.NumberFormat('vi-VN');
const csrf = () => document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

export default function PosPage({ catalog, categories, customers, activeShift, registers, expiryAlerts }: { catalog: Product[]; categories: Array<{ id: number; name: string; color?: string }>; customers: Customer[]; activeShift: Shift | null; registers: Array<{ id: number; name: string }>; expiryAlerts: number }) {
    const [query, setQuery] = useState('');
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [cart, setCart] = useState<CartLine[]>([]);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [online, setOnline] = useState(navigator.onLine);
    const [pendingCount, setPendingCount] = useState(0);
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [openShiftOpen, setOpenShiftOpen] = useState(!activeShift);
    const [receipt, setReceipt] = useState<SaleReceipt | null>(null);
    const [cash, setCash] = useState(0);
    const [qr, setQr] = useState(0);
    const [qrConfirmed, setQrConfirmed] = useState(false);
    const [customerId, setCustomerId] = useState<number | null>(null);
    const [ownerPin, setOwnerPin] = useState('');
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const products = useMemo(() => catalog.filter((product) => {
        if (categoryId && product.category_id !== categoryId) return false;
        const normalized = query.trim().toLowerCase();
        if (!normalized) return true;
        return product.name.toLowerCase().includes(normalized) || product.sku.toLowerCase().includes(normalized) || product.variants.some((variant) => variant.units.some((unit) => unit.barcodes.some((barcode) => barcode.value.includes(normalized))));
    }), [catalog, categoryId, query]);
    const subtotal = cart.reduce((sum, line) => sum + Math.round(line.unitPrice * line.quantity), 0);
    const discount = cart.reduce((sum, line) => sum + line.discount, 0);
    const total = Math.max(0, subtotal - discount);
    const paid = Math.min(total, Math.max(0, cash) + Math.max(0, qr));
    const debt = total - paid;
    const overrideNeeded = cart.some((line) => line.unitPrice !== line.productUnit.sale_price || line.discount > 0);

    const refreshPending = () => pendingSales().then((items) => setPendingCount(items.length));

    useEffect(() => {
        cacheCatalog(catalog);
        refreshPending();
        if (navigator.onLine) syncPendingSales(csrf()).then(refreshPending);
        const goOnline = async () => { setOnline(true); const result = await syncPendingSales(csrf()); await refreshPending(); if (result.synced) setMessage(`Đã đồng bộ ${result.synced} hóa đơn offline.`); };
        const goOffline = () => setOnline(false);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
    }, [catalog]);

    useEffect(() => {
        const shortcuts = (event: KeyboardEvent) => {
            if (event.key === 'F3') { event.preventDefault(); searchRef.current?.focus(); }
            if (event.key === 'F8') { event.preventDefault(); setCart([]); }
            if (event.key === 'F9') { event.preventDefault(); setCash(total); setCheckoutOpen(true); }
            if (event.key === 'F12') { event.preventDefault(); if (cart.length) setCheckoutOpen(true); }
            if (event.key === 'Delete' && selectedKey) setCart((lines) => lines.filter((line) => line.key !== selectedKey));
        };
        window.addEventListener('keydown', shortcuts);
        return () => window.removeEventListener('keydown', shortcuts);
    }, [cart.length, selectedKey, total]);

    const addUnit = (product: Product, variant: Variant, productUnit: ProductUnit) => {
        const key = `${variant.id}-${productUnit.id}`;
        setCart((lines) => {
            const existing = lines.find((line) => line.key === key);
            return existing ? lines.map((line) => line.key === key ? { ...line, quantity: line.quantity + 1 } : line) : [...lines, { key, product, variant, productUnit, quantity: 1, unitPrice: productUnit.sale_price, discount: 0 }];
        });
        setSelectedKey(key);
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
        const exact = catalog.flatMap((product) => product.variants.flatMap((variant) => variant.units.flatMap((unit) => unit.barcodes.map((barcode) => ({ product, variant, unit, barcode: barcode.value }))))).find((row) => row.barcode === query.trim());
        if (exact) addUnit(exact.product, exact.variant, exact.unit); else if (products.length === 1) addDefault(products[0]);
    };

    const updateLine = (key: string, values: Partial<CartLine>) => setCart((lines) => lines.map((line) => line.key === key ? { ...line, ...values } : line));

    const checkout = async () => {
        if (!activeShift || !cart.length) return;
        if (debt > 0 && !customerId) { setMessage('Cần chọn khách hàng khi hóa đơn còn nợ.'); return; }
        if (qr > 0 && !qrConfirmed) { setMessage('Hãy xác nhận đã thấy tiền QR vào tài khoản.'); return; }
        if (!online && overrideNeeded) { setMessage('Sửa giá/giảm giá cần PIN chủ cửa hàng và phải chờ đến khi online.'); return; }

        const payload: PendingSale & { owner_pin?: string } = {
            idempotency_key: crypto.randomUUID(), shift_id: activeShift.id, customer_id: customerId, source: online ? 'online' : 'offline_sync',
            items: cart.map((line) => ({ product_unit_id: line.productUnit.id, quantity: line.quantity, ...(line.unitPrice !== line.productUnit.sale_price ? { unit_price: line.unitPrice } : {}), ...(line.discount ? { discount_amount: line.discount } : {}) })),
            payments: [...(cash > 0 ? [{ method: 'cash' as const, amount: cash }] : []), ...(qr > 0 ? [{ method: 'qr' as const, amount: qr, manually_confirmed: qrConfirmed }] : [])],
            ...(ownerPin ? { owner_pin: ownerPin } : {}),
        };
        setProcessing(true); setMessage(null);
        try {
            const response = await fetch('/sales', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrf() }, body: JSON.stringify(payload) });
            if (!response.ok) { const error = await response.json(); throw new Error(Object.values(error.errors ?? {}).flat()[0] as string ?? error.message); }
            const result = await response.json();
            setReceipt(result.sale); setCart([]); setCheckoutOpen(false); setCash(0); setQr(0); setOwnerPin(''); setCustomerId(null); setMessage('Thanh toán thành công.');
        } catch (error) {
            if (!navigator.onLine && !overrideNeeded) {
                const offlinePayload = { ...payload, source: 'offline_sync' as const }; delete offlinePayload.owner_pin;
                await queueSale(offlinePayload); await refreshPending(); setCart([]); setCheckoutOpen(false); setMessage('Đã lưu hóa đơn offline; hệ thống sẽ tự đồng bộ khi có mạng.');
            } else setMessage(error instanceof Error ? error.message : 'Không thể lưu hóa đơn.');
        } finally { setProcessing(false); }
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Bán hàng', href: '/pos' }]}>
            <Head title="Bán hàng" />
            <div className="flex min-h-0 flex-1 flex-col bg-slate-100 p-3 lg:h-[calc(100vh-4rem)]">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 shadow-sm">
                    <div className="flex items-center gap-2 text-sm"><Badge className={online ? 'bg-emerald-600' : 'bg-amber-600'}>{online ? <Wifi className="mr-1 size-3" /> : <WifiOff className="mr-1 size-3" />}{online ? 'Online' : 'Offline'}</Badge><span className="font-medium">{activeShift ? `${activeShift.code} · ${activeShift.register.name}` : 'Chưa mở ca'}</span>{pendingCount > 0 && <Badge variant="outline">{pendingCount} HĐ chờ đồng bộ</Badge>}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">F3 tìm · F8 xóa giỏ · F9 tiền đủ · F12 thanh toán{expiryAlerts > 0 && <Badge className="bg-orange-100 text-orange-800"><AlertTriangle className="mr-1 size-3" />{expiryAlerts} lô cận/hết hạn</Badge>}</div>
                </div>
                {message && <button className="mb-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-left text-sm text-blue-800" onClick={() => setMessage(null)}>{message}</button>}
                <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-5">
                    <section className="flex min-h-[420px] flex-col overflow-hidden rounded-lg border bg-white shadow-sm lg:col-span-2">
                        <div className="border-b p-3"><div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-slate-400" /><Input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleSearchKey} className="pl-9" autoFocus placeholder="Quét mã vạch hoặc tìm tên, SKU (F3)" /></div>
                            <div className="mt-2 flex gap-1 overflow-x-auto pb-1"><Button size="sm" variant={categoryId === null ? 'default' : 'outline'} onClick={() => setCategoryId(null)}>Tất cả</Button>{categories.map((category) => <Button key={category.id} size="sm" variant={categoryId === category.id ? 'default' : 'outline'} onClick={() => setCategoryId(category.id)}>{category.name}</Button>)}</div></div>
                        <div className="grid flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto p-2 xl:grid-cols-3">
                            {products.map((product) => { const variant = product.variants[0]; const unit = variant?.units.find((item) => item.is_default_sale) ?? variant?.units[0]; const stock = Number(variant?.balances[0]?.quantity_base ?? 0); return <button key={product.id} onClick={() => addDefault(product)} className="group flex min-h-32 flex-col rounded-lg border bg-white p-3 text-left transition hover:border-blue-500 hover:shadow-md">{product.image_path ? <img src={`/storage/${product.image_path}`} alt="" className="mb-2 size-12 rounded-md object-cover" /> : <div className="mb-2 flex size-9 items-center justify-center rounded-md bg-blue-50 text-blue-600"><Package className="size-5" /></div>}<span className="line-clamp-2 min-h-10 text-sm font-semibold">{product.name}</span><span className="text-xs text-slate-500">{product.sku} · Tồn {money.format(stock)}</span><div className="mt-auto flex w-full items-end justify-between"><strong className="text-blue-700">{money.format(unit?.sale_price ?? 0)}đ</strong><span className="text-xs">/{unit?.unit.name}</span></div>{variant?.units.length > 1 && <div className="mt-2 flex flex-wrap gap-1" onClick={(event) => event.stopPropagation()}>{variant.units.map((choice) => <span key={choice.id} role="button" onClick={() => addUnit(product, variant, choice)} className="rounded bg-slate-100 px-1.5 py-1 text-[11px] hover:bg-blue-100">{choice.unit.name}</span>)}</div>}</button>; })}
                        </div>
                    </section>
                    <section className="flex min-h-[480px] flex-col overflow-hidden rounded-lg border bg-white shadow-sm lg:col-span-3">
                        <div className="flex items-center justify-between border-b px-4 py-3"><div><h2 className="font-semibold">Hóa đơn hiện tại</h2><p className="text-xs text-slate-500">{cart.length} dòng sản phẩm</p></div><Button variant="ghost" size="sm" disabled={!cart.length} onClick={() => setCart([])}><Trash2 className="mr-1 size-4" />Xóa giỏ</Button></div>
                        <div className="min-h-0 flex-1 overflow-y-auto"><table className="w-full text-sm"><thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Sản phẩm</th><th className="w-28 px-2 py-2">SL</th><th className="w-32 px-2 py-2">Đơn giá</th><th className="w-28 px-2 py-2">Giảm</th><th className="w-28 px-3 py-2 text-right">Thành tiền</th></tr></thead><tbody>{cart.map((line) => <tr key={line.key} onClick={() => setSelectedKey(line.key)} className={`border-t ${selectedKey === line.key ? 'bg-blue-50' : ''}`}><td className="px-3 py-2"><div className="font-medium">{line.product.name}</div><div className="text-xs text-slate-500">{line.productUnit.unit.name} · 1 {line.productUnit.unit.code} = {Number(line.productUnit.conversion_to_base)} đơn vị gốc</div></td><td className="px-2 py-2"><div className="flex items-center"><Button size="icon" variant="outline" className="size-7" onClick={() => line.quantity <= 1 ? setCart((items) => items.filter((item) => item.key !== line.key)) : updateLine(line.key, { quantity: line.quantity - 1 })}><Minus className="size-3" /></Button><Input className="h-7 w-12 rounded-none px-1 text-center" type="number" min="0.001" value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: Math.max(.001, Number(event.target.value)) })} /><Button size="icon" variant="outline" className="size-7" onClick={() => updateLine(line.key, { quantity: line.quantity + 1 })}><Plus className="size-3" /></Button></div></td><td className="px-2"><Input className="h-8 px-2 text-right" type="number" value={line.unitPrice} disabled={!online} onChange={(event) => updateLine(line.key, { unitPrice: Math.max(0, Number(event.target.value)) })} /></td><td className="px-2"><Input className="h-8 px-2 text-right" type="number" value={line.discount} disabled={!online} onChange={(event) => updateLine(line.key, { discount: Math.max(0, Number(event.target.value)) })} /></td><td className="px-3 text-right font-semibold">{money.format(line.unitPrice * line.quantity - line.discount)}đ</td></tr>)}{!cart.length && <tr><td colSpan={5} className="py-20 text-center text-slate-400"><ShoppingCart className="mx-auto mb-2 size-10" />Quét mã hoặc chọn sản phẩm để bắt đầu</td></tr>}</tbody></table></div>
                        <div className="border-t bg-slate-50 p-4"><div className="mb-3 grid grid-cols-3 gap-4 text-sm"><div><span className="text-slate-500">Tạm tính</span><div className="font-semibold">{money.format(subtotal)}đ</div></div><div><span className="text-slate-500">Giảm giá</span><div className="font-semibold text-orange-600">-{money.format(discount)}đ</div></div><div className="text-right"><span className="text-slate-500">Phải thu</span><div className="text-2xl font-bold text-blue-700">{money.format(total)}đ</div></div></div><Button className="h-12 w-full bg-blue-600 text-base hover:bg-blue-700" disabled={!cart.length || !activeShift} onClick={() => setCheckoutOpen(true)}><Banknote className="mr-2 size-5" />Thanh toán (F12)</Button></div>
                    </section>
                </div>
            </div>

            <Dialog open={openShiftOpen} onOpenChange={setOpenShiftOpen}><DialogContent><DialogHeader><DialogTitle>Mở ca bán hàng</DialogTitle><DialogDescription>Cần ghi nhận tiền đầu ca trước khi phát sinh hóa đơn.</DialogDescription></DialogHeader><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); router.post('/shifts', { register_id: Number(form.get('register_id')), opening_cash: Number(form.get('opening_cash')) }, { onSuccess: () => setOpenShiftOpen(false) }); }} className="space-y-4"><div><Label>Quầy</Label><select name="register_id" className="mt-1 h-10 w-full rounded-md border bg-white px-3" required>{registers.map((register) => <option key={register.id} value={register.id}>{register.name}</option>)}</select></div><div><Label>Tiền đầu ca</Label><Input name="opening_cash" type="number" min="0" defaultValue="0" required /></div><DialogFooter><Button type="submit">Mở ca</Button></DialogFooter></form></DialogContent></Dialog>

            <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Thanh toán · {money.format(total)}đ</DialogTitle><DialogDescription>Có thể kết hợp tiền mặt, QR và ghi nợ phần còn lại.</DialogDescription></DialogHeader><div className="grid gap-4 md:grid-cols-2"><div className="space-y-3"><div><Label className="flex items-center gap-2"><Banknote className="size-4" />Tiền mặt khách đưa</Label><Input type="number" min="0" value={cash} onChange={(event) => setCash(Number(event.target.value))} /></div><div><Label className="flex items-center gap-2"><QrCode className="size-4" />Chuyển khoản / QR</Label><Input type="number" min="0" value={qr} onChange={(event) => setQr(Number(event.target.value))} /></div>{qr > 0 && <label className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm"><input type="checkbox" className="mt-1" checked={qrConfirmed} onChange={(event) => setQrConfirmed(event.target.checked)} />Tôi đã kiểm tra thủ công và thấy tiền vào tài khoản ngân hàng.</label>}</div><div className="space-y-3 rounded-md bg-slate-50 p-3"><div className="flex justify-between"><span>Đã thanh toán</span><strong>{money.format(paid)}đ</strong></div><div className="flex justify-between text-red-600"><span>Còn ghi nợ</span><strong>{money.format(debt)}đ</strong></div><div><Label><UserRound className="mr-1 inline size-4" />Khách hàng {debt > 0 && '*'}</Label><select value={customerId ?? ''} onChange={(event) => setCustomerId(event.target.value ? Number(event.target.value) : null)} className="mt-1 h-10 w-full rounded-md border bg-white px-3"><option value="">Khách lẻ</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ''} · Nợ {money.format(customer.balance)}đ</option>)}</select></div>{overrideNeeded && <div><Label>PIN chủ cửa hàng</Label><Input type="password" inputMode="numeric" value={ownerPin} disabled={!online} onChange={(event) => setOwnerPin(event.target.value)} placeholder={online ? 'Bắt buộc do có sửa giá/giảm giá' : 'Chỉ duyệt khi online'} /></div>}</div></div><DialogFooter><Button variant="outline" onClick={() => setCheckoutOpen(false)}>Quay lại</Button><Button onClick={checkout} disabled={processing}>{processing ? 'Đang lưu...' : online ? 'Xác nhận thanh toán' : 'Lưu hóa đơn offline'}</Button></DialogFooter></DialogContent></Dialog>

            <Dialog open={!!receipt} onOpenChange={(open) => !open && setReceipt(null)}><DialogContent className="max-w-sm"><div data-receipt className="bg-white text-black"><DialogHeader><DialogTitle className="text-center">MART HUB MINI MART</DialogTitle><DialogDescription className="text-center">HÓA ĐƠN BÁN HÀNG · Khổ 58mm</DialogDescription></DialogHeader>{receipt && <div className="mt-3 space-y-2 text-xs"><div className="border-y border-dashed py-2"><div>Số HĐ: {receipt.invoice_number}</div><div>Thời gian: {new Date(receipt.sold_at).toLocaleString('vi-VN')}</div></div>{receipt.items.map((item) => <div key={item.id}><div className="font-medium">{item.product_name}</div><div className="flex justify-between"><span>{Number(item.quantity)} {item.unit_name} × {money.format(item.unit_price)}</span><span>{money.format(item.line_total)}đ</span></div></div>)}<div className="space-y-1 border-t border-dashed pt-2"><div className="flex justify-between"><span>Tổng tiền</span><strong>{money.format(receipt.total)}đ</strong></div><div className="flex justify-between"><span>Đã thu</span><span>{money.format(receipt.paid_amount)}đ</span></div>{receipt.debt_amount > 0 && <div className="flex justify-between"><span>Còn nợ</span><span>{money.format(receipt.debt_amount)}đ</span></div>}<div className="text-center">Cảm ơn quý khách!</div></div></div>}</div><DialogFooter data-print-hidden><Button variant="outline" onClick={() => setReceipt(null)}>Đóng</Button><Button onClick={() => window.print()}><Printer className="mr-2 size-4" />In hóa đơn</Button></DialogFooter></DialogContent></Dialog>
        </AppLayout>
    );
}
