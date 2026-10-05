// Snapshot of a delivery point — Maps Static API with the same browser key as the map/search.
// Billed per image (10k free/month), so it is only rendered on the review step.
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

/** Static map image URL centered on the point with a red pin; null without a Google key. */
export const staticMapUrl = (lat: number, lng: number, { width = 600, height = 260, zoom = 16 } = {}) => {
    if (!API_KEY) return null;
    const params = new URLSearchParams({
        center: `${lat},${lng}`,
        zoom: String(zoom),
        size: `${width}x${height}`,
        scale: '2',
        language: 'id',
        region: 'ID',
        markers: `color:red|${lat},${lng}`,
        key: API_KEY,
    });
    return `https://maps.googleapis.com/maps/api/staticmap?${params}`;
};
