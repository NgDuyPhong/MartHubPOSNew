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
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { PackagePlus, Upload } from 'lucide-react';
import { FormEvent, useRef, useState } from 'react';

type Receipt = { id: number; receipt_number: string; source: string; supplier_name?: string; items_count: number; received_at: string };

export default function StockReceiptsPage({ receipts, productUnits }: { receipts: { data: Receipt[] }; productUnits: ProductUnit[] }) {
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h1 className="text-2xl font-bold">Bổ sung tồn kho</h1>
                        <p className="text-sm text-slate-500">Nhập tay hoặc import Excel; giá vốn cập nhật theo lần nhập cuối.</p>
                    </div>
                    <div className="flex gap-2">
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
                </div>
                {importMessage && <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">{importMessage}</div>}
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
                <StockReceiptHistory receipts={receipts.data} />
            </div>
        </AppLayout>
    );
}
