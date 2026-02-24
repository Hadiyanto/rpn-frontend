export interface Category {
    entity_id: number;
    parent_id: number;
    name: string;
    image: string;
    subcategories: Category[] | null;
}
