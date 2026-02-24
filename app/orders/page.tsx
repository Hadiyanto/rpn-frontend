'use client';

import { useState, useEffect } from 'react';
import {
    LuSearch,
    LuCalendarDays,
    LuPackage,
    LuBell,
    LuClipboardList,
    LuStickyNote,
    LuChevronDown,
    LuChevronUp,
    LuPrinter,
} from 'react-icons/lu';
// import BottomNav from '@/components/BottomNav';
import { printOrder } from '@/utils/printer';
import Link from 'next/link';

interface OrderItem {
    id: number;
    box_type: 'FULL' | 'HALF';
    name: string;
    qty: number;
}

interface Order {
    id: number;
    customer_name: string;
    pickup_date: string;
    pickup_time: string;
    note: string | null;
    status: 'PENDING' | 'CONFIRMED' | 'DONE' | 'CANCELLED';
    created_at: string;
    items: OrderItem[];
}

const DAY_ID: Record<number, string> = {
    0: 'Minggu', 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu',
};

const STATUS_STYLES: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-600',
    CONFIRMED: 'bg-green-100 text-green-600',
    DONE: 'bg-blue-100 text-blue-600',
    CANCELLED: 'bg-red-100 text-red-500',
};

const STATUS_LABEL: Record<string, string> = {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    DONE: 'Done',
    CANCELLED: 'Cancelled',
};


function getInitials(name: string) {
    return name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('');
}

const AVATAR_COLORS = [
    'bg-primary/10 text-primary',
    'bg-orange-100 text-orange-500',
    'bg-blue-100 text-blue-500',
    'bg-purple-100 text-purple-500',
    'bg-pink-100 text-pink-500',
];

function avatarColor(id: number) {
    return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function formatPickupDate(dateStr: string) {
    const date = new Date(dateStr);
    const day = DAY_ID[date.getDay()] ?? '';
    const formatted = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    return `${day}, ${formatted}`;
}

function formatChipDate(dateStr: string) {
    const date = new Date(dateStr);
    const day = DAY_ID[date.getDay()] ?? '';
    const dd = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    return `${day} / ${dd}`;
}

function getTodayStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeDate, setActiveDate] = useState<string>(getTodayStr());
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [printingId, setPrintingId] = useState<number | null>(null);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
                const res = await fetch(`${apiUrl}/api/orders`);
                const json = await res.json();
                if (json.status === 'ok') {
                    const data = json.data as Order[];
                    setOrders(data);
                    const today = getTodayStr();
                    const dates = Array.from(new Set(data.map(o => o.pickup_date)));
                    const hasToday = dates.includes(today);
                    if (hasToday) setActiveDate(today);
                    // else: activeDate stays as today → filtered empty → shows "Belum ada order"
                }
            } catch (err) {
                console.error('Failed to fetch orders:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    // Unique pickup dates from orders, sorted ASC
    const uniqueDates = Array.from(new Set(orders.map(o => o.pickup_date))).sort();

    const filtered = orders.filter((order) => {
        const matchSearch =
            order.customer_name.toLowerCase().includes(search.toLowerCase()) ||
            order.items.some((i) => i.name.toLowerCase().includes(search.toLowerCase()));

        const matchDate = activeDate === 'All' ? true : order.pickup_date === activeDate;

        return matchSearch && matchDate;
    }).sort((a, b) => {
        const dateCompare = a.pickup_date.localeCompare(b.pickup_date);
        if (dateCompare !== 0) return dateCompare;
        return (a.pickup_time ?? '').localeCompare(b.pickup_time ?? '');
    });

    return (
        <div className="bg-brand-yellow font-display text-primary min-h-screen flex flex-col items-center">
            <div className="relative flex min-h-screen w-full max-w-[480px] flex-col bg-brand-yellow shadow-2xl">

                {/* Header */}
                <header className="sticky top-0 z-50 bg-brand-yellow/95 backdrop-blur-md border-b border-primary/10 px-5 pt-5 pb-4 space-y-4">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-extrabold tracking-tight text-primary">Orders</h1>
                        <button className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center border border-primary/10 shadow-sm">
                            <LuBell className="text-primary text-lg" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40 text-lg" />
                        <input
                            className="w-full bg-white/70 border-2 border-primary/10 rounded-2xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm placeholder:text-primary/40 text-primary font-medium"
                            placeholder="Cari nama atau pesanan..."
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Date filter chips */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {uniqueDates.map((date) => (
                            <button
                                key={date}
                                onClick={() => setActiveDate(date)}
                                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeDate === date
                                    ? 'bg-primary text-brand-yellow shadow-md'
                                    : 'bg-white/60 text-primary/60 border border-primary/10'
                                    }`}
                            >
                                {formatChipDate(date)}
                            </button>
                        ))}
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 px-5 pb-32 pt-4 space-y-4 overflow-y-auto">
                    {loading && (
                        <div className="flex justify-center pt-16">
                            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        </div>
                    )}

                    {!loading && filtered.length === 0 && (
                        <div className="flex flex-col items-center justify-center pt-20 gap-3 text-primary/40">
                            <LuClipboardList className="text-5xl" />
                            <p className="text-sm font-semibold">Belum ada order</p>
                        </div>
                    )}

                    {!loading && filtered.map((order) => {
                        const isExpanded = expandedId === order.id;
                        return (
                            <div
                                key={order.id}
                                className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-sm border border-primary/10 overflow-hidden"
                            >
                                {/* Card Header */}
                                <div className="p-5 flex flex-col gap-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base ${avatarColor(order.id)}`}>
                                                {getInitials(order.customer_name)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-primary text-base">{order.customer_name}</h3>
                                                <p className="text-xs text-primary/50 flex items-center gap-1 mt-0.5">
                                                    <LuCalendarDays className="text-[13px]" />
                                                    {formatPickupDate(order.pickup_date)}
                                                    {order.pickup_time && ` · ${order.pickup_time}`}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${STATUS_STYLES[order.status] ?? 'bg-gray-100 text-gray-500'}`}>
                                            {STATUS_LABEL[order.status] ?? order.status}
                                        </span>
                                    </div>

                                    {/* Items summary */}
                                    <div className="bg-brand-yellow/30 rounded-2xl p-4 space-y-2">
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <LuPackage className="text-primary/50 text-sm shrink-0" />
                                                    <span className="text-sm font-semibold text-primary">
                                                        {item.name}
                                                        <span className="text-primary/50 font-medium"> x{item.qty}</span>
                                                    </span>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${item.box_type === 'FULL'
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'bg-primary/5 text-primary/60'
                                                    }`}>
                                                    {item.box_type} BOX
                                                </span>
                                            </div>
                                        ))}

                                        {/* Note */}
                                        {order.note && (
                                            <div className="pt-2 border-t border-primary/10 flex items-start gap-2">
                                                <LuStickyNote className="text-primary/40 text-sm mt-0.5 shrink-0" />
                                                <p className="text-xs text-primary/60 italic">{order.note}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Expand toggle */}
                                    <button
                                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                                        className="flex items-center justify-center gap-1 text-xs font-bold text-primary/50 hover:text-primary transition-colors"
                                    >
                                        {isExpanded ? (
                                            <><LuChevronUp className="text-sm" /> Tutup</>
                                        ) : (
                                            <><LuChevronDown className="text-sm" /> Detail</>
                                        )}
                                    </button>
                                </div>

                                {/* Expanded detail */}
                                {isExpanded && (
                                    <div className="border-t border-primary/10 px-5 py-4 bg-primary/5 space-y-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-primary/40 mb-2">Detail Pesanan</p>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-primary/50">Order ID</span>
                                            <span className="font-bold text-primary">#{order.id}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-primary/50">Total Item</span>
                                            <span className="font-bold text-primary">{order.items.reduce((s, i) => s + i.qty, 0)} pcs</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-primary/50">Dibuat</span>
                                            <span className="font-bold text-primary">
                                                {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                setPrintingId(order.id);
                                                try {
                                                    await printOrder({
                                                        customerName: order.customer_name,
                                                        pickupDate: formatPickupDate(order.pickup_date),
                                                        pickupTime: order.pickup_time,
                                                        note: order.note,
                                                        orderId: order.id,
                                                        items: order.items,
                                                    });
                                                } catch {
                                                    alert('Gagal print. Pastikan Bluetooth aktif dan pilih printer yang benar.');
                                                } finally {
                                                    setPrintingId(null);
                                                }
                                            }}
                                            disabled={printingId === order.id}
                                            className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-brand-yellow text-xs font-black uppercase tracking-wider shadow-sm active:scale-95 transition-all disabled:opacity-50"
                                        >
                                            <LuPrinter className="text-sm" />
                                            {printingId === order.id ? 'Printing...' : 'Cetak Order'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </main>

                {/* FAB */}
                <Link
                    href="/orders/new"
                    className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-brand-yellow rounded-2xl shadow-xl flex items-center justify-center active:scale-90 transition-transform z-40"
                >
                    <span className="text-2xl font-black leading-none">+</span>
                </Link>

                {/* <BottomNav /> */}
            </div>
        </div>
    );
}
