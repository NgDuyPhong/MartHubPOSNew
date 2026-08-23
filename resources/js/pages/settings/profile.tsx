import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

import DeleteUser from '@/components/delete-user';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Cài đặt hồ sơ',
        href: '/settings/profile',
    },
];

export default function Profile({ mustVerifyEmail, status }: { mustVerifyEmail: boolean; status?: string }) {
    const { auth } = usePage<SharedData>().props;

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
        name: auth.user.name,
        email: auth.user.email,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        patch(route('profile.update'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cài đặt hồ sơ" />

            <SettingsLayout>
                <div className="flex flex-col gap-6">
                    <HeadingSmall title="Thông tin hồ sơ" description="Cập nhật tên và địa chỉ email" />

                    <form onSubmit={submit} className="flex flex-col gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Tên</Label>

                            <Input
                                id="name"
                                className="w-full"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                autoComplete="name"
                                placeholder="Họ và tên"
                            />

                            <InputError message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Địa chỉ email</Label>

                            <Input
                                id="email"
                                type="email"
                                className="w-full"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                                autoComplete="username"
                                placeholder="Địa chỉ email"
                            />

                            <InputError message={errors.email} />
                        </div>

                        {mustVerifyEmail && auth.user.email_verified_at === null && (
                            <div>
                                <p className="text-foreground text-sm">
                                    Địa chỉ email của bạn chưa được xác minh.
                                    <Link
                                        href={route('verification.send')}
                                        method="post"
                                        as="button"
                                        className="text-muted-foreground hover:text-foreground focus:ring-ring rounded-md text-sm underline focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
                                    >
                                        Nhấp vào đây để gửi lại email xác minh.
                                    </Link>
                                </p>

                                {status === 'verification-link-sent' && (
                                    <div className="text-success text-sm font-medium">
                                        Một liên kết xác minh mới đã được gửi đến địa chỉ email của bạn.
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-4">
                            <Button disabled={processing}>Lưu</Button>

                            <Transition
                                show={recentlySuccessful}
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p className="text-muted-foreground text-sm">Đã lưu</p>
                            </Transition>
                        </div>
                    </form>
                </div>

                <DeleteUser />
            </SettingsLayout>
        </AppLayout>
    );
}
