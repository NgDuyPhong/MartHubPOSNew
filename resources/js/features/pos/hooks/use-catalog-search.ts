import { useDeferredValue, useMemo } from 'react';
import { buildCatalogSearchIndex, filterCatalogWithIndex } from '../model/selectors';
import type { Product } from '../model/types';

export function useCatalogSearch(catalog: Product[], query: string, categoryId: number | null) {
    const index = useMemo(() => buildCatalogSearchIndex(catalog), [catalog]);
    const deferredQuery = useDeferredValue(query);
    const products = useMemo(() => filterCatalogWithIndex(index, deferredQuery, categoryId), [categoryId, deferredQuery, index]);

    return {
        index,
        products,
        isSearchPending: query !== deferredQuery,
    };
}
