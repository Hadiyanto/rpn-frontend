'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { LuArrowRight, LuChevronLeft, LuChevronRight, LuClock, LuMapPin, LuPhone, LuX, LuZoomIn } from 'react-icons/lu';
import { SiInstagram } from 'react-icons/si';
import { BRAND_NAME, COPY, DELIVERY_APPS, PERKS, SOCIALS, mapsLink, priceLine, rp, shortStoreName, useStorefront, waLink, type Flavor } from './data';

// Storefront design "Levain" — in the spirit of levainbakery.com: cream page, big photos, bold
// headings, mono labels. A gallery only: ordering happens on /pesan.

const HERO_SLIDES = 5;
const SWIPE_PX = 40;

/** Touch handlers calling onSwipe(-1) for a swipe right (previous) and onSwipe(1) for left (next). */
function useSwipe(onSwipe: (step: number) => void) {
    const [startX, setStartX] = useState<number | null>(null);
    return {
        onTouchStart: (e: React.TouchEvent) => setStartX(e.touches[0].clientX),
        onTouchEnd: (e: React.TouchEvent) => {
            if (startX === null) return;
            const dx = e.changedTouches[0].clientX - startX;
            if (Math.abs(dx) > SWIPE_PX) onSwipe(dx < 0 ? 1 : -1);
            setStartX(null);
        },
    };
}
const SLIDE_MS = 5000;

/** Full-bleed hero photos that cross-fade on a timer, with arrows + dots. */
function HeroCarousel({ photos }: { photos: string[] }) {
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const count = photos.length;
    const go = useCallback((step: number) => setIndex(i => (i + step + count) % count), [count]);
    const swipe = useSwipe(go);

    useEffect(() => {
        if (count < 2 || paused) return;
        const t = setInterval(() => go(1), SLIDE_MS);
        return () => clearInterval(t);
    }, [count, paused, go]);

    return (
        <div className="absolute inset-0" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} {...swipe}>
            {photos.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="" loading={i === 0 ? 'eager' : 'lazy'}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${i === index ? 'opacity-100' : 'opacity-0'}`} />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
            {count > 1 && (
                <>
                    <button onClick={() => go(-1)} aria-label="Foto sebelumnya"
                        className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-black/30 hover:bg-black/50 text-white items-center justify-center backdrop-blur">
                        <LuChevronLeft className="text-xl" />
                    </button>
                    <button onClick={() => go(1)} aria-label="Foto berikutnya"
                        className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-black/30 hover:bg-black/50 text-white items-center justify-center backdrop-blur">
                        <LuChevronRight className="text-xl" />
                    </button>
                    <div className="absolute bottom-5 right-4 sm:right-8 z-10 flex gap-2">
                        {photos.map((src, i) => (
                            <button key={src} onClick={() => setIndex(i)} aria-label={`Foto ${i + 1}`}
                                className={`h-2 rounded-full transition-all ${i === index ? 'w-7 bg-brand-yellow' : 'w-2 bg-white/60 hover:bg-white'}`} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

/** Zoomed flavor photo; arrows / ← → move through the photos, Esc or a click outside closes. */
function Lightbox({ items, index, onIndex, onClose }: { items: Flavor[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
    const f = items[index];
    const step = useCallback((d: number) => onIndex((index + d + items.length) % items.length), [index, items.length, onIndex]);
    const swipe = useSwipe(step);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') step(-1);
            if (e.key === 'ArrowRight') step(1);
        };
        document.addEventListener('keydown', onKey);
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
    }, [onClose, step]);

    return (
        <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true" {...swipe}>
            <button onClick={onClose} aria-label="Tutup" className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
                <LuX className="text-xl" />
            </button>
            {items.length > 1 && (
                <>
                    <button onClick={e => { e.stopPropagation(); step(-1); }} aria-label="Sebelumnya"
                        className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
                        <LuChevronLeft className="text-xl" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); step(1); }} aria-label="Berikutnya"
                        className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
                        <LuChevronRight className="text-xl" />
                    </button>
                </>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.image_url!} alt={f.variant_name} onClick={e => e.stopPropagation()}
                className="max-w-full max-h-[78vh] rounded-2xl object-contain shadow-2xl" />
            <div className="mt-4 text-center text-white" onClick={e => e.stopPropagation()}>
                <p className="font-heading font-black text-xl sm:text-2xl">{f.variant_name}</p>
                <p className="mt-1 font-mono text-xs text-white/70">{priceLine(f)}</p>
            </div>
        </div>
    );
}

export default function DesignLevain() {
    const { stores, flavors, photos, minPrice } = useStorefront();
    const storyImage = photos[1] ?? photos[0];
    const zoomable = flavors.filter(f => f.image_url);
    const [zoom, setZoom] = useState<number | null>(null);
    const closeZoom = useCallback(() => setZoom(null), [setZoom]);

    return (
        <div className="min-h-screen bg-[#FBF7EF] text-[#1F2A22] font-sans">
            {/* Announcement */}
            <div className="bg-primary text-brand-yellow text-center py-2 px-4 font-mono text-[11px] uppercase tracking-[0.15em]">
                {COPY.announcement}
            </div>

            {/* Header */}
            <header className="sticky top-0 z-40 bg-[#FBF7EF]/95 backdrop-blur border-b border-[#1F2A22]/10">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
                    <Link href="/" className="font-heading font-black uppercase tracking-tight text-lg sm:text-xl text-primary">{BRAND_NAME}</Link>
                    <nav className="flex items-center gap-1 sm:gap-6 text-sm font-semibold">
                        <a href="#rasa" className="hidden sm:inline hover:text-primary">Rasa</a>
                        <a href="#lokasi" className="hidden sm:inline hover:text-primary">Lokasi</a>
                        <a href={SOCIALS[0].url} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hidden sm:inline text-lg hover:text-primary"><SiInstagram /></a>
                        <Link href="/pesan" className="ml-2 px-4 py-2 rounded-full bg-primary text-brand-yellow font-bold hover:opacity-90">Pesan</Link>
                    </nav>
                </div>
            </header>

            {/* Hero */}
            <section className="relative min-h-[72vh] sm:min-h-[80vh] flex items-end overflow-hidden bg-primary">
                <HeroCarousel photos={photos.slice(0, HERO_SLIDES)} />
                <div className="relative max-w-6xl mx-auto w-full px-4 pb-14 sm:pb-20 text-white pointer-events-none [&_a]:pointer-events-auto">
                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-yellow mb-4">{BRAND_NAME}</p>
                    <h1 className="font-heading font-black text-4xl sm:text-6xl leading-[1.02] max-w-3xl tracking-tight">{COPY.heroTitle}</h1>
                    <p className="mt-5 text-base sm:text-lg max-w-xl text-white/85">{COPY.heroText}</p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link href="/pesan" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-brand-yellow text-primary font-bold hover:opacity-90">
                            Pesan sekarang <LuArrowRight />
                        </Link>
                        <a href="#lokasi" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-white/60 text-white font-bold hover:bg-white/10">
                            Lihat lokasi
                        </a>
                    </div>
                </div>
            </section>

            {/* Perks */}
            <section className="border-b border-[#1F2A22]/10">
                <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {PERKS.map(({ icon: Icon, title, text }) => (
                        <div key={title} className="flex items-start gap-3">
                            <Icon className="text-primary text-2xl shrink-0 mt-0.5" />
                            <div>
                                <p className="font-heading font-bold text-sm uppercase tracking-wide">{title}</p>
                                <p className="text-sm text-[#1F2A22]/65">{text}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Favorites */}
            <section id="rasa" className="max-w-6xl mx-auto px-4 py-16 sm:py-24">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                    <div>
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary/70 mb-2">Menu</p>
                        <h2 className="font-heading font-black text-3xl sm:text-5xl tracking-tight">Rasa favorit</h2>
                        {minPrice !== null && <p className="mt-2 text-[#1F2A22]/65">Mulai {rp(minPrice)} per box</p>}
                    </div>
                </div>

                {flavors.length === 0 ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-square rounded-3xl bg-[#1F2A22]/5 animate-pulse" />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        {flavors.map(f => (
                            <div key={f.id} className="group">
                                <button type="button" disabled={!f.image_url} onClick={() => setZoom(zoomable.indexOf(f))}
                                    aria-label={f.image_url ? `Perbesar foto ${f.variant_name}` : f.variant_name}
                                    className="relative block w-full aspect-square rounded-3xl overflow-hidden bg-[#1F2A22]/5 enabled:cursor-zoom-in">
                                    {f.image_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={f.image_url} alt={f.variant_name} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-brand-yellow/40 p-4">
                                            <span className="font-heading font-black text-primary/70 text-xl sm:text-2xl text-center leading-tight uppercase">{f.variant_name}</span>
                                        </div>
                                    )}
                                    {f.rank < 3 && (
                                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#FBF7EF] font-mono text-[10px] uppercase tracking-wider text-primary">Terlaris</span>
                                    )}
                                    {f.image_url && (
                                        <span className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-[#FBF7EF]/90 text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <LuZoomIn />
                                        </span>
                                    )}
                                </button>
                                <p className="mt-3 font-heading font-bold text-base sm:text-lg leading-tight">{f.variant_name}</p>
                                <p className="mt-1 font-mono text-xs text-[#1F2A22]/65">
                                    {priceLine(f)}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {zoom !== null && zoomable[zoom] && <Lightbox items={zoomable} index={zoom} onIndex={setZoom} onClose={closeZoom} />}

            {/* Story */}
            <section className="bg-primary text-[#FBF7EF]">
                <div className="max-w-6xl mx-auto grid md:grid-cols-2">
                    <div className="relative min-h-[320px] md:min-h-[520px] bg-[#1F2A22]/30">
                        {storyImage && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={storyImage} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                        )}
                    </div>
                    <div className="px-6 py-14 sm:px-12 flex flex-col justify-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-yellow mb-4">Cerita kami</p>
                        <h2 className="font-heading font-black text-3xl sm:text-4xl leading-tight tracking-tight">{COPY.storyTitle}</h2>
                        <p className="mt-5 text-[#FBF7EF]/80 leading-relaxed">{COPY.storyText}</p>
                        <Link href="/pesan" className="mt-8 self-start inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-brand-yellow text-primary font-bold hover:opacity-90">
                            Pilih rasamu <LuArrowRight />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Locations */}
            <section id="lokasi" className="max-w-6xl mx-auto px-4 py-16 sm:py-24">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary/70 mb-2">Kunjungi kami</p>
                <h2 className="font-heading font-black text-3xl sm:text-5xl tracking-tight mb-8">Lokasi</h2>
                <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                    {stores.map(s => {
                        const maps = mapsLink(s);
                        return (
                            <div key={s.id} className="rounded-3xl bg-white p-6 sm:p-8 shadow-[0_1px_0_rgba(31,42,34,0.08)] border border-[#1F2A22]/10 flex flex-col">
                                <h3 className="font-heading font-black text-xl sm:text-2xl tracking-tight">{s.name}</h3>
                                {s.address && <p className="mt-3 flex gap-2 text-[#1F2A22]/75"><LuMapPin className="mt-1 shrink-0 text-primary" />{s.address}</p>}
                                {(s.open_time || s.last_pickup_time) && (
                                    <p className="mt-2 flex gap-2 text-[#1F2A22]/75">
                                        <LuClock className="mt-1 shrink-0 text-primary" />
                                        <span className="font-mono text-sm">{s.open_time ?? '—'} – {s.last_pickup_time ?? '—'}</span>
                                    </p>
                                )}
                                {s.phone && (
                                    <a href={waLink(s.phone)} target="_blank" rel="noopener noreferrer" className="mt-2 flex gap-2 text-[#1F2A22]/75 hover:text-primary">
                                        <LuPhone className="mt-1 shrink-0 text-primary" /><span className="font-mono text-sm">{s.phone}</span>
                                    </a>
                                )}
                                <div className="mt-6 pt-6 border-t border-[#1F2A22]/10 flex flex-wrap gap-3 mt-auto">
                                    <Link href={`/pesan?store=${s.id}`} className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-brand-yellow font-bold text-sm hover:opacity-90">
                                        Pesan di store ini <LuArrowRight />
                                    </Link>
                                    {maps && (
                                        <a href={maps} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-[#1F2A22]/20 font-bold text-sm hover:border-primary">
                                            <LuMapPin /> Google Maps
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* CTA */}
            <section className="bg-brand-yellow">
                <div className="max-w-6xl mx-auto px-4 py-16 text-center">
                    <h2 className="font-heading font-black text-3xl sm:text-5xl tracking-tight text-primary">{COPY.ctaTitle}</h2>
                    <Link href="/pesan" className="mt-8 inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-brand-yellow font-bold hover:opacity-90">
                        Pesan sekarang <LuArrowRight />
                    </Link>
                    {DELIVERY_APPS.length > 0 && (
                        <div className="mt-10">
                            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary/70 mb-4">Atau pesan lewat aplikasi</p>
                            <div className="flex flex-wrap justify-center gap-3">
                                {DELIVERY_APPS.map(({ icon: Icon, label, url }) => (
                                    <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#FBF7EF] text-primary font-bold text-sm border border-primary/15 hover:border-primary">
                                        <Icon className="text-lg" /> {label}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-[#1F2A22] text-[#FBF7EF]/80">
                <div className="max-w-6xl mx-auto px-4 py-12 grid gap-8 sm:grid-cols-3">
                    <div>
                        <p className="font-heading font-black uppercase text-lg text-[#FBF7EF]">{BRAND_NAME}</p>
                        <p className="mt-2 text-sm">{COPY.tagline}</p>
                        <div className="mt-5 flex gap-3">
                            {SOCIALS.map(({ icon: Icon, label, url }) => (
                                <a key={label} href={url} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}
                                    className="w-10 h-10 rounded-full border border-[#FBF7EF]/20 flex items-center justify-center text-[#FBF7EF] hover:bg-[#FBF7EF] hover:text-[#1F2A22] transition-colors">
                                    <Icon className="text-lg" />
                                </a>
                            ))}
                        </div>
                        {DELIVERY_APPS.length > 0 && (
                            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                                {DELIVERY_APPS.map(({ label, url }) => (
                                    <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-[#FBF7EF]">{label}</a>
                                ))}
                            </div>
                        )}
                    </div>
                    {stores.map(s => (
                        <div key={s.id} className="text-sm">
                            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-yellow mb-2">{shortStoreName(s)}</p>
                            {s.address && <p>{s.address}</p>}
                            {s.phone && <p className="mt-1 font-mono">{s.phone}</p>}
                        </div>
                    ))}
                </div>
                <div className="border-t border-[#FBF7EF]/10">
                    <p className="max-w-6xl mx-auto px-4 py-5 font-mono text-[11px] uppercase tracking-[0.15em]">© {new Date().getFullYear()} {BRAND_NAME}</p>
                </div>
            </footer>
        </div>
    );
}
