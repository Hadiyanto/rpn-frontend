'use client';

import { LuTriangleAlert, LuRefreshCw } from 'react-icons/lu';

export default function ErrorState({ reset }: { error?: Error & { digest?: string }; reset: () => void }) {
    return (
        <div className="bg-brand-yellow font-display min-h-screen flex flex-col items-center justify-center p-5 text-center gap-3">
            <LuTriangleAlert className="text-4xl text-red-500" />
            <p className="text-sm font-bold text-primary">Terjadi kesalahan saat memuat halaman.</p>
            <button
                onClick={reset}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-brand-yellow font-bold text-sm rounded-xl active:scale-95 transition-transform"
            >
                <LuRefreshCw size={14} /> Coba Lagi
            </button>
        </div>
    );
}
