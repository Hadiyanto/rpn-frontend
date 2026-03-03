'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { LuChevronLeft, LuHistory } from 'react-icons/lu';

export default function StockHistoryPage() {
    const router = useRouter();
    const params = useParams();
    const stockId = params.id as string;

    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/stocks/${stockId}/history`);
            const json = await res.json();
            if (json.status === 'ok') {
                setHistory(json.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (stockId) fetchHistory();
    }, [stockId]);

    const formatDate = (isoString: string) => {
        const d = new Date(isoString);
        return d.toLocaleDateString('id-ID', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="bg-brand-yellow min-h-screen font-display text-primary pb-20 p-0 m-0">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-brand-yellow/90 backdrop-blur-md border-b border-primary/10">
                <div className="flex items-center px-4 py-4 gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 text-primary hover:bg-gray-50 transition-colors"
                    >
                        <LuChevronLeft className="text-xl" />
                    </button>
                    <div>
                        <h1 className="text-lg font-extrabold text-primary leading-tight">Riwayat Stok</h1>
                        <p className="text-[10px] font-black uppercase text-primary/50 tracking-wider">Pergerakan Barang</p>
                    </div>
                </div>
            </div>

            {/* Content gap */}
            <div className="p-4 space-y-4">
                {loading ? (
                    <div className="animate-pulse space-y-3">
                        <div className="h-16 bg-white/50 rounded-2xl"></div>
                        <div className="h-16 bg-white/50 rounded-2xl"></div>
                        <div className="h-16 bg-white/50 rounded-2xl"></div>
                    </div>
                ) : history.length === 0 ? (
                    <div className="text-center py-10 bg-white/50 rounded-2xl border border-primary/5">
                        <LuHistory className="mx-auto text-4xl text-primary/20 mb-2" />
                        <p className="text-sm font-medium text-primary/50">Belum ada riwayat stok untuk barang ini.</p>
                    </div>
                ) : (
                    <div className="relative border-l-2 border-primary/10 ml-4 space-y-6">
                        {history.map((h, i) => (
                            <div key={h.id} className="relative pl-6 animate-in fade-in slide-in-from-left-2" style={{ animationDelay: `${i * 50}ms` }}>
                                {/* Timeline Dot */}
                                <div className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-4 border-brand-yellow ${h.type === 'IN' ? 'bg-green-500' : h.type === 'OUT' ? 'bg-red-500' : 'bg-blue-500'
                                    }`}></div>

                                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 flex flex-col gap-2">
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${h.type === 'IN' ? 'bg-green-100 text-green-700' : h.type === 'OUT' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {h.type}
                                            </span>
                                            <p className="text-xs font-bold text-gray-400 mt-1.5">{formatDate(h.created_at)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-lg font-black leading-none ${parseFloat(h.qty_change) > 0 ? 'text-green-600' : 'text-red-500'
                                                }`}>
                                                {parseFloat(h.qty_change) > 0 ? '+' : ''}{h.qty_change}
                                            </p>
                                            <p className="text-[10px] font-bold uppercase text-gray-400 mt-1">
                                                Hasil: {h.final_qty}
                                            </p>
                                        </div>
                                    </div>

                                    {h.notes && (
                                        <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 mt-1">
                                            <p className="text-xs font-medium text-gray-600">{h.notes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
