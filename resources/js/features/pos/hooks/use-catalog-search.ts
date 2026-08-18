import { useDeferredValue, useMemo, useRef } from 'react';
import { buildCatalogSearchIndex, filterCatalogWithIndex, getCatalogVersion } from '../model/selectors';
import type { Product } from '../model/types';

export function useCatalogSearch(catalog: Product[], query: string, categoryId: number | null) {
    const catalogVersion = useMemo(() => getCatalogVersion(catalog), [catalog]);
    const catalogCache = useRef<{ version: string; catalog: Product[] }>({ version: '', catalog: [] });

    if (catalogCache.current.version !== catalogVersion) {
        catalogCache.current = { version: catalogVersion, catalog };
    }

    const currentCatalog = catalogCache.current.catalog;
    const index = useMemo(() => buildCatalogSearchIndex(currentCatalog), [currentCatalog]);
    const deferredQuery = useDeferredValue(query);
    const products = useMemo(() => filterCatalogWithIndex(index, deferredQuery, categoryId), [categoryId, deferredQuery, index]);

    return {
        index,
        products,
        isSearchPending: query !== deferredQuery,
    };
}
