// Selling prices (docs/plan-harga-per-rasa.md in rpn-backend): each flavor has a price per box
// type per store, and a box costs its most expensive flavor. Orders store that box price on the
// item (unit_price), so totals never depend on today's prices.

export interface PricedItem {
    qty: number;
    unit_price?: number | string | null;
}

export interface FlavorPrices {
    id: number;
    variant_name?: string;
    /** { [store_id]: { price_full, price_half } } from GET /variants */
    prices?: Record<string, { price_full: number | string | null; price_half: number | string | null }>;
}

/** Price of one box on an order (snapshotted when the order was created or last edited). */
export const itemPrice = (item: PricedItem) => Number(item.unit_price ?? 0);

export const itemSubtotal = (item: PricedItem) => itemPrice(item) * item.qty;

export const orderTotal = (order: { items: PricedItem[] }) => order.items.reduce((sum, i) => sum + itemSubtotal(i), 0);

/** A flavor's price for a box type at a store; null = not sold in that box type there. */
export const flavorPrice = (variant: FlavorPrices | undefined, storeId: number | null | undefined, boxType: string): number | null => {
    if (!variant || !storeId) return null;
    const p = variant.prices?.[String(storeId)];
    const value = boxType === 'HALF' ? p?.price_half : p?.price_full;
    return value === null || value === undefined ? null : Number(value);
};

/** Box price = the most expensive chosen flavor (same rule as the backend). null if any has no price. */
export const boxPrice = (variants: FlavorPrices[], variantIds: number[], storeId: number | null | undefined, boxType: string): number | null => {
    let best: number | null = null;
    for (const id of variantIds) {
        const price = flavorPrice(variants.find(v => v.id === id), storeId, boxType);
        if (price === null) return null;
        best = best === null ? price : Math.max(best, price);
    }
    return best;
};

/** "Rp 60k – 68k" for a box type at a store (for box pickers), or null when nothing is priced. */
export const priceRangeLabel = (variants: FlavorPrices[], storeId: number | null | undefined, boxType: string): string | null => {
    const prices = variants.map(v => flavorPrice(v, storeId, boxType)).filter((p): p is number => p !== null);
    if (prices.length === 0) return null;
    const k = (n: number) => `${(n / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}k`;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `Rp ${k(min)}` : `Rp ${k(min)}–${k(max)}`;
};
