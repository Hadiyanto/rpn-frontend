'use client';

import { useState, useEffect } from 'react';
import {
    LuPlus,
    LuTrash2,
    LuChevronDown,
    LuPackage,
    LuCheck,
} from 'react-icons/lu';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface OrderItem {
    box_type: 'FULL' | 'HALF';
    name: string;
    qty: number;
}

const emptyItem = (): OrderItem => ({ box_type: 'FULL', name: '', qty: 1 });

function toTitleCase(str: string) {
    return str.toLowerCase().split(' ').map(function (word) {
        return (word.charAt(0).toUpperCase() + word.slice(1));
    }).join(' ');
}

function getTodayStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function normalizeVariant(name: string) {
    if (!name) return name;
    // Standardize wording
    let n = name.replace(/Dengan/g, "Dan").trim();

    // Kalau mengandung Dan tapi belum diawali Mix
    if (n.includes(" Dan ") && !n.startsWith("Mix ")) {
        n = "Mix " + n;
    }

    // Kalau format Mix -> sort alfabetis
    if (n.startsWith("Mix ")) {
        const parts = n
            .replace("Mix ", "")
            .split(" Dan ")
            .map(p => p.trim())
            .sort();

        return "Mix " + parts.join(" Dan ");
    }

    return n;
}

export default function GuestOrderPage() {
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [form, setForm] = useState({
        customer_name: '',
        pickup_date: '', // Set via useEffect to prevent hydration error
        pickup_time: '11:00',
        note: '',
        payment_method: '' as '' | 'TRANSFER' | 'CASH',
        pesanan: [emptyItem()],
    });

    const [menus, setMenus] = useState<any[]>([]);
    const [variants, setVariants] = useState<any[]>([]);
    const [quotas, setQuotas] = useState<any[]>([]);

    useEffect(() => {
        // Fetch menus and variants
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

        Promise.all([
            fetch(`${apiUrl}/api/menu`).then(r => r.json()),
            fetch(`${apiUrl}/api/variants`).then(r => r.json()),
            fetch(`${apiUrl}/api/daily-quota`).then(r => r.json()),
        ]).then(([mjson, vjson, qjson]) => {
            if (mjson.status === 'ok') setMenus(mjson.data);
            if (vjson.status === 'ok') setVariants(vjson.data);
            if (qjson.status === 'ok') setQuotas(qjson.data);
        }).catch(console.error);
    }, []);

    // Filter to only enable dates that exist in the daily_quota table and have qty > 0
    const filterPassedDates = (time: Date) => {
        const local = new Date(time.getTime() - time.getTimezoneOffset() * 60000);
        const dateString = local.toISOString().split('T')[0];
        const todayStr = getTodayStr();

        // Must be today or future
        if (dateString < todayStr) return false;

        const q = quotas.find(q => q.date === dateString);
        return q ? q.qty > 0 : false;
    };

    const handleReviewOrder = () => {
        if (!form.customer_name.trim()) return alert('Nama customer wajib diisi');
        if (!form.pickup_date) return alert('Tanggal pickup wajib diisi');
        const validItems = form.pesanan.filter(p => p.name.trim().length > 0 && p.qty > 0);
        if (validItems.length === 0) return alert('Minimal 1 pesanan (dengan nama) wajib diisi');

        setShowConfirm(true);
    };

    const submitOrder = async () => {
        setSubmitting(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

            // Normalize variants before submitting
            const validItems = form.pesanan
                .filter(p => p.name.trim().length > 0 && p.qty > 0)
                .map(item => ({ ...item, name: normalizeVariant(item.name) }));

            const payload = { ...form, pesanan: validItems };

            const res = await fetch(`${apiUrl}/api/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const json = await res.json();

            if (json.status === 'ok') {
                setShowConfirm(false);
                setSuccess(true);
            } else {
                alert(json.message || 'Gagal menyimpan pesanan');
            }
        } catch {
            alert('Gagal menghubungi server');
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="bg-brand-yellow font-display text-primary min-h-screen flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-[480px] bg-white rounded-3xl p-8 text-center shadow-xl">
                    <LuCheck className="text-6xl text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-extrabold text-primary mb-2">Terima Kasih!</h2>
                    <p className="text-primary/70 mb-8">
                        Pesanan Kak <strong>{form.customer_name}</strong> telah berhasil kami terima.
                    </p>
                    <button
                        onClick={() => {
                            setSuccess(false);
                            setForm({
                                customer_name: '',
                                pickup_date: getTodayStr(),
                                pickup_time: '11:00',
                                note: '',
                                payment_method: '',
                                pesanan: [emptyItem()],
                            });
                        }}
                        className="w-full h-12 bg-primary/10 text-primary font-bold rounded-xl active:scale-95 transition-all"
                    >
                        Buat Pesanan Baru
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-brand-yellow font-display text-primary min-h-screen flex flex-col items-center p-0 sm:p-4 sm:py-8">
            <div className="relative bg-white rounded-none sm:rounded-3xl flex flex-col w-full max-w-[480px] min-h-screen sm:min-h-[fit-content] shadow-2xl">

                {/* Header */}
                <div className="flex flex-col items-center justify-center px-5 py-8 border-b border-primary/10 bg-brand-yellow sm:rounded-t-3xl">
                    <LuPackage className="text-4xl text-primary mb-2 opacity-80" />
                    <h1 className="text-2xl font-extrabold text-primary">Form Pemesanan</h1>
                    <p className="text-primary/60 text-sm mt-1">Silakan isi detail pesanan Anda</p>
                </div>

                {/* Form */}
                <div className="flex-1 px-5 py-6 space-y-6">

                    {/* Customer Name */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-primary/60">Nama Customer *</label>
                        <input
                            className="w-full h-11 px-4 rounded-xl border-2 border-primary/10 bg-primary/5 text-primary text-sm font-medium focus:outline-none focus:border-primary/30"
                            placeholder="Nama pemesan"
                            autoCapitalize="words"
                            value={form.customer_name}
                            onChange={e => setForm(f => ({ ...f, customer_name: toTitleCase(e.target.value) }))}
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
                        <div className="w-36 space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-primary/60">Waktu *</label>
                            <div className="flex gap-1 h-11 rounded-xl border-2 border-primary/10 bg-primary/5 overflow-hidden">
                                <select
                                    value={form.pickup_time.split(':')[0] ?? '11'}
                                    onChange={e => {
                                        const mm = form.pickup_time.split(':')[1] ?? '00';
                                        setForm(f => ({ ...f, pickup_time: `${e.target.value}:${mm}` }));
                                    }}
                                    className="flex-1 bg-transparent text-primary text-sm font-medium text-center focus:outline-none appearance-none m-0 p-0"
                                >
                                    {[11, 12, 13, 14, 15, 16, 17].map(hNum => {
                                        const h = String(hNum).padStart(2, '0');
                                        return <option key={h} value={h}>{h}</option>;
                                    })}
                                </select>
                                <span className="flex items-center text-primary font-black text-sm">:</span>
                                <select
                                    value={form.pickup_time.split(':')[1] ?? '00'}
                                    onChange={e => {
                                        const hh = form.pickup_time.split(':')[0] ?? '11';
                                        setForm(f => ({ ...f, pickup_time: `${hh}:${e.target.value}` }));
                                    }}
                                    className="flex-1 bg-transparent text-primary text-sm font-medium text-center focus:outline-none appearance-none m-0 p-0"
                                >
                                    {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
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
                                <div className="flex gap-2">
                                    {/* Box Type */}
                                    <div className="flex rounded-xl overflow-hidden border-2 border-primary/10">
                                        {(['FULL', 'HALF'] as const).map(bt => (
                                            <button
                                                key={bt}
                                                onClick={() => setForm(f => ({ ...f, pesanan: f.pesanan.map((p, i) => i === idx ? { ...p, box_type: bt } : p) }))}
                                                className={`px-3 py-2 text-[10px] font-black uppercase transition-all ${item.box_type === bt ? 'bg-primary text-brand-yellow' : 'text-primary/50 hover:bg-black/5'
                                                    }`}
                                            >{bt}</button>
                                        ))}
                                    </div>
                                    {/* Qty */}
                                    <div className="flex items-center gap-2 bg-white rounded-xl border-2 border-primary/10 px-2 sm:px-3">
                                        <button onClick={() => setForm(f => ({ ...f, pesanan: f.pesanan.map((p, i) => i === idx ? { ...p, qty: Math.max(1, p.qty - 1) } : p) }))} className="text-primary font-black text-lg w-7 sm:w-6 h-full min-h-[38px] flex items-center justify-center hover:bg-black/5 rounded-md">−</button>
                                        <span className="text-sm font-black text-primary w-5 text-center">{item.qty}</span>
                                        <button onClick={() => setForm(f => ({ ...f, pesanan: f.pesanan.map((p, i) => i === idx ? { ...p, qty: p.qty + 1 } : p) }))} className="text-primary font-black text-lg w-7 sm:w-6 h-full min-h-[38px] flex items-center justify-center hover:bg-black/5 rounded-md">+</button>
                                    </div>
                                    {/* Delete */}
                                    {form.pesanan.length > 1 && (
                                        <button
                                            onClick={() => setForm(f => ({ ...f, pesanan: f.pesanan.filter((_, i) => i !== idx) }))}
                                            className="ml-auto w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                        >
                                            <LuTrash2 className="text-sm" />
                                        </button>
                                    )}
                                </div>
                                {/* Item name as Dropdown */}
                                <div className="relative">
                                    <select
                                        className="w-full h-11 min-h-[44px] px-4 pr-10 rounded-xl border-2 border-primary/10 bg-white text-primary text-sm font-medium focus:outline-none focus:border-primary/30 appearance-none"
                                        value={item.name}
                                        onChange={e => setForm(f => ({ ...f, pesanan: f.pesanan.map((p, i) => i === idx ? { ...p, name: e.target.value } : p) }))}
                                    >
                                        <option value="">Pilih varian menu...</option>
                                        {variants
                                            .filter(v => v.is_active)
                                            .map(v => (
                                                <option key={v.id} value={v.variant_name}>{v.variant_name}</option>
                                            ))}
                                    </select>
                                    <LuChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-primary/40" />
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
                                className="w-full h-11 min-h-[44px] px-4 pr-10 rounded-xl border-2 border-primary/10 bg-primary/5 text-primary text-sm font-medium focus:outline-none focus:border-primary/30 appearance-none"
                            >
                                <option value="">Pilih metode pembayaran (Opsional)</option>
                                <option value="TRANSFER">Transfer</option>
                                <option value="CASH">Cash</option>
                            </select>
                            <LuChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-primary/40" />
                        </div>
                    </div>

                    {/* Note */}
                    <div className="space-y-1.5 pb-4">
                        <label className="text-[10px] font-black uppercase tracking-wider text-primary/60">Catatan (opsional)</label>
                        <textarea
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border-2 border-primary/10 bg-primary/5 text-primary text-sm font-medium focus:outline-none focus:border-primary/30 resize-none"
                            placeholder="Tambahan info pesan..."
                            value={form.note}
                            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                        />
                    </div>

                    {/* Total Estimasi */}
                    {menus.length > 0 && (
                        <div className="flex justify-between items-end pt-2">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-wider text-primary/60">Estimasi Total</span>
                                <span className="text-xs text-primary/40 font-medium leading-tight">Berdasarkan pilihan box</span>
                            </div>
                            <span className="text-xl font-extrabold text-primary">
                                Rp {form.pesanan.reduce((sum, item) => sum + (menus.find(m => m.name === item.box_type)?.price || 0) * item.qty, 0).toLocaleString('id-ID')}
                            </span>
                        </div>
                    )}
                </div>

                {/* Submit */}
                <div className="px-5 py-5 border-t border-primary/10 bg-white sm:rounded-b-3xl mt-auto">
                    <button
                        onClick={handleReviewOrder}
                        disabled={submitting}
                        className="w-full h-13 bg-primary text-brand-yellow font-extrabold text-[15px] rounded-2xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 py-3.5"
                    >
                        {submitting ? 'Mengirim Pesanan...' : 'Kirim Pesanan Sekarang'}
                    </button>
                </div>
            </div>

            {/* Confirmation Bottom Sheet Overlay */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm sm:items-center sm:justify-center">
                    <div className="bg-white w-full max-w-[480px] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
                        <h2 className="text-xl font-extrabold text-primary mb-1">Konfirmasi Pesanan</h2>
                        <p className="text-sm text-primary/60 mb-5">Mohon cek kembali detail pesanan Anda</p>

                        <div className="space-y-4 mb-6">
                            <div className="p-4 bg-primary/5 rounded-2xl space-y-3 text-sm">
                                <div className="flex justify-between border-b border-primary/10 pb-2">
                                    <span className="text-primary/60">Nama</span>
                                    <span className="font-bold text-primary text-right">{form.customer_name}</span>
                                </div>
                                <div className="flex justify-between border-b border-primary/10 pb-2">
                                    <span className="text-primary/60">Pengambilan</span>
                                    <span className="font-bold text-primary text-right">{form.pickup_date} <br /> Pukul {form.pickup_time}</span>
                                </div>
                                <div className="flex justify-between border-b border-primary/10 pb-2">
                                    <span className="text-primary/60">Metode</span>
                                    <span className="font-bold text-primary text-right">{form.payment_method || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase text-primary/60 block mb-2">Daftar Menu</span>
                                    <div className="space-y-3">
                                        {form.pesanan.filter(p => p.name.trim().length > 0 && p.qty > 0).map((item, idx) => {
                                            const normName = normalizeVariant(item.name);
                                            const price = menus.find(m => m.name === item.box_type)?.price || 0;
                                            return (
                                                <div key={idx} className="flex justify-between items-start gap-3">
                                                    <div className="flex-1">
                                                        <div className="font-bold text-primary">{item.qty}x Box {item.box_type === 'FULL' ? 'Besar' : 'Kecil'}</div>
                                                        <div className="text-xs text-primary/70">{normName}</div>
                                                    </div>
                                                    <div className="font-bold text-primary whitespace-nowrap">
                                                        Rp {(price * item.qty).toLocaleString('id-ID')}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                {menus.length > 0 && (
                                    <div className="flex justify-between pt-3 border-t border-primary/10 mt-2">
                                        <span className="font-black text-primary">Total Estimasi</span>
                                        <span className="font-black text-primary text-lg">
                                            Rp {form.pesanan.reduce((sum, item) => sum + (menus.find(m => m.name === item.box_type)?.price || 0) * item.qty, 0).toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                disabled={submitting}
                                className="flex-1 py-3.5 rounded-xl font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-all text-sm"
                            >
                                Cek Lagi
                            </button>
                            <button
                                onClick={submitOrder}
                                disabled={submitting}
                                className="flex-1 py-3.5 rounded-xl font-bold text-brand-yellow bg-primary hover:bg-primary/90 transition-all text-sm shadow-lg disabled:opacity-50"
                            >
                                {submitting ? 'Memproses...' : 'Kirim Pesanan!'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
