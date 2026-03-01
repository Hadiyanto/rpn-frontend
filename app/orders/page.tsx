'use client';

import { useState, useEffect, useRef } from 'react';
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
    LuX,
    LuPlus,
    LuTrash2,
    LuMenu,
    LuPencil,
    LuWallet,
    LuCheck,
    LuPackageCheck,
    LuMessageCircle,
    LuSend,
    LuLayoutGrid,
    LuLayoutTemplate,
    LuGift
} from 'react-icons/lu';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { printOrder } from '@/utils/printer';
import { subscribePush } from '@/utils/push';
import Sidebar from '@/components/Sidebar';
import { useUserRole } from '@/hooks/useUserRole';

interface OrderItem {
    id?: number;
    box_type: 'FULL' | 'HALF' | 'HAMPERS';
    name: string;
    qty: number;
}

interface Order {
    id: number;
    customer_name: string;
    customer_phone: string;
    pickup_date: string;
    pickup_time: string;
    note: string | null;
    status: 'UNPAID' | 'PAID' | 'CONFIRMED' | 'DONE';
    payment_method: 'TRANSFER' | 'CASH' | null;
    transfer_img_url: string | null;
    created_at: string;
    items: OrderItem[];
}

const DAY_ID: Record<number, string> = {
    0: 'Minggu', 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu',
};

const STATUS_STYLES: Record<string, string> = {
    UNPAID: 'bg-orange-100 text-orange-600',
    PAID: 'bg-teal-100 text-teal-600',
    CONFIRMED: 'bg-green-100 text-green-600',
    DONE: 'bg-blue-100 text-blue-600',
    CANCELLED: 'bg-red-100 text-red-600',
};

const STATUS_LABEL: Record<string, string> = {
    UNPAID: 'Unpaid',
    PAID: 'Paid',
    CONFIRMED: 'Confirmed',
    DONE: 'Done',
    CANCELLED: 'Cancelled',
};

const PAYMENT_STYLES: Record<string, string> = {
    TRANSFER: 'bg-blue-100 text-blue-600',
    CASH: 'bg-emerald-100 text-emerald-600',
};

const PAYMENT_LABEL: Record<string, string> = {
    TRANSFER: 'Transfer',
    CASH: 'Cash',
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
    const date = new Date(`${dateStr}T00:00:00+07:00`);
    const day = DAY_ID[date.getDay()] ?? '';
    const formatted = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
    return `${day}, ${formatted}`;
}

function formatChipDate(dateStr: string) {
    const date = new Date(`${dateStr}T00:00:00+07:00`);
    const day = DAY_ID[date.getDay()] ?? '';
    const dd = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' });
    return `${day} / ${dd}`;
}

function getTodayStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function toTitleCase(str: string) {
    return str.replace(/\b\w/g, c => c.toUpperCase());
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeDate, setActiveDate] = useState<string>(getTodayStr());
    const [activeTab, setActiveTab] = useState<'ALL' | 'UNPAID' | 'PAID' | 'CONFIRMED' | 'DONE' | 'CANCELLED'>('ALL');
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [printingId, setPrintingId] = useState<number | null>(null);
    const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
    const [showSidebar, setShowSidebar] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const userRoleData = useUserRole();
    const [seenOrderCount, setSeenOrderCount] = useState<number>(() => {
        if (typeof window === 'undefined') return 0;
        return Number(localStorage.getItem('rpn_seen_order_count') ?? 0);
    });
    const [showNotifPanel, setShowNotifPanel] = useState(false);

    const today = getTodayStr();
    const paidOrders = orders.filter(o => o.status === 'PAID' && o.pickup_date === today);
    const unreadCount = Math.max(0, paidOrders.length - seenOrderCount);

    const toggleBell = () => {
        const next = !showNotifPanel;
        setShowNotifPanel(next);
        if (next) {
            // mark as read
            const n = paidOrders.length;
            setSeenOrderCount(n);
            localStorage.setItem('rpn_seen_order_count', String(n));
        }
    };

    const handleStatusChange = async (orderId: number, newStatus: string) => {
        setUpdatingStatusId(orderId);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const res = await fetch(`${apiUrl}/api/order/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            const json = await res.json();
            if (json.status === 'ok') {
                setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as Order['status'] } : o));
            } else {
                alert(json.message || 'Gagal update status');
            }
        } catch {
            alert('Gagal update status');
        } finally {
            setUpdatingStatusId(null);
        }
    };

    const [updatingPaymentId, setUpdatingPaymentId] = useState<number | null>(null);

    // WhatsApp Modal State
    const [waModalOpen, setWaModalOpen] = useState(false);
    const [waOrder, setWaOrder] = useState<Order | null>(null);
    const [waMessage, setWaMessage] = useState('');
    const [sendingWa, setSendingWa] = useState(false);

    const openWAModal = (order: Order) => {
        setWaOrder(order);

        let itemsStr = '';
        if (order.items && order.items.length > 0) {
            itemsStr = order.items.map(item => `- ${item.qty} ${item.box_type === 'HALF' ? 'Half Box' : 'Full Box'} ${item.name}`).join('\n');
        }

        const timeStr = order.pickup_time ? ` jam ${order.pickup_time}` : '';
        const msg = `Halo Kak ${order.customer_name},\n\nTerkait pesanan RPN untuk tanggal ${formatPickupDate(order.pickup_date)}${timeStr}:\n\n${itemsStr}\n\n`;

        setWaMessage(msg);
        setWaModalOpen(true);
    };

    const sendWAMessage = async () => {
        if (!waOrder) return;
        setSendingWa(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const res = await fetch(`${apiUrl}/api/whatsapp/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: 'individual',
                    phone: waOrder.customer_phone,
                    message: waMessage
                })
            });
            const data = await res.json();
            if (res.ok) {
                setWaModalOpen(false);
            } else {
                alert(data.message || 'Gagal mengirim pesan WA');
            }
        } catch (err) {
            console.error(err);
            alert('Terjadi kesalahan saat mengirim WA');
        } finally {
            setSendingWa(false);
        }
    };

    // Dynamic Options Data
    const [menus, setMenus] = useState<any[]>([]);
    const [variants, setVariants] = useState<any[]>([]);
    const [quotas, setQuotas] = useState<any[]>([]);
    const [availableHours, setAvailableHours] = useState<any[]>([]);

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
                const [r1, r2, r3] = await Promise.all([
                    fetch(`${apiUrl}/api/menu`).then(r => r.json()),
                    fetch(`${apiUrl}/api/variants`).then(r => r.json()),
                    fetch(`${apiUrl}/api/daily-quota`).then(r => r.json()),
                ]);
                if (r1.status === 'ok') setMenus(r1.data);
                if (r2.status === 'ok') setVariants(r2.data);
                if (r3.status === 'ok') setQuotas(r3.data);
            } catch (err) {
                console.error('Failed to fetch metadata', err);
            }
        };
        fetchOptions();
    }, []);

    const filterPassedDates = (time: Date) => {
        const y = time.getFullYear();
        const m = String(time.getMonth() + 1).padStart(2, '0');
        const d = String(time.getDate()).padStart(2, '0');
        const dateString = `${y}-${m}-${d}`;

        const q = quotas.find(q => q.date === dateString);
        return q ? q.remaining_qty > 0 : false;
    };

    function normalizeVariant(name: string) {
        if (!name) return name;
        let n = name.replace(/Dengan/g, "Dan").trim();
        if (n.includes(" Dan ") && !n.startsWith("Mix ")) n = "Mix " + n;
        if (n.startsWith("Mix ")) {
            const parts = n.replace("Mix ", "").split(" Dan ").map(p => p.trim()).sort();
            return "Mix " + parts.join(" Dan ");
        }
        return n;
    }

    const handlePaymentMethodChange = async (orderId: number, newMethod: string) => {
        setUpdatingPaymentId(orderId);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const res = await fetch(`${apiUrl}/api/order/${orderId}/payment-method`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payment_method: newMethod || null }),
            });
            const json = await res.json();
            if (json.status === 'ok') {
                setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_method: newMethod as Order['payment_method'] } : o));
            } else {
                alert(json.message || 'Gagal update payment method');
            }
        } catch {
            alert('Gagal update payment method');
        } finally {
            setUpdatingPaymentId(null);
        }
    };

    // Bottom sheet state
    const [showSheet, setShowSheet] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const emptyItem = () => ({ box_type: 'FULL' as 'FULL' | 'HALF', name: '', qty: 1 });
    const [form, setForm] = useState({
        customer_name: '',
        customer_phone: '',
        pickup_date: getTodayStr(),
        pickup_time: ':',
        note: '',
        payment_method: '' as '' | 'TRANSFER' | 'CASH',
        pesanan: [{ box_type: 'FULL' as 'FULL' | 'HALF' | 'HAMPERS', name: '', qty: 1 }]
    });

    useEffect(() => {
        if (!form.pickup_date) {
            setAvailableHours([]);
            return;
        }
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        fetch(`${apiUrl}/api/hourly-quota/availability?date=${form.pickup_date}`)
            .then(r => r.json())
            .then(json => {
                if (json.status === 'ok') {
                    setAvailableHours(json.data);
                }
            })
            .catch(console.error);
    }, [form.pickup_date]);

    const getIsHourAvailable = (hStr: string) => {
        if (!form.pickup_date) return false;
        const hq = availableHours.find(h => h.time_str === hStr && h.is_active);

        // If no explicit hourly quota rule exists, it means that hour is CLOSED
        if (!hq) return false;

        const requestedQty = form.pesanan.reduce((sum, item) => {
            if (!item.name) return sum;
            return sum + (item.box_type === 'HALF' ? item.qty * 0.5 : item.qty);
        }, 0);
        return requestedQty <= hq.remaining_qty;
    };

    const resetForm = () => setForm({
        customer_name: '',
        customer_phone: '',
        pickup_date: getTodayStr(),
        pickup_time: '11:00',
        note: '',
        payment_method: '',
        pesanan: [emptyItem()],
    });

    const submitOrder = async () => {
        if (!form.customer_name.trim()) { alert('Nama customer wajib diisi'); return; }
        if (!form.customer_phone.trim()) { alert('Nomor WhatsApp wajib diisi'); return; }
        if (!form.pickup_date) { alert('Tanggal pickup wajib diisi'); return; }
        if (form.pesanan.some(p => !p.name.trim())) { alert('Nama pesanan tidak boleh kosong'); return; }
        setSubmitting(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

            if (editingOrder) {
                // EDIT mode
                const res = await fetch(`${apiUrl}/api/order/${editingOrder.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        customer_name: form.customer_name.trim(),
                        customer_phone: form.customer_phone.trim(),
                        pickup_date: form.pickup_date,
                        pickup_time: form.pickup_time.trim() || null,
                        note: form.note.trim() || null,
                        payment_method: form.payment_method || null,
                        pesanan: form.pesanan
                            .filter(p => p.name.trim().length > 0 && p.qty > 0)
                            .map(p => ({ box_type: p.box_type, name: normalizeVariant(p.name.trim()), qty: p.qty })),
                    }),
                });
                const json = await res.json();
                if (json.status === 'ok') {
                    // Refresh orders
                    const res2 = await fetch(`${apiUrl}/api/orders`);
                    const json2 = await res2.json();
                    if (json2.status === 'ok') setOrders(json2.data);
                    setShowSheet(false);
                    setEditingOrder(null);
                    resetForm();
                } else {
                    alert(json.message || 'Gagal update order');
                }
            } else {
                // CREATE mode
                const res = await fetch(`${apiUrl}/api/order`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        customer_name: form.customer_name.trim(),
                        customer_phone: form.customer_phone.trim(),
                        pickup_date: form.pickup_date,
                        pickup_time: form.pickup_time.trim() || null,
                        note: form.note.trim() || null,
                        payment_method: form.payment_method || null,
                        pesanan: form.pesanan
                            .filter(p => p.name.trim().length > 0 && p.qty > 0)
                            .map(p => ({ box_type: p.box_type, name: normalizeVariant(p.name.trim()), qty: p.qty })),
                    }),
                });
                const json = await res.json();
                if (json.status === 'ok') {
                    // Refresh orders
                    const res2 = await fetch(`${apiUrl}/api/orders`);
                    const json2 = await res2.json();
                    if (json2.status === 'ok') setOrders(json2.data);
                    setShowSheet(false);
                    resetForm();
                } else {
                    alert(json.message || 'Gagal submit order');
                }
            }
        } catch (err) {
            console.error(err);
            alert(editingOrder ? 'Gagal update order' : 'Gagal submit order');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Polling & suara ────────────────────────────────────────────────
    const prevPaidCountRef = useRef<number | null>(null);

    const playDing = () => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            // Ding: 880 Hz → 1320 Hz
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.4, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.6);
        } catch { /* audio blocked */ }
    };

    useEffect(() => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

        const fetchOrders = async (isFirst = false) => {
            try {
                const res = await fetch(`${apiUrl}/api/orders`);
                const json = await res.json();
                if (json.status === 'ok') {
                    const data = json.data as Order[];

                    // Hitung PAID hari ini
                    const todayStr = getTodayStr();
                    const newPaidCount = data.filter(o => o.status === 'PAID' && o.pickup_date === todayStr).length;
                    if (!isFirst && prevPaidCountRef.current !== null && newPaidCount > prevPaidCountRef.current) {
                        playDing();
                    }
                    prevPaidCountRef.current = newPaidCount;

                    setOrders(data);
                    if (isFirst) {
                        const today = getTodayStr();
                        const dates = Array.from(new Set(data.map(o => o.pickup_date)));
                        if (dates.includes(today)) setActiveDate(today);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch orders:', err);
            } finally {
                if (isFirst) setLoading(false);
            }
        };

        fetchOrders(true);
        const timer = setInterval(() => fetchOrders(false), 30_000);
        return () => clearInterval(timer);
    }, []);

    // Auto-subscribe push notifications
    useEffect(() => {
        subscribePush().catch(console.error);
    }, []);

    // Unique pickup dates from orders, sorted ASC
    const uniqueDates = Array.from(new Set(orders.map(o => o.pickup_date))).sort();

    const filtered = orders.filter((order) => {
        const matchSearch =
            order.customer_name.toLowerCase().includes(search.toLowerCase()) ||
            order.customer_phone?.toLowerCase().includes(search.toLowerCase()) ||
            order.note?.toLowerCase().includes(search.toLowerCase()) ||
            order.items.some((i) => i.name.toLowerCase().includes(search.toLowerCase()));

        const matchDate = activeDate === 'All' ? true : order.pickup_date === activeDate;

        const matchStatus = activeTab === 'ALL' ? true : order.status === activeTab;

        return matchSearch && matchDate && matchStatus;
    }).sort((a, b) => {
        const dateCompare = a.pickup_date.localeCompare(b.pickup_date);
        if (dateCompare !== 0) return dateCompare;
        return (a.pickup_time ?? '').localeCompare(b.pickup_time ?? '');
    });

    return (
        <div className="bg-brand-yellow font-display text-primary min-h-screen flex flex-col items-center">
            <div className="relative flex min-h-screen w-full max-w-[480px] flex-col bg-brand-yellow shadow-2xl">

                {/* Sidebar */}
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
                        <h1 className="text-2xl font-extrabold tracking-tight text-primary">Orders</h1>
                        <div className="relative">
                            <button
                                onClick={toggleBell}
                                className="relative w-10 h-10 rounded-full bg-white/60 flex items-center justify-center border border-primary/10 shadow-sm"
                            >
                                <LuBell className={`text-lg transition-transform ${showNotifPanel ? 'text-primary scale-110' : 'text-primary'}`} />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center leading-none">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notif Panel */}
                            {showNotifPanel && (
                                <>
                                    {/* Overlay to close */}
                                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifPanel(false)} />
                                    <div className="absolute right-0 top-12 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-primary/10 overflow-hidden">
                                        <div className="px-4 py-3 border-b border-primary/10 flex items-center justify-between">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-primary/50">Order Sudah Dibayar</p>
                                            <span className="text-[10px] font-bold text-primary/40">{paidOrders.length} order</span>
                                        </div>
                                        <div className="max-h-72 overflow-y-auto divide-y divide-primary/5">
                                            {paidOrders.length === 0 ? (
                                                <div className="py-8 text-center">
                                                    <p className="text-xs text-primary/40 font-semibold">Belum ada order PAID 🔔</p>
                                                </div>
                                            ) : (
                                                paidOrders
                                                    .sort((a, b) => a.pickup_date.localeCompare(b.pickup_date))
                                                    .map(o => (
                                                        <button
                                                            key={o.id}
                                                            onClick={() => {
                                                                setShowNotifPanel(false);
                                                                setActiveDate(o.pickup_date);
                                                            }}
                                                            className="w-full px-4 py-3 text-left hover:bg-primary/5 transition-colors"
                                                        >
                                                            <div className="flex items-center justify-between gap-2">
                                                                <p className="text-sm font-bold text-primary truncate">{o.customer_name}</p>
                                                                <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full shrink-0">PAID</span>
                                                            </div>
                                                            <p className="text-[11px] text-primary/50 mt-0.5">
                                                                {formatPickupDate(o.pickup_date)}{o.pickup_time ? ` · ${o.pickup_time}` : ''}
                                                            </p>
                                                            <p className="text-[10px] text-primary/40 mt-0.5">
                                                                {o.items.map(i => i.name).join(', ')}
                                                            </p>
                                                        </button>
                                                    ))
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
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

                    {/* Status filter tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x">
                        {(['ALL', 'UNPAID', 'PAID', 'CONFIRMED', 'DONE', 'CANCELLED'] as const).map(s => {
                            const isActive = activeTab === s;
                            return (
                                <button
                                    key={s}
                                    onClick={() => setActiveTab(s)}
                                    className={`snap-center px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${isActive
                                        ? 'bg-primary text-brand-yellow shadow-md'
                                        : 'bg-white/60 text-primary/60 border border-primary/10'
                                        }`}
                                >
                                    {s === 'ALL' ? 'Semua' : STATUS_LABEL[s]}
                                </button>
                            );
                        })}
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
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <a href={`https://wa.me/${order.customer_phone?.replace(/^0/, '62')}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-brand-yellow/80 hover:text-brand-yellow hover:underline flex flex-row items-center gap-1">
                                                        {order.customer_phone}
                                                    </a>
                                                    <button onClick={() => openWAModal(order)} className="p-1 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors" title="Kirim WA melalui Server" aria-label="Send WA">
                                                        <LuMessageCircle size={14} />
                                                    </button>
                                                </div>
                                                <p className="text-xs text-primary/50 flex items-center gap-1 mt-0.5">
                                                    <LuCalendarDays className="text-[13px]" />
                                                    {formatPickupDate(order.pickup_date)}
                                                    {order.pickup_time && ` · ${order.pickup_time}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5">
                                            {/* Status */}
                                            <div className="relative border-2 border-current rounded-full" style={{ borderColor: 'currentColor', opacity: 0.8 }}>
                                                <select
                                                    value={order.status}
                                                    disabled={updatingStatusId === order.id}
                                                    onChange={e => handleStatusChange(order.id, e.target.value)}
                                                    className={`appearance-none cursor-pointer pl-3 pr-6 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border-0 focus:outline-none transition-opacity disabled:opacity-50 ${STATUS_STYLES[order.status] ?? 'bg-gray-100 text-gray-500'}`}
                                                >
                                                    {['UNPAID', 'PAID', 'CONFIRMED', 'DONE', 'CANCELLED'].map(s => (
                                                        <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>
                                                    ))}
                                                </select>
                                                <LuChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px]" />
                                            </div>
                                            {/* Payment Method */}
                                            <div className="relative rounded-full border-2 border-current" style={{ borderColor: 'currentColor', opacity: 0.8 }}>
                                                <select
                                                    value={order.payment_method ?? ''}
                                                    disabled={updatingPaymentId === order.id}
                                                    onChange={e => handlePaymentMethodChange(order.id, e.target.value)}
                                                    className={`appearance-none cursor-pointer pl-3 pr-6 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border-0 focus:outline-none transition-opacity disabled:opacity-50 ${order.payment_method ? (PAYMENT_STYLES[order.payment_method] ?? 'bg-gray-100 text-gray-500') : 'bg-gray-100 text-gray-400'
                                                        }`}
                                                >
                                                    <option value="">--</option>
                                                    <option value="TRANSFER">Transfer</option>
                                                    <option value="CASH">Cash</option>
                                                </select>
                                                <LuChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px]" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Items summary */}
                                    <div className="bg-brand-yellow/30 rounded-2xl p-4 space-y-2">
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <LuPackage className="text-primary/50 text-sm shrink-0" />
                                                    <span className="text-sm font-semibold text-primary">
                                                        {item.qty}x {item.box_type === 'FULL' ? 'Box Besar' : item.box_type === 'HALF' ? 'Box Kecil' : 'Hampers'}
                                                        <span className="text-primary/50 font-medium"> {item.name}</span>
                                                    </span>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${item.box_type === 'FULL'
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'bg-primary/5 text-primary/60'
                                                    }`}>
                                                    {item.box_type}
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
                                                {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })}
                                            </span>
                                        </div>
                                        {order.transfer_img_url && (
                                            <div className="pt-2 flex justify-between items-start text-xs border-t border-primary/5 mt-2">
                                                <span className="text-primary/50 mt-1">Bukti Transfer</span>
                                                <button
                                                    onClick={() => setSelectedImage(order.transfer_img_url!)}
                                                    className="block w-16 h-16 rounded-lg overflow-hidden border border-primary/10 hover:opacity-80 transition-opacity"
                                                >
                                                    <img src={order.transfer_img_url} alt="Bukti Transfer" className="w-full h-full object-cover" />
                                                </button>
                                            </div>
                                        )}
                                        <div className="pt-3 border-t border-primary/5 flex items-center justify-between">
                                            <div className="flex gap-2">
                                                {order.status === 'UNPAID' && (
                                                    <button
                                                        onClick={() => handleStatusChange(order.id, 'PAID')}
                                                        className="flex flex-col items-center justify-center bg-teal-50 hover:bg-teal-100 text-teal-600 px-4 py-2 rounded-xl transition-colors active:scale-95"
                                                    >
                                                        <LuCheck className="text-xl mb-1" />
                                                        <span className="text-[10px] font-black uppercase">Paid</span>
                                                    </button>
                                                )}
                                                {order.status === 'PAID' && (
                                                    <button
                                                        onClick={() => handleStatusChange(order.id, 'CONFIRMED')}
                                                        className="flex flex-col items-center justify-center bg-green-50 hover:bg-green-100 text-green-600 px-4 py-2 rounded-xl transition-colors active:scale-95"
                                                    >
                                                        <LuCheck className="text-xl mb-1" />
                                                        <span className="text-[10px] font-black uppercase">Confirm</span>
                                                    </button>
                                                )}
                                                {order.status === 'CONFIRMED' && (
                                                    <button
                                                        onClick={() => handleStatusChange(order.id, 'DONE')}
                                                        className="flex flex-col items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-xl transition-colors active:scale-95"
                                                    >
                                                        <LuPackageCheck className="text-xl mb-1" />
                                                        <span className="text-[10px] font-black uppercase">Done</span>
                                                    </button>
                                                )}
                                                {['UNPAID', 'PAID', 'CONFIRMED'].includes(order.status) && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('Yakin ingin membatalkan order ini?')) {
                                                                handleStatusChange(order.id, 'CANCELLED');
                                                            }
                                                        }}
                                                        className="flex flex-col items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 px-4 py-2 rounded-xl transition-colors active:scale-95"
                                                    >
                                                        <LuTrash2 className="text-xl mb-1" />
                                                        <span className="text-[10px] font-black uppercase">Cancel</span>
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingOrder(order);
                                                        setForm({
                                                            customer_name: order.customer_name,
                                                            customer_phone: order.customer_phone,
                                                            pickup_date: order.pickup_date,
                                                            pickup_time: order.pickup_time?.slice(0, 5) || '11:00',
                                                            note: order.note || '',
                                                            payment_method: (order.payment_method ?? '') as '' | 'TRANSFER' | 'CASH',
                                                            pesanan: order.items.map(i => ({ box_type: i.box_type as 'FULL' | 'HALF' | 'HAMPERS', name: i.name, qty: i.qty })),
                                                        });
                                                        setShowSheet(true);
                                                    }}
                                                    className="flex-1 flex flex-col items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-xl transition-colors active:scale-95"
                                                >
                                                    <LuPencil className="text-xl mb-1" />
                                                    <span className="text-[10px] font-black uppercase text-center leading-tight">Edit Order</span>
                                                </button>
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
                                                    className="flex-1 flex flex-col items-center justify-center bg-primary hover:bg-primary/90 text-brand-yellow px-4 py-2 rounded-xl transition-colors active:scale-95 disabled:opacity-50"
                                                >
                                                    <LuPrinter className="text-xl mb-1" />
                                                    <span className="text-[10px] font-black uppercase text-center leading-tight">
                                                        {printingId === order.id ? 'Printing...' : 'Cetak Order'}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </main>

                {/* FAB */}
                <button
                    onClick={() => { setEditingOrder(null); resetForm(); setShowSheet(true); }}
                    className="fixed bottom-8 right-6 w-14 h-14 bg-primary text-brand-yellow rounded-2xl shadow-xl flex items-center justify-center active:scale-90 transition-transform z-40"
                >
                    <LuPlus className="text-2xl font-black" />
                </button>

                {/* Bottom Sheet */}
                {showSheet && (
                    <div className="fixed inset-0 z-50 flex flex-col justify-end">
                        {/* Backdrop */}
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowSheet(false); setEditingOrder(null); resetForm(); }} />

                        {/* Sheet */}
                        <div className="relative bg-white rounded-t-3xl max-h-[90vh] flex flex-col w-full max-w-[480px] mx-auto shadow-2xl">
                            {/* Handle */}
                            <div className="flex justify-center pt-3 pb-1">
                                <div className="w-10 h-1 bg-primary/20 rounded-full" />
                            </div>

                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-3 border-b border-primary/10">
                                <h2 className="text-base font-extrabold text-primary">
                                    {editingOrder ? `Edit Order #${editingOrder.id}` : 'Order Baru'}
                                </h2>
                                <button onClick={() => { setShowSheet(false); setEditingOrder(null); resetForm(); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10">
                                    <LuX className="text-primary text-sm" />
                                </button>
                            </div>

                            {/* Form */}
                            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

                                {/* Customer Name */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-primary/60">Nama Customer *</label>
                                    <input
                                        className="w-full h-11 px-4 rounded-xl border-2 border-primary/10 bg-primary/5 text-primary text-sm font-medium focus:outline-none focus:border-primary/30"
                                        placeholder="Nama pemesan"
                                        autoCapitalize="words"
                                        list="customer-names"
                                        value={form.customer_name}
                                        onChange={e => setForm(f => ({ ...f, customer_name: toTitleCase(e.target.value) }))}
                                    />
                                    <datalist id="customer-names">
                                        {Array.from(new Set(orders.map(o => o.customer_name ? toTitleCase(o.customer_name.trim()) : ''))).filter(Boolean).sort().map(name => (
                                            <option key={name} value={name} />
                                        ))}
                                    </datalist>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-primary/60 tracking-wider">Nomor WhatsApp *</label>
                                    <input
                                        type="tel"
                                        className="w-full h-11 px-4 rounded-xl border-2 border-primary/10 bg-primary/5 text-primary text-sm font-medium focus:outline-none focus:border-primary/30"
                                        placeholder="0812xxxx"
                                        value={form.customer_phone}
                                        onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value.replace(/[^0-9]/g, '') }))}
                                    />
                                </div>

                                {/* Pickup Date & Time */}
                                <div className="flex gap-3">
                                    <div className="flex-1 space-y-1.5 flex flex-col">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-primary/60">Tanggal Pickup *</label>
                                        <div className="flex-1 min-h-[44px]">
                                            <DatePicker
                                                selected={form.pickup_date ? new Date(`${form.pickup_date}T00:00:00`) : null}
                                                onChange={(date: Date | null) => {
                                                    if (date) {
                                                        const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
                                                        setForm(f => ({ ...f, pickup_date: local.toISOString().split('T')[0] }));
                                                    }
                                                }}
                                                filterDate={filterPassedDates}
                                                dateFormat="dd/MM/yyyy"
                                                className="w-full h-11 px-4 rounded-xl border-2 border-primary/10 bg-primary/5 text-primary text-sm font-medium focus:outline-none focus:border-primary/30"
                                                placeholderText="Pilih Tanggal"
                                            />
                                        </div>
                                    </div>
                                    <div className="w-36 space-y-1.5 flex flex-col relative">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-primary/60">Waktu *</label>

                                        {/* Custom Time Selector Button */}
                                        <button
                                            type="button"
                                            onClick={() => setShowTimePicker(!showTimePicker)}
                                            className="w-full h-11 px-4 flex items-center justify-center gap-1 rounded-xl border-2 border-primary/10 bg-primary/5 hover:bg-primary/10 transition-colors text-primary text-sm font-extrabold focus:outline-none focus:border-primary/30"
                                        >
                                            <span>{form.pickup_time.split(':')[0] || '--'}</span>
                                            <span className="opacity-50">:</span>
                                            <span>{form.pickup_time.split(':')[1] || '--'}</span>
                                            <LuChevronDown className={`ml-auto transition-transform ${showTimePicker ? 'rotate-180' : ''}`} />
                                        </button>

                                        {/* Custom Floating Dropdown */}
                                        {showTimePicker && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setShowTimePicker(false)}></div>
                                                <div className="absolute top-[calc(100%+8px)] right-0 w-48 bg-white rounded-2xl shadow-2xl border-2 border-primary/5 z-20 flex overflow-hidden animate-in zoom-in-95 duration-200">

                                                    {/* Hours Column */}
                                                    <div className="flex-1 border-r border-primary/5 max-h-56 overflow-y-auto no-scrollbar">
                                                        <div className="sticky top-0 bg-white/90 backdrop-blur pb-2 pt-3 px-3">
                                                            <div className="text-[10px] font-black uppercase tracking-widest text-primary/40 text-center">Jam</div>
                                                        </div>
                                                        <div className="p-1.5 space-y-0.5">
                                                            {[11, 12, 13, 14, 15, 16, 17].map(hNum => {
                                                                const hStr = String(hNum).padStart(2, '0') + ':00';
                                                                const hDisplay = String(hNum).padStart(2, '0');
                                                                const isSelected = form.pickup_time.split(':')[0] === hDisplay;
                                                                const isAvail = getIsHourAvailable(hStr);

                                                                return (
                                                                    <button
                                                                        key={hDisplay}
                                                                        type="button"
                                                                        disabled={!isAvail}
                                                                        onClick={() => {
                                                                            const mm = form.pickup_time.split(':')[1] || '00';
                                                                            setForm(f => ({ ...f, pickup_time: `${hDisplay}:${mm}` }));
                                                                        }}
                                                                        className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${!isAvail
                                                                            ? 'opacity-30 cursor-not-allowed bg-black/5 text-primary/40'
                                                                            : isSelected
                                                                                ? 'bg-primary text-brand-yellow scale-[1.02] shadow-md'
                                                                                : 'text-primary/70 hover:bg-primary/5 hover:text-primary'
                                                                            }`}
                                                                    >
                                                                        {hDisplay}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Minutes Column */}
                                                    <div className="flex-1 max-h-56 overflow-y-auto no-scrollbar">
                                                        <div className="sticky top-0 bg-white/90 backdrop-blur pb-2 pt-3 px-3">
                                                            <div className="text-[10px] font-black uppercase tracking-widest text-primary/40 text-center">Menit</div>
                                                        </div>
                                                        <div className="p-1.5 space-y-0.5">
                                                            {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => {
                                                                const isSelected = form.pickup_time.split(':')[1] === m;
                                                                return (
                                                                    <button
                                                                        key={m}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const hh = form.pickup_time.split(':')[0] || '11';
                                                                            setForm(f => ({ ...f, pickup_time: `${hh}:${m}` }));
                                                                        }}
                                                                        className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${isSelected
                                                                            ? 'bg-primary text-brand-yellow scale-[1.02] shadow-md'
                                                                            : 'text-primary/70 hover:bg-primary/5 hover:text-primary'
                                                                            }`}
                                                                    >
                                                                        {m}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Pesanan */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-primary/60">Pesanan *</label>
                                        <button
                                            onClick={() => setForm(f => ({ ...f, pesanan: [...f.pesanan, emptyItem()] }))}
                                            className="flex items-center gap-1 text-[10px] font-black text-primary bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors"
                                        >
                                            <LuPlus className="text-xs" /> Tambah Item
                                        </button>
                                    </div>
                                    {form.pesanan.map((item, idx) => (
                                        <div key={idx} className="bg-primary/5 rounded-2xl p-4 space-y-3">
                                            <div className="flex flex-col gap-4">
                                                <div className="flex justify-between items-center pb-2 border-b border-primary/5">
                                                    <span className="text-[11px] font-black uppercase text-primary/60 tracking-widest">Item #{idx + 1}</span>
                                                    {form.pesanan.length > 1 && (
                                                        <button
                                                            onClick={() => setForm(f => ({ ...f, pesanan: f.pesanan.filter((_, i) => i !== idx) }))}
                                                            className="text-[10px] font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1"
                                                        >
                                                            <LuTrash2 /> Hapus
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Box Type Cards and Qty */}
                                                <div className="flex items-center gap-3">
                                                    <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1">
                                                        {(['FULL', 'HALF', 'HAMPERS'] as const).map(bt => {
                                                            const isSelected = item.box_type === bt;
                                                            const menuData = menus.find(m => m.name === bt);
                                                            const priceStr = menuData ? `Rp ${(menuData.price / 1000)}k` : '...';

                                                            let Icon = LuLayoutGrid;
                                                            if (bt === 'HALF') Icon = LuLayoutTemplate;
                                                            if (bt === 'HAMPERS') Icon = LuGift;

                                                            return (
                                                                <button
                                                                    key={bt}
                                                                    onClick={() => {
                                                                        setForm(f => ({
                                                                            ...f,
                                                                            pesanan: f.pesanan.map((p, i) => {
                                                                                if (i !== idx) return p;
                                                                                let newP = { ...p, box_type: bt };
                                                                                if (bt === 'HALF' && p.name && p.name.startsWith('Mix ')) {
                                                                                    const parts = p.name.replace('Mix ', '').split(' Dan ');
                                                                                    if (parts.length > 1) {
                                                                                        newP.name = parts[0];
                                                                                    }
                                                                                }
                                                                                return newP;
                                                                            })
                                                                        }));
                                                                    }}
                                                                    className={`flex-1 min-w-[65px] rounded-xl p-2.5 flex flex-col items-center relative transition-all shadow-sm border-2 ${isSelected
                                                                        ? 'bg-white border-blue-600'
                                                                        : 'bg-white/50 border-primary/10 opacity-70 hover:opacity-100'
                                                                        }`}
                                                                >
                                                                    {isSelected && (
                                                                        <div className="absolute -top-1.5 -right-1.5 bg-blue-600 rounded-full h-4 w-4 flex items-center justify-center shadow-sm">
                                                                            <LuCheck className="text-[10px] text-white stroke-[3]" />
                                                                        </div>
                                                                    )}
                                                                    <Icon className={`text-[22px] mb-1.5 ${isSelected ? 'text-primary' : 'text-primary/40'}`} />
                                                                    <span className={`text-[10px] font-black uppercase tracking-tight leading-none ${isSelected ? 'text-primary' : 'text-primary/60'}`}>
                                                                        {bt}
                                                                    </span>
                                                                    <span className={`text-[9px] font-medium leading-none mt-1 ${isSelected ? 'text-primary/70' : 'text-primary/40'}`}>
                                                                        {priceStr}
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Qty Controls */}
                                                    <div className="flex items-center gap-1.5 bg-white rounded-xl border-2 border-primary/10 px-1 py-1 shadow-sm shrink-0">
                                                        <button onClick={() => setForm(f => ({ ...f, pesanan: f.pesanan.map((p, i) => i === idx ? { ...p, qty: Math.max(1, p.qty - 1) } : p) }))} className="text-primary font-black text-sm w-7 h-9 flex items-center justify-center hover:bg-black/5 rounded-lg transition-colors">−</button>
                                                        <span className="text-[13px] font-black text-primary min-w-[16px] text-center">{item.qty}</span>
                                                        <button onClick={() => setForm(f => ({ ...f, pesanan: f.pesanan.map((p, i) => i === idx ? { ...p, qty: p.qty + 1 } : p) }))} className="text-primary font-black text-sm w-7 h-9 flex items-center justify-center hover:bg-black/5 rounded-lg transition-colors">+</button>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Item name as Checkboxes (Max 2 for FULL/HAMPERS) */}
                                            <div className="pt-2">
                                                <label className="text-[10px] font-black uppercase tracking-wider text-primary/60 block mb-2">
                                                    Pilih Rasa (Max {item.box_type === 'HAMPERS' ? 3 : item.box_type === 'FULL' ? 2 : 1} Varian)
                                                </label>
                                                <div className="grid grid-cols-2 lg:grid-cols-2 gap-2">
                                                    {variants
                                                        .filter(v => v.is_active)
                                                        .map(v => {
                                                            const maxFlavors = item.box_type === 'HAMPERS' ? 3 : item.box_type === 'FULL' ? 2 : 1;
                                                            let selectedFlavors: string[] = [];
                                                            if (item.name) {
                                                                if (item.name.startsWith('Mix ')) {
                                                                    selectedFlavors = item.name.replace('Mix ', '').split(' Dan ');
                                                                } else {
                                                                    selectedFlavors = [item.name];
                                                                }
                                                            }

                                                            const vName = (v.name || v.variant_name || '').toLowerCase();
                                                            const isKraftBomb = vName.includes('kraf') && vName.includes('bomb');
                                                            const isKraftCarnation = vName.includes('kraf') && vName.includes('carnation');
                                                            const isKraftDisabled = item.box_type === 'HAMPERS' && (isKraftBomb || isKraftCarnation);

                                                            const isChecked = selectedFlavors.includes(v.variant_name);
                                                            const isDisabled = isKraftDisabled || (!isChecked && selectedFlavors.length >= maxFlavors);

                                                            return (
                                                                <label
                                                                    key={v.id}
                                                                    className={`relative flex items-center gap-2 p-2 rounded-lg border-2 transition-all cursor-pointer ${isChecked
                                                                        ? 'border-primary bg-primary/5 text-primary'
                                                                        : isDisabled
                                                                            ? 'border-primary/5 bg-primary/5 text-primary/30 opacity-50 cursor-not-allowed'
                                                                            : 'border-primary/10 bg-white text-primary/70 hover:border-primary/30'
                                                                        }`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        className="peer sr-only"
                                                                        checked={isChecked}
                                                                        disabled={isDisabled}
                                                                        onChange={(e) => {
                                                                            let newFlavors = [...selectedFlavors];
                                                                            if (e.target.checked) {
                                                                                if (newFlavors.length < maxFlavors) newFlavors.push(v.variant_name);
                                                                            } else {
                                                                                newFlavors = newFlavors.filter(f => f !== v.variant_name);
                                                                            }

                                                                            let newName = '';
                                                                            if (newFlavors.length > 0) {
                                                                                if (newFlavors.length > 1) {
                                                                                    const sorted = [...newFlavors].sort();
                                                                                    newName = `Mix ${sorted.join(' Dan ')}`;
                                                                                } else {
                                                                                    newName = newFlavors[0];
                                                                                }
                                                                            }

                                                                            setForm(f => ({
                                                                                ...f,
                                                                                pesanan: f.pesanan.map((p, i) => i === idx ? { ...p, name: newName } : p)
                                                                            }));
                                                                        }}
                                                                    />
                                                                    <div className={`w-4 h-4 rounded flex items-center justify-center border-2 transition-colors shrink-0 flex-none ${isChecked ? 'bg-primary border-primary text-brand-yellow' : 'border-primary/20 peer-focus-visible:border-primary/50'
                                                                        }`}>
                                                                        {isChecked && <LuCheck className="text-[10px] stroke-[4]" />}
                                                                    </div>
                                                                    <span className="text-xs font-bold leading-tight select-none flex-1 line-clamp-2 break-words text-left">{v.variant_name}</span>
                                                                </label>
                                                            );
                                                        })}
                                                </div>
                                                {!item.name && (
                                                    <p className="text-[10px] text-red-500 font-bold mt-2">* Silahkan pilih minimal 1 rasa</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Payment Method */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-primary/60">Metode Pembayaran</label>
                                    <div className="relative">
                                        <select
                                            value={form.payment_method}
                                            onChange={e => setForm(f => ({ ...f, payment_method: e.target.value as typeof form.payment_method }))}
                                            className="w-full h-11 px-4 pr-10 rounded-xl border-2 border-primary/10 bg-primary/5 text-primary text-sm font-medium focus:outline-none focus:border-primary/30 appearance-none"
                                        >
                                            <option value="">Pilih metode pembayaran...</option>
                                            <option value="TRANSFER">Transfer</option>
                                            <option value="CASH">Cash</option>
                                        </select>
                                        <LuChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-primary/40" />
                                    </div>
                                </div>

                                {/* Note */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-primary/60">Catatan (opsional)</label>
                                    <textarea
                                        rows={2}
                                        className="w-full px-4 py-3 rounded-xl border-2 border-primary/10 bg-primary/5 text-primary text-sm font-medium focus:outline-none focus:border-primary/30 resize-none"
                                        placeholder="Tambahan info..."
                                        value={form.note}
                                        onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="px-5 py-4 border-t border-primary/10">
                                <button
                                    onClick={submitOrder}
                                    disabled={submitting}
                                    className="w-full h-13 bg-primary text-brand-yellow font-extrabold text-sm rounded-2xl shadow-lg active:scale-[0.98] transition-transform disabled:opacity-50 py-3"
                                >
                                    {submitting ? (editingOrder ? 'Menyimpan...' : 'Menyimpan...') : (editingOrder ? 'Simpan Perubahan' : 'Simpan Order')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* <BottomNav /> */}
            </div>

            {/* Image Preview Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative max-w-full max-h-full">
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute -top-12 right-0 sm:-right-12 w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>
                        <img
                            src={selectedImage}
                            alt="Preview Bukti Transfer"
                            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}

            {/* WhatsApp Modal */}
            {waModalOpen && waOrder && (
                <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center items-center bg-black/40 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200" onClick={() => setWaModalOpen(false)}>
                    <div className="bg-[#fcfaf2] w-full sm:max-w-md rounded-t-[32px] sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex justify-between items-center px-6 py-5 border-b border-primary/10">
                            <h2 className="font-extrabold text-primary text-xl tracking-tight">Kirim WhatsApp</h2>
                            <button onClick={() => setWaModalOpen(false)} className="w-8 h-8 rounded-full bg-primary/5 hover:bg-primary/10 flex items-center justify-center text-primary/60 outline-none transition-colors">
                                <LuX className="text-lg" />
                            </button>
                        </div>
                        {/* Body */}
                        <div className="p-6 flex flex-col gap-4 overflow-y-auto">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-primary/60">Penerima</label>
                                <div className="px-4 py-3 rounded-xl border border-primary/10 bg-primary/5 text-primary text-sm font-bold flex items-center justify-between">
                                    <span>{waOrder.customer_name}</span>
                                    <span className="text-brand-yellow/80">{waOrder.customer_phone}</span>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-primary/60">Pesan</label>
                                <textarea
                                    className="w-full px-4 py-3 rounded-xl border-2 border-primary/10 bg-white text-primary text-sm font-medium focus:outline-none focus:border-green-500 transition-colors resize-none"
                                    rows={8}
                                    value={waMessage}
                                    onChange={e => setWaMessage(e.target.value)}
                                />
                            </div>
                        </div>
                        {/* Footer */}
                        <div className="px-6 py-5 border-t border-primary/10 bg-white">
                            <button
                                onClick={sendWAMessage}
                                disabled={sendingWa || !waMessage.trim()}
                                className="w-full flex items-center justify-center gap-2 h-14 bg-green-500 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-green-500/30 active:scale-[0.98] transition-transform disabled:opacity-50"
                            >
                                <LuSend className="text-lg" />
                                {sendingWa ? 'Mengirim...' : 'Kirim Pesan WA'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
