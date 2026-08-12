import { Button } from '@/components/ui/button';
import {
    ProductFormDialog,
    ProductTable,
    hasValidBaseUnit,
    normalizeUnitRows,
    type Product,
    type ProductFormData,
    type Unit,
    type UnitRow,
} from '@/features/products';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { FormEvent, useState } from 'react';

export default function ProductsPage({
    products,
    categories,
    units,
}: {
    products: { data: Product[] };
    categories: Array<{ id: number; name: string }>;
    units: Unit[];
}) {
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const firstUnit = units[0]?.id ?? 0;
    const initialData = (): ProductFormData => ({
        name: '',
        sku: '',
        category_id: '',
        image: null,
        track_lot: false,
        track_expiry: false,
        is_active: true,
        units: [{ unit_id: firstUnit, conversion_to_base: 1, sale_price: 0, barcode: '', is_base: true, is_default_sale: true }],
    });
    const form = useForm<ProductFormData>(initialData());
    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!hasValidBaseUnit(form.data.units)) {
            form.setError('units', 'Cần có đúng một đơn vị cơ sở với hệ số bằng 1.');
            return;
        }
        const options = {
            forceFormData: true,
            onSuccess: () => {
                setOpen(false);
                setEditingId(null);
                form.reset();
            },
        };
        if (editingId) {
            form.transform((data) => ({ ...data, units: normalizeUnitRows(data.units), _method: 'put' }));
            form.post(route('products.update', editingId), options);
        } else {
            form.transform((data) => ({ ...data, units: normalizeUnitRows(data.units) }));
            form.post(route('products.store'), options);
        }
    };
    const addProduct = () => {
        setEditingId(null);
        form.setData(initialData());
        setOpen(true);
    };
    const editProduct = (product: Product) => {
        const variant = product.variants[0];
        setEditingId(product.id);
        form.setData({
            name: product.name,
            sku: product.sku,
            category_id: product.category_id ?? '',
            image: null,
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
            })),
        });
        setOpen(true);
    };
    const updateUnit = (index: number, values: Partial<UnitRow>) =>
        form.setData(
            'units',
            form.data.units.map((row, rowIndex) => (rowIndex === index ? { ...row, ...values } : row)),
        );
    const chooseExclusive = (index: number, field: 'is_base' | 'is_default_sale') =>
        form.setData(
            'units',
            form.data.units.map((row, rowIndex) => ({
                ...row,
                [field]: rowIndex === index,
                ...(field === 'is_base' && rowIndex === index ? { conversion_to_base: 1 } : {}),
            })),
        );

    return (
        <AppLayout breadcrumbs={[{ title: 'Sản phẩm', href: route('products.index') }]}>
            <Head title="Sản phẩm" />
            <div className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Sản phẩm & đơn vị bán</h1>
                        <p className="text-sm text-slate-500">Tồn kho luôn lưu theo đơn vị cơ sở; barcode gắn với từng quy cách.</p>
                    </div>
                    <Button onClick={addProduct}>
                        <Plus className="mr-2 size-4" />
                        Thêm sản phẩm
                    </Button>
                </div>
                <ProductTable products={products.data} onEdit={editProduct} />
            </div>
            <ProductFormDialog
                open={open}
                editingId={editingId}
                form={form}
                categories={categories}
                units={units}
                firstUnit={firstUnit}
                onOpenChange={setOpen}
                onSubmit={submit}
                updateUnit={updateUnit}
                chooseExclusive={chooseExclusive}
            />
        </AppLayout>
    );
}
