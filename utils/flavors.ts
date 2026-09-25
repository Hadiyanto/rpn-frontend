import type { Menu, Variant } from '@/types/menu';

export interface FlavorSelection {
    name: string;
    variant_ids: number[];
}

const variantLabel = (v: Variant) => v.variant_name || v.name || '';

/** Legacy parsing of an order item name ("Mix A Dan B" → ["A", "B"]). */
const parseNames = (name: string): string[] => {
    if (!name) return [];
    if (name.startsWith('Mix ')) return name.replace('Mix ', '').split(' Dan ');
    return [name];
};

/** The variants currently chosen for an item: by id when known, otherwise matched by name. */
export const selectedVariants = (item: { name: string; variant_ids?: number[] }, variants: Variant[]): Variant[] => {
    if (item.variant_ids && item.variant_ids.length > 0) {
        return item.variant_ids
            .map(id => variants.find(v => v.id === id))
            .filter((v): v is Variant => !!v);
    }
    const names = parseNames(item.name);
    return names
        .map(n => variants.find(v => variantLabel(v) === n))
        .filter((v): v is Variant => !!v);
};

/** Builds the stored name ("Mix A Dan B", sorted) and ids from a list of chosen variants. */
export const buildSelection = (chosen: Variant[]): FlavorSelection => {
    // Plain code-unit order, same as the old `names.sort()`, so stored names don't change.
    const sorted = [...chosen].sort((a, b) => (variantLabel(a) < variantLabel(b) ? -1 : variantLabel(a) > variantLabel(b) ? 1 : 0));
    const names = sorted.map(variantLabel);
    return {
        name: names.length > 1 ? `Mix ${names.join(' Dan ')}` : names[0] ?? '',
        variant_ids: sorted.map(v => v.id),
    };
};

/**
 * variant_ids to submit for an item. Falls back to name matching so edits of older orders
 * (saved before variant_ids existed) still send ids. Undefined when nothing matches.
 */
export const resolveVariantIds = (item: { name: string; variant_ids?: number[] }, variants: Variant[]): number[] | undefined => {
    const ids = selectedVariants(item, variants).map(v => v.id);
    return ids.length > 0 ? ids : undefined;
};

/** Max different flavors per box, as configured on the box's menu row (the backend enforces the same value). */
export const maxFlavorsFor = (menus: Pick<Menu, 'name' | 'max_flavors'>[], boxType: string) =>
    menus.find(m => m.name === boxType)?.max_flavors ?? 1;
