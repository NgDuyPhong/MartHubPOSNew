import { getCsrfToken } from './csrf';
import { HttpError } from './errors';

type JsonRequestInit = Omit<RequestInit, 'body'> & {
    body?: unknown;
};

export async function requestJson<T>(url: string, init: JsonRequestInit = {}): Promise<T> {
    const method = (init.method ?? 'GET').toUpperCase();
    const headers = new Headers(init.headers);

    headers.set('Accept', 'application/json');
    headers.set('X-Requested-With', 'XMLHttpRequest');

    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        const token = getCsrfToken();

        if (token) {
            headers.set('X-CSRF-TOKEN', token);
        }
    }

    let body: BodyInit | undefined;

    if (init.body !== undefined) {
        headers.set('Content-Type', 'application/json');
        body = JSON.stringify(init.body);
    }

    const response = await fetch(url, {
        ...init,
        body,
        credentials: init.credentials ?? 'same-origin',
        headers,
    });

    const text = await response.text();
    let payload: unknown = null;

    if (text) {
        try {
            payload = JSON.parse(text);
        } catch {
            payload = text;
        }
    }

    if (!response.ok) {
        throw new HttpError(response.status, payload);
    }

    return payload as T;
}
