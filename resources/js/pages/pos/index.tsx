import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    exportPendingSales,
    filterCatalogWithIndex,
    findBarcodeMatchWithIndex,
    getDefaultSellableSelection,
    getLastReceipt,
    getPosFreshness,
    getPosSnapshot,
    reconcileCartWithCatalog,
    saveLastReceipt,
    useCatalogSearch,
    useConnectivity,
    usePosCarts,
    usePosCheckout,
    usePosResourceRefresh,
    usePosShortcuts,
    type CartLine,
    type CategoryOption,
    type CheckoutDraftSnapshot,
    type Customer,
    type PosVersions,
    type Product,
    type ProductUnit,
    type SaleReceipt,
    type Shift,
    type Variant,
} from '@/features/pos';
import {
    CartSummary,
    CartTable,
    CatalogPanel,
    HeldCartsPanel,
    OpenShiftDialog,
    PosStatusBar,
    QuickCustomerDialog,
    ReceiptPreview,
    SaleSuccessBar,
    SyncCenter,
} from '@/features/pos/components';
import { VariantUnitPicker } from '@/features/pos/components/variant-unit-picker';
import { ProductQuickEditSheet } from '@/features/products';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm, usePoll } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type PosProps = {
    catalog: Product[];
    categories: Array<{ id: number; name: string; color?: string }>;
    customers: Customer[];
    activeShift: Shift | null;
    registers: Array<{ id: number; name: string }>;
    expiryAlerts: number;
    canManageCatalog: boolean;
    latestReceipt: SaleReceipt | null;
    versions: PosVersions;
    snapshotScope: { organizationId: number; branchId: number };
};

const posResourceRefreshErrorMessage = 'Không thể làm mới dữ liệu POS. Hãy kiểm tra kết nối rồi thử lại khi quay lại POS.';

export default function PosPage({
    catalog,
    categories,
    customers,
    activeShift,
    registers,
    expiryAlerts,
    canManageCatalog,
    latestReceipt,
    versions,
    snapshotScope,
}: PosProps) {
    const [currentCatalog, setCurrentCatalog] = useState<Product[]>(catalog);
    const [currentCategories, setCurrentCategories] = useState<CategoryOption[]>(categories);
    const [currentCustomers, setCurrentCustomers] = useState<Customer[]>(customers);
    const [currentActiveShift, setCurrentActiveShift] = useState<Shift | null>(activeShift);
    const [currentExpiryAlerts, setCurrentExpiryAlerts] = useState(expiryAlerts);
    const [currentVersions, setCurrentVersions] = useState<PosVersions>(versions);
    const scopeKey = `${snapshotScope.organizationId}:${snapshotScope.branchId}`;
    const [query, setQuery] = useState('');
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [receipt, setReceipt] = useState<SaleReceipt | null>(null);
    const [storedReceipt, setStoredReceipt] = useState<SaleReceipt | null>(latestReceipt);
    const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [customerOptions, setCustomerOptions] = useState<Customer[]>(customers);
    const [quickCustomerOpen, setQuickCustomerOpen] = useState(false);
    const [openShiftOpen, setOpenShiftOpen] = useState(!activeShift);
    const [quickEditProduct, setQuickEditProduct] = useState<Product | null>(null);
    const [quickEditUnitId, setQuickEditUnitId] = useState<number | undefined>();
    const [pickerProduct, setPickerProduct] = useState<Product | null>(null);
    const [clearDialogOpen, setClearDialogOpen] = useState(false);
    const [syncCenterOpen, setSyncCenterOpen] = useState(false);
    const [undoCart, setUndoCart] = useState<CartLine[]>([]);
    const searchRef = useRef<HTMLInputElement>(null);
    const checkoutRef = useRef<HTMLDivElement>(null);
    const confirmCheckoutRef = useRef<HTMLButtonElement>(null);
    const openShiftForm = useForm({ register_id: registers[0]?.id ?? 0, opening_cash: 0 });
    useEffect(() => {
        setCurrentCatalog(catalog);
        setCurrentCategories(categories);
        setCurrentCustomers(customers);
        setCurrentExpiryAlerts(expiryAlerts);
        setCurrentVersions(versions);
        setStoredReceipt(latestReceipt);
    }, [catalog, categories, customers, expiryAlerts, latestReceipt, versions]);
    useEffect(() => {
        setCurrentActiveShift(activeShift);
    }, [activeShift]);
    useEffect(() => setCustomerOptions(currentCustomers), [currentCustomers]);
    usePoll(30000, { only: ['activeShift'] }, { keepAlive: true });
    useEffect(() => setOpenShiftOpen(!currentActiveShift), [currentActiveShift]);
    const {
        cart,
        selectedKey,
        addLine,
        updateLine,
        removeLine,
        clearCart,
        replaceCart,
        selectLine,
        drafts,
        activeCartId,
        activeDraft,
        ready: cartsReady,
        persistActiveCart,
        createCart,
        holdCart,
        switchCart,
        renameCart,
        deleteCart,
    } = usePosCarts(scopeKey);
    const cartReconciliation = useMemo(() => reconcileCartWithCatalog(cart, currentCatalog), [cart, currentCatalog]);
    const hasStaleCartPrice = useMemo(() => Object.values(cartReconciliation).some(({ status }) => status === 'price_changed'), [cartReconciliation]);
    const unavailableCartLineCount = useMemo(
        () => Object.values(cartReconciliation).filter(({ status }) => status === 'unavailable').length,
        [cartReconciliation],
    );
    const { index: catalogSearchIndex, products, isSearchPending } = useCatalogSearch(currentCatalog, query, categoryId);
    const onSync = useCallback((synced: number) => setMessage(`Đã đồng bộ ${synced} hóa đơn offline.`), []);
    const applyPosSnapshot = useCallback((snapshot: Awaited<ReturnType<typeof getPosSnapshot>>) => {
        if (snapshot.catalog) setCurrentCatalog(snapshot.catalog);
        if (snapshot.categories) setCurrentCategories(snapshot.categories);
        if (snapshot.customers) {
            setCurrentCustomers(snapshot.customers);
            setCustomerOptions(snapshot.customers);
        }
        if (snapshot.activeShift !== undefined) setCurrentActiveShift(snapshot.activeShift);
        if (snapshot.expiryAlerts !== undefined) setCurrentExpiryAlerts(snapshot.expiryAlerts);
        if (snapshot.latestReceipt !== undefined && snapshot.latestReceipt) setStoredReceipt(snapshot.latestReceipt);
        setCurrentVersions(snapshot.versions);
    }, []);
    const refreshPosResources = useCallback(
        async (resources: string[]) => {
            const snapshot = await getPosSnapshot(resources);
            applyPosSnapshot(snapshot);

            return snapshot;
        },
        [applyPosSnapshot],
    );
    const refreshAfterSale = useCallback(
        () => refreshPosResources(['catalog', 'categories', 'customers', 'expiryAlerts']).then(() => undefined),
        [refreshPosResources],
    );
    const refreshAfterSync = useCallback(
        () => refreshPosResources(['catalog', 'categories', 'customers', 'expiryAlerts', 'latestReceipt']).then(() => undefined),
        [refreshPosResources],
    );
    const refreshCatalogForReprice = useCallback(async () => {
        const snapshot = await refreshPosResources(['catalog']);

        return snapshot.catalog ?? currentCatalog;
    }, [currentCatalog, refreshPosResources]);
    const onCacheError = useCallback(() => setMessage('Không thể lưu snapshot catalog offline; dữ liệu trong phiên bán vẫn được giữ nguyên.'), []);
    const ensureCheckoutDataFresh = useCallback(
        async (selectedCustomerId: number | null) => {
            const freshness = await getPosFreshness(currentVersions);
            const resources = new Set<string>();
            if (freshness.changed.includes('catalog') || freshness.changed.includes('inventory')) {
                resources.add('catalog');
                resources.add('categories');
            }
            if (freshness.changed.includes('customers')) resources.add('customers');
            if (freshness.changed.includes('activeShift')) resources.add('activeShift');
            if (freshness.changed.includes('inventory')) resources.add('expiryAlerts');

            let freshCatalog = currentCatalog;
            let freshCustomers = currentCustomers;
            let freshShift = currentActiveShift;
            if (resources.size) {
                const snapshot = await refreshPosResources([...resources]);
                freshCatalog = snapshot.catalog ?? freshCatalog;
                freshCustomers = snapshot.customers ?? freshCustomers;
                freshShift = snapshot.activeShift !== undefined ? snapshot.activeShift : freshShift;
            }

            if (!freshShift || (currentActiveShift && freshShift.id !== currentActiveShift.id)) {
                throw new Error('Ca bán đã thay đổi hoặc đã đóng. Hãy mở/chọn ca hợp lệ rồi thử lại.');
            }
            if (selectedCustomerId && !freshCustomers.some((customer) => customer.id === selectedCustomerId && customer.is_active !== false)) {
                throw new Error('Khách hàng đã ngừng sử dụng hoặc không còn hợp lệ. Hãy chọn lại khách hàng.');
            }
            return { activeShift: freshShift, catalog: freshCatalog };
        },
        [currentActiveShift, currentCatalog, currentCustomers, currentVersions, refreshPosResources],
    );
    const { online, pendingCount, records, refreshPending, syncNow, retry, reprice } = useConnectivity({
        catalog: currentCatalog,
        categories: currentCategories,
        scope: snapshotScope,
        versions: currentVersions,
        onSync,
        onReconnect: refreshAfterSync,
        onRefreshCatalog: refreshCatalogForReprice,
        onCacheError,
    });
    const onResourceRefreshError = useCallback(() => setMessage(posResourceRefreshErrorMessage), []);
    const onResourceRefreshRecovered = useCallback(() => {
        setMessage((current) => (current === posResourceRefreshErrorMessage ? null : current));
    }, []);
    usePosResourceRefresh({
        versions: currentVersions,
        online,
        onSnapshot: applyPosSnapshot,
        onVersions: setCurrentVersions,
        onError: onResourceRefreshError,
        onSuccess: onResourceRefreshRecovered,
    });
    const handleReprice = useCallback(
        async (idempotencyKey: string) => {
            try {
                const result = await reprice(idempotencyKey);
                setMessage(
                    result === 'repriced'
                        ? 'Đã cập nhật giá hiện tại cho hóa đơn. Hãy kiểm tra lại rồi bấm Đồng bộ ngay.'
                        : 'Không thể tự cập nhật giá cho conflict này; hãy xuất recovery JSON để xử lý thủ công.',
                );
            } catch {
                setMessage('Không thể tải catalog hiện tại. Hãy kiểm tra kết nối rồi thử lại.');
            }
        },
        [reprice],
    );
    useEffect(() => {
        void getLastReceipt(scopeKey)
            .then((savedReceipt) => {
                if (savedReceipt) setStoredReceipt(savedReceipt);
            })
            .catch(() => undefined);
    }, [scopeKey]);

    useEffect(() => {
        const refreshStoredReceipt = () => {
            void getLastReceipt(scopeKey)
                .then((savedReceipt) => {
                    if (savedReceipt) setStoredReceipt(savedReceipt);
                })
                .catch(() => undefined);
        };

        window.addEventListener('pos:receipt-updated', refreshStoredReceipt);
        return () => window.removeEventListener('pos:receipt-updated', refreshStoredReceipt);
    }, [scopeKey]);
    const handleExportRecovery = useCallback(async () => {
        const blob = new Blob([await exportPendingSales(scopeKey)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `marthub-pos-recovery-${new Date().toISOString().slice(0, 10)}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
    }, [scopeKey]);
    const requestClearCart = useCallback(() => {
        if (cart.length) setClearDialogOpen(true);
    }, [cart.length]);
    const confirmClearCart = useCallback(() => {
        setUndoCart(cart);
        clearCart();
        setClearDialogOpen(false);
        setMessage('Đã xóa hóa đơn hiện tại.');
    }, [cart, clearCart]);
    const undoClearCart = useCallback(() => {
        if (!undoCart.length) return;
        replaceCart(undoCart);
        setUndoCart([]);
        setMessage(null);
    }, [replaceCart, undoCart]);
    const handleSaleSuccess = useCallback(
        (saleReceipt: SaleReceipt) => {
            setReceipt(saleReceipt);
            setStoredReceipt(saleReceipt);
            void saveLastReceipt(saleReceipt, scopeKey)
                .then(() => window.dispatchEvent(new Event('pos:receipt-updated')))
                .catch(() => undefined);
            setReceiptPreviewOpen(false);
            window.setTimeout(() => searchRef.current?.focus(), 0);
        },
        [scopeKey],
    );
    const checkout = usePosCheckout({
        cart,
        catalog: currentCatalog,
        scopeKey,
        activeShift: currentActiveShift,
        online,
        customers: customerOptions,
        unavailableCartLineCount,
        clearCart,
        refreshPending,
        onMessage: setMessage,
        onSuccess: handleSaleSuccess,
        ensureFresh: ensureCheckoutDataFresh,
        refreshAfterSale,
    });
    const { restoreDraft } = checkout;
    const handleQuickCustomerCreated = useCallback(
        (customer: Customer) => {
            setCustomerOptions((current) =>
                [...current.filter((item) => item.id !== customer.id), customer].sort((left, right) => left.name.localeCompare(right.name)),
            );
            checkout.setCustomerId(customer.id);
            setMessage(`Đã tạo và chọn khách hàng ${customer.name}.`);
        },
        [checkout, setMessage],
    );
    const checkoutSnapshot = useMemo<CheckoutDraftSnapshot>(
        () => ({ customerId: checkout.customerId, cash: checkout.cash, qr: checkout.qr, qrConfirmed: checkout.qrConfirmed }),
        [checkout.cash, checkout.customerId, checkout.qr, checkout.qrConfirmed],
    );
    const checkoutSnapshotRef = useRef(checkoutSnapshot);
    const restoredCartIdRef = useRef<string | null>(null);

    useEffect(() => {
        checkoutSnapshotRef.current = checkoutSnapshot;
    }, [checkoutSnapshot]);

    useEffect(() => {
        if (!cartsReady || !activeDraft || restoredCartIdRef.current !== null) return;
        restoredCartIdRef.current = activeDraft.id;
        restoreDraft(activeDraft.checkout);
    }, [activeDraft, cartsReady, restoreDraft]);

    useEffect(() => {
        if (cartsReady) persistActiveCart(checkoutSnapshot);
    }, [cart, cartsReady, checkoutSnapshot, persistActiveCart]);

    useEffect(() => {
        const flushActiveCart = () => persistActiveCart(checkoutSnapshotRef.current);

        window.addEventListener('visibilitychange', flushActiveCart);
        return () => window.removeEventListener('visibilitychange', flushActiveCart);
    }, [persistActiveCart]);

    const focusSearchAfterCartChange = useCallback(() => {
        setQuery('');
        setReceipt(null);
        window.setTimeout(() => searchRef.current?.focus(), 0);
    }, []);

    const createNewCart = useCallback(() => {
        const nextDraft = createCart(checkoutSnapshot);
        restoreDraft(nextDraft.checkout);
        focusSearchAfterCartChange();
    }, [checkoutSnapshot, createCart, focusSearchAfterCartChange, restoreDraft]);

    const holdCurrentCart = useCallback(() => {
        const nextDraft = holdCart(checkoutSnapshot);
        restoreDraft(nextDraft.checkout);
        focusSearchAfterCartChange();
    }, [checkoutSnapshot, focusSearchAfterCartChange, holdCart, restoreDraft]);

    const switchToCart = useCallback(
        (id: string) => {
            const nextDraft = switchCart(id, checkoutSnapshot);
            if (!nextDraft) return;
            restoreDraft(nextDraft.checkout);
            focusSearchAfterCartChange();
        },
        [checkoutSnapshot, focusSearchAfterCartChange, restoreDraft, switchCart],
    );
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
    const openQuickEdit = useCallback(
        (product: Product, unit?: ProductUnit) => {
            if (!canManageCatalog) return;
            setQuickEditProduct(product);
            setQuickEditUnitId(unit?.id);
        },
        [canManageCatalog],
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
                const selection = getDefaultSellableSelection(product);
                if (selection) addUnit(product, selection.variant, selection.unit);
                else setPickerProduct(product);
            }
        },
        [addUnit, catalogSearchIndex, categoryId, query],
    );

    usePosShortcuts({
        cartLength: cart.length,
        checkoutExpanded: checkout.expanded,
        total: checkout.total,
        selectedKey,
        clearCart: requestClearCart,
        dialogOpen: clearDialogOpen || Boolean(pickerProduct) || Boolean(quickEditProduct),
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
            <div className="bg-muted/30 flex min-h-0 flex-1 flex-col p-3 lg:h-[calc(100dvh-4rem)]">
                <PosStatusBar
                    online={online}
                    pendingCount={pendingCount}
                    activeShift={currentActiveShift}
                    expiryAlerts={currentExpiryAlerts}
                    onOpenSync={() => setSyncCenterOpen(true)}
                    hasLatestReceipt={Boolean(storedReceipt)}
                    onOpenLatestReceipt={() => setReceiptPreviewOpen(true)}
                />
                {message && (
                    <div
                        className="bg-info-muted text-info-foreground border-info/30 mb-2 flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                        role="status"
                    >
                        <span>{message}</span>
                        <div className="flex items-center gap-2">
                            {undoCart.length > 0 && (
                                <Button size="sm" variant="outline" onClick={undoClearCart}>
                                    Hoàn tác
                                </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => setMessage(null)}>
                                Đóng
                            </Button>
                        </div>
                    </div>
                )}
                {hasStaleCartPrice && (
                    <div
                        className="bg-warning-muted text-warning-foreground border-warning/40 mb-2 rounded-md border px-3 py-2 text-sm"
                        role="status"
                    >
                        Giá catalog đã thay đổi; dòng hàng đang có trong giỏ vẫn giữ giá cũ. Sản phẩm thêm mới sẽ dùng giá hiện tại.
                    </div>
                )}
                {unavailableCartLineCount > 0 && (
                    <div className="bg-destructive/10 text-destructive border-destructive/30 mb-2 rounded-md border px-3 py-2 text-sm" role="alert">
                        Có {unavailableCartLineCount} dòng hàng không còn khả dụng. Hãy xóa dòng đó và chọn sản phẩm khác trước khi thanh toán.
                    </div>
                )}
                <div className="grid min-h-0 min-w-0 flex-1 gap-3 lg:grid-cols-5">
                    <CatalogPanel
                        categories={currentCategories}
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
                        onPick={setPickerProduct}
                        canManageCatalog={canManageCatalog}
                        onQuickEdit={openQuickEdit}
                    />
                    <section className="bg-card flex min-h-[480px] min-w-0 flex-col overflow-hidden rounded-lg border shadow-sm lg:col-span-3">
                        <HeldCartsPanel
                            drafts={drafts}
                            activeCartId={activeCartId}
                            onNew={createNewCart}
                            onSwitch={switchToCart}
                            onRename={renameCart}
                            onHold={holdCurrentCart}
                            onDelete={deleteCart}
                        />
                        <CartTable
                            cart={cart}
                            reconciliation={cartReconciliation}
                            selectedKey={selectedKey}
                            online={online}
                            onSelect={selectLine}
                            onClear={requestClearCart}
                            onUpdate={updateLine}
                            onRemove={removeLine}
                        />
                        <CartSummary
                            checkoutRef={checkoutRef}
                            confirmRef={confirmCheckoutRef}
                            searchRef={searchRef}
                            activeShift={currentActiveShift !== null}
                            online={online}
                            customers={customerOptions}
                            {...checkout}
                            onCheckout={checkout.checkout}
                            onCashChange={checkout.setCash}
                            onQrChange={checkout.setQr}
                            onQrConfirm={checkout.setQrConfirmed}
                            onCustomerChange={checkout.setCustomerId}
                            onQuickCreateCustomer={() => setQuickCustomerOpen(true)}
                            onOwnerPinChange={checkout.setOwnerPin}
                            onExpand={() => checkout.setExpanded(true)}
                            onCollapse={() => checkout.setExpanded(false)}
                        />
                    </section>
                </div>
            </div>
            <OpenShiftDialog
                open={openShiftOpen}
                required={!currentActiveShift}
                onOpenChange={setOpenShiftOpen}
                registers={registers}
                form={openShiftForm}
                searchRef={searchRef}
            />
            <QuickCustomerDialog
                open={quickCustomerOpen}
                online={online}
                onOpenChange={setQuickCustomerOpen}
                onCreated={handleQuickCustomerCreated}
            />
            <SyncCenter
                open={syncCenterOpen}
                onOpenChange={setSyncCenterOpen}
                online={online}
                records={records}
                onSync={() => void syncNow()}
                onRetry={(key) => void retry(key)}
                onReprice={(key) => void handleReprice(key)}
                onExport={() => void handleExportRecovery()}
            />
            {receipt && <SaleSuccessBar receipt={receipt} onPreview={() => setReceiptPreviewOpen(true)} />}
            <ReceiptPreview receipt={receipt ?? storedReceipt} open={receiptPreviewOpen} onOpenChange={setReceiptPreviewOpen} />
            <VariantUnitPicker
                product={pickerProduct}
                open={Boolean(pickerProduct)}
                onOpenChange={(open) => !open && setPickerProduct(null)}
                onSelect={(product, variant, unit) => {
                    addUnit(product, variant, unit);
                    setPickerProduct(null);
                }}
            />
            <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Xóa hóa đơn hiện tại?</DialogTitle>
                        <DialogDescription>Các dòng hàng sẽ được xóa khỏi hóa đơn. Bạn vẫn có thể hoàn tác ngay sau đó.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setClearDialogOpen(false)}>
                            Hủy
                        </Button>
                        <Button type="button" variant="destructive" onClick={confirmClearCart}>
                            Xóa hóa đơn
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <ProductQuickEditSheet
                product={quickEditProduct}
                unitId={quickEditUnitId}
                categories={currentCategories}
                open={Boolean(quickEditProduct)}
                onOpenChange={(open) => {
                    if (!open) {
                        setQuickEditProduct(null);
                        setQuickEditUnitId(undefined);
                        searchRef.current?.focus();
                    }
                }}
                online={online}
            />
        </AppLayout>
    );
}
