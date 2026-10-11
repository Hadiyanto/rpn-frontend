'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LuStore } from 'react-icons/lu';
import { fetchJson } from '@/utils/fetchJson';
import { API_URL } from '@/utils/config';
import { BRAND_NAME } from '@/utils/brand';
import type { Variant } from '@/types/menu';

const LOGO = '/images/android-chrome-512x512.png';
// The logo's own yellow, so the line-art logo blends into the banner.
const BANNER_BG = '#FFD600';

/** Brand banner at the top of the order form (/pesan): logo, one flavor photo, store count. */
export default function OrderBanner({ storeCount }: { storeCount: number }) {
    const [photo, setPhoto] = useState<{ src: string; name: string } | null>(null);

    useEffect(() => {
        fetchJson(`${API_URL}/api/variants`)
            .then(json => {
                const v = (json.data as Variant[] | undefined)?.find(x => x.is_active && x.image_url);
                if (v) setPhoto({ src: v.image_url!, name: v.variant_name });
            })
            .catch(() => {});
    }, []);

    return (
        <div>
            <div className="relative h-36 sm:h-40 overflow-hidden sm:rounded-t-[28px] flex items-center justify-between gap-3 pl-2 pr-5" style={{ backgroundColor: BANNER_BG }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={LOGO} alt={BRAND_NAME} className="h-[150%] w-auto shrink-0 -ml-4 -my-[25%]" />
                {photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo.src} alt={photo.name}
                        className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-full object-cover border-4 border-white shadow-lg rotate-6" />
                )}
            </div>
            <div className="flex items-center gap-3 px-5 pt-4 pb-1">
                <Link href="/" className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 shadow-sm border border-primary/10" aria-label="Beranda">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={LOGO} alt="" className="w-full h-full object-cover" />
                </Link>
                <div className="min-w-0">
                    <p className="font-heading font-black text-lg text-primary leading-tight">{BRAND_NAME}</p>
                    {storeCount > 0 && (
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-primary/70">
                            <span className="w-5 h-5 rounded-full bg-brand-yellow/50 flex items-center justify-center"><LuStore className="text-[11px] text-primary" /></span>
                            <b className="text-primary">{storeCount}</b> store
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
