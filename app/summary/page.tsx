'use client';

import { useState, useEffect } from 'react';
import {
    LuMenu,
    LuTrendingUp,
    LuTrendingDown,
    LuBanknote,
    LuPackage,
    LuCalendarDays,
    LuLandmark,
    LuActivity,
} from 'react-icons/lu';
import Sidebar from '@/components/Sidebar';
import { useUserRole } from '@/hooks/useUserRole';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface SummaryData {
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    grossMargin: number;
    withdrawableProfit: number;
    netMarginReal: number;
    profitPerBoxReal: number;
    returnToCapital: number;
    totalBoxes: number;
    remainingDebt: number;
}

function formatRupiah(n: number): string {
    return 'Rp ' + n.toLocaleString('id-ID');
}

export default function SummaryPage() {
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [loading, setLoading] = useState(false);
    const [showSidebar, setShowSidebar] = useState(false);
    const userRoleData = useUserRole();

    // Default to current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    const [startDate, setStartDate] = useState<Date>(firstDay);
    const [endDate, setEndDate] = useState<Date>(today);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    const fetchSummary = async () => {
        if (!startDate || !endDate) return;
        setLoading(true);

        // Adjust for timezone offset to get YYYY-MM-DD correctly
        const startStr = new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        const endStr = new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];

        try {
            const res = await fetch(`${apiUrl}/api/finance/summary?start=${startStr}&end=${endStr}`);
            const json = await res.json();
            if (json.status === 'ok') {
                setSummary(json.data);
            } else {
                alert(json.message || 'Gagal memuat data');
            }
        } catch (e) {
            console.error(e);
            alert('Gagal memuat data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate]);

    return (
        <div className="bg-brand-yellow font-display text-primary min-h-screen flex flex-col items-center">
            <div className="relative flex min-h-screen w-full max-w-[480px] flex-col bg-brand-yellow shadow-2xl">
                <Sidebar open={showSidebar} onClose={() => setShowSidebar(false)} allowedPages={userRoleData.allowedPages} userEmail={userRoleData.email} userRole={userRoleData.role} />

                {/* Header */}
                <header className="sticky top-0 z-50 bg-brand-yellow/95 backdrop-blur-md border-b border-primary/10 px-5 pt-5 pb-4 space-y-4">
                    <div className="flex justify-between items-center">
                        <button
                            onClick={() => setShowSidebar(true)}
                            className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center border border-primary/10 shadow-sm"
                        >
                            <LuMenu className="text-primary text-lg" />
                        </button>
                        <h1 className="text-2xl font-extrabold tracking-tight text-primary">Business Summary</h1>
                        <div className="w-10 h-10" />
                    </div>

                    {/* Date Pickers */}
                    <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                            <DatePicker
                                selected={startDate}
                                onChange={(date: Date | null) => date && setStartDate(date)}
                                selectsStart
                                startDate={startDate}
                                endDate={endDate}
                                dateFormat="dd/MM/yyyy"
                                className="w-full h-10 px-3 rounded-xl border border-primary/10 bg-white/60 text-xs font-bold text-primary focus:outline-none focus:border-primary/40 shadow-sm"
                                placeholderText="Start Date"
                            />
                            <LuCalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/40 pointer-events-none" />
                        </div>
                        <span className="text-primary/40 font-black text-xs">-</span>
                        <div className="flex-1 relative">
                            <DatePicker
                                selected={endDate}
                                onChange={(date: Date | null) => date && setEndDate(date)}
                                selectsEnd
                                startDate={startDate}
                                endDate={endDate}
                                minDate={startDate}
                                dateFormat="dd/MM/yyyy"
                                className="w-full h-10 px-3 rounded-xl border border-primary/10 bg-white/60 text-xs font-bold text-primary focus:outline-none focus:border-primary/40 shadow-sm"
                                placeholderText="End Date"
                            />
                            <LuCalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/40 pointer-events-none" />
                        </div>
                    </div>
                </header>

                <main className="flex-1 px-4 py-5 space-y-4 pb-24">
                    {loading && (
                        <div className="flex justify-center pt-20">
                            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        </div>
                    )}

                    {!loading && summary && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">

                            {/* Hero: Gross Profit */}
                            <section className="bg-primary rounded-3xl p-6 shadow-xl relative overflow-hidden text-brand-yellow">
                                <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/5" />
                                <div className="absolute -right-4 -bottom-10 w-24 h-24 rounded-full bg-white/5" />

                                <div className="relative">
                                    <div className="flex items-center gap-2 mb-1">
                                        <LuBanknote className="text-brand-yellow/60 text-sm" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-yellow/60">
                                            Gross Profit
                                        </p>
                                    </div>
                                    <p className="text-4xl font-black leading-tight mt-1 truncate">
                                        {formatRupiah(summary.grossProfit)}
                                    </p>
                                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-yellow/10 rounded-lg">
                                        <LuActivity className="text-brand-yellow/80 text-[10px]" />
                                        <span className="text-xs font-bold text-brand-yellow/90">Margin: {summary.grossMargin}%</span>
                                    </div>
                                </div>
                            </section>

                            {/* Two Cards: Revenue & Cost */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white rounded-3xl p-5 shadow-sm border border-primary/5 relative overflow-hidden">
                                    <div className="absolute right-0 top-0 w-16 h-16 bg-emerald-50 rounded-bl-full -z-0" />
                                    <div className="relative z-10">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-primary/40 mb-1 flex items-center gap-1">
                                            <LuTrendingUp className="text-emerald-500" /> Revenue
                                        </p>
                                        <p className="text-lg font-black text-emerald-600 truncate">{formatRupiah(summary.totalRevenue)}</p>
                                        <p className="text-[10px] font-bold text-primary/40 mt-1">{summary.totalBoxes} Box Terjual</p>
                                    </div>
                                </div>
                                <div className="bg-white rounded-3xl p-5 shadow-sm border border-primary/5 relative overflow-hidden">
                                    <div className="absolute right-0 top-0 w-16 h-16 bg-red-50 rounded-bl-full -z-0" />
                                    <div className="relative z-10">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-primary/40 mb-1 flex items-center gap-1">
                                            <LuTrendingDown className="text-red-400" /> Cost (HPP)
                                        </p>
                                        <p className="text-lg font-black text-red-500 truncate">{formatRupiah(summary.totalCost)}</p>
                                        <p className="text-[10px] font-bold text-primary/40 mt-1">Total Pengeluaran</p>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Real Profitability */}
                            <section className="bg-white/60 rounded-3xl p-1 border border-primary/5 shadow-sm">
                                <div className="bg-white rounded-[20px] p-5">
                                    <div className="flex justify-between items-center mb-4 border-b border-primary/10 pb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                                <LuActivity className="text-sm" />
                                            </div>
                                            <p className="text-sm font-black text-primary uppercase">Real Profit</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-primary/40 mb-0.5">Withdrawable Profit</p>
                                            <p className="text-2xl font-black text-primary">{formatRupiah(summary.withdrawableProfit)}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-primary/40 mb-0.5">Net Margin</p>
                                                <p className="text-lg font-bold text-primary">{summary.netMarginReal}%</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-primary/40 mb-0.5">Profit / Box</p>
                                                <p className="text-lg font-bold text-primary">{formatRupiah(summary.profitPerBoxReal)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Section: Benchmark */}
                            <section className="bg-white/60 rounded-3xl p-1 border border-primary/5 shadow-sm">
                                <div className="bg-white rounded-[20px] p-5 grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <LuLandmark className="text-blue-500 text-sm" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-primary/50">Return to Capital</p>
                                        </div>
                                        <p className="text-xl font-black text-primary">{summary.returnToCapital}%</p>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <LuBanknote className="text-orange-500 text-sm" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-primary/50">Sisa Hutang</p>
                                        </div>
                                        <p className="text-xl font-black text-primary">{formatRupiah(summary.remainingDebt)}</p>
                                    </div>
                                </div>
                            </section>

                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
