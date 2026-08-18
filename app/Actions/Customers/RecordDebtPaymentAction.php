<?php

namespace App\Actions\Customers;

use App\Models\Customer;
use App\Models\CustomerCreditEntry;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\Shift;
use App\Models\User;
use App\Services\ResourceVersionService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RecordDebtPaymentAction
{
    public function __construct(private readonly ResourceVersionService $resourceVersions) {}

    public function execute(User $user, Customer $customer, array $data): Payment
    {
        return DB::transaction(function () use ($user, $customer, $data) {
            abort_unless($customer->organization_id === $user->organization_id, 403);
            $shift = Shift::query()->whereKey($data['shift_id'])->where('status', 'open')->whereHas('register', fn ($query) => $query->where('branch_id', $user->branch_id))->lockForUpdate()->firstOrFail();
            if ($data['method'] === 'qr' && ! ($data['manually_confirmed'] ?? false)) {
                throw ValidationException::withMessages(['manually_confirmed' => 'Cần xác nhận đã thấy tiền QR vào tài khoản.']);
            }

            $balance = (int) $customer->creditEntries()->sum('debit') - (int) $customer->creditEntries()->sum('credit');
            if ((int) $data['amount'] > $balance) {
                throw ValidationException::withMessages(['amount' => 'Số tiền thu không được lớn hơn công nợ hiện tại.']);
            }

            $payment = Payment::query()->create([
                'customer_id' => $customer->id,
                'shift_id' => $shift->id,
                'user_id' => $user->id,
                'method' => $data['method'],
                'direction' => 'in',
                'amount' => $data['amount'],
                'status' => 'confirmed',
                'reference' => $data['reference'] ?? null,
                'manually_confirmed' => (bool) ($data['manually_confirmed'] ?? false),
                'paid_at' => now(),
            ]);
            $credit = CustomerCreditEntry::query()->create([
                'customer_id' => $customer->id,
                'user_id' => $user->id,
                'type' => 'debt_payment',
                'debit' => 0,
                'credit' => $data['amount'],
                'source_type' => Payment::class,
                'source_id' => $payment->id,
                'note' => $data['note'] ?? 'Thu công nợ',
            ]);
            PaymentAllocation::query()->create(['payment_id' => $payment->id, 'customer_credit_entry_id' => $credit->id, 'amount' => $data['amount']]);
            $this->resourceVersions->bumpAfterCommit($user, ['customers']);

            return $payment;
        }, 3);
    }
}
