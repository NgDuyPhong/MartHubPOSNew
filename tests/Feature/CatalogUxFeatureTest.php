<?php

use App\Models\ApprovalEvent;
use App\Models\Branch;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Organization;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\ProductVariant;
use App\Models\Register;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Shift;
use App\Models\Unit;
use App\Models\User;

function catalogUser(string $role = 'owner'): array
{
    $organization = Organization::query()->create(['code' => fake()->unique()->lexify('org-????'), 'name' => 'Test Mart']);
    $branch = Branch::query()->create(['organization_id' => $organization->id, 'code' => 'MAIN', 'name' => 'Cửa hàng chính']);
    $user = User::factory()->create(['organization_id' => $organization->id, 'branch_id' => $branch->id, 'role' => $role, 'is_active' => true]);

    return [$organization, $branch, $user];
}

function catalogProduct(int $organizationId, string $name = 'Nước suối'): array
{
    $unit = Unit::query()->create(['organization_id' => $organizationId, 'code' => fake()->unique()->lexify('U???'), 'name' => 'Chai']);
    $categoryName = str($name)->slug(' ')->toString();
    $category = Category::query()->firstOrCreate(['organization_id' => $organizationId, 'name' => $categoryName], ['code' => str($name)->slug('-')->toString()]);
    $product = Product::query()->create(['organization_id' => $organizationId, 'category_id' => $category->id, 'sku' => fake()->unique()->lexify('SKU????'), 'name' => $name, 'is_active' => true]);
    $variant = ProductVariant::query()->create(['product_id' => $product->id, 'name' => 'Mặc định', 'sku' => $product->sku, 'last_cost_base' => 1000, 'is_active' => true]);
    $productUnit = ProductUnit::query()->create(['product_variant_id' => $variant->id, 'unit_id' => $unit->id, 'conversion_to_base' => 1, 'sale_price' => 5000, 'is_base' => true, 'is_default_sale' => true, 'is_active' => true]);

    return [$product, $productUnit];
}

test('products index keeps server pagination and search filters', function () {
    [$organization, , $user] = catalogUser();
    catalogProduct($organization->id, 'Nước suối');
    catalogProduct($organization->id, 'Cà phê');

    $response = $this->actingAs($user)->get('/products?search=nuoc&per_page=25');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('products/index')
        ->where('filters.search', 'nuoc')
        ->where('products.total', 1));
});

test('product unit ids must be distinct', function () {
    [$organization, , $owner] = catalogUser();
    $unit = Unit::query()->create(['organization_id' => $organization->id, 'code' => 'EA', 'name' => 'Cái']);

    $this->actingAs($owner)->post(route('products.store'), [
        'name' => 'Sản phẩm trùng đơn vị',
        'sku' => 'DUP-UNIT-001',
        'category_id' => null,
        'track_lot' => false,
        'track_expiry' => false,
        'is_active' => true,
        'image_action' => 'none',
        'units' => [
            ['unit_id' => $unit->id, 'conversion_to_base' => 1, 'sale_price' => 5000, 'is_base' => true, 'is_default_sale' => true, 'allows_fractional_quantity' => false],
            ['unit_id' => $unit->id, 'conversion_to_base' => 1, 'sale_price' => 5000, 'is_base' => false, 'is_default_sale' => false, 'allows_fractional_quantity' => false],
        ],
    ])->assertSessionHasErrors('units.1.unit_id');
});

test('catalog quick update is restricted and audited', function () {
    [$organization, , $owner] = catalogUser();
    [$product, $productUnit] = catalogProduct($organization->id);
    $secondUnit = Unit::query()->create(['organization_id' => $organization->id, 'code' => 'BOX', 'name' => 'Hộp']);
    $secondProductUnit = ProductUnit::query()->create([
        'product_variant_id' => $productUnit->product_variant_id,
        'unit_id' => $secondUnit->id,
        'conversion_to_base' => 10,
        'sale_price' => 70000,
        'is_base' => false,
        'is_default_sale' => false,
        'is_active' => true,
    ]);
    $register = Register::query()->create(['branch_id' => $owner->branch_id, 'code' => 'POS-QUICK', 'name' => 'Quầy nhanh', 'is_active' => true]);
    $shift = Shift::query()->create([
        'register_id' => $register->id,
        'opened_by' => $owner->id,
        'code' => 'CA-QUICK',
        'status' => 'open',
        'opening_cash' => 0,
        'opened_at' => now(),
    ]);
    $sale = Sale::query()->create([
        'public_id' => Str::uuid()->toString(),
        'branch_id' => $owner->branch_id,
        'shift_id' => $shift->id,
        'user_id' => $owner->id,
        'invoice_number' => 'HD-QUICK',
        'status' => 'completed',
        'source' => 'online',
        'subtotal' => 5000,
        'total' => 5000,
        'sold_at' => now(),
    ]);
    $saleItem = SaleItem::query()->create([
        'sale_id' => $sale->id,
        'product_variant_id' => $productUnit->product_variant_id,
        'product_unit_id' => $productUnit->id,
        'product_sku' => $product->sku,
        'product_name' => $product->name,
        'variant_name' => 'Mặc định',
        'unit_code' => $productUnit->unit->code,
        'unit_name' => $productUnit->unit->name,
        'conversion_to_base' => 1,
        'quantity' => 1,
        'quantity_base' => 1,
        'unit_price' => 5000,
        'original_unit_price' => 5000,
        'line_total' => 5000,
    ]);
    $updatedAt = $product->updated_at->toISOString();

    $response = $this->actingAs($owner)->patch(route('products.quick-update', $product), [
        'name' => 'Nước suối mới',
        'category_id' => $product->category_id,
        'product_unit_id' => $productUnit->id,
        'sale_price' => 6000,
        'updated_at' => $updatedAt,
    ]);

    $response->assertRedirect();
    expect($product->refresh()->name)->toBe('Nước suối mới')
        ->and($productUnit->refresh()->sale_price)->toBe(6000)
        ->and($secondProductUnit->refresh()->sale_price)->toBe(70000)
        ->and($saleItem->refresh()->unit_price)->toBe(5000)
        ->and(ApprovalEvent::query()->where('action', 'catalog.quick_update')->first()->requested_by)->toBe($owner->id)
        ->and(ApprovalEvent::query()->where('action', 'catalog.quick_update')->first()->approved_by)->toBe($owner->id)
        ->and(ApprovalEvent::query()->where('action', 'catalog.quick_update')->count())->toBe(1)
        ->and(ApprovalEvent::query()->where('action', 'catalog.quick_update')->first()->context['source'])->toBe('catalog_quick_edit');

    [$organization2, , $cashier] = catalogUser('cashier');
    [$product2, $productUnit2] = catalogProduct($organization2->id);
    $this->actingAs($cashier)->patch(route('products.quick-update', $product2), [
        'name' => 'Không được sửa',
        'category_id' => $product2->category_id,
        'product_unit_id' => $productUnit2->id,
        'sale_price' => 1,
        'updated_at' => $product2->updated_at->toISOString(),
    ])->assertForbidden();
});

test('category hierarchy rejects cycles and used units cannot be deactivated', function () {
    [$organization, , $owner] = catalogUser();
    $parent = Category::query()->create(['organization_id' => $organization->id, 'name' => 'Đồ uống', 'code' => 'do-uong']);
    $child = Category::query()->create(['organization_id' => $organization->id, 'name' => 'Nước', 'code' => 'nuoc', 'parent_id' => $parent->id]);

    $this->actingAs($owner)->put(route('categories.update', $parent), [
        'name' => $parent->name,
        'code' => $parent->code,
        'parent_id' => $child->id,
        'is_active' => true,
    ])->assertSessionHasErrors('parent_id');

    [, $productUnit] = catalogProduct($organization->id);
    $unit = $productUnit->unit;
    $this->actingAs($owner)->put(route('units.update', $unit), [
        'code' => $unit->code,
        'name' => $unit->name,
        'is_active' => false,
    ])->assertStatus(409);
});

test('customer search is accent-insensitive and debt filter is server-side', function () {
    [$organization, , $owner] = catalogUser();
    $customer = Customer::query()->create(['organization_id' => $organization->id, 'code' => 'KH-001', 'name' => 'Nguyễn Văn Ánh', 'is_active' => true]);
    $customer->creditEntries()->create(['type' => 'sale', 'debit' => 12000, 'credit' => 0]);
    Customer::query()->create(['organization_id' => $organization->id, 'code' => 'KH-002', 'name' => 'Tran Thi Binh', 'is_active' => true]);

    $this->actingAs($owner)->get('/customers?search=nguyen&debt=with_debt')->assertInertia(fn ($page) => $page->where('customers.total', 1));
});

test('products default to active status filter', function () {
    [$organization, , $owner] = catalogUser();
    catalogProduct($organization->id, 'Active product');
    [$inactiveProduct] = catalogProduct($organization->id, 'Inactive product');
    $inactiveProduct->update(['is_active' => false]);

    $this->actingAs($owner)->get(route('products.index'))->assertInertia(fn ($page) => $page
        ->where('filters.status', 'active')
        ->where('products.total', 1));
});

test('categories default to active status filter', function () {
    [$organization, , $owner] = catalogUser();
    Category::query()->create(['organization_id' => $organization->id, 'name' => 'Đang dùng', 'code' => 'dang-dung', 'is_active' => true]);
    Category::query()->create(['organization_id' => $organization->id, 'name' => 'Ngừng dùng', 'code' => 'ngung-dung', 'is_active' => false]);

    $this->actingAs($owner)->get(route('categories.index'))->assertInertia(fn ($page) => $page
        ->where('filters.status', 'active')
        ->where('categories.total', 1));
});

test('quick customer creation returns a customer ready for POS selection', function () {
    [$organization, , $owner] = catalogUser();

    $response = $this->actingAs($owner)->postJson(route('customers.quick.store'), [
        'name' => 'Khách mua nhanh',
        'phone' => '0900000000',
    ]);

    $response->assertCreated()->assertJsonPath('customer.name', 'Khách mua nhanh')->assertJsonPath('customer.balance', 0);
    expect(Customer::query()->where('organization_id', $organization->id)->where('name', 'Khách mua nhanh')->exists())->toBeTrue();
});
