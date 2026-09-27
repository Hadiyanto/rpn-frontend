'use client';

import { useEffect, useRef, useState } from 'react';
import { LuX } from 'react-icons/lu';
import type { Variant } from '@/types/menu';
import { cldImage } from '@/utils/image';

/** What "Pilih rasa ini" can do for a flavor right now (decided by the order form). */
export interface PickOption {
    label: string;
    run?: () => void;
    /** Shown but not clickable (e.g. "Sudah dipilih di Item 1"). */
    disabled?: boolean;
}

/**
 * Swipeable photo gallery of the flavors (customer order form). Tapping a photo opens it full
 * screen; there the customer can swipe on and pick the flavor straight into the order.
 * Flavors without a photo are left out. Order: best sellers first, then the catalog order.
 */
export default function FlavorGallery({ variants, bestSellers = [], pickOptions, badgeCount = 3 }: {
    variants: Variant[];
    /** [{ variant_id, sold }] most sold first (empty until there are orders). */
    bestSellers?: { variant_id: number; sold: number }[];
    pickOptions: (variant: Variant) => PickOption[];
    /** How many top sellers get the "Terlaris" badge. */
    badgeCount?: number;
}) {
    const sold = new Map(bestSellers.map(b => [b.variant_id, b.sold]));
    const items = variants
        .filter(v => !!v.image_url)
        .map((v, i) => ({ v, i }))
        .sort((a, b) => (sold.get(b.v.id) ?? 0) - (sold.get(a.v.id) ?? 0) || a.i - b.i)
        .map(x => x.v);
    const topIds = new Set(bestSellers.filter(b => b.sold > 0).slice(0, badgeCount).map(b => b.variant_id));

    const [openAt, setOpenAt] = useState<number | null>(null);
    const [current, setCurrent] = useState(0);
    const stripRef = useRef<HTMLDivElement>(null);

    const onStripScroll = () => {
        const el = stripRef.current;
        if (!el || !el.firstElementChild) return;
        const card = (el.firstElementChild as HTMLElement).offsetWidth + 12;
        setCurrent(Math.min(items.length - 1, Math.round(el.scrollLeft / card)));
    };

    if (items.length === 0) return null;

    return (
        <section className="space-y-2" aria-label="Galeri rasa">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/60">Menu Rasa</span>
                <span className="text-[10px] font-bold text-primary/40 tabular-nums">{current + 1} / {items.length}</span>
            </div>
            <div
                ref={stripRef}
                onScroll={onStripScroll}
                className="-mx-4 px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-4 scrollbar-hide"
            >
                {items.map((v, idx) => (
                    <button
                        key={v.id}
                        type="button"
                        onClick={() => setOpenAt(idx)}
                        className="relative shrink-0 w-[70%] sm:w-[42%] snap-start rounded-2xl overflow-hidden bg-primary/5 border border-primary/10 text-left active:scale-[0.99] transition-transform"
                        aria-label={`Lihat foto ${v.variant_name}`}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={cldImage(v.image_url, 600)} alt={v.variant_name} loading={idx < 2 ? 'eager' : 'lazy'} className="w-full aspect-square object-cover" />
                        {topIds.has(v.id) && <BestSellerBadge />}
                        <span className="absolute inset-x-0 bottom-0 px-3 pt-8 pb-2.5 bg-gradient-to-t from-black/70 to-transparent text-white text-sm font-extrabold">
                            {v.variant_name}
                        </span>
                    </button>
                ))}
            </div>

            {openAt !== null && (
                <Lightbox
                    items={items}
                    startAt={openAt}
                    topIds={topIds}
                    pickOptions={pickOptions}
                    onClose={() => setOpenAt(null)}
                />
            )}
        </section>
    );
}

function BestSellerBadge() {
    return (
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-brand-yellow text-primary text-[10px] font-black uppercase tracking-wide shadow">
            Terlaris
        </span>
    );
}

function Lightbox({ items, startAt, topIds, pickOptions, onClose }: {
    items: Variant[];
    startAt: number;
    topIds: Set<number>;
    pickOptions: (variant: Variant) => PickOption[];
    onClose: () => void;
}) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [index, setIndex] = useState(startAt);
    // After "Pilih rasa ini" with more than one way to add it, the choices are shown here.
    const [choosing, setChoosing] = useState(false);
    const touchStart = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        const el = trackRef.current;
        if (el) el.scrollLeft = startAt * el.clientWidth;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener('keydown', onKey);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onScroll = () => {
        const el = trackRef.current;
        if (!el) return;
        const next = Math.round(el.scrollLeft / el.clientWidth);
        if (next !== index) {
            setIndex(next);
            setChoosing(false);
        }
    };

    const variant = items[index];
    const options = variant ? pickOptions(variant) : [];
    const run = (o: PickOption) => {
        if (o.disabled || !o.run) return;
        o.run();
        onClose();
    };
    const pick = () => {
        const usable = options.filter(o => !o.disabled);
        if (options.length === 1 && usable.length === 1) run(usable[0]);
        else setChoosing(true);
    };

    return (
        <div
            className="fixed inset-0 z-[200] bg-black/95 flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label={variant?.variant_name}
            // Swipe down to close.
            onTouchStart={e => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
            onTouchEnd={e => {
                const s = touchStart.current;
                touchStart.current = null;
                if (!s) return;
                const dy = e.changedTouches[0].clientY - s.y;
                const dx = Math.abs(e.changedTouches[0].clientX - s.x);
                if (dy > 90 && dx < 60) onClose();
            }}
        >
            <div className="flex items-center justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-2 text-white">
                <span className="text-xs font-bold text-white/60 tabular-nums">{index + 1} / {items.length}</span>
                <button type="button" onClick={onClose} className="w-10 h-10 -mr-2 flex items-center justify-center rounded-full hover:bg-white/10" aria-label="Tutup">
                    <LuX className="text-2xl" />
                </button>
            </div>

            <div ref={trackRef} onScroll={onScroll} className="flex-1 flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
                {items.map((v, i) => (
                    <div key={v.id} className="relative shrink-0 w-full h-full snap-center flex items-center justify-center px-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={cldImage(v.image_url, 1200)}
                            alt={v.variant_name}
                            loading={Math.abs(i - startAt) <= 1 ? 'eager' : 'lazy'}
                            className="max-w-full max-h-full object-contain rounded-xl"
                        />
                    </div>
                ))}
            </div>

            {variant && (
                <div className="px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] space-y-3">
                    <div className="flex items-center gap-2 text-white">
                        <h2 className="text-xl font-extrabold">{variant.variant_name}</h2>
                        {topIds.has(variant.id) && <span className="px-2 py-0.5 rounded-full bg-brand-yellow text-primary text-[10px] font-black uppercase">Terlaris</span>}
                    </div>
                    {!choosing ? (
                        <button type="button" onClick={pick} className="w-full h-12 rounded-xl bg-brand-yellow text-primary font-extrabold text-sm active:scale-[0.99]">
                            Pilih rasa ini
                        </button>
                    ) : (
                        <div className="space-y-2">
                            {options.map(o => (
                                <button
                                    key={o.label}
                                    type="button"
                                    disabled={o.disabled}
                                    onClick={() => run(o)}
                                    className={`w-full h-12 rounded-xl font-extrabold text-sm ${o.disabled ? 'bg-white/10 text-white/40' : 'bg-white text-primary active:scale-[0.99]'}`}
                                >
                                    {o.label}
                                </button>
                            ))}
                            <button type="button" onClick={() => setChoosing(false)} className="w-full h-10 text-sm font-bold text-white/60">Batal</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
