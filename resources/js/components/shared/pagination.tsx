import { Button } from '@/components/ui/button';
import type { ListQuery, Paginated } from '@/types/pagination';
import type { SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function stripEmptyQuery(query: ListQuery): Record<string, string | number | boolean> {
    return Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== '')) as Record<
        string,
        string | number | boolean
    >;
}

export function Pagination<T>({
    paginator,
    routeUrl,
    query = {},
    pageKey = 'page',
}: {
    paginator: Paginated<T>;
    routeUrl: string;
    query?: ListQuery;
    pageKey?: string;
}) {
    const { ui } = usePage<SharedData>().props;
    const pageSizes = ui?.pagination?.options ?? [25, 50, 100];
    if (paginator.total === 0) return null;

    const changePerPage = (perPage: number) => {
        router.get(routeUrl, stripEmptyQuery({ ...query, per_page: perPage, [pageKey]: 1 }), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <nav className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between" aria-label="Phân trang">
            <div className="text-muted-foreground flex flex-wrap items-center gap-2">
                <span>
                    {paginator.from ?? 0}–{paginator.to ?? 0} / {paginator.total}
                </span>
                <label className="flex items-center gap-2">
                    <span className="sr-only">Số dòng mỗi trang</span>
                    <select
                        className="bg-background h-9 rounded-md border px-2 text-sm"
                        value={paginator.per_page}
                        onChange={(event) => changePerPage(Number(event.target.value))}
                        aria-label="Số dòng mỗi trang"
                    >
                        {pageSizes.map((size) => (
                            <option key={size} value={size}>
                                {size}/trang
                            </option>
                        ))}
                    </select>
                </label>
            </div>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
                <span className="text-muted-foreground whitespace-nowrap">
                    Trang {paginator.current_page}/{paginator.last_page}
                </span>
                <div className="flex items-center gap-1">
                    {paginator.links.map((link, index) => {
                        if (index === 0 || index === paginator.links.length - 1) {
                            return link.url ? (
                                <Button key={`${link.label}-${index}`} asChild size="icon" variant="outline" className="size-9">
                                    <Link href={link.url} preserveScroll preserveState aria-label={index === 0 ? 'Trang trước' : 'Trang sau'}>
                                        {index === 0 ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
                                    </Link>
                                </Button>
                            ) : (
                                <Button key={`${link.label}-${index}`} size="icon" variant="outline" className="size-9" disabled>
                                    {index === 0 ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
                                </Button>
                            );
                        }

                        return link.url ? (
                            <Button key={`${link.label}-${index}`} asChild size="sm" variant={link.active ? 'default' : 'outline'} className="min-w-9">
                                <Link href={link.url} preserveScroll preserveState aria-current={link.active ? 'page' : undefined}>
                                    {link.label}
                                </Link>
                            </Button>
                        ) : (
                            <span key={`${link.label}-${index}`} className="text-muted-foreground px-1">
                                …
                            </span>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}
