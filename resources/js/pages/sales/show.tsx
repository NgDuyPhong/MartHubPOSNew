import { Button } from '@/components/ui/button';
import { ReturnDialog, SaleReceipt, nonEmptyReturnItems, type ReturnFormData, type SaleItem } from '@/features/sales';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime } from '@/lib/format';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Printer, RotateCcw } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';

type Sale = {
    id: number;
    invoice_number: string;
    sold_at: string;
    subtotal: number;
    discount_amount: number;
    total: number;
    paid_amount: number;
    debt_amount: number;
    change_amount: number;
    source: string;
    customer?: { name: string; phone?: string };
    items: SaleItem[];
    payments: Array<{ id: number; method: string; direction: string; amount: number; manually_confirmed: boolean }>;
};

export default function SaleShow({ sale, activeShift }: { sale: Sale; activeShift: { id: number; code: string } | null }) {
    const [returnOpen, setReturnOpen] = useState(false);
    const form = useForm<ReturnFormData>({
        shift_id: activeShift?.id ?? 0,
        type: 'refund',
        refund_method: 'cash',
        reason: '',
        items: sale.items.map((item) => ({ sale_item_id: item.id, quantity: 0, condition: 'resellable' })),
    });
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.transform((data) => ({ ...data, items: nonEmptyReturnItems(data.items) }));
        form.post(route('sales.returns.store', sale.id), { onSuccess: () => setReturnOpen(false) });
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Hóa đơn', href: route('sales.index') },
                { title: sale.invoice_number, href: route('sales.show', sale.id) },
            ]}
        >
            <Head title={sale.invoice_number} />
            <div className="space-y-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                        <Link href={route('sales.index')}>
                            <Button variant="outline" size="icon" aria-label="Quay lại danh sách hóa đơn">
                                <ArrowLeft className="size-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-semibold">{sale.invoice_number}</h1>
                            <p className="text-muted-foreground text-sm">
                                {formatDateTime(sale.sold_at)} · {sale.customer?.name ?? 'Khách lẻ'}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => window.print()}>
                            <Printer className="mr-2 size-4" />
                            In 58mm
                        </Button>
                        <Button disabled={!activeShift} onClick={() => setReturnOpen(true)}>
                            <RotateCcw className="mr-2 size-4" />
                            Đổi / trả hàng
                        </Button>
                    </div>
                </div>
                <SaleReceipt sale={sale} />
            </div>
            <ReturnDialog
                open={returnOpen}
                onOpenChange={setReturnOpen}
                invoiceNumber={sale.invoice_number}
                customer={sale.customer}
                activeShift={activeShift}
                saleItems={sale.items}
                form={form}
                onSubmit={submit}
            />
        </AppLayout>
    );
}
