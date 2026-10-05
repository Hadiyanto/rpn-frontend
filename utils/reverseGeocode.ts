/** Turns a map point into an address; null when nothing was found. */
export type ReverseGeocode = (lat: number, lng: number) => Promise<{ address: string; postalCode: number | null } | null>;

/** OpenStreetMap Nominatim — used with the Leaflet map (no Google key). */
export const nominatimReverseGeocode: ReverseGeocode = async (lat, lng) => {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=id`);
    const json = await r.json();
    if (!json.display_name) return null;
    return { address: json.display_name, postalCode: json.address?.postcode ? Number(json.address.postcode) : null };
};
