import AppLogoIcon from '@/components/app-logo-icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { Barcode, Boxes, ReceiptText, Wifi } from 'lucide-react';

const operatingPrinciples = [
    { label: 'Quét nhanh', description: 'Barcode và phím tắt luôn ở gần thao tác chính.', icon: Barcode },
    { label: 'Đối soát rõ', description: 'Ca, tồn kho và doanh thu có cùng một luồng dữ liệu.', icon: Boxes },
    { label: 'Không mất đơn', description: 'Bán hàng offline vẫn được lưu và đồng bộ có kiểm soát.', icon: Wifi },
];

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;

    return (
        <>
            <Head title="MartHub POS" />
            <main className="bg-background text-foreground min-h-dvh">
                <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-6 lg:px-8">
                    <Link href={route('home')} className="flex items-center gap-3" aria-label="MartHub POS trang chủ">
                        <span className="bg-sidebar-primary text-sidebar-primary-foreground flex size-9 items-center justify-center rounded-md">
                            <AppLogoIcon className="size-5 fill-current" aria-hidden="true" />
                        </span>
                        <span className="text-sm font-semibold tracking-tight">MartHub POS</span>
                    </Link>
                    {auth.user ? (
                        <Button asChild variant="outline" size="sm">
                            <Link href={route('dashboard')}>Mở dashboard</Link>
                        </Button>
                    ) : (
                        <Button asChild variant="outline" size="sm">
                            <Link href={route('login')}>Đăng nhập</Link>
                        </Button>
                    )}
                </header>

                <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 lg:py-24">
                    <section className="flex flex-col gap-6">
                        <div className="flex flex-col gap-4">
                            <Badge variant="outline" className="w-fit">
                                Vận hành cửa hàng
                            </Badge>
                            <h1 className="max-w-3xl text-4xl leading-tight font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                                Một quầy bán hàng rõ ràng, nhanh và dễ đối soát.
                            </h1>
                            <p className="text-muted-foreground max-w-2xl text-base leading-7">
                                MartHub POS kết nối catalog, cart, ca bán, tồn kho và hóa đơn trong một workspace gọn cho cửa hàng mini mart.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <Button asChild size="lg">
                                <Link href={auth.user ? route('pos') : route('login')}>
                                    {auth.user ? 'Mở màn hình bán hàng' : 'Bắt đầu với MartHub POS'}
                                    <ReceiptText />
                                </Link>
                            </Button>
                            {!auth.user && (
                                <Button asChild variant="ghost" size="lg">
                                    <Link href={route('login')}>Đăng nhập tài khoản</Link>
                                </Button>
                            )}
                        </div>

                        <div className="grid gap-4 border-t pt-6 sm:grid-cols-3">
                            {operatingPrinciples.map((principle) => {
                                const Icon = principle.icon;

                                return (
                                    <div key={principle.label} className="flex flex-col gap-2">
                                        <Icon className="text-primary size-5" aria-hidden="true" />
                                        <h2 className="text-sm font-semibold">{principle.label}</h2>
                                        <p className="text-muted-foreground text-xs leading-5">{principle.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <aside className="bg-card flex flex-col gap-6 rounded-xl border p-6 shadow-sm lg:p-8" aria-label="Tổng quan MartHub POS">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <span className="bg-primary text-primary-foreground flex size-11 items-center justify-center rounded-lg">
                                    <AppLogoIcon className="size-6 fill-current" aria-hidden="true" />
                                </span>
                                <div>
                                    <h2 className="font-semibold">MartHub POS</h2>
                                    <p className="text-muted-foreground text-sm">Workspace vận hành</p>
                                </div>
                            </div>
                            <Badge variant="success">Sẵn sàng</Badge>
                        </div>

                        <div className="grid gap-3 border-y py-5 sm:grid-cols-2">
                            <div className="bg-muted/50 rounded-lg p-4">
                                <div className="text-muted-foreground text-xs">Luồng chính</div>
                                <div className="mt-1 font-semibold">Catalog → Cart → Checkout</div>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-4">
                                <div className="text-muted-foreground text-xs">Kiểm soát</div>
                                <div className="mt-1 font-semibold">Ca bán · Tồn kho · Sync</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm">
                            <div className="bg-success/15 text-success flex size-9 items-center justify-center rounded-md">
                                <Wifi className="size-4" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="font-medium">Sẵn sàng cho quầy bán</p>
                                <p className="text-muted-foreground text-xs">Thiết kế cho desktop, tablet và thao tác liên tục.</p>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>
        </>
    );
}
