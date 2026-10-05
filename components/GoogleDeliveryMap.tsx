'use client';

import { useCallback, useEffect } from 'react';
import { APIProvider, Map, Marker, useMap, useMapsLibrary, type MapMouseEvent } from '@vis.gl/react-google-maps';
import type { ReverseGeocode } from '@/utils/reverseGeocode';

// Delivery map on Google Maps (Maps JavaScript API, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) — same props as
// LeafletMap. Addresses for a tapped point come from the JS Geocoder: the Geocoding web service
// rejects referrer-restricted keys, the JS service accepts them (billed as Geocoding).
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export const isGoogleMapsAvailable = () => !!API_KEY;

// Map center when the store has no coordinates yet: Jakarta.
const FALLBACK_CENTER = { lat: -6.2, lng: 106.816666 };
const ORIGIN_ICON = 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png';

interface Props {
    /** The store's coordinates (origin of the delivery). */
    originLat?: number | string | null;
    originLng?: number | string | null;
    destLat: number | null;
    destLng: number | null;
    /** Tapped point + how to turn it into an address (Google Geocoder here). */
    onMapClick: (lat: number, lng: number, reverseGeocode: ReverseGeocode) => void;
}

function DeliveryMapContent({ originLat, originLng, destLat, destLng, onMapClick }: Props) {
    const map = useMap();
    const geocoding = useMapsLibrary('geocoding');
    const hasOrigin = originLat != null && originLng != null && originLat !== '' && originLng !== '';
    const origin = hasOrigin ? { lat: Number(originLat), lng: Number(originLng) } : FALLBACK_CENTER;

    // Follow the destination (map tap or address search), like LeafletMap's RecenterOnDest.
    useEffect(() => {
        if (!map || !destLat || !destLng) return;
        map.panTo({ lat: destLat, lng: destLng });
        if ((map.getZoom() ?? 0) < 15) map.setZoom(16);
    }, [map, destLat, destLng]);

    const reverseGeocode = useCallback<ReverseGeocode>(async (lat, lng) => {
        if (!geocoding) return null;
        const { results } = await new geocoding.Geocoder().geocode({ location: { lat, lng } });
        if (!results.length) return null;
        const postal = results.flatMap(r => r.address_components).find(c => c.types.includes('postal_code'));
        return { address: results[0].formatted_address, postalCode: postal ? Number(postal.long_name) : null };
    }, [geocoding]);

    const handleClick = (e: MapMouseEvent) => {
        const latLng = e.detail.latLng;
        if (!latLng) return;
        // Tapping a place icon would open Google's info window; just drop the pin there.
        if (e.detail.placeId) e.stop();
        onMapClick(latLng.lat, latLng.lng, reverseGeocode);
    };

    return (
        <Map
            defaultCenter={origin}
            defaultZoom={13}
            gestureHandling="greedy"
            disableDefaultUI
            zoomControl
            onClick={handleClick}
            style={{ width: '100%', height: '100%' }}
        >
            {hasOrigin && <Marker position={origin} icon={ORIGIN_ICON} title="Toko" />}
            {destLat && destLng && <Marker position={{ lat: destLat, lng: destLng }} title="Lokasi pengiriman" />}
        </Map>
    );
}

export default function GoogleDeliveryMap(props: Props) {
    return (
        <APIProvider apiKey={API_KEY} language="id" region="ID">
            <DeliveryMapContent {...props} />
        </APIProvider>
    );
}
