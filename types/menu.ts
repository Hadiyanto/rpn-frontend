export type BoxType = 'FULL' | 'HALF';

export interface Menu {
    id: number;
    name: BoxType;
    description?: string;
    price: number;
    is_active: boolean;
    image_url?: string;
    store_ids?: number[];
    /** Share of a FULL-box recipe one box uses (HALF = 0.5). */
    box_multiplier?: number;
    /** How many different flavors may be mixed in one box (HALF 1, FULL up to 3). */
    max_flavors?: number;
    /** Shipping size & weight per box (used for delivery rates). */
    weight_gram?: number | null;
    length_cm?: number | null;
    width_cm?: number | null;
    height_cm?: number | null;
}

export interface Variant {
    id: number;
    variant_name: string;
    name?: string;
    is_active: boolean;
    image_url?: string;
    /** Stores where the flavor is sold. Only stores in `recipe_store_ids` are allowed. */
    store_ids?: number[];
    /** Stores that have a recipe for this flavor. */
    recipe_store_ids?: number[];
}

export interface Store {
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
    area_id: string | null;
    latitude: number | null;
    longitude: number | null;
    open_time: string | null;
    is_active: boolean;
    bank_name: string | null;
    bank_account_number: string | null;
    bank_account_name: string | null;
    qris_image_url: string | null;
}
