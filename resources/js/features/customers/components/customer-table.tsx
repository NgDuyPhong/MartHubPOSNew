import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/format';
import { Banknote, Pencil } from 'lucide-react';
import { canReceiveDebt, customerBalance } from '../model/selectors';
import type { Customer } from '../model/types';

export function CustomerTable({
    customers,
    activeShift,
    onReceiveDebt,
    onEdit,
}: {
    customers: Customer[];
    activeShift: boolean;
    onReceiveDebt: (customer: Customer, balance: number) => void;
    onEdit: (customer: Customer) => void;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted text-muted-foreground text-left text-xs uppercase">
                    <tr>
                        <th className="px-4 py-3">Mã</th>
                        <th className="px-4 py-3">Khách hàng</th>
                        <th className="px-4 py-3">Điện thoại</th>
                        <th className="px-4 py-3">Địa chỉ</th>
                        <th className="px-4 py-3 text-right">Còn nợ</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {customers.map((customer) => {
                        const balance = customerBalance(customer);
                        return (
                            <tr key={customer.id} className="border-t">
                                <td className="px-4 py-3 text-slate-500">{customer.code}</td>
                                <td className="px-4 font-semibold">{customer.name}</td>
                                <td className="px-4">{customer.phone || '—'}</td>
                                <td className="px-4">{customer.address || '—'}</td>
                                <td className={`px-4 text-right font-bold ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {formatMoney(balance)}đ
                                </td>
                                <td className="px-4 text-right">
                                    <div className="flex justify-end gap-1">{canReceiveDebt(customer) && <Button size="sm" variant="outline" disabled={!activeShift} onClick={() => onReceiveDebt(customer, balance)}><Banknote className="mr-1 size-3" />Thu nợ</Button>}<Button size="sm" variant="ghost" onClick={() => onEdit(customer)}><Pencil className="mr-1 size-3" />Sửa</Button></div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
