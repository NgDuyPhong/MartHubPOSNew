import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Hồ sơ',
        url: '/settings/profile',
        icon: null,
    },
    {
        title: 'Mật khẩu',
        url: '/settings/password',
        icon: null,
    },
    {
        title: 'Giao diện',
        url: '/settings/appearance',
        icon: null,
    },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const currentPath = window.location.pathname;

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-8 p-4 md:p-5 lg:p-6">
            <Heading title="Cài đặt" description="Quản lý hồ sơ và cài đặt tài khoản" />

            <div className="flex flex-col gap-8 lg:flex-row">
                <aside className="w-full shrink-0 lg:w-48">
                    <nav className="flex flex-col gap-1" aria-label="Điều hướng cài đặt">
                        {sidebarNavItems.map((item) => (
                            <Button
                                key={item.url}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn('w-full justify-start', {
                                    'bg-muted': currentPath === item.url,
                                })}
                            >
                                <Link href={item.url} prefetch>
                                    {item.title}
                                </Link>
                            </Button>
                        ))}
                    </nav>
                </aside>

                <Separator className="md:hidden" />

                <div className="min-w-0 flex-1 md:max-w-2xl">
                    <section className="max-w-xl space-y-10">{children}</section>
                </div>
            </div>
        </div>
    );
}
