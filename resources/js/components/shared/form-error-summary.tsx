import { Alert } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function FormErrorSummary({ errors }: { errors: Record<string, string | undefined> }) {
    const messages = Object.values(errors).filter((message): message is string => Boolean(message));
    if (!messages.length) return null;

    return (
        <Alert variant="destructive" className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
                {messages.length === 1 ? (
                    messages[0]
                ) : (
                    <ul className="list-disc space-y-1 pl-4">
                        {messages.map((message) => (
                            <li key={message}>{message}</li>
                        ))}
                    </ul>
                )}
            </div>
        </Alert>
    );
}
