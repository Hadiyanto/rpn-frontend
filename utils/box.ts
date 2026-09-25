import type { BoxType } from '@/types/menu';

export const BOX_TYPES: readonly BoxType[] = ['FULL', 'HALF'];

// Historical orders may still carry a retired box type (e.g. 'HAMPERS'), so every
// helper accepts any string and falls back to a readable version of the raw value.
const fallbackLabel = (boxType: string) => boxType.charAt(0) + boxType.slice(1).toLowerCase();

/** "Full Box" / "Half Box" — used in WA messages, Biteship item names, receipts. */
export const boxLabel = (boxType: string) =>
    boxType === 'FULL' ? 'Full Box' : boxType === 'HALF' ? 'Half Box' : fallbackLabel(boxType);

/** "Box Besar" / "Box Kecil" — customer-facing order summaries. */
export const boxLabelID = (boxType: string) =>
    boxType === 'FULL' ? 'Box Besar' : boxType === 'HALF' ? 'Box Kecil' : fallbackLabel(boxType);
