import { CollectionState, FilterBar, PageHeader, Pagination, SearchField } from '@/components/shared';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    StockReceiptForm,
    StockReceiptHistory,
    downloadStockReceiptTemplate,
    mapImportRows,
    parseCsvMatrix,
    parseSpreadsheet,
    type ProductUnit,
    type StockReceiptFormData,
    type StockReceiptRow,
} from '@/features/stock-receipts';
import { useListQuery } from '@/hooks/use-list-query';
import AppLayout from '@/layouts/app-layout';
import type { Paginated } from '@/types/pagination';
import { Head, useForm } from '@inertiajs/react';
import { PackagePlus, Upload } from 'lucide-react';
import { FormEvent, useRef, useState } from 'react';

type Receipt = { id: number; receipt_number: string; source: string; supplier_name?: string; items_count: number; received_at: string };

export default function StockReceiptsPage({
    receipts,
    productUnits,
    filters,
}: {
    receipts: Paginated<Receipt>;
    productUnits: ProductUnit[];
    filters: { search: string; per_page: number };
}) {
    const { query, update, reset, isLoading, error, retry } = useListQuery(route('stock-receipts.index'), { ...filters, page: 1 });
    const [showForm, setShowForm] = useState(false);
    const [importMessage, setImportMessage] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);
    const form = useForm<StockReceiptFormData>({
        source: 'manual',
        supplier_name: '',
        note: '',
        items: [{ product_unit_id: productUnits[0]?.id ?? 0, quantity: 1, unit_cost: 0, lot_number: '', expiry_date: '' }],
    });
    const updateRow = (index: number, values: Partial<StockReceiptRow>) =>
        form.setData(
            'items',
            form.data.items.map((row, rowIndex) => (rowIndex === index ? { ...row, ...values } : row)),
        );
    const addRow = () =>
        form.setData('items', [
            ...form.data.items,
            { product_unit_id: productUnits[0]?.id ?? 0, quantity: 1, unit_cost: 0, lot_number: '', expiry_date: '' },
        ]);
    const removeRow = (index: number) =>
        form.setData(
            'items',
            form.data.items.filter((_, rowIndex) => rowIndex !== index),
        );
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(route('stock-receipts.store'), {
            onSuccess: () => {
                setShowForm(false);
                form.reset();
            },
        });
    };
    const parseFile = async (file: File) => {
        try {
            const matrix = file.name.toLowerCase().endsWith('.csv') ? parseCsvMatrix(await file.text()) : await parseSpreadsheet(file);
            const rows = mapImportRows(matrix, productUnits);
            if (!rows.length) throw new Error('Không tìm thấy dòng hợp lệ. Kiểm tra barcode/SKU và mã đơn vị.');
            form.setData((data) => ({ ...data, source: 'excel', items: rows }));
            setShowForm(true);
            setImportMessage(`Đã đọc ${rows.length} dòng từ ${file.name}.`);
        } catch (error) {
            setImportMessage(error instanceof Error ? error.message : 'Không đọc được file.');
        }
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Nhập kho', href: route('stock-receipts.index') }]}>
            <Head title="Nhập kho" />
            <div className="space-y-4 p-4">
                <PageHeader
                    title="Bổ sung tồn kho"
                    description="Nhập tay hoặc import Excel; giá vốn cập nhật theo lần nhập cuối."
                    actions={
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={downloadStockReceiptTemplate}>
                                Tải file mẫu .xlsx
                            </Button>
                            <input
                                ref={fileRef}
                                className="hidden"
                                type="file"
                                accept=".xlsx,.csv"
                                onChange={(event) => event.target.files?.[0] && parseFile(event.target.files[0])}
                            />
                            <Button variant="outline" onClick={() => fileRef.current?.click()}>
                                <Upload className="mr-2 size-4" />
                                Import Excel
                            </Button>
                            <Button onClick={() => setShowForm(!showForm)}>
                                <PackagePlus className="mr-2 size-4" />
                                Nhập tay
                            </Button>
                        </div>
                    }
                />
                {importMessage && (
                    <Alert variant="info">
                        <AlertDescription>{importMessage}</AlertDescription>
                    </Alert>
                )}
                <FilterBar>
                    <SearchField value={query.search} onChange={(value) => update('search', value)} placeholder="Tìm mã phiếu hoặc nhà cung cấp…" />
                </FilterBar>
                {showForm && (
                    <StockReceiptForm
                        form={form}
                        productUnits={productUnits}
                        updateRow={updateRow}
                        addRow={addRow}
                        removeRow={removeRow}
                        onSubmit={submit}
                    />
                )}
                {receipts.data.length > 0 && <StockReceiptHistory receipts={receipts.data} />}
                <CollectionState
                    isEmpty={!receipts.data.length}
                    hasFilters={Boolean(query.search)}
                    onReset={reset}
                    error={error}
                    onRetry={retry}
                    isLoading={isLoading}
                    label="phiếu nhập kho"
                />
                <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
                    <Pagination paginator={receipts} routeUrl={route('stock-receipts.index')} query={query} />
                </div>
            </div>
        </AppLayout>
    );
}
