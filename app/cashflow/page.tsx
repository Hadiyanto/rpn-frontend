'use client';

import { useState, useEffect } from 'react';
import {
    LuMenu,
    LuTrendingUp,
    LuTrendingDown,
    LuCalendarDays,
    LuBanknote,
    LuClipboardList,
    LuPlus,
    LuX,
    LuChevronDown,
    LuChevronUp,
    LuPackage,
    LuReceipt,
} from 'react-icons/lu';
import Sidebar from '@/components/Sidebar';
import { useUserRole } from '@/hooks/useUserRole';

/* ─── Interfaces ────────────────────────────────────────────────────── */

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

interface Pengeluaran {
    id: number;
    name: string;
    category: string | null;
    price: number;
    date: string;
    receipt_image_url: string | null;
    created_at: string;
}

/* ─── Helpers ───────────────────────────────────────────────────────── */

const PRICE: Record<'FULL' | 'HALF', number> = { FULL: 65000, HALF: 35000 };

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

const EXPENSE_CATEGORIES = ['Bahan Baku', 'Operasional', 'Gaji', 'Packaging', 'Transportasi', 'Lainnya'];

/* ─── Component ─────────────────────────────────────────────────────── */

export default function CashflowPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [expenses, setExpenses] = useState<Pengeluaran[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSidebar, setShowSidebar] = useState(false);
    const userRoleData = useUserRole();
    const [activeDate, setActiveDate] = useState<string | 'ALL'>('ALL');
    const [activeTab, setActiveTab] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
    const [showAllItems, setShowAllItems] = useState(false);

    // Bottom sheet: add expense
    const [showSheet, setShowSheet] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [expForm, setExpForm] = useState({
        name: '',
        category: '',
        price: '',
        date: getTodayStr(),
    });

    const resetExpForm = () => setExpForm({ name: '', category: '', price: '', date: getTodayStr() });

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    useEffect(() => {
        Promise.all([
            fetch(`${apiUrl}/api/orders`).then(r => r.json()),
            fetch(`${apiUrl}/api/pengeluaran`).then(r => r.json()),
        ])
            .then(([ojson, pjson]) => {
                if (ojson.status === 'ok') setOrders(ojson.data);
                if (pjson.status === 'ok') setExpenses(pjson.data);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const submitExpense = async () => {
        if (!expForm.name.trim()) { alert('Nama pengeluaran wajib diisi'); return; }
        if (!expForm.price || Number(expForm.price) <= 0) { alert('Harga harus > 0'); return; }
        setSubmitting(true);
        try {
            const res = await fetch(`${apiUrl}/api/pengeluaran`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: expForm.name.trim(),
                    category: expForm.category || null,
                    price: Number(expForm.price),
                    date: expForm.date || getTodayStr(),
                }),
            });
            const json = await res.json();
            if (json.status === 'ok') {
                // Refresh expenses
                const res2 = await fetch(`${apiUrl}/api/pengeluaran`);
                const json2 = await res2.json();
                if (json2.status === 'ok') setExpenses(json2.data);
                setShowSheet(false);
                resetExpForm();
            } else {
                alert(json.message || 'Gagal submit pengeluaran');
            }
        } catch {
            alert('Gagal submit pengeluaran');
        } finally {
            setSubmitting(false);
        }
    };

    /* ─── Data Processing ───────────────────────────────────────────── */

    const doneOrders = orders.filter(o => o.status === 'DONE');

    // All unique dates from both sources
    const allDates = Array.from(new Set([
        ...doneOrders.map(o => o.pickup_date),
        ...expenses.map(e => e.date),
    ])).sort();

    // Filtered by date
    const filteredOrders = activeDate === 'ALL' ? doneOrders : doneOrders.filter(o => o.pickup_date === activeDate);
    const filteredExpenses = activeDate === 'ALL' ? expenses : expenses.filter(e => e.date === activeDate);

    const totalIncome = filteredOrders.reduce((s, o) => s + orderRevenue(o), 0);
    const totalExpense = filteredExpenses.reduce((s, e) => s + Number(e.price), 0);
    const netCashflow = totalIncome - totalExpense;

    // Build combined timeline
    type TimelineItem =
        | { type: 'income'; order: Order; amount: number; date: string }
        | { type: 'expense'; expense: Pengeluaran; amount: number; date: string };

    const timeline: TimelineItem[] = [];

    if (activeTab !== 'EXPENSE') {
        filteredOrders.forEach(o => {
            timeline.push({ type: 'income', order: o, amount: orderRevenue(o), date: o.pickup_date });
        });
    }
    if (activeTab !== 'INCOME') {
        filteredExpenses.forEach(e => {
            timeline.push({ type: 'expense', expense: e, amount: Number(e.price), date: e.date });
        });
    }

    timeline.sort((a, b) => b.date.localeCompare(a.date)); // newest first

    const visibleTimeline = showAllItems ? timeline : timeline.slice(0, 4);

    // Per-date chart data
    const dateMap: Record<string, { income: number; expense: number }> = {};
    doneOrders.forEach(o => {
        if (!dateMap[o.pickup_date]) dateMap[o.pickup_date] = { income: 0, expense: 0 };
        dateMap[o.pickup_date].income += orderRevenue(o);
    });
    expenses.forEach(e => {
        if (!dateMap[e.date]) dateMap[e.date] = { income: 0, expense: 0 };
        dateMap[e.date].expense += Number(e.price);
    });
    const chartData = Object.entries(dateMap).sort(([a], [b]) => a.localeCompare(b));
    const maxChart = Math.max(...chartData.map(([, v]) => Math.max(v.income, v.expense)), 1);

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
                        <h1 className="text-2xl font-extrabold tracking-tight text-primary">Cash Flow</h1>
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
                        {allDates.map(date => (
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
                </header>

                <main className="flex-1 px-4 py-5 space-y-4 pb-24">
                    {loading && (
                        <div className="flex justify-center pt-20">
                            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        </div>
                    )}

                    {!loading && doneOrders.length === 0 && expenses.length === 0 && (
                        <div className="flex flex-col items-center justify-center pt-24 gap-3 text-primary/40">
                            <LuClipboardList className="text-5xl" />
                            <p className="text-sm font-semibold">Belum ada data</p>
                        </div>
                    )}

                    {!loading && (doneOrders.length > 0 || expenses.length > 0) && (
                        <>
                            {/* Hero Card */}
                            <section className="bg-primary rounded-3xl p-6 shadow-xl relative overflow-hidden">
                                <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/5" />
                                <div className="absolute -right-4 -bottom-10 w-24 h-24 rounded-full bg-white/5" />
                                <div className="relative">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-yellow/50 mb-1">
                                        {activeDate === 'ALL' ? 'Total Cash Flow' : `Cash Flow · ${formatChipDate(activeDate)}`}
                                    </p>
                                    <p className={`text-3xl font-black leading-tight mt-1 ${netCashflow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {netCashflow >= 0 ? '+' : ''}{formatRupiah(netCashflow)}
                                    </p>
                                    <div className="flex gap-4 mt-4">
                                        <div>
                                            <div className="flex items-center gap-1 mb-0.5">
                                                <LuTrendingUp className="text-emerald-400 text-xs" />
                                                <p className="text-[9px] text-brand-yellow/50 font-bold uppercase">Pemasukan</p>
                                            </div>
                                            <p className="text-lg font-black text-emerald-400">{formatRupiah(totalIncome)}</p>
                                        </div>
                                        <div className="w-px bg-brand-yellow/10" />
                                        <div>
                                            <div className="flex items-center gap-1 mb-0.5">
                                                <LuTrendingDown className="text-red-400 text-xs" />
                                                <p className="text-[9px] text-brand-yellow/50 font-bold uppercase">Pengeluaran</p>
                                            </div>
                                            <p className="text-lg font-black text-red-400">{formatRupiah(totalExpense)}</p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Summary Cards */}
                            <section className="grid grid-cols-3 gap-3">
                                <div className="bg-white/60 rounded-2xl p-4 border border-primary/10 text-center">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-primary/40 mb-1">Order Done</p>
                                    <p className="text-2xl font-black text-primary">{filteredOrders.length}</p>
                                </div>
                                <div className="bg-white/60 rounded-2xl p-4 border border-primary/10 text-center">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-primary/40 mb-1">Pengeluaran</p>
                                    <p className="text-2xl font-black text-primary">{filteredExpenses.length}</p>
                                </div>
                                <div className="bg-white/60 rounded-2xl p-4 border border-primary/10 text-center">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-primary/40 mb-1">Margin</p>
                                    <p className={`text-2xl font-black ${totalIncome > 0 ? (netCashflow >= 0 ? 'text-emerald-600' : 'text-red-500') : 'text-primary/30'}`}>
                                        {totalIncome > 0 ? `${Math.round((netCashflow / totalIncome) * 100)}%` : '—'}
                                    </p>
                                </div>
                            </section>

                            {/* Chart */}
                            {chartData.length > 1 && (
                                <section className="bg-white/60 rounded-2xl p-5 border border-primary/10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/50 mb-4">Pemasukan vs Pengeluaran</p>
                                    <div className="flex gap-2 items-end h-32">
                                        {chartData.map(([date, { income, expense }]) => {
                                            const incPct = Math.max(Math.round((income / maxChart) * 100), 2);
                                            const expPct = Math.max(Math.round((expense / maxChart) * 100), 2);
                                            const isActive = activeDate === date;
                                            return (
                                                <button
                                                    key={date}
                                                    onClick={() => setActiveDate(activeDate === date ? 'ALL' : date)}
                                                    className="flex flex-col items-center gap-1 flex-1 h-full justify-end"
                                                >
                                                    <div className="flex gap-0.5 items-end w-full h-full">
                                                        <div
                                                            className={`flex-1 rounded-t-md transition-all ${isActive ? 'bg-emerald-500' : 'bg-emerald-500/30'}`}
                                                            style={{ height: `${incPct}%` }}
                                                        />
                                                        <div
                                                            className={`flex-1 rounded-t-md transition-all ${isActive ? 'bg-red-400' : 'bg-red-400/30'}`}
                                                            style={{ height: `${expPct}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-[7px] font-black leading-none ${isActive ? 'text-primary' : 'text-primary/40'}`}>
                                                        {new Date(`${date}T00:00:00+07:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' })}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="flex items-center gap-4 mt-3 justify-center">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                                            <span className="text-[9px] font-bold text-primary/50">Pemasukan</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-sm bg-red-400" />
                                            <span className="text-[9px] font-bold text-primary/50">Pengeluaran</span>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Tab Filter */}
                            <div className="flex gap-2">
                                {(['ALL', 'INCOME', 'EXPENSE'] as const).map(tab => {
                                    const labels = { ALL: 'Semua', INCOME: '↗ Pemasukan', EXPENSE: '↘ Pengeluaran' };
                                    const isActive = activeTab === tab;
                                    return (
                                        <button
                                            key={tab}
                                            onClick={() => { setActiveTab(tab); setShowAllItems(false); }}
                                            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${isActive
                                                ? 'bg-primary text-brand-yellow shadow-md'
                                                : 'bg-white/60 text-primary/50 border border-primary/10'
                                                }`}
                                        >
                                            {labels[tab]}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Timeline */}
                            <section className="space-y-3">
                                {timeline.length === 0 && (
                                    <div className="text-center py-12 text-primary/40">
                                        <LuClipboardList className="text-4xl mx-auto mb-2" />
                                        <p className="text-sm font-semibold">Tidak ada data</p>
                                    </div>
                                )}

                                {visibleTimeline.map((item, idx) => (
                                    <div
                                        key={`${item.type}-${item.type === 'income' ? item.order.id : item.expense.id}-${idx}`}
                                        className="bg-white/70 backdrop-blur-sm rounded-2xl border border-primary/10 p-4 flex items-center gap-3"
                                    >
                                        {/* Icon */}
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.type === 'income'
                                            ? 'bg-emerald-100 text-emerald-600'
                                            : 'bg-red-100 text-red-500'
                                            }`}>
                                            {item.type === 'income' ? <LuPackage className="text-base" /> : <LuReceipt className="text-base" />}
                                        </div>
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-primary truncate">
                                                {item.type === 'income' ? item.order.customer_name : item.expense.name}
                                            </p>
                                            <p className="text-[11px] text-primary/50 font-medium flex items-center gap-1 mt-0.5">
                                                <LuCalendarDays className="text-[10px]" />
                                                {formatChipDate(item.date)}
                                                {item.type === 'income' && item.order.pickup_time ? ` · ${item.order.pickup_time}` : ''}
                                                {item.type === 'expense' && item.expense.category ? ` · ${item.expense.category}` : ''}
                                            </p>
                                        </div>
                                        {/* Amount */}
                                        <p className={`text-sm font-black shrink-0 ${item.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {item.type === 'income' ? '+' : '−'}{formatRupiah(item.amount)}
                                        </p>
                                    </div>
                                ))}

                                {/* Lihat Semua */}
                                {timeline.length > 4 && (
                                    <button
                                        onClick={() => setShowAllItems(prev => !prev)}
                                        className="w-full py-3 rounded-2xl border-2 border-dashed border-primary/15 text-xs font-black text-primary/50 uppercase tracking-wider hover:bg-white/40 transition-all active:scale-[0.98]"
                                    >
                                        {showAllItems ? 'Sembunyikan' : `Lihat Semua (${timeline.length})`}
                                    </button>
                                )}
                            </section>
                        </>
                    )}
                </main>

                {/* FAB: Add Pengeluaran */}
                <button
                    onClick={() => { resetExpForm(); setShowSheet(true); }}
                    className="fixed bottom-8 right-6 w-14 h-14 bg-primary text-brand-yellow rounded-2xl shadow-xl flex items-center justify-center active:scale-90 transition-transform z-40"
                >
                    <LuPlus className="text-2xl font-black" />
                </button>

                {/* Bottom Sheet: Add Expense */}
                {showSheet && (
                    <div className="fixed inset-0 z-50 flex flex-col justify-end">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowSheet(false); resetExpForm(); }} />

                        <div className="relative bg-white rounded-t-3xl max-h-[85vh] flex flex-col w-full max-w-[480px] mx-auto shadow-2xl">
                            <div className="flex justify-center pt-3 pb-1">
                                <div className="w-10 h-1 bg-primary/20 rounded-full" />
                            </div>

                            <div className="flex items-center justify-between px-5 py-3 border-b border-primary/10">
                                <h2 className="text-base font-extrabold text-primary">Tambah Pengeluaran</h2>
                                <button onClick={() => { setShowSheet(false); resetExpForm(); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10">
                                    <LuX className="text-primary text-sm" />
                                </button>
                            </div>

                            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
                                {/* Name */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-primary/60">Nama Pengeluaran *</label>
                                    <input
                                        className="w-full h-11 px-4 rounded-xl border-2 border-primary/10 bg-primary/5 text-primary text-sm font-medium focus:outline-none focus:border-primary/30"
                                        placeholder="Contoh: Beli tepung"
                                        value={expForm.name}
                                        onChange={e => setExpForm(f => ({ ...f, name: e.target.value }))}
                                    />
                                </div>

                                {/* Category */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-primary/60">Kategori</label>
                                    <div className="relative">
                                        <select
                                            value={expForm.category}
                                            onChange={e => setExpForm(f => ({ ...f, category: e.target.value }))}
                                            className="w-full h-11 px-4 pr-10 rounded-xl border-2 border-primary/10 bg-primary/5 text-primary text-sm font-medium focus:outline-none focus:border-primary/30 appearance-none"
                                        >
                                            <option value="">Pilih kategori...</option>
                                            {EXPENSE_CATEGORIES.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                        <LuChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-primary/40" />
                                    </div>
                                </div>

                                {/* Price */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-primary/60">Nominal (Rp) *</label>
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        className="w-full h-11 px-4 rounded-xl border-2 border-primary/10 bg-primary/5 text-primary text-sm font-medium focus:outline-none focus:border-primary/30"
                                        placeholder="50000"
                                        value={expForm.price}
                                        onChange={e => setExpForm(f => ({ ...f, price: e.target.value }))}
                                    />
                                </div>

                                {/* Date */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-primary/60">Tanggal</label>
                                    <input
                                        type="date"
                                        className="w-full h-11 px-4 rounded-xl border-2 border-primary/10 bg-primary/5 text-primary text-sm font-medium focus:outline-none focus:border-primary/30"
                                        value={expForm.date}
                                        onChange={e => setExpForm(f => ({ ...f, date: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="px-5 py-4 border-t border-primary/10">
                                <button
                                    onClick={submitExpense}
                                    disabled={submitting}
                                    className="w-full h-13 bg-primary text-brand-yellow font-extrabold text-sm rounded-2xl shadow-lg active:scale-[0.98] transition-transform disabled:opacity-50 py-3"
                                >
                                    {submitting ? 'Menyimpan...' : 'Simpan Pengeluaran'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
