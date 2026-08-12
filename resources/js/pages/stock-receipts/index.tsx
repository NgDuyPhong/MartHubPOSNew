import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime, formatQuantity } from '@/lib/format';
import { Head, useForm } from '@inertiajs/react';
import { Download, FileSpreadsheet, PackagePlus, Plus, Trash2, Upload } from 'lucide-react';
import { FormEvent, useRef, useState } from 'react';

type ProductUnit = {
    id: number;
    unit: { code: string; name: string };
    barcodes: Array<{ value: string }>;
    variant: { product: { name: string; sku: string; track_lot: boolean; track_expiry: boolean } };
};
type Row = { product_unit_id: number; quantity: number; unit_cost: number; lot_number: string; expiry_date: string };

export default function StockReceiptsPage({
    receipts,
    productUnits,
}: {
    receipts: {
        data: Array<{ id: number; receipt_number: string; source: string; supplier_name?: string; items_count: number; received_at: string }>;
    };
    productUnits: ProductUnit[];
}) {
    const [showForm, setShowForm] = useState(false);
    const [importMessage, setImportMessage] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);
    const form = useForm<{ source: 'manual' | 'excel'; supplier_name: string; note: string; items: Row[] }>({
        source: 'manual',
        supplier_name: '',
        note: '',
        items: [{ product_unit_id: productUnits[0]?.id ?? 0, quantity: 1, unit_cost: 0, lot_number: '', expiry_date: '' }],
    });
    const updateRow = (index: number, values: Partial<Row>) =>
        form.setData(
            'items',
            form.data.items.map((row, rowIndex) => (rowIndex === index ? { ...row, ...values } : row)),
        );
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post('/stock-receipts', {
            onSuccess: () => {
                setShowForm(false);
                form.reset();
            },
        });
    };

    const exportTemplate = async () => {
        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Nhap kho');
        sheet.columns = [
            { header: 'barcode_or_sku', key: 'identifier', width: 22 },
            { header: 'unit_code', key: 'unit', width: 14 },
            { header: 'quantity', key: 'quantity', width: 12 },
            { header: 'unit_cost', key: 'cost', width: 16 },
            { header: 'lot_number', key: 'lot', width: 18 },
            { header: 'expiry_date', key: 'expiry', width: 16 },
        ];
        sheet.addRow({ identifier: '8935049501576', unit: 'LON', quantity: 24, cost: 9000, lot: 'LO-001', expiry: '2027-12-31' });
        sheet.getRow(1).font = { bold: true };
        const buffer = await workbook.xlsx.writeBuffer();
        const url = URL.createObjectURL(
            new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        );
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'mau-nhap-kho.xlsx';
        anchor.click();
        URL.revokeObjectURL(url);
    };

    const parseFile = async (file: File) => {
        try {
            let matrix: unknown[][] = [];
            if (file.name.toLowerCase().endsWith('.csv')) {
                matrix = (await file.text())
                    .split(/\r?\n/)
                    .filter(Boolean)
                    .map((line) => line.split(',').map((cell) => cell.trim()));
            } else {
                const ExcelJS = await import('exceljs');
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.load((await file.arrayBuffer()) as never);
                const worksheet = workbook.worksheets[0];
                worksheet.eachRow((row) =>
                    matrix.push(
                        (row.values as unknown[])
                            .slice(1)
                            .map((value) => (typeof value === 'object' && value && 'text' in value ? (value as { text: string }).text : value)),
                    ),
                );
            }
            const rows = matrix
                .slice(1)
                .map((cells) => {
                    const identifier = String(cells[0] ?? '').trim();
                    const unitCode = String(cells[1] ?? '')
                        .trim()
                        .toUpperCase();
                    const match = productUnits.find(
                        (item) =>
                            item.unit.code.toUpperCase() === unitCode &&
                            (item.variant.product.sku === identifier || item.barcodes.some((barcode) => barcode.value === identifier)),
                    );
                    return match
                        ? {
                              product_unit_id: match.id,
                              quantity: Number(cells[2] ?? 0),
                              unit_cost: Number(cells[3] ?? 0),
                              lot_number: String(cells[4] ?? ''),
                              expiry_date: String(cells[5] ?? '').slice(0, 10),
                          }
                        : null;
                })
                .filter((row): row is Row => !!row && row.quantity > 0);
            if (!rows.length) throw new Error('Không tìm thấy dòng hợp lệ. Kiểm tra barcode/SKU và mã đơn vị.');
            form.setData((data) => ({ ...data, source: 'excel', items: rows }));
            setShowForm(true);
            setImportMessage(`Đã đọc ${rows.length} dòng từ ${file.name}.`);
        } catch (error) {
            setImportMessage(error instanceof Error ? error.message : 'Không đọc được file.');
        }
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Nhập kho', href: '/stock-receipts' }]}>
            <Head title="Nhập kho" />
            <div className="space-y-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h1 className="text-2xl font-bold">Bổ sung tồn kho</h1>
                        <p className="text-sm text-slate-500">Nhập tay hoặc import Excel; giá vốn cập nhật theo lần nhập cuối.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={exportTemplate}>
                            <Download className="mr-2 size-4" />
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
                    <form onSubmit={submit} className="space-y-4 rounded-lg border bg-white p-4 shadow-sm">
                        <div className="grid gap-3 md:grid-cols-2">
                            <div>
                                <Label>Nguồn hàng / ghi chú nhà cung cấp</Label>
                                <Input
                                    value={form.data.supplier_name}
                                    onChange={(e) => form.setData('supplier_name', e.target.value)}
                                    placeholder="Không bắt buộc"
                                />
                            </div>
                            <div>
                                <Label>Ghi chú</Label>
                                <Input value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[800px] text-sm">
                                <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                                    <tr>
                                        <th className="p-2">Sản phẩm / quy cách</th>
                                        <th className="p-2">Số lượng</th>
                                        <th className="p-2">Giá nhập / ĐV</th>
                                        <th className="p-2">Số lô</th>
                                        <th className="p-2">Hạn sử dụng</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {form.data.items.map((row, index) => (
                                        <tr key={index} className="border-t">
                                            <td className="p-2">
                                                <select
                                                    className="h-9 w-full rounded-md border bg-white px-2"
                                                    value={row.product_unit_id}
                                                    onChange={(e) => updateRow(index, { product_unit_id: Number(e.target.value) })}
                                                >
                                                    {productUnits.map((item) => (
                                                        <option key={item.id} value={item.id}>
                                                            {item.variant.product.name} · {item.unit.name} ({item.unit.code})
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    type="number"
                                                    min="0.001"
                                                    step="0.001"
                                                    value={row.quantity}
                                                    onChange={(e) => updateRow(index, { quantity: Number(e.target.value) })}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={row.unit_cost}
                                                    onChange={(e) => updateRow(index, { unit_cost: Number(e.target.value) })}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input value={row.lot_number} onChange={(e) => updateRow(index, { lot_number: e.target.value })} />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    type="date"
                                                    value={row.expiry_date}
                                                    onChange={(e) => updateRow(index, { expiry_date: e.target.value })}
                                                />
                                            </td>
                                            <td>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    disabled={form.data.items.length === 1}
                                                    onClick={() =>
                                                        form.setData(
                                                            'items',
                                                            form.data.items.filter((_, rowIndex) => rowIndex !== index),
                                                        )
                                                    }
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-between">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    form.setData('items', [
                                        ...form.data.items,
                                        { product_unit_id: productUnits[0]?.id ?? 0, quantity: 1, unit_cost: 0, lot_number: '', expiry_date: '' },
                                    ])
                                }
                            >
                                <Plus className="mr-2 size-4" />
                                Thêm dòng
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                Ghi nhận nhập kho
                            </Button>
                        </div>
                        {Object.keys(form.errors).length > 0 && (
                            <p className="text-sm text-red-600">Dữ liệu chưa hợp lệ. Vui lòng kiểm tra các dòng nhập.</p>
                        )}
                    </form>
                )}
                <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b px-4 py-3 font-semibold">
                        <FileSpreadsheet className="size-4" />
                        Lịch sử nhập kho
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                            <tr>
                                <th className="px-4 py-2">Mã phiếu</th>
                                <th className="px-4 py-2">Thời gian</th>
                                <th className="px-4 py-2">Nguồn</th>
                                <th className="px-4 py-2">Ghi chú nhà cung cấp</th>
                                <th className="px-4 py-2 text-right">Số lượng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {receipts.data.map((receipt) => (
                                <tr key={receipt.id} className="border-t">
                                    <td className="px-4 py-3 font-medium">{receipt.receipt_number}</td>
                                    <td className="px-4">{formatDateTime(receipt.received_at)}</td>
                                    <td className="px-4">{receipt.source === 'excel' ? 'Excel' : 'Nhập tay'}</td>
                                    <td className="px-4">{receipt.supplier_name ?? '—'}</td>
                                    <td className="px-4 text-right">{formatQuantity(receipt.items_count)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
