import { FormErrorSummary } from '@/components/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { InertiaFormProps } from '@inertiajs/react';
import type { FormEvent } from 'react';
import type { ProductUnit, StockReceiptFormData, StockReceiptRow } from '../model/types';
import { StockReceiptItemsTable } from './stock-receipt-items-table';

export function StockReceiptForm({
    form,
    productUnits,
    updateRow,
    addRow,
    removeRow,
    onSubmit,
}: {
    form: InertiaFormProps<StockReceiptFormData>;
    productUnits: ProductUnit[];
    updateRow: (index: number, values: Partial<StockReceiptRow>) => void;
    addRow: () => void;
    removeRow: (index: number) => void;
    onSubmit: (event: FormEvent) => void;
}) {
    return (
        <form className="bg-card space-y-4 rounded-lg border p-4 shadow-sm" onSubmit={onSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
                <div>
                    <Label htmlFor="stock-supplier">Nguồn hàng / ghi chú nhà cung cấp</Label>
                    <Input
                        id="stock-supplier"
                        value={form.data.supplier_name}
                        onChange={(event) => form.setData('supplier_name', event.target.value)}
                        placeholder="Không bắt buộc"
                    />
                </div>
                <div>
                    <Label htmlFor="stock-note">Ghi chú</Label>
                    <Input id="stock-note" value={form.data.note} onChange={(event) => form.setData('note', event.target.value)} />
                </div>
            </div>
            <StockReceiptItemsTable form={form} productUnits={productUnits} updateRow={updateRow} addRow={addRow} removeRow={removeRow} />
            <FormErrorSummary errors={form.errors} />
        </form>
    );
}
