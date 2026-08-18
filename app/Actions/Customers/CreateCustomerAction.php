<?php

namespace App\Actions\Customers;

use App\Models\Customer;
use App\Models\User;
use App\Services\ResourceVersionService;
use Illuminate\Support\Facades\DB;

class CreateCustomerAction
{
    public function __construct(private readonly ResourceVersionService $resourceVersions) {}

    public function execute(User $user, array $data): Customer
    {
        return DB::transaction(function () use ($user, $data): Customer {
            $customerNumber = Customer::query()->where('organization_id', $user->organization_id)->count() + 1;
            $customer = Customer::query()->create([
                ...$data,
                'organization_id' => $user->organization_id,
                'code' => 'KH-'.str_pad((string) $customerNumber, 5, '0', STR_PAD_LEFT),
                'is_active' => true,
            ]);
            $this->resourceVersions->bumpAfterCommit($user, ['customers']);

            return $customer;
        });
    }
}
