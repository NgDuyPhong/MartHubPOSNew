<?php

namespace App\Actions\Customers;

use App\Models\Customer;
use App\Models\User;

class CreateCustomerAction
{
    public function execute(User $user, array $data): Customer
    {
        $customerNumber = Customer::query()->where('organization_id', $user->organization_id)->count() + 1;

        return Customer::query()->create([
            ...$data,
            'organization_id' => $user->organization_id,
            'code' => 'KH-'.str_pad((string) $customerNumber, 5, '0', STR_PAD_LEFT),
            'is_active' => true,
        ]);
    }
}
