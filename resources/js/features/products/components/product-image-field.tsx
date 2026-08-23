import { FieldError } from '@/components/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { InertiaFormProps } from '@inertiajs/react';
import { ImageOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ProductFormData } from '../model/types';

export function ProductImageField({
    form,
    currentUrl,
    productName,
}: {
    form: InertiaFormProps<ProductFormData>;
    currentUrl?: string | null;
    productName: string;
}) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl ?? null);
    const [previewFailed, setPreviewFailed] = useState(false);

    useEffect(() => {
        if (form.data.image) {
            const objectUrl = URL.createObjectURL(form.data.image);
            setPreviewUrl(objectUrl);
            setPreviewFailed(false);
            return () => URL.revokeObjectURL(objectUrl);
        }

        setPreviewUrl(
            form.data.image_action === 'external'
                ? form.data.external_image_url || null
                : form.data.image_action === 'remove'
                  ? null
                  : (currentUrl ?? null),
        );
        setPreviewFailed(false);
    }, [currentUrl, form.data.external_image_url, form.data.image, form.data.image_action]);

    return (
        <div className="flex flex-col gap-3">
            <div>
                <Label>Ảnh sản phẩm</Label>
                <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Nguồn ảnh sản phẩm">
                    {(['keep', 'upload', 'external', 'remove'] as const).map((action) => (
                        <label key={action} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm">
                            <input
                                type="radio"
                                name="image_action"
                                checked={form.data.image_action === action}
                                onChange={() => {
                                    form.setData('image_action', action);
                                    if (action !== 'upload') form.setData('image', null);
                                }}
                            />
                            {action === 'keep'
                                ? 'Giữ ảnh hiện tại'
                                : action === 'upload'
                                  ? 'Tải ảnh lên'
                                  : action === 'external'
                                    ? 'Dùng URL HTTPS'
                                    : 'Gỡ ảnh'}
                        </label>
                    ))}
                </div>
            </div>
            {form.data.image_action === 'upload' && (
                <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => form.setData('image', event.target.files?.[0] ?? null)}
                />
            )}
            {form.data.image_action === 'external' && (
                <Input
                    type="url"
                    placeholder="https://cdn.example.com/product.webp"
                    value={form.data.external_image_url}
                    onChange={(event) => form.setData('external_image_url', event.target.value)}
                />
            )}
            <FieldError message={form.errors.image} />
            <FieldError message={form.errors.external_image_url} />
            <div className="bg-muted/50 flex min-h-28 items-center justify-center rounded-md border p-3">
                {previewUrl && !previewFailed ? (
                    <img
                        src={previewUrl}
                        alt={`Ảnh sản phẩm ${productName || 'mới'}`}
                        className="size-28 rounded-md object-cover"
                        onError={() => setPreviewFailed(true)}
                    />
                ) : (
                    <div className="text-muted-foreground flex flex-col items-center gap-1 text-xs">
                        <ImageOff className="size-6" aria-hidden="true" />
                        Chưa có ảnh
                    </div>
                )}
            </div>
        </div>
    );
}
