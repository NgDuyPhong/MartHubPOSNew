import { FieldError } from '@/components/shared/field-error';
import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

export default function InputError({ message, className = '', ...props }: HTMLAttributes<HTMLParagraphElement> & { message?: string }) {
    return <FieldError {...props} message={message} className={cn('text-sm', className)} />;
}
