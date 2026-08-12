import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/format';
import { Banknote, Users } from 'lucide-react';
import { canReceiveDebt, customerBalance } from '../model/selectors';
import type { Customer } from '../model/types';

export function CustomerTable({
    customers,
    activeShift,
    onReceiveDebt,
}: {
    customers: Customer[];
    activeShift: boolean;
    onReceiveDebt: (customer: Customer, balance: number) => void;
}) {
    return (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
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
                                    {canReceiveDebt(customer) && (
                                        <Button size="sm" variant="outline" disabled={!activeShift} onClick={() => onReceiveDebt(customer, balance)}>
                                            <Banknote className="mr-1 size-3" />
                                            Thu nợ
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                    {!customers.length && (
                        <tr>
                            <td colSpan={6} className="py-20 text-center text-slate-400">
                                <Users className="mx-auto mb-2 size-10" />
                                Chưa có khách hàng
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
