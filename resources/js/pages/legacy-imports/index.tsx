import { PageShell } from '@/components/shared';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type SharedData } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, Database, FileArchive, ShieldCheck, Upload } from 'lucide-react';
import { FormEvent, useMemo } from 'react';

type Preview = {
    status: string;
    export_id: string;
    bundle_sha256: string;
    contract: string;
    profile: Record<string, { rows: number; errors: number }>;
    validation?: { errors: string[]; warnings: string[]; counts: Record<string, number> };
    control_totals: Record<string, string | number>;
};

export default function LegacyImportsPage() {
    const { props } = usePage<SharedData & { flash?: { success?: string; error?: string; legacyImportPreview?: Preview } }>();
    const form = useForm<{ bundle: File | null }>({ bundle: null });
    const preview = props.flash?.legacyImportPreview;
    const totalRows = useMemo(() => Object.values(preview?.profile ?? {}).reduce((total, entity) => total + entity.rows, 0), [preview]);

    const submit = (event: FormEvent, action: 'preview' | 'execute') => {
        event.preventDefault();
        if (!form.data.bundle) return;
        if (action === 'execute' && preview?.validation?.errors?.length) return;
        if (
            action === 'execute' &&
            !window.confirm(`Xác nhận import export ${preview?.export_id ?? 'này'} với SHA-256 ${preview?.bundle_sha256 ?? ''}?`)
        )
            return;
        form.post(route(`legacy-imports.${action}`), { forceFormData: true, preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Import sản phẩm cũ', href: route('legacy-imports.index') }]}>
            <Head title="Import sản phẩm cũ" />
            <PageShell className="gap-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="text-primary mb-2 flex items-center gap-2 text-sm font-medium">
                            <Database className="size-4" />
                            Migration catalog
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Import sản phẩm từ hệ thống cũ</h1>
                        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
                            Chỉ nhận bundle <code>product_catalog</code> gồm sản phẩm, đơn vị, giá, ảnh và tồn kho hiện tại.
                        </p>
                    </div>
                    <div className="bg-card rounded-lg border px-4 py-3 text-sm shadow-xs">
                        <div className="flex items-center gap-2 font-medium">
                            <ShieldCheck className="text-success size-4" /> Chỉ owner/manager
                        </div>
                        <p className="text-muted-foreground mt-1">Dữ liệu được lưu trong private storage.</p>
                    </div>
                </div>

                {props.flash?.success && (
                    <Alert>
                        <CheckCircle2 className="size-4" />
                        <AlertTitle>Hoàn tất</AlertTitle>
                        <AlertDescription>{props.flash.success}</AlertDescription>
                    </Alert>
                )}
                {form.errors.bundle && (
                    <Alert variant="destructive">
                        <AlertCircle className="size-4" />
                        <AlertTitle>Không thể xử lý bundle</AlertTitle>
                        <AlertDescription>{form.errors.bundle}</AlertDescription>
                    </Alert>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>1. Chọn bundle export</CardTitle>
                        <CardDescription>File ZIP tối đa 512 MB. Preview không ghi dữ liệu vào database.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-4" onSubmit={(event) => submit(event, 'preview')}>
                            <label className="block text-sm font-medium" htmlFor="legacy-bundle">
                                File bundle
                            </label>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                <Input
                                    id="legacy-bundle"
                                    type="file"
                                    accept=".zip,application/zip"
                                    onChange={(event) => form.setData('bundle', event.target.files?.[0] ?? null)}
                                />
                                <Button type="submit" disabled={!form.data.bundle || form.processing}>
                                    <Upload className="size-4" />
                                    {form.processing ? 'Đang kiểm tra…' : 'Preview'}
                                </Button>
                            </div>
                            {form.data.bundle && (
                                <p className="text-muted-foreground flex items-center gap-2 text-xs">
                                    <FileArchive className="size-3.5" />
                                    {form.data.bundle.name}
                                </p>
                            )}
                        </form>
                    </CardContent>
                </Card>

                {preview && (
                    <Card>
                        <CardHeader>
                            <CardTitle>2. Kết quả preview</CardTitle>
                            <CardDescription>
                                Export {preview.export_id} · SHA-256 <code className="break-all">{preview.bundle_sha256}</code>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-3">
                                <Summary label="Contract" value={preview.contract} />
                                <Summary label="Tổng dòng" value={String(totalRows)} />
                                <Summary label="Sản phẩm" value={String(preview.control_totals.product_count ?? 0)} />
                            </div>
                            {!!preview.validation?.errors?.length && (
                                <Alert variant="destructive">
                                    <AlertCircle className="size-4" />
                                    <AlertTitle>Preview có lỗi, chưa được phép execute</AlertTitle>
                                    <AlertDescription>
                                        <ul className="list-disc space-y-1 pl-5">
                                            {preview.validation.errors.map((error) => (
                                                <li key={error}>{error}</li>
                                            ))}
                                        </ul>
                                    </AlertDescription>
                                </Alert>
                            )}
                            {!!preview.validation?.warnings?.length && (
                                <Alert>
                                    <AlertCircle className="size-4" />
                                    <AlertTitle>Cảnh báo cần duyệt</AlertTitle>
                                    <AlertDescription>
                                        <ul className="list-disc space-y-1 pl-5">
                                            {preview.validation.warnings.map((warning) => (
                                                <li key={warning}>{warning}</li>
                                            ))}
                                        </ul>
                                    </AlertDescription>
                                </Alert>
                            )}
                            <div className="overflow-x-auto rounded-md border">
                                <table className="w-full min-w-[520px] text-left text-sm" aria-label="Kết quả kiểm tra bundle">
                                    <thead className="bg-muted/50 text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                                        <tr>
                                            <th scope="col" className="px-3 py-2">
                                                Entity
                                            </th>
                                            <th scope="col" className="px-3 py-2">
                                                Rows
                                            </th>
                                            <th scope="col" className="px-3 py-2">
                                                Errors
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(preview.profile).map(([entity, result]) => (
                                            <tr className="hover:bg-muted/50 border-t transition-colors" key={entity}>
                                                <td className="px-3 py-2 font-medium">{entity}</td>
                                                <td className="px-3 py-2">{result.rows}</td>
                                                <td className="px-3 py-2">{result.errors}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <form onSubmit={(event) => submit(event, 'execute')}>
                                <Button type="submit" disabled={!form.data.bundle || form.processing || !!preview.validation?.errors?.length}>
                                    <CheckCircle2 className="size-4" />
                                    Xác nhận import bundle này
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Import một lần</CardTitle>
                        <CardDescription>
                            Hệ thống không tạo bảng lịch sử migration. Hãy lưu lại output reconciliation của command hoặc ảnh chụp kết quả sau khi xác
                            nhận.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </PageShell>
        </AppLayout>
    );
}

function Summary({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-muted/20 rounded-md border p-3">
            <div className="text-muted-foreground text-xs">{label}</div>
            <div className="mt-1 font-semibold">{value}</div>
        </div>
    );
}
