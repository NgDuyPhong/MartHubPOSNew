import { PageHeader } from '@/components/shared';
import { generateProductSku, ProductForm, type ProductFormData, type Unit } from '@/features/products';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';

const initialData = (unitId: number): ProductFormData => ({
    name: '',
    sku: generateProductSku(),
    category_id: '',
    image: null,
    image_action: 'none',
    external_image_url: '',
    track_lot: false,
    track_expiry: false,
    is_active: true,
    units: [
        {
            unit_id: unitId,
            conversion_to_base: 1,
            sale_price: 0,
            barcode: '',
            is_base: true,
            is_default_sale: true,
            allows_fractional_quantity: false,
        },
    ],
});

export default function CreateProductPage({ categories, units }: { categories: Array<{ id: number; name: string }>; units: Unit[] }) {
    const form = useForm<ProductFormData>(initialData(units[0]?.id ?? 0));
    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Sản phẩm', href: route('products.index') },
                { title: 'Thêm sản phẩm', href: route('products.create') },
            ]}
        >
            <Head title="Thêm sản phẩm" />
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-5 lg:p-6">
                <PageHeader title="Thêm sản phẩm" description="Khai báo thông tin cơ bản, ảnh và các đơn vị bán." />
                <ProductForm form={form} categories={categories} units={units} onCancel={() => window.history.back()} />
            </div>
        </AppLayout>
    );
}
