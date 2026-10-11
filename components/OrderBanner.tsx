'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchJson } from '@/utils/fetchJson';
import { API_URL } from '@/utils/config';
import { BRAND_NAME } from '@/utils/brand';
import type { Variant } from '@/types/menu';

const LOGO = '/images/android-chrome-512x512.png';
// The logo's own yellow, so the line-art logo blends into the banner.
const BANNER_BG = '#FFD600';

/** Brand banner at the top of the order form (/pesan): logo (→ home) and one flavor photo. */
export default function OrderBanner() {
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
        <div className="relative h-36 sm:h-40 overflow-hidden sm:rounded-t-[28px] flex items-center justify-between gap-3 pl-2 pr-5" style={{ backgroundColor: BANNER_BG }}>
            <Link href="/" aria-label="Beranda" className="h-[150%] shrink-0 -ml-4 -my-[25%]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={LOGO} alt={BRAND_NAME} className="h-full w-auto" />
            </Link>
            {photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.src} alt={photo.name}
                    className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-full object-cover border-4 border-white shadow-lg rotate-6" />
            )}
        </div>
    );
}
