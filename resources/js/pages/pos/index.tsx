import {
    filterCatalogWithIndex,
    findBarcodeMatchWithIndex,
    useCatalogSearch,
    useConnectivity,
    usePosCart,
    usePosCheckout,
    usePosShortcuts,
    type Customer,
    type Product,
    type ProductUnit,
    type SaleReceipt,
    type Shift,
    type Variant,
} from '@/features/pos';
import { CartSummary, CartTable, CatalogPanel, OpenShiftDialog, PosStatusBar, ReceiptPreview, SaleSuccessBar } from '@/features/pos/components';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { useCallback, useRef, useState } from 'react';

type PosProps = {
    catalog: Product[];
    categories: Array<{ id: number; name: string; color?: string }>;
    customers: Customer[];
    activeShift: Shift | null;
    registers: Array<{ id: number; name: string }>;
    expiryAlerts: number;
};

export default function PosPage({ catalog, categories, customers, activeShift, registers, expiryAlerts }: PosProps) {
    const [query, setQuery] = useState('');
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [receipt, setReceipt] = useState<SaleReceipt | null>(null);
    const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [openShiftOpen, setOpenShiftOpen] = useState(!activeShift);
    const searchRef = useRef<HTMLInputElement>(null);
    const checkoutRef = useRef<HTMLDivElement>(null);
    const confirmCheckoutRef = useRef<HTMLButtonElement>(null);
    const openShiftForm = useForm({ register_id: registers[0]?.id ?? 0, opening_cash: 0 });
    const { cart, selectedKey, addLine, updateLine, removeLine, clearCart, selectLine } = usePosCart();
    const { index: catalogSearchIndex, products, isSearchPending } = useCatalogSearch(catalog, query, categoryId);
    const onSync = useCallback((synced: number) => setMessage(`Đã đồng bộ ${synced} hóa đơn offline.`), []);
    const { online, pendingCount, refreshPending } = useConnectivity(catalog, onSync);
    const handleSaleSuccess = useCallback((saleReceipt: SaleReceipt) => {
        setReceipt(saleReceipt);
        setReceiptPreviewOpen(false);
        window.setTimeout(() => searchRef.current?.focus(), 0);
    }, []);
    const checkout = usePosCheckout({
        cart,
        activeShift,
        online,
        customers,
        clearCart,
        refreshPending,
        onMessage: setMessage,
        onSuccess: handleSaleSuccess,
    });
    const addUnit = useCallback(
        (product: Product, variant: Variant, unit: ProductUnit) => {
            setReceipt(null);
            setReceiptPreviewOpen(false);
            addLine(product, variant, unit);
            setQuery('');
            searchRef.current?.focus();
        },
        [addLine],
    );

    const handleSearchKey = useCallback(
        (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key !== 'Enter' || !query.trim()) return;
            const exact = findBarcodeMatchWithIndex(catalogSearchIndex, query);
            if (exact) addUnit(exact.product, exact.variant, exact.unit);
            else {
                const matches = filterCatalogWithIndex(catalogSearchIndex, query, categoryId);
                if (matches.length !== 1) return;
                const product = matches[0];
                const variant = product.variants[0];
                const unit = variant?.units.find((item) => item.is_default_sale) ?? variant?.units[0];
                if (variant && unit) addUnit(product, variant, unit);
            }
        },
        [addUnit, catalogSearchIndex, categoryId, query],
    );

    usePosShortcuts({
        cartLength: cart.length,
        checkoutExpanded: checkout.expanded,
        total: checkout.total,
        selectedKey,
        clearCart,
        removeLine,
        setCash: checkout.setCash,
        expandCheckout: () => checkout.setExpanded(true),
        collapseCheckout: () => checkout.setExpanded(false),
        searchRef,
        checkoutRef,
        confirmCheckoutRef,
    });

    return (
        <AppLayout breadcrumbs={[{ title: 'Bán hàng', href: '/pos' }]}>
            <Head title="Bán hàng" />
            <div className="flex min-h-0 flex-1 flex-col bg-slate-100 p-3 lg:h-[calc(100vh-4rem)]">
                <PosStatusBar online={online} pendingCount={pendingCount} activeShift={activeShift} expiryAlerts={expiryAlerts} />
                {message && (
                    <button
                        className="mb-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-left text-sm text-blue-800"
                        onClick={() => setMessage(null)}
                    >
                        {message}
                    </button>
                )}
                <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-5">
                    <CatalogPanel
                        categories={categories}
                        query={query}
                        categoryId={categoryId}
                        products={products}
                        totalMatches={products.length}
                        isSearchPending={isSearchPending}
                        searchRef={searchRef}
                        onQueryChange={setQuery}
                        onCategoryChange={setCategoryId}
                        onSearchKey={handleSearchKey}
                        onAdd={addUnit}
                    />
                    <section className="flex min-h-[480px] flex-col overflow-hidden rounded-lg border bg-white shadow-sm lg:col-span-3">
                        <CartTable
                            cart={cart}
                            selectedKey={selectedKey}
                            online={online}
                            onSelect={selectLine}
                            onClear={clearCart}
                            onUpdate={updateLine}
                            onRemove={removeLine}
                        />
                        <CartSummary
                            checkoutRef={checkoutRef}
                            confirmRef={confirmCheckoutRef}
                            searchRef={searchRef}
                            activeShift={activeShift !== null}
                            online={online}
                            customers={customers}
                            {...checkout}
                            onCheckout={checkout.checkout}
                            onCashChange={checkout.setCash}
                            onQrChange={checkout.setQr}
                            onQrConfirm={checkout.setQrConfirmed}
                            onCustomerChange={checkout.setCustomerId}
                            onOwnerPinChange={checkout.setOwnerPin}
                            onExpand={() => checkout.setExpanded(true)}
                            onCollapse={() => checkout.setExpanded(false)}
                        />
                    </section>
                </div>
            </div>
            <OpenShiftDialog open={openShiftOpen} onOpenChange={setOpenShiftOpen} registers={registers} form={openShiftForm} searchRef={searchRef} />
            {receipt && <SaleSuccessBar receipt={receipt} onPreview={() => setReceiptPreviewOpen(true)} />}
            <ReceiptPreview receipt={receipt} open={receiptPreviewOpen} onOpenChange={setReceiptPreviewOpen} />
        </AppLayout>
    );
}
