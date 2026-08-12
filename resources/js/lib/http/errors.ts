export type ValidationErrors = Record<string, string | string[]>;

export class HttpError extends Error {
    constructor(
        public readonly status: number,
        public readonly payload: unknown,
    ) {
        super(resolveMessage(payload, status));
        this.name = 'HttpError';
    }

    get validationErrors(): ValidationErrors {
        if (typeof this.payload !== 'object' || this.payload === null || !('errors' in this.payload)) {
            return {};
        }

        const errors = (this.payload as { errors?: unknown }).errors;

        return typeof errors === 'object' && errors !== null ? (errors as ValidationErrors) : {};
    }
}

function resolveMessage(payload: unknown, status: number): string {
    if (typeof payload === 'object' && payload !== null && 'message' in payload) {
        const message = (payload as { message?: unknown }).message;

        if (typeof message === 'string' && message.length > 0) {
            return message;
        }
    }

    return `Request failed with status ${status}.`;
}

export function firstValidationMessage(error: unknown): string | null {
    if (!(error instanceof HttpError)) {
        return null;
    }

    const firstError = Object.values(error.validationErrors)[0];

    return Array.isArray(firstError) ? (firstError[0] ?? null) : (firstError ?? null);
}
