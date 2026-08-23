import type { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

export function useOrganizationTimezone(): string {
    return usePage<SharedData>().props.organization?.timezone ?? 'UTC';
}
