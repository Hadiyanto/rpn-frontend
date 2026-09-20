export interface Menu {
    id: number;
    name: 'FULL' | 'HALF' | 'HAMPERS';
    description?: string;
    price: number;
    is_active: boolean;
    image_url?: string;
    store_ids?: number[];
}

export interface Variant {
    id: number;
    variant_name: string;
    name?: string;
    is_active: boolean;
    image_url?: string;
    store_ids?: number[];
}
