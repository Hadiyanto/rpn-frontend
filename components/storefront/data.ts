'use client';

// Shared content + data for the storefront (/). Content is fixed here for now;
// the CMS (Config → Storefront) replaces it later.

import { useEffect, useMemo, useState } from 'react';
import { LuFlame, LuStore, LuWallet, LuLayers } from 'react-icons/lu';
import { SiGojek, SiGrab, SiInstagram, SiShopee, SiThreads } from 'react-icons/si';
import { fetchJson } from '@/utils/fetchJson';
import { API_URL } from '@/utils/config';
import { BRAND_NAME } from '@/utils/brand';
import type { Store, Variant } from '@/types/menu';

export { BRAND_NAME };

export const COPY = {
    announcement: 'Pesan online · ambil di toko atau dikirim ke rumah',
    heroTitle: 'Pisang nugget, digoreng saat kamu pesan.',
    heroText: 'Pisang pilihan, adonan renyah, topping melimpah. Pilih rasamu, campur sampai tiga dalam satu box.',
    storyTitle: 'Dibuat kecil-kecilan, dengan serius.',
    storyText: 'Setiap box kami siapkan di dapur toko pada hari yang sama: pisang dipotong, dibalut, digoreng, lalu diberi topping tepat sebelum kamu ambil. Tanpa stok kemarin.',
    ctaTitle: 'Lagi pengen pisang nugget?',
    tagline: 'Pisang nugget fresh setiap hari.',
};

export const PERKS = [
    { icon: LuFlame, title: 'Fresh setiap hari', text: 'Digoreng di hari pengambilan' },
    { icon: LuLayers, title: 'Campur rasa', text: 'Sampai 3 rasa di Box Besar' },
    { icon: LuStore, title: 'Ambil atau kirim', text: 'Pickup di toko atau diantar' },
    { icon: LuWallet, title: 'Bayar mudah', text: 'QRIS, transfer, atau tunai' },
];

export const SOCIALS = [
    { icon: SiInstagram, label: 'Instagram', url: 'https://www.instagram.com/rajapisangnugget/' },
    { icon: SiThreads, label: 'Threads', url: 'https://www.threads.com/@rajapisangnugget' },
];

/** Delivery apps; an entry without url is hidden. */
export const DELIVERY_APPS = [
    { icon: SiGojek, label: 'GoFood', url: 'https://gofood.link/u/g3k97' },
    { icon: SiGrab, label: 'GrabFood', url: 'https://app.grab.com/s/C58FBzmd' },
    { icon: SiShopee, label: 'ShopeeFood', url: '' },
].filter(a => a.url);

export const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
const toNum = (v: number | string | null | undefined) => (v === null || v === undefined || v === '' ? null : Number(v));

export const mapsLink = (s: Store) => s.maps_url
    || (s.latitude != null && s.longitude != null ? `https://www.google.com/maps/search/?api=1&query=${Number(s.latitude)},${Number(s.longitude)}` : null);

export const waLink = (phone: string) => {
    let p = phone.replace(/\D/g, '');
    if (p.startsWith('0')) p = `62${p.slice(1)}`;
    return `https://wa.me/${p}`;
};

/** "Raja Pisang Nugget Kalibata" → "Kalibata". */
export const shortStoreName = (s: Store) => s.name.replace(BRAND_NAME, '').trim() || s.name;

/** "Kecil Rp 32.500 · Besar Rp 60.000" — "mulai" when the stores charge different prices. */
export const priceLine = (f: Flavor) => {
    const from = f.varies ? 'mulai ' : '';
    return [f.half !== null ? `Kecil ${from}${rp(f.half)}` : null, f.full !== null ? `Besar ${from}${rp(f.full)}` : null].filter(Boolean).join(' · ');
};

/** A flavor across all stores: lowest price per size, `varies` when stores differ, sales rank. */
export type Flavor = Variant & { half: number | null; full: number | null; varies: boolean; rank: number };

const minOf = (xs: (number | null)[]) => {
    const n = xs.filter((x): x is number => x !== null);
    return n.length ? Math.min(...n) : null;
};
const differ = (xs: (number | null)[]) => new Set(xs.filter(x => x !== null)).size > 1;

/** Stores and all flavors sold at any store (with photo first, then best sellers). */
export function useStorefront() {
    const [stores, setStores] = useState<Store[]>([]);
    const [variants, setVariants] = useState<Variant[]>([]);
    const [sold, setSold] = useState<Map<number, number>>(new Map());

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const [s, v] = await Promise.all([
                fetchJson(`${API_URL}/api/stores`).catch(() => ({ data: [] })),
                fetchJson(`${API_URL}/api/variants`).catch(() => ({ data: [] })),
            ]);
            if (cancelled) return;
            const list: Store[] = s.data ?? [];
            setStores(list);
            setVariants(v.data ?? []);
            // Best sellers summed over all stores.
            const per = await Promise.all(list.map(st =>
                fetchJson(`${API_URL}/api/variants/best-sellers?store_id=${st.id}`).catch(() => ({ data: [] }))));
            if (cancelled) return;
            const total = new Map<number, number>();
            per.forEach(r => (r.data ?? []).forEach((b: { variant_id: number; sold: number }) =>
                total.set(b.variant_id, (total.get(b.variant_id) ?? 0) + Number(b.sold))));
            setSold(total);
        })();
        return () => { cancelled = true; };
    }, []);

    const flavors = useMemo<Flavor[]>(() => {
        const storeIds = new Set(stores.map(s => String(s.id)));
        const rank = new Map([...sold.entries()].sort((a, b) => b[1] - a[1]).map(([id], i) => [id, i]));
        return variants
            .filter(v => v.is_active)
            .map(v => {
                const prices = Object.entries(v.prices ?? {}).filter(([id]) => storeIds.has(id)).map(([, p]) => p);
                const halves = prices.map(p => toNum(p.price_half));
                const fulls = prices.map(p => toNum(p.price_full));
                return { ...v, half: minOf(halves), full: minOf(fulls), varies: differ(halves) || differ(fulls), rank: rank.get(v.id) ?? 999 };
            })
            .filter(v => v.half !== null || v.full !== null)
            .sort((a, b) => Number(!a.image_url) - Number(!b.image_url) || a.rank - b.rank || a.variant_name.localeCompare(b.variant_name));
    }, [variants, sold, stores]);

    /** Flavor photos, best sellers first — the only photos we have for now. */
    const photos = flavors.map(f => f.image_url).filter((u): u is string => !!u);
    const minPrice = minOf(flavors.map(f => minOf([f.half, f.full])));

    return { stores, flavors, photos, minPrice };
}
