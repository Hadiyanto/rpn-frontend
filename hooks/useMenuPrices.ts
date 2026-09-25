'use client';

import { useEffect, useState } from 'react';
import { fetchJson } from '@/utils/fetchJson';
import { API_URL } from '@/utils/config';

/**
 * Price per box type from the menu table — the single source for revenue on report pages.
 * Includes inactive/retired rows so older orders keep their revenue; an active row wins over
 * a retired one with the same name.
 */
export function useMenuPrices() {
    const [prices, setPrices] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        fetchJson(`${API_URL}/api/menu`)
            .then(json => {
                if (cancelled || json.status !== 'ok') return;
                const map: Record<string, number> = {};
                [...json.data]
                    .sort((a: { is_active: boolean }, b: { is_active: boolean }) => Number(b.is_active !== false) - Number(a.is_active !== false))
                    .forEach((m: { name: string; price: number }) => { if (map[m.name] === undefined) map[m.name] = Number(m.price); });
                setPrices(map);
            })
            .catch(console.error)
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const priceOf = (boxType: string) => prices[boxType] ?? 0;
    return { prices, priceOf, loading };
}
