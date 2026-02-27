'use client';

import { useState, useEffect } from 'react';
import {
    LuMenu,
    LuPackage,
    LuClipboardList,
    LuStar,
    LuTrendingUp,
    LuChartBar,
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
    pickup_time: string;
    note: string | null;
    status: 'PENDING' | 'CONFIRMED' | 'DONE' | 'CANCELLED';
    created_at: string;
    items: OrderItem[];
}

function getTodayStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function formatDate(dateStr: string) {
    const [y, m, d] = dateStr.split('-');
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function AnalyticsPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSidebar, setShowSidebar] = useState(false);
    const userRoleData = useUserRole();
    const [rangeStart, setRangeStart] = useState<string | null>(getTodayStr());
    const [rangeEnd, setRangeEnd] = useState<string | null>(null);
    const [activeStatus, setActiveStatus] = useState<string>('ALL');

    useEffect(() => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        fetch(`${apiUrl}/api/orders`)
            .then(r => r.json())
            .then(j => { if (j.status === 'ok') setOrders(j.data); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleDateChip = (date: string) => {
        if (!rangeStart || (rangeStart && rangeEnd)) {
            // Reset: baru pilih start
            setRangeStart(date);
            setRangeEnd(null);
        } else {
            // Sudah ada start, set end
            if (date < rangeStart) {
                // Klik tanggal sebelum start → jadikan start baru
                setRangeStart(date);
                setRangeEnd(null);
            } else if (date === rangeStart) {
                // Klik tanggal sama → single day
                setRangeEnd(null);
            } else {
                setRangeEnd(date);
            }
        }
    };

    const availableDates = Array.from(new Set(orders.map(o => o.pickup_date))).sort();
    const effectiveEnd = rangeEnd ?? rangeStart;
    const dayOrders = orders.filter(o => {
        const matchDate = !rangeStart || (o.pickup_date >= rangeStart && o.pickup_date <= (effectiveEnd ?? rangeStart));
        const matchStatus = activeStatus === 'ALL' || o.status === activeStatus;
        return matchDate && matchStatus;
    });
    const totalOrders = dayOrders.length;
    const totalItems = dayOrders.reduce((s, o) => s + o.items.reduce((si, i) => si + i.qty, 0), 0);

    const timeSlotMap: Record<string, number> = {};
    dayOrders.forEach(o => {
        const slot = o.pickup_time ?? 'Unknown';
        timeSlotMap[slot] = (timeSlotMap[slot] ?? 0) + 1;
    });
    const timeSlots = Object.entries(timeSlotMap).sort(([a], [b]) => a.localeCompare(b));
    const maxSlotCount = Math.max(...timeSlots.map(([, c]) => c), 1);

    const flavorMap: Record<string, number> = {};
    dayOrders.forEach(o => {
        o.items.forEach(item => {
            flavorMap[item.name] = (flavorMap[item.name] ?? 0) + item.qty;
        });
    });
    const topFlavors = Object.entries(flavorMap).sort(([, a], [, b]) => b - a);
    const topFlavor = topFlavors[0];
    const maxFlavorCount = Math.max(...topFlavors.map(([, c]) => c), 1);

    const fullBoxCount = dayOrders.reduce((s, o) => s + o.items.filter(i => i.box_type === 'FULL').reduce((si, i) => si + i.qty, 0), 0);
    const halfBoxCount = dayOrders.reduce((s, o) => s + o.items.filter(i => i.box_type === 'HALF').reduce((si, i) => si + i.qty, 0), 0);

    // Chart: total orders per date — ikut filter status
    const ordersByDate: Record<string, number> = {};
    orders
        .filter(o => activeStatus === 'ALL' || o.status === activeStatus)
        .forEach(o => {
            ordersByDate[o.pickup_date] = (ordersByDate[o.pickup_date] ?? 0) + 1;
        });
    const allDatesChart = Object.entries(ordersByDate).sort(([a], [b]) => a.localeCompare(b));
    const maxDateCount = Math.max(...allDatesChart.map(([, c]) => c), 1);

    function fmtChartDate(dateStr: string) {
        const [y, m, d] = dateStr.split('-');
        const date = new Date(Number(y), Number(m) - 1, Number(d));
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    }

    return (
        <div className="bg-brand-yellow font-display text-primary min-h-screen flex flex-col items-center">
            <div className="relative flex min-h-screen w-full max-w-[480px] flex-col bg-brand-yellow shadow-2xl">

                <Sidebar open={showSidebar} onClose={() => setShowSidebar(false)} allowedPages={userRoleData.allowedPages} userEmail={userRoleData.email} userRole={userRoleData.role} />

                {/* Header */}
                <header className="sticky top-0 z-50 bg-brand-yellow/95 backdrop-blur-md border-b border-primary/10 px-5 pt-5 pb-4">
                    <div className="flex justify-between items-center">
                        <button
                            onClick={() => setShowSidebar(true)}
                            className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center border border-primary/10 shadow-sm"
                        >
                            <LuMenu className="text-primary text-lg" />
                        </button>
                        <h1 className="text-2xl font-extrabold tracking-tight text-primary">Analytics</h1>
                        <div className="w-10 h-10" />
                    </div>
                </header>

                <main className="flex-1 px-4 py-5 space-y-5 pb-16">

                    {/* Date Selector */}
                    <section className="bg-white/60 rounded-2xl p-4 border border-primary/10">
                        <p className="text-[10px] uppercase tracking-widest text-primary/50 font-black mb-3">
                            {rangeEnd && rangeEnd !== rangeStart
                                ? `${formatDate(rangeStart!)} — ${formatDate(rangeEnd)}`
                                : rangeStart ? formatDate(rangeStart) : 'Pilih Tanggal'}
                        </p>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            {availableDates.length === 0 && (
                                <p className="text-primary/40 text-xs">Belum ada data</p>
                            )}
                            {availableDates.map(date => {
                                const [y, m, d] = date.split('-');
                                const label = new Date(Number(y), Number(m) - 1, Number(d))
                                    .toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
                                const isStart = date === rangeStart;
                                const isEnd = date === rangeEnd;
                                const end = rangeEnd ?? rangeStart;
                                const inRange = rangeStart && end && date > rangeStart && date < end;
                                return (
                                    <button
                                        key={date}
                                        onClick={() => handleDateChip(date)}
                                        className={`shrink-0 px-4 py-2 rounded-xl text-xs font-black transition-all ${isStart || isEnd
                                            ? 'bg-primary text-brand-yellow shadow-lg'
                                            : inRange
                                                ? 'bg-primary/30 text-primary'
                                                : 'bg-primary/10 text-primary/60 hover:bg-primary/20'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                        {!rangeEnd && rangeStart && (
                            <p className="text-[10px] text-primary/40 font-medium mt-2">Tap tanggal lain untuk set rentang akhir</p>
                        )}

                        {/* Status filter chips */}
                        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
                            {(['ALL', 'UNPAID', 'PAID', 'CONFIRMED', 'DONE', 'CANCELLED'] as const).map(s => {
                                const STATUS_STYLES: Record<string, string> = {
                                    UNPAID: 'bg-orange-100 text-orange-600',
                                    PAID: 'bg-teal-100 text-teal-600',
                                    CONFIRMED: 'bg-green-100 text-green-600',
                                    DONE: 'bg-blue-100 text-blue-600',
                                    CANCELLED: 'bg-red-100 text-red-600',
                                };
                                const STATUS_LABEL: Record<string, string> = {
                                    ALL: 'Semua', UNPAID: 'Unpaid', PAID: 'Paid', CONFIRMED: 'Confirmed', DONE: 'Done', CANCELLED: 'Cancelled',
                                };
                                const isActive = activeStatus === s;
                                const chipStyle = isActive && s !== 'ALL'
                                    ? STATUS_STYLES[s]
                                    : isActive
                                        ? 'bg-primary text-brand-yellow'
                                        : 'bg-primary/10 text-primary/60 hover:bg-primary/20';
                                return (
                                    <button
                                        key={s}
                                        onClick={() => setActiveStatus(s)}
                                        className={`shrink-0 px-4 py-2 rounded-xl text-xs font-black transition-all ${chipStyle}`}
                                    >
                                        {STATUS_LABEL[s]}
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {loading ? (
                        <p className="text-center text-primary/40 text-sm py-10">Memuat data...</p>
                    ) : dayOrders.length === 0 ? (
                        <div className="text-center py-16">
                            <p className="text-primary/40 text-sm font-bold">Belum ada order untuk tanggal ini</p>
                        </div>
                    ) : (
                        <>
                            {/* Chart: Orders per Date — Line Chart */}
                            {allDatesChart.length > 0 && (() => {
                                const W = 400, H = 120, PAD_L = 8, PAD_R = 8, PAD_T = 24, PAD_B = 28;
                                const chartW = W - PAD_L - PAD_R;
                                const chartH = H - PAD_T - PAD_B;
                                const n = allDatesChart.length;
                                const effectiveEnd2 = rangeEnd ?? rangeStart;

                                const pts = allDatesChart.map(([date, count], i) => {
                                    const x = PAD_L + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW);
                                    const y = PAD_T + chartH - (count / maxDateCount) * chartH;
                                    const isInRange = rangeStart && effectiveEnd2
                                        ? date >= rangeStart && date <= effectiveEnd2
                                        : false;
                                    const isPeak = count === maxDateCount;
                                    return { x, y, date, count, isInRange, isPeak };
                                });

                                const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
                                const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(PAD_T + chartH).toFixed(1)} L${pts[0].x.toFixed(1)},${(PAD_T + chartH).toFixed(1)} Z`;

                                return (
                                    <section className="bg-white/60 rounded-2xl p-5 border border-primary/10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <LuChartBar className="text-primary text-base" />
                                            <p className="text-[10px] uppercase tracking-widest text-primary/50 font-black">Total Order per Tanggal</p>
                                        </div>
                                        <svg
                                            viewBox={`0 0 ${W} ${H}`}
                                            className="w-full"
                                            style={{ height: 140 }}
                                        >
                                            <defs>
                                                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="var(--color-primary, #1a1a1a)" stopOpacity="0.18" />
                                                    <stop offset="100%" stopColor="var(--color-primary, #1a1a1a)" stopOpacity="0.01" />
                                                </linearGradient>
                                            </defs>

                                            {/* Horizontal grid lines */}
                                            {[0, 0.5, 1].map((t, i) => (
                                                <line
                                                    key={i}
                                                    x1={PAD_L} y1={PAD_T + chartH - t * chartH}
                                                    x2={W - PAD_R} y2={PAD_T + chartH - t * chartH}
                                                    stroke="currentColor" strokeOpacity="0.06" strokeWidth="1"
                                                />
                                            ))}

                                            {/* Area fill */}
                                            <path d={areaPath} fill="url(#lineGrad)" />

                                            {/* Line */}
                                            <path
                                                d={linePath}
                                                fill="none"
                                                stroke="currentColor"
                                                strokeOpacity="0.25"
                                                strokeWidth="2"
                                                strokeLinejoin="round"
                                                strokeLinecap="round"
                                            />

                                            {/* Active segment overlay */}
                                            {pts.length > 1 && (() => {
                                                const activePts = pts.filter(p => p.isInRange);
                                                if (activePts.length < 1) return null;
                                                const activePath = activePts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
                                                return (
                                                    <path
                                                        d={activePath}
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeOpacity="0.9"
                                                        strokeWidth="2.5"
                                                        strokeLinejoin="round"
                                                        strokeLinecap="round"
                                                    />
                                                );
                                            })()}

                                            {/* Dots & labels */}
                                            {pts.map((p, i) => (
                                                <g key={p.date} style={{ cursor: 'pointer' }} onClick={() => handleDateChip(p.date)}>
                                                    {/* Peak badge */}
                                                    {p.isPeak && (
                                                        <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="9" fontWeight="800" fill="currentColor" fillOpacity="0.7">
                                                            ★ {p.count}
                                                        </text>
                                                    )}
                                                    {/* Outer ring for active */}
                                                    {p.isInRange && (
                                                        <circle cx={p.x} cy={p.y} r={7} fill="currentColor" fillOpacity="0.15" />
                                                    )}
                                                    {/* Dot */}
                                                    <circle
                                                        cx={p.x} cy={p.y} r={p.isInRange ? 4.5 : 3}
                                                        fill={p.isInRange ? 'currentColor' : 'white'}
                                                        stroke="currentColor"
                                                        strokeOpacity={p.isInRange ? 1 : 0.35}
                                                        strokeWidth="1.5"
                                                    />
                                                    {/* Count label above non-peak active dots */}
                                                    {p.isInRange && !p.isPeak && (
                                                        <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize="8" fontWeight="800" fill="currentColor" fillOpacity="0.7">
                                                            {p.count}
                                                        </text>
                                                    )}
                                                    {/* X-axis date label */}
                                                    {(n <= 10 || i % Math.ceil(n / 8) === 0 || i === n - 1) && (
                                                        <text
                                                            x={p.x} y={H - 4}
                                                            textAnchor="middle"
                                                            fontSize="7.5"
                                                            fontWeight="700"
                                                            fill="currentColor"
                                                            fillOpacity={p.isInRange ? 0.8 : 0.35}
                                                        >
                                                            {fmtChartDate(p.date)}
                                                        </text>
                                                    )}
                                                </g>
                                            ))}
                                        </svg>
                                    </section>
                                );
                            })()}
                            {/* Summary Cards */}
                            <section className="grid grid-cols-2 gap-3">
                                <div className="bg-white/60 p-5 rounded-2xl border border-primary/10">
                                    <div className="flex items-center gap-2 mb-3 text-primary/50">
                                        <LuClipboardList className="text-lg" />
                                        <span className="text-[10px] font-black uppercase tracking-wide">Total Order</span>
                                    </div>
                                    <p className="text-4xl font-black text-primary">{totalOrders}</p>
                                </div>
                                <div className="bg-white/60 p-5 rounded-2xl border border-primary/10">
                                    <div className="flex items-center gap-2 mb-3 text-primary/50">
                                        <LuPackage className="text-lg" />
                                        <span className="text-[10px] font-black uppercase tracking-wide">Total Item</span>
                                    </div>
                                    <p className="text-4xl font-black text-primary">{totalItems}</p>
                                </div>

                                <div className="bg-white/60 p-5 rounded-2xl border border-primary/10">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-primary/50 mb-3">Full Box</p>
                                    <p className="text-3xl font-black text-primary">{fullBoxCount}</p>
                                    <p className="text-[10px] text-primary/40 mt-1 font-bold">box</p>
                                </div>
                                <div className="bg-white/60 p-5 rounded-2xl border border-primary/10">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-primary/50 mb-3">Half Box</p>
                                    <p className="text-3xl font-black text-primary">{halfBoxCount}</p>
                                    <p className="text-[10px] text-primary/40 mt-1 font-bold">box</p>
                                </div>

                                {topFlavor && (
                                    <div className="col-span-2 bg-primary p-5 rounded-2xl shadow-lg flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 text-brand-yellow/60 mb-1">
                                                <LuStar className="text-sm" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Most Popular</span>
                                            </div>
                                            <p className="text-xl font-black text-brand-yellow leading-tight">{topFlavor[0]}</p>
                                            <p className="text-xs text-brand-yellow/60 font-bold mt-0.5">{topFlavor[1]}x dipesan</p>
                                        </div>
                                        <div className="w-14 h-14 bg-brand-yellow/10 rounded-2xl flex items-center justify-center text-2xl">
                                            🍌
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* Orders per Time Slot Chart */}
                            {timeSlots.length > 0 && (
                                <section className="bg-white/60 rounded-2xl p-5 border border-primary/10">
                                    <div className="mb-5">
                                        <p className="text-[10px] uppercase tracking-widest text-primary/50 font-black">Orders per Waktu Pickup</p>
                                        <p className="text-3xl font-black text-primary mt-1">{totalOrders} <span className="text-sm font-bold text-primary/40">order</span></p>
                                    </div>
                                    <div className="flex gap-3 items-end h-36 px-1">
                                        {timeSlots.map(([slot, count]) => {
                                            const heightPct = Math.round((count / maxSlotCount) * 100);
                                            const isPeak = count === maxSlotCount;
                                            return (
                                                <div key={slot} className="flex flex-col items-center gap-2 flex-1 h-full justify-end relative">
                                                    {isPeak && (
                                                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-primary text-brand-yellow text-[9px] font-black px-2 py-0.5 rounded-full shadow whitespace-nowrap">
                                                            ⭐ {count}
                                                        </div>
                                                    )}
                                                    <div
                                                        className={`w-full rounded-t-lg transition-all ${isPeak ? 'bg-primary shadow-lg' : 'bg-primary/20'}`}
                                                        style={{ height: `${heightPct}%`, minHeight: '8px' }}
                                                    />
                                                    <span className={`text-[9px] font-black ${isPeak ? 'text-primary' : 'text-primary/40'}`}>{slot}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}

                            {/* Top Flavors */}
                            {topFlavors.length > 0 && (
                                <section className="bg-white/60 rounded-2xl overflow-hidden border border-primary/10">
                                    <div className="px-5 py-4 border-b border-primary/10 flex items-center gap-2">
                                        <LuTrendingUp className="text-primary text-base" />
                                        <h4 className="font-black text-sm tracking-tight text-primary">Top Flavor Hari Ini</h4>
                                    </div>
                                    <div className="divide-y divide-primary/5">
                                        {topFlavors.slice(0, 6).map(([name, count], idx) => {
                                            const barPct = Math.round((count / maxFlavorCount) * 100);
                                            return (
                                                <div key={name} className="px-5 py-4 flex items-center gap-4">
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${idx === 0 ? 'bg-primary text-brand-yellow' : 'bg-primary/10 text-primary/40'}`}>
                                                        {String(idx + 1).padStart(2, '0')}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-black text-primary truncate">{name}</p>
                                                        <div className="flex items-center gap-2 mt-1.5">
                                                            <div className="flex-1 h-1.5 bg-primary/10 rounded-full">
                                                                <div
                                                                    className={`h-full rounded-full ${idx === 0 ? 'bg-primary' : 'bg-primary/40'}`}
                                                                    style={{ width: `${barPct}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[10px] font-black text-primary/40 shrink-0">{count}x</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}

                            {/* Order Status Breakdown */}
                            <section className="bg-white/60 rounded-2xl p-5 border border-primary/10">
                                <p className="text-[10px] uppercase tracking-widest text-primary/50 font-black mb-4">Status Order</p>
                                {(['UNPAID', 'PAID', 'CONFIRMED', 'DONE', 'CANCELLED'] as const).map(status => {
                                    const count = dayOrders.filter(o => o.status === status).length;
                                    const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
                                    const colors: Record<string, string> = {
                                        UNPAID: 'bg-orange-400',
                                        PAID: 'bg-teal-400',
                                        CONFIRMED: 'bg-emerald-500',
                                        DONE: 'bg-blue-400',
                                        CANCELLED: 'bg-red-500',
                                    };
                                    if (count === 0) return null;
                                    return (
                                        <div key={status} className="flex items-center gap-3 mb-3 last:mb-0">
                                            <div className={`w-2 h-2 rounded-full shrink-0 ${colors[status]}`} />
                                            <span className="text-xs font-black text-primary/50 w-20 uppercase">{status}</span>
                                            <div className="flex-1 h-1.5 bg-primary/10 rounded-full">
                                                <div className={`h-full rounded-full ${colors[status]}`} style={{ width: `${pct}%` }} />
                                            </div>
                                            <span className="text-xs font-black text-primary w-6 text-right">{count}</span>
                                        </div>
                                    );
                                })}
                            </section>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
