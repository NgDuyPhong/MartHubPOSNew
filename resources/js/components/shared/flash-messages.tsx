import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { CheckCircle2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export function FlashMessages() {
    const { props } = usePage<SharedData>();
    const flash = props.flash;
    const [dismissed, setDismissed] = useState<string | null>(null);
    const message = flash?.error ? { text: flash.error, tone: 'error' as const } : flash?.success ? { text: flash.success, tone: 'success' as const } : null;

    useEffect(() => {
        setDismissed(null);
    }, [flash?.error, flash?.success]);

    if (!message || dismissed === message.text) return null;

    return (
        <div className="px-4 pt-3 md:px-5 lg:px-6" role="status" aria-live="polite">
            <Alert variant={message.tone === 'error' ? 'destructive' : 'default'}>
                {message.tone === 'success' && <CheckCircle2 className="size-4" />}
                <AlertDescription className="flex items-center justify-between gap-3">
                    <span>{message.text}</span>
                    <Button type="button" size="icon" variant="ghost" className="size-7 shrink-0" onClick={() => setDismissed(message.text)} aria-label="Đóng thông báo">
                        <X className="size-4" />
                    </Button>
                </AlertDescription>
            </Alert>
        </div>
    );
}
