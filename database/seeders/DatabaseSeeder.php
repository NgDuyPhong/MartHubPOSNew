<?php

namespace Database\Seeders;

use App\Models\Barcode;
use App\Models\Branch;
use App\Models\Category;
use App\Models\InventoryBalance;
use App\Models\Organization;
use App\Models\Product;
use App\Models\Register;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $organization = Organization::query()->firstOrCreate(['code' => 'MARTHUB'], ['name' => 'MartHub Mini Mart', 'timezone' => 'Asia/Ho_Chi_Minh', 'is_active' => true]);
        $branch = Branch::query()->firstOrCreate(['organization_id' => $organization->id, 'code' => 'CN01'], ['name' => 'Cửa hàng chính', 'address' => 'Địa chỉ cửa hàng', 'is_active' => true]);
        $owner = User::query()->updateOrCreate(['email' => 'owner@marthub.local'], [
            'organization_id' => $organization->id,
            'branch_id' => $branch->id,
            'name' => 'Chủ cửa hàng',
            'password' => 'password',
            'role' => 'owner',
            'approval_pin_hash' => Hash::make('1234'),
            'email_verified_at' => now(),
            'is_active' => true,
        ]);
        User::query()->updateOrCreate(['email' => 'cashier@marthub.local'], [
            'organization_id' => $organization->id,
            'branch_id' => $branch->id,
            'name' => 'Thu ngân',
            'password' => 'password',
            'role' => 'cashier',
            'email_verified_at' => now(),
            'is_active' => true,
        ]);
        Register::query()->firstOrCreate(['branch_id' => $branch->id, 'code' => 'POS01'], ['name' => 'Quầy thu ngân', 'is_active' => true]);

        $category = Category::query()->firstOrCreate(['organization_id' => $organization->id, 'name' => 'Nước giải khát'], ['color' => '#0f766e', 'sort_order' => 1, 'is_active' => true]);
        $units = collect([
            ['code' => 'LON', 'name' => 'Lon'],
            ['code' => 'LOC', 'name' => 'Lốc'],
            ['code' => 'THUNG', 'name' => 'Thùng'],
            ['code' => 'CAI', 'name' => 'Cái'],
        ])->mapWithKeys(function (array $data) use ($organization) {
            $unit = Unit::query()->firstOrCreate(['organization_id' => $organization->id, 'code' => $data['code']], ['name' => $data['name'], 'is_active' => true]);

            return [$data['code'] => $unit];
        });

        if (! Product::query()->where('organization_id', $organization->id)->where('sku', 'COCA330')->exists()) {
            $product = Product::query()->create(['organization_id' => $organization->id, 'category_id' => $category->id, 'sku' => 'COCA330', 'name' => 'Coca-Cola 330ml', 'track_lot' => true, 'track_expiry' => true, 'is_active' => true]);
            $variant = $product->variants()->create(['name' => 'Mặc định', 'sku' => 'COCA330', 'last_cost_base' => 8000, 'is_active' => true]);
            foreach ([
                ['code' => 'LON', 'factor' => 1, 'price' => 10000, 'barcode' => '8935049501576', 'base' => true, 'default' => true],
                ['code' => 'LOC', 'factor' => 6, 'price' => 57000, 'barcode' => '8935049501577', 'base' => false, 'default' => false],
                ['code' => 'THUNG', 'factor' => 24, 'price' => 220000, 'barcode' => '8935049501578', 'base' => false, 'default' => false],
            ] as $row) {
                $productUnit = $variant->units()->create(['unit_id' => $units[$row['code']]->id, 'conversion_to_base' => $row['factor'], 'sale_price' => $row['price'], 'is_base' => $row['base'], 'is_default_sale' => $row['default'], 'is_active' => true]);
                Barcode::query()->create(['product_unit_id' => $productUnit->id, 'value' => $row['barcode'], 'is_primary' => true]);
            }
            InventoryBalance::query()->create(['branch_id' => $branch->id, 'product_variant_id' => $variant->id, 'scope_key' => "{$branch->id}:{$variant->id}:0", 'quantity_base' => 120]);
        }

        $this->command?->info("Tài khoản demo: {$owner->email} / password · PIN duyệt: 1234");
    }
}
