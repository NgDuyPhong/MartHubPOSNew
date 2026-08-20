import { PageHeader } from '@/components/shared';
import { ProductForm, type Product, type ProductFormData, type Unit } from '@/features/products';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';

function formData(product: Product): ProductFormData {
    const variant = product.variants[0];
    return {
        name: product.name,
        sku: product.sku,
        category_id: product.category_id ?? '',
        image: null,
        image_action: product.image_source === 'none' ? 'remove' : 'keep',
        external_image_url: product.external_image_url ?? '',
        track_lot: product.track_lot,
        track_expiry: product.track_expiry,
        is_active: product.is_active,
        units: (variant?.units ?? []).map((row) => ({
            id: row.id,
            unit_id: row.unit.id,
            conversion_to_base: Number(row.conversion_to_base),
            sale_price: row.sale_price,
            barcode: row.barcodes[0]?.value ?? '',
            is_base: row.is_base,
            is_default_sale: row.is_default_sale,
            allows_fractional_quantity: row.allows_fractional_quantity,
        })),
    };
}

export default function EditProductPage({
    product,
    categories,
    units,
}: {
    product: Product;
    categories: Array<{ id: number; name: string }>;
    units: Unit[];
}) {
    const form = useForm<ProductFormData>(formData(product));
    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Sản phẩm', href: route('products.index') },
                { title: `Sửa ${product.name}`, href: route('products.edit', product.id) },
            ]}
        >
            <Head title={`Sửa ${product.name}`} />
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-5 lg:p-6">
                <PageHeader title="Sửa sản phẩm" description={product.sku} />
                <ProductForm form={form} categories={categories} units={units} product={product} onCancel={() => window.history.back()} />
            </div>
        </AppLayout>
    );
}
