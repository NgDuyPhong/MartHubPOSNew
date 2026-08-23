import { useForm } from '@inertiajs/react';
import { FormEventHandler, useRef } from 'react';

// Components...
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import HeadingSmall from '@/components/heading-small';

import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function DeleteUser() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const { data, setData, delete: destroy, processing, reset, errors, clearErrors } = useForm({ password: '' });

    const deleteUser: FormEventHandler = (e) => {
        e.preventDefault();

        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current?.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        clearErrors();
        reset();
    };

    return (
        <div className="flex flex-col gap-6">
            <HeadingSmall title="Xóa tài khoản" description="Xóa tài khoản và toàn bộ dữ liệu liên quan" />
            <div className="border-destructive/20 bg-destructive/5 flex flex-col gap-4 rounded-lg border p-4">
                <div className="text-destructive relative flex flex-col gap-0.5">
                    <p className="font-medium">Cảnh báo</p>
                    <p className="text-sm">Vui lòng cân nhắc kỹ vì thao tác này không thể hoàn tác.</p>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="destructive">Xóa tài khoản</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogTitle>Bạn có chắc chắn muốn xóa tài khoản không?</DialogTitle>
                        <DialogDescription>
                            Sau khi xóa, toàn bộ dữ liệu và tài nguyên của tài khoản cũng sẽ bị xóa vĩnh viễn. Vui lòng nhập mật khẩu để xác nhận bạn
                            muốn xóa tài khoản vĩnh viễn.
                        </DialogDescription>
                        <form className="flex flex-col gap-6" onSubmit={deleteUser}>
                            <div className="grid gap-2">
                                <Label htmlFor="password" className="sr-only">
                                    Mật khẩu
                                </Label>

                                <Input
                                    id="password"
                                    type="password"
                                    name="password"
                                    ref={passwordInput}
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="Mật khẩu"
                                    autoComplete="current-password"
                                />

                                <InputError message={errors.password} />
                            </div>

                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="secondary" onClick={closeModal}>
                                        Hủy
                                    </Button>
                                </DialogClose>

                                <Button variant="destructive" disabled={processing} asChild>
                                    <button type="submit">Xóa tài khoản</button>
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
