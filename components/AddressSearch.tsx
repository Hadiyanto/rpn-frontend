'use client';

import { useEffect, useRef, useState } from 'react';
import { LuSearch, LuMapPin, LuX } from 'react-icons/lu';

// Address / place search for the delivery pin — Google Places API (New), called from the browser
// with a referrer-restricted key (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).
// Billing: autocomplete requests inside a session are free when the session ends with a Place
// Details call, which only asks for Essentials fields (location, formattedAddress).
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const PLACES_URL = 'https://places.googleapis.com/v1';

interface Suggestion {
    placeId: string;
    main: string;
    secondary: string;
}

// Subset of the places:autocomplete response we read.
interface PlacePrediction {
    placeId: string;
    text?: { text?: string };
    structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
}

interface Props {
    /** Biases results towards the store, so nearby places come first. */
    biasLat?: number | string | null;
    biasLng?: number | string | null;
    onSelect: (place: { lat: number; lng: number; address: string }) => void;
}

const newSessionToken = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

export const isAddressSearchAvailable = () => !!API_KEY;

export default function AddressSearch({ biasLat, biasLng, onSelect }: Props) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const sessionToken = useRef<string | null>(null);
    // Skip the lookup triggered by filling the input with the picked suggestion.
    const justPicked = useRef(false);

    useEffect(() => {
        if (justPicked.current) {
            justPicked.current = false;
            return;
        }
        const input = query.trim();
        if (input.length < 3) {
            setSuggestions([]);
            return;
        }
        sessionToken.current ??= newSessionToken();
        let cancelled = false;
        const timeoutId = setTimeout(async () => {
            setLoading(true);
            setError('');
            try {
                const hasBias = biasLat != null && biasLng != null && biasLat !== '' && biasLng !== '';
                const res = await fetch(`${PLACES_URL}/places:autocomplete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': API_KEY },
                    body: JSON.stringify({
                        input,
                        sessionToken: sessionToken.current,
                        includedRegionCodes: ['id'],
                        languageCode: 'id',
                        ...(hasBias ? {
                            locationBias: { circle: { center: { latitude: Number(biasLat), longitude: Number(biasLng) }, radius: 30000 } },
                        } : {}),
                    }),
                });
                const json = await res.json();
                if (cancelled) return;
                if (!res.ok) throw new Error(json?.error?.message || `HTTP ${res.status}`);
                const predictions: PlacePrediction[] = (json.suggestions ?? [])
                    .map((s: { placePrediction?: PlacePrediction }) => s.placePrediction)
                    .filter(Boolean);
                setSuggestions(predictions.map(p => ({
                        placeId: p.placeId,
                        main: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
                        secondary: p.structuredFormat?.secondaryText?.text ?? '',
                    })));
            } catch (err) {
                console.error('Places autocomplete failed:', err);
                if (!cancelled) {
                    setSuggestions([]);
                    setError('Pencarian alamat sedang tidak tersedia. Silakan tandai lokasi langsung di peta.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, 350);
        return () => { cancelled = true; clearTimeout(timeoutId); };
    }, [query, biasLat, biasLng]);

    const pick = async (s: Suggestion) => {
        setSuggestions([]);
        setLoading(true);
        setError('');
        try {
            // Ends the session: Essentials fields only (location + formattedAddress).
            const params = new URLSearchParams({ languageCode: 'id', ...(sessionToken.current ? { sessionToken: sessionToken.current } : {}) });
            const res = await fetch(`${PLACES_URL}/places/${encodeURIComponent(s.placeId)}?${params}`, {
                headers: { 'X-Goog-Api-Key': API_KEY, 'X-Goog-FieldMask': 'location,formattedAddress' },
            });
            const json = await res.json();
            if (!res.ok || !json.location) throw new Error(json?.error?.message || `HTTP ${res.status}`);
            justPicked.current = true;
            setQuery(s.main);
            onSelect({
                lat: json.location.latitude,
                lng: json.location.longitude,
                address: json.formattedAddress || [s.main, s.secondary].filter(Boolean).join(', '),
            });
        } catch (err) {
            console.error('Places details failed:', err);
            setError('Gagal mengambil lokasi. Silakan coba lagi atau tandai lokasi di peta.');
        } finally {
            sessionToken.current = null;
            setLoading(false);
        }
    };

    if (!API_KEY) return null;

    return (
        <div className="relative">
            <div className="relative">
                <LuSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-primary/40" />
                <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Cari alamat, gedung, atau tempat..."
                    className="w-full h-11 pl-10 pr-10 rounded-xl border-2 border-primary/10 bg-primary/5 text-primary text-sm font-medium focus:outline-none focus:border-primary/30"
                />
                {query && (
                    <button type="button" onClick={() => { setQuery(''); setSuggestions([]); setError(''); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-primary/40 hover:text-primary" aria-label="Hapus pencarian">
                        <LuX />
                    </button>
                )}
            </div>
            {loading && <p className="text-[11px] text-primary/50 font-medium mt-1.5 px-1">Mencari...</p>}
            {error && <p className="text-[11px] text-red-600 font-semibold mt-1.5 px-1">{error}</p>}
            {suggestions.length > 0 && (
                <div className="absolute z-[500] left-0 right-0 mt-1 bg-white rounded-xl border-2 border-primary/10 shadow-xl overflow-hidden max-h-72 overflow-y-auto">
                    {suggestions.map(s => (
                        <button key={s.placeId} type="button" onClick={() => pick(s)}
                            className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-primary/5 border-b border-primary/5 last:border-b-0">
                            <LuMapPin className="text-primary/40 mt-0.5 shrink-0" size={14} />
                            <span className="min-w-0">
                                <span className="block text-sm font-bold text-primary truncate">{s.main}</span>
                                {s.secondary && <span className="block text-[11px] text-primary/50 truncate">{s.secondary}</span>}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
