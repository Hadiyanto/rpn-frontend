'use client';

import { useState, useEffect } from 'react';
import {
    LuMenu,
    LuTrendingUp,
    LuCalendarDays,
    LuPackage,
    LuBanknote,
    LuChevronDown,
    LuChevronUp,
    LuClipboardList,
} from 'react-icons/lu';
import Sidebar from '@/components/Sidebar';
import { useUserRole } from '@/hooks/useUserRole';

interface OrderItem {
    id: number;
    qty: number;
    name: string;
    box_type: 'FULL' | 'HALF';
}

interface Order {
    id: number;
    customer_name: string;
    pickup_date: string;
    pickup_time: string | null;
    note: string | null;
    status: 'UNPAID' | 'PAID' | 'CONFIRMED' | 'DONE';
    payment_method: 'TRANSFER' | 'CASH' | null;
    created_at: string;
    items: OrderItem[];
}

// Fixed prices from menu table
const PRICE: Record<'FULL' | 'HALF', number> = {
    FULL: 65000,
    HALF: 35000,
};

function orderRevenue(order: Order): number {
    return order.items.reduce((sum, i) => sum + i.qty * PRICE[i.box_type], 0);
}

function formatRupiah(n: number): string {
    return 'Rp ' + n.toLocaleString('id-ID');
}

function getTodayStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const DAY_ID: Record<number, string> = {
    0: 'Minggu', 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu',
};

function formatDate(dateStr: string) {
    const date = new Date(`${dateStr}T00:00:00+07:00`);
    const day = DAY_ID[date.getDay()] ?? '';
    return `${day}, ${date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })}`;
}

function formatChipDate(dateStr: string) {
    const date = new Date(`${dateStr}T00:00:00+07:00`);
    const day = DAY_ID[date.getDay()] ?? '';
    return `${day.slice(0, 3)} / ${date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' })}`;
}

const PAYMENT_STYLES: Record<string, string> = {
    TRANSFER: 'bg-blue-100 text-blue-600',
    CASH: 'bg-emerald-100 text-emerald-600',
};

export default function FinancePage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSidebar, setShowSidebar] = useState(false);
    const userRoleData = useUserRole();
    const [activeDate, setActiveDate] = useState<string | 'ALL'>('ALL');
    const [activePayment, setActivePayment] = useState<'ALL' | 'TRANSFER' | 'CASH'>('ALL');
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [showAllOrders, setShowAllOrders] = useState(false);

    useEffect(() => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        fetch(`${apiUrl}/api/orders?status=DONE`)
            .then(r => r.json())
            .then(j => { if (j.status === 'ok') setOrders(j.data); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const doneOrders = orders.filter(o => o.status === 'DONE');

    // Unique dates sorted ASC
    const uniqueDates = Array.from(new Set(doneOrders.map(o => o.pickup_date))).sort();

    // Filtered by selected date + payment method
    const filtered = doneOrders.filter(o => {
        const matchDate = activeDate === 'ALL' || o.pickup_date === activeDate;
        const matchPayment = activePayment === 'ALL' || o.payment_method === activePayment;
        return matchDate && matchPayment;
    });

    // Sort filtered by date + time
    const sortedFiltered = [...filtered].sort((a, b) => {
        const d = a.pickup_date.localeCompare(b.pickup_date);
        if (d !== 0) return d;
        return (a.pickup_time ?? '').localeCompare(b.pickup_time ?? '');
    });

    // Totals for filtered range
    const totalRevenue = filtered.reduce((s, o) => s + orderRevenue(o), 0);
    const totalOrders = filtered.length;
    const totalItems = filtered.reduce((s, o) => s + o.items.reduce((si, i) => si + i.qty, 0), 0);
    const fullBoxCount = filtered.reduce((s, o) => s + o.items.filter(i => i.box_type === 'FULL').reduce((si, i) => si + i.qty, 0), 0);
    const halfBoxCount = filtered.reduce((s, o) => s + o.items.filter(i => i.box_type === 'HALF').reduce((si, i) => si + i.qty, 0), 0);

    // Revenue per date (for chart — respects payment filter)
    const revenueByDate: Record<string, number> = {};
    doneOrders
        .filter(o => activePayment === 'ALL' || o.payment_method === activePayment)
        .forEach(o => {
            revenueByDate[o.pickup_date] = (revenueByDate[o.pickup_date] ?? 0) + orderRevenue(o);
        });
    const revenueByDateArr = Object.entries(revenueByDate).sort(([a], [b]) => a.localeCompare(b));
    const maxRev = Math.max(...revenueByDateArr.map(([, v]) => v), 1);

    // Total overall (all dates)
    const grandTotal = doneOrders.reduce((s, o) => s + orderRevenue(o), 0);

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
                        <h1 className="text-2xl font-extrabold tracking-tight text-primary">Finance</h1>
                        <div className="w-10 h-10" />
                    </div>

                    {/* Date filter chips */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        <button
                            onClick={() => setActiveDate('ALL')}
                            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${activeDate === 'ALL'
                                ? 'bg-primary text-brand-yellow shadow-md'
                                : 'bg-white/60 text-primary/60 border border-primary/10'
                                }`}
                        >
                            Semua
                        </button>
                        {uniqueDates.map(date => (
                            <button
                                key={date}
                                onClick={() => setActiveDate(date)}
                                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${activeDate === date
                                    ? 'bg-primary text-brand-yellow shadow-md'
                                    : 'bg-white/60 text-primary/60 border border-primary/10'
                                    }`}
                            >
                                {formatChipDate(date)}
                            </button>
                        ))}
                    </div>

                    {/* Payment method filter chips */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {(['ALL', 'TRANSFER', 'CASH'] as const).map(pm => {
                            const isActive = activePayment === pm;
                            const chipStyle = isActive && pm !== 'ALL'
                                ? (PAYMENT_STYLES[pm] ?? 'bg-primary text-brand-yellow')
                                : isActive
                                    ? 'bg-primary text-brand-yellow shadow-md'
                                    : 'bg-white/60 text-primary/60 border border-primary/10';
                            const label = pm === 'ALL' ? 'Semua' : pm === 'TRANSFER' ? '💳 Transfer' : '💵 Cash';
                            return (
                                <button
                                    key={pm}
                                    onClick={() => setActivePayment(pm)}
                                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${chipStyle}`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </header>

                <main className="flex-1 px-4 py-5 space-y-4 pb-16">
                    {loading && (
                        <div className="flex justify-center pt-20">
                            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        </div>
                    )}

                    {!loading && doneOrders.length === 0 && (
                        <div className="flex flex-col items-center justify-center pt-24 gap-3 text-primary/40">
                            <LuClipboardList className="text-5xl" />
                            <p className="text-sm font-semibold">Belum ada order DONE</p>
                        </div>
                    )}

                    {!loading && doneOrders.length > 0 && (
                        <>
                            {/* Hero Revenue Card */}
                            <section className="bg-primary rounded-3xl p-6 shadow-xl relative overflow-hidden">
                                {/* decorative circle */}
                                <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/5" />
                                <div className="absolute -right-4 -bottom-10 w-24 h-24 rounded-full bg-white/5" />
                                <div className="relative">
                                    <div className="flex items-center gap-2 mb-1">
                                        <LuBanknote className="text-brand-yellow/60 text-sm" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-yellow/60">
                                            {activeDate === 'ALL' ? 'Total Pemasukan' : `Pemasukan · ${formatChipDate(activeDate)}`}
                                        </p>
                                    </div>
                                    <p className="text-3xl font-black text-brand-yellow leading-tight mt-1">{formatRupiah(totalRevenue)}</p>
                                    <div className="flex gap-4 mt-4">
                                        <div>
                                            <p className="text-[10px] text-brand-yellow/50 font-bold uppercase tracking-wide">Order</p>
                                            <p className="text-xl font-black text-brand-yellow">{totalOrders}</p>
                                        </div>
                                        <div className="w-px bg-brand-yellow/10" />
                                        <div>
                                            <p className="text-[10px] text-brand-yellow/50 font-bold uppercase tracking-wide">Item</p>
                                            <p className="text-xl font-black text-brand-yellow">{totalItems}</p>
                                        </div>
                                        <div className="w-px bg-brand-yellow/10" />
                                        <div>
                                            <p className="text-[10px] text-brand-yellow/50 font-bold uppercase tracking-wide">Full Box</p>
                                            <p className="text-xl font-black text-brand-yellow">{fullBoxCount}</p>
                                        </div>
                                        <div className="w-px bg-brand-yellow/10" />
                                        <div>
                                            <p className="text-[10px] text-brand-yellow/50 font-bold uppercase tracking-wide">Half Box</p>
                                            <p className="text-xl font-black text-brand-yellow">{halfBoxCount}</p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Box Price Reference */}
                            <section className="grid grid-cols-2 gap-3">
                                <div className="bg-white/60 rounded-2xl p-4 border border-primary/10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/40 mb-1">Full Box</p>
                                    <p className="text-lg font-black text-primary">{formatRupiah(PRICE.FULL)}</p>
                                    <p className="text-[10px] text-primary/40 font-semibold mt-0.5">× {fullBoxCount} = <span className="font-black text-primary/70">{formatRupiah(PRICE.FULL * fullBoxCount)}</span></p>
                                </div>
                                <div className="bg-white/60 rounded-2xl p-4 border border-primary/10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/40 mb-1">Half Box</p>
                                    <p className="text-lg font-black text-primary">{formatRupiah(PRICE.HALF)}</p>
                                    <p className="text-[10px] text-primary/40 font-semibold mt-0.5">× {halfBoxCount} = <span className="font-black text-primary/70">{formatRupiah(PRICE.HALF * halfBoxCount)}</span></p>
                                </div>
                            </section>

                            {/* Revenue Per Date Bar Chart */}
                            {revenueByDateArr.length > 1 && (
                                <section className="bg-white/60 rounded-2xl p-5 border border-primary/10">
                                    <div className="flex items-center gap-2 mb-4">
                                        <LuTrendingUp className="text-primary text-base" />
                                        <p className="text-[10px] uppercase tracking-widest text-primary/50 font-black">Pemasukan per Tanggal</p>
                                    </div>
                                    <div className="flex gap-2 items-end h-32">
                                        {revenueByDateArr.map(([date, rev]) => {
                                            const pct = Math.max(Math.round((rev / maxRev) * 100), 4);
                                            const isActive = activeDate === date || activeDate === 'ALL';
                                            const isPeak = rev === maxRev;
                                            return (
                                                <button
                                                    key={date}
                                                    onClick={() => setActiveDate(activeDate === date ? 'ALL' : date)}
                                                    className="flex flex-col items-center gap-1.5 flex-1 h-full justify-end"
                                                >
                                                    {isPeak && (
                                                        <span className="text-[8px] font-black text-primary/60 leading-none">⭐</span>
                                                    )}
                                                    <div
                                                        className={`w-full rounded-t-lg transition-all ${activeDate === date ? 'bg-primary' : isPeak ? 'bg-primary/70' : 'bg-primary/20'}`}
                                                        style={{ height: `${pct}%` }}
                                                    />
                                                    <span className={`text-[8px] font-black leading-none ${activeDate === date ? 'text-primary' : 'text-primary/40'}`}>
                                                        {new Date(`${date}T00:00:00+07:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' })}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}

                            {/* Orders List */}
                            <section className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/40">
                                        {filtered.length} Order DONE {activeDate !== 'ALL' ? `· ${formatChipDate(activeDate)}` : ''}
                                    </p>
                                </div>

                                {sortedFiltered.length === 0 && (
                                    <div className="text-center py-12 text-primary/40">
                                        <LuClipboardList className="text-4xl mx-auto mb-2" />
                                        <p className="text-sm font-semibold">Tidak ada order DONE pada tanggal ini</p>
                                    </div>
                                )}

                                {(showAllOrders ? sortedFiltered : sortedFiltered.slice(0, 2)).map(order => {
                                    const rev = orderRevenue(order);
                                    const isExpanded = expandedId === order.id;
                                    return (
                                        <div
                                            key={order.id}
                                            className="bg-white/70 backdrop-blur-sm rounded-2xl border border-primary/10 overflow-hidden shadow-sm"
                                        >
                                            <button
                                                onClick={() => setExpandedId(isExpanded ? null : order.id)}
                                                className="w-full p-4 flex items-center gap-3 text-left"
                                            >
                                                {/* Left: Customer info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-primary text-sm truncate">{order.customer_name}</p>
                                                        {order.payment_method && (
                                                            <span className={`shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${PAYMENT_STYLES[order.payment_method] ?? 'bg-gray-100 text-gray-500'}`}>
                                                                {order.payment_method}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-primary/50 font-medium flex items-center gap-1 mt-0.5">
                                                        <LuCalendarDays className="text-[11px]" />
                                                        {formatDate(order.pickup_date)}{order.pickup_time ? ` · ${order.pickup_time}` : ''}
                                                    </p>
                                                    <p className="text-[11px] text-primary/40 mt-0.5 truncate">
                                                        {order.items.map(i => `${i.name} ×${i.qty}`).join(', ')}
                                                    </p>
                                                </div>
                                                {/* Right: Revenue */}
                                                <div className="text-right shrink-0">
                                                    <p className="text-base font-black text-primary">{formatRupiah(rev)}</p>
                                                    <p className="text-[10px] text-primary/40 font-semibold">{order.items.reduce((s, i) => s + i.qty, 0)} pcs</p>
                                                </div>
                                                {isExpanded
                                                    ? <LuChevronUp className="text-primary/30 text-sm shrink-0" />
                                                    : <LuChevronDown className="text-primary/30 text-sm shrink-0" />
                                                }
                                            </button>

                                            {/* Expanded detail */}
                                            {isExpanded && (
                                                <div className="border-t border-primary/10 px-4 py-3 bg-primary/5 space-y-2">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/40 mb-2">Rincian</p>
                                                    {order.items.map((item, idx) => (
                                                        <div key={idx} className="flex items-center justify-between text-xs">
                                                            <div className="flex items-center gap-2">
                                                                <LuPackage className="text-primary/40 text-sm shrink-0" />
                                                                <span className="font-semibold text-primary">
                                                                    {item.name}
                                                                    <span className="text-primary/50"> ×{item.qty}</span>
                                                                </span>
                                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${item.box_type === 'FULL' ? 'bg-primary/10 text-primary' : 'bg-primary/5 text-primary/60'}`}>
                                                                    {item.box_type}
                                                                </span>
                                                            </div>
                                                            <span className="font-black text-primary">{formatRupiah(item.qty * PRICE[item.box_type])}</span>
                                                        </div>
                                                    ))}
                                                    <div className="flex justify-between text-xs pt-2 border-t border-primary/10">
                                                        <span className="font-black text-primary/50 uppercase tracking-wide">Total</span>
                                                        <span className="font-black text-primary">{formatRupiah(rev)}</span>
                                                    </div>
                                                    {order.note && (
                                                        <p className="text-[11px] text-primary/50 italic pt-1">📝 {order.note}</p>
                                                    )}
                                                    <p className="text-[10px] text-primary/30 pt-1">Order #{order.id}</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Lihat Semua / Sembunyikan */}
                                {sortedFiltered.length > 2 && (
                                    <button
                                        onClick={() => setShowAllOrders(prev => !prev)}
                                        className="w-full py-3 rounded-2xl border-2 border-dashed border-primary/15 text-xs font-black text-primary/50 uppercase tracking-wider hover:bg-white/40 transition-all active:scale-[0.98]"
                                    >
                                        {showAllOrders ? 'Sembunyikan' : `Lihat Semua (${sortedFiltered.length} order)`}
                                    </button>
                                )}
                            </section>

                            {/* Grand Total footer (only when filtering by date) */}
                            {activeDate !== 'ALL' && (
                                <div className="bg-white/60 rounded-2xl p-4 border border-primary/10 flex items-center justify-between">
                                    <p className="text-xs font-black text-primary/50 uppercase tracking-wide">Semua Waktu</p>
                                    <p className="text-sm font-black text-primary">{formatRupiah(grandTotal)}</p>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
