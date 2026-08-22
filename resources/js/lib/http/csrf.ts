function getCookie(name: string): string | null {
    const prefix = `${name}=`;
    const cookie = document.cookie.split('; ').find((value) => value.startsWith(prefix));

    if (!cookie) return null;

    const value = cookie.slice(prefix.length);

    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

export type CsrfToken = {
    value: string;
    header: 'X-CSRF-TOKEN' | 'X-XSRF-TOKEN';
};

export function getCsrfToken(): CsrfToken | null {
    const cookie = getCookie('XSRF-TOKEN');
    if (cookie) return { value: cookie, header: 'X-XSRF-TOKEN' };

    const meta = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;

    return meta ? { value: meta, header: 'X-CSRF-TOKEN' } : null;
}
