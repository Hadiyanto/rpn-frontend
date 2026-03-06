'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
    LuPlus,
    LuTrash2,
    LuChevronDown,
    LuPackage,
    LuCheck,
    LuLayoutGrid,
    LuLayoutTemplate,
    LuGift,
    LuTruck,
    LuStore,
    LuMapPin,
    LuRefreshCw,
} from 'react-icons/lu';
import { MdClose } from 'react-icons/md';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// Leaflet map loaded client-side only
const LeafletMap = dynamic(() => import('@/components/LeafletMap'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const ORIGIN_AREA_ID = 'IDNP6IDNC148IDND841IDZ12750'; // Pancoran, Jakarta Selatan

interface OrderItem {
    box_type: 'FULL' | 'HALF' | 'HAMPERS';
    name: string;
    qty: number;
    isExpanded?: boolean;
}

type DeliveryMethod = 'pickup' | 'customer_delivery' | 'store_delivery';

const emptyItem = (): OrderItem => ({ box_type: 'FULL', name: '', qty: 1, isExpanded: false });

function toTitleCase(str: string) {
    return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function getTodayStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function normalizeVariant(name: string) {
    if (!name) return name;
    let n = name.replace(/Dengan/g, 'Dan').trim();
    if (n.includes(' Dan ') && !n.startsWith('Mix ')) n = 'Mix ' + n;
    if (n.startsWith('Mix ')) {
        const parts = n.replace('Mix ', '').split(' Dan ').map(p => p.trim()).sort();
        return 'Mix ' + parts.join(' Dan ');
    }
    return n;
}

const DELIVERY_OPTIONS: { key: DeliveryMethod; label: string; desc: string; icon: any; hidden?: boolean }[] = [
    { key: 'pickup', label: 'Pick Up Sendiri', desc: 'Customer datang langsung ke toko', icon: LuStore },
    { key: 'customer_delivery', label: 'Delivery Sendiri', desc: 'Customer atur kurir sendiri', icon: LuTruck },
    { key: 'store_delivery', label: 'Store Delivery', desc: 'Toko yang mengirim ke customer', icon: LuMapPin, hidden: true },
];

export default function OrderPage() {
    const [submitting, setSubmitting] = useState(false);
    const [submittedOrder, setSubmittedOrder] = useState<any>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [toast, setToast] = useState<{ title: string; body: string; type: 'success' | 'error' | 'info' } | null>(null);

    const [shippingFee, setShippingFee] = useState<number | null>(null);
    const [shippingLoading, setShippingLoading] = useState(false);

    const showToast = (title: string, body: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ title, body, type });
        setTimeout(() => setToast(null), 3000);
    };

    const [form, setForm] = useState({
        customer_name: '',
        customer_phone: '',
        pickup_date: '',
        pickup_time: ':',
        note: '',
        payment_method: '' as '' | 'TRANSFER' | 'CASH',
        pesanan: [emptyItem()],
    });

    // Delivery state
    const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('pickup');
    const [destLat, setDestLat] = useState<number | null>(null);
    const [destLng, setDestLng] = useState<number | null>(null);
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [driverNote, setDriverNote] = useState('');
    const [postalCode, setPostalCode] = useState<number | null>(null);
    const [areaResults, setAreaResults] = useState<any[]>([]);
    const [selectedArea, setSelectedArea] = useState<any>(null);
    const [areaLoading, setAreaLoading] = useState(false);

    const [menus, setMenus] = useState<any[]>([]);
    const [variants, setVariants] = useState<any[]>([]);
    const [quotas, setQuotas] = useState<any[]>([]);
    const [availableHours, setAvailableHours] = useState<any[]>([]);

    useEffect(() => {
        Promise.all([
            fetch(`${API_URL}/api/menu`).then(r => r.json()),
            fetch(`${API_URL}/api/variants`).then(r => r.json()),
            fetch(`${API_URL}/api/daily-quota`).then(r => r.json()),
        ]).then(([mjson, vjson, qjson]) => {
            if (mjson.status === 'ok') setMenus(mjson.data);
            if (vjson.status === 'ok') setVariants(vjson.data);
            if (qjson.status === 'ok') setQuotas(qjson.data);
        }).catch(console.error);
    }, []);

    // Hourly quota check disabled — all active hours are treated as available
    // useEffect(() => {
    //     if (!form.pickup_date) { setAvailableHours([]); return; }
    //     fetch(`${API_URL}/api/hourly-quota/availability?date=${form.pickup_date}`)
    //         .then(r => r.json()).then(json => { if (json.status === 'ok') setAvailableHours(json.data); })
    //         .catch(console.error);
    // }, [form.pickup_date]);

    // Reverse geocode when pin dropped — fills address, extracts postal_code, auto-searches Biteship area
    const onMapClick = useCallback(async (lat: number, lng: number) => {
        setDestLat(lat);
        setDestLng(lng);
        setSelectedArea(null);
        setAreaResults([]);
        try {
            const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=id`);
            const json = await r.json();
            const addr = json.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            setDeliveryAddress(addr);

            const pc = json.address?.postcode ? Number(json.address.postcode) : null;
            setPostalCode(pc);

            // Persist to localStorage
            try {
                localStorage.setItem('rpn_delivery_pin', JSON.stringify({
                    lat, lng,
                    postal_code: pc,
                    address: addr,
                    saved_at: new Date().toISOString(),
                }));
            } catch { /* localStorage not available */ }

            // Auto-search Biteship areas using postal code
            if (pc) {
                setAreaLoading(true);
                try {
                    const ar = await fetch(`${API_URL}/api/biteship/areas?search=${pc}`);
                    const aj = await ar.json();
                    setAreaResults(aj.data ?? []);
                } catch { setAreaResults([]); }
                finally { setAreaLoading(false); }
            }
        } catch {
            setDeliveryAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
    }, []);

    const getBiteshipItems = useCallback(() => {
        return form.pesanan
            .filter(p => !!p.name)
            .map(item => ({
                name: `${item.box_type === 'FULL' ? 'Full Box' : item.box_type === 'HALF' ? 'Half Box' : 'Hampers'} - ${item.name}`,
                description: `RPN ${item.box_type}`,
                value: 50000,
                length: item.box_type === 'FULL' ? 20 : 10,
                width: item.box_type === 'FULL' ? 20 : 10,
                height: 10,
                weight: item.box_type === 'FULL' ? 1000 : 500,
                quantity: item.qty || 1
            }));
    }, [form.pesanan]);

    // Auto-fetch shipping rates when conditions are met
    useEffect(() => {
        if (deliveryMethod !== 'store_delivery') {
            setShippingFee(null);
            return;
        }

        const validItems = getBiteshipItems();
        if (!destLat || !destLng || validItems.length === 0) {
            setShippingFee(null);
            return;
        }

        const fetchRates = async () => {
            setShippingLoading(true);
            try {
                const payload = {
                    origin_area_id: ORIGIN_AREA_ID,
                    destination_latitude: destLat,
                    destination_longitude: destLng,
                    couriers: 'grab',
                    items: validItems,
                };

                const res = await fetch(`${API_URL}/api/biteship/rates`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                const json = await res.json();
                if (json.status === 'ok' && Array.isArray(json.data)) {
                    // Find the "instant" courier option
                    const instantRate = json.data.find((r: any) => r.type === 'instant');
                    if (instantRate) {
                        setShippingFee(instantRate.price);
                    } else {
                        setShippingFee(null);
                        console.warn('No instant rate found in Biteship data', json.data);
                    }
                } else {
                    setShippingFee(null);
                    console.error('Biteship rates error:', json);
                }
            } catch (err) {
                console.error('Failed to fetch shipping rates:', err);
                setShippingFee(null);
            } finally {
                setShippingLoading(false);
            }
        };

        // Add a slight debounce to avoid slamming the API repeatedly while users change qty
        const timeoutId = setTimeout(() => {
            fetchRates();
        }, 800);

        return () => clearTimeout(timeoutId);
    }, [deliveryMethod, destLat, destLng, getBiteshipItems]);

    const filterPassedDates = (time: Date) => {
        const y = time.getFullYear(), m = String(time.getMonth() + 1).padStart(2, '0'), d = String(time.getDate()).padStart(2, '0');
        // If quotas haven't loaded yet, allow all dates (graceful fallback)
        if (quotas.length === 0) return true;
        const q = quotas.find(q => q.date === `${y}-${m}-${d}`);
        return q ? (q.remaining_qty > 0 || (q.remaining_hampers_qty || 0) > 0) : false;
    };

    // Hourly quota disabled: always return true so all hours are selectable
    const getIsHourAvailable = (_hStr: string) => true;

    const handleReviewOrder = () => {
        setErrorMessage('');
        if (!form.customer_name.trim()) { setErrorMessage('Nama customer wajib diisi'); return window.scrollTo({ top: 0, behavior: 'smooth' }); }
        if (!form.customer_phone.trim()) { setErrorMessage('Nomor WhatsApp wajib diisi'); return window.scrollTo({ top: 0, behavior: 'smooth' }); }
        if (!form.pickup_date) { setErrorMessage('Tanggal pickup wajib diisi'); return window.scrollTo({ top: 0, behavior: 'smooth' }); }
        const [hh, mm] = form.pickup_time.split(':');
        if (!hh || !mm) { setErrorMessage('Waktu pickup wajib dipilih'); return window.scrollTo({ top: 0, behavior: 'smooth' }); }
        if (!form.payment_method) { setErrorMessage('Metode pembayaran wajib dipilih'); return window.scrollTo({ top: 0, behavior: 'smooth' }); }
        if (deliveryMethod === 'store_delivery') {
            if (!deliveryAddress.trim()) { setErrorMessage('Alamat pengiriman wajib diisi'); return window.scrollTo({ top: 0, behavior: 'smooth' }); }
            if (!destLat || !destLng) { setErrorMessage('Silakan tandai lokasi di peta'); return window.scrollTo({ top: 0, behavior: 'smooth' }); }
        }
        const validItems = form.pesanan.filter(p => p.name.trim().length > 0 && p.qty > 0);
        if (validItems.length === 0) { setErrorMessage('Minimal 1 pesanan wajib diisi'); return window.scrollTo({ top: 0, behavior: 'smooth' }); }
        setShowConfirm(true);
    };

    const submitOrder = async () => {
        setSubmitting(true);
        setErrorMessage('');
        try {
            const validItems = form.pesanan
                .filter(p => p.name.trim().length > 0 && p.qty > 0)
                .map(item => ({ ...item, name: normalizeVariant(item.name) }));

            // Build note — plain now, delivery stored in separate columns
            const noteStr = form.note.trim() || null;

            const payload = {
                ...form,
                note: noteStr,
                pesanan: validItems,
                delivery_method: deliveryMethod,
                delivery_lat: destLat,
                delivery_lng: destLng,
                delivery_address: deliveryAddress.trim() || null,
                delivery_driver_note: driverNote.trim() || null,
                delivery_area_id: selectedArea?.id || null,
            };

            const res = await fetch(`${API_URL}/api/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (json.status === 'ok') {
                setShowConfirm(false);
                setSubmittedOrder(json.data);
            } else {
                setShowConfirm(false);
                setErrorMessage(json.message || 'Gagal menyimpan pesanan');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch {
            setShowConfirm(false);
            setErrorMessage('Gagal menghubungi server');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setSubmittedOrder(null);
        setForm({ customer_name: '', customer_phone: '', pickup_date: '', pickup_time: ':', note: '', payment_method: '', pesanan: [emptyItem()] });
        setDeliveryMethod('pickup');
        setDestLat(null); setDestLng(null); setDeliveryAddress(''); setDriverNote('');
        setPostalCode(null); setAreaResults([]); setSelectedArea(null);
    };

    if (submittedOrder) {
        return (
            <div className="bg-brand-yellow font-display text-primary min-h-screen flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-[480px] bg-white rounded-3xl p-8 shadow-xl">
                    <div className="text-center mb-6">
                        <LuCheck className="text-6xl text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-extrabold text-primary mb-2">Pesanan Dibuat!</h2>
                        <p className="text-primary/70">Order <strong>#{submittedOrder.id}</strong> — {submittedOrder.customer_name}</p>
                    </div>
                    <div className="bg-primary/5 rounded-2xl p-4 mb-6 space-y-3 text-sm">
                        {[
                            { label: 'Status', value: submittedOrder.status },
                            { label: 'Metode Bayar', value: submittedOrder.payment_method },
                            { label: 'Jadwal', value: `${submittedOrder.pickup_date} · ${submittedOrder.pickup_time}` },
                        ].map(({ label, value }) => (
                            <div key={label} className="flex justify-between border-b border-primary/10 pb-2">
                                <span className="text-primary/50">{label}</span>
                                <span className="font-bold text-primary">{value ?? '-'}</span>
                            </div>
                        ))}
                        <div>
                            <span className="text-[10px] font-black uppercase text-primary/40 block mb-2">Pesanan</span>
                            {submittedOrder.items?.map((item: any, i: number) => (
                                <div key={i} className="flex justify-between text-xs py-1">
                                    <span className="text-primary/70">{item.qty}x {item.box_type === 'FULL' ? 'Box Besar' : item.box_type === 'HALF' ? 'Box Kecil' : 'Hampers'} · {item.name}</span>
                                    <span className="font-bold text-primary">Rp {((menus.find(m => m.name === item.box_type)?.price || 0) * item.qty).toLocaleString('id-ID')}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between pt-2 border-t border-primary/10">
                            <span className="font-black text-primary">Total</span>
                            <span className="font-black text-primary">Rp {submittedOrder.items?.reduce((s: number, i: any) => s + (menus.find(m => m.name === i.box_type)?.price || 0) * i.qty, 0).toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                    <button onClick={resetForm} className="w-full py-3.5 bg-primary text-brand-yellow font-extrabold rounded-2xl shadow-lg">
                        Buat Pesanan Baru
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-brand-yellow font-display text-primary min-h-screen flex flex-col items-center p-0 sm:p-4 sm:py-8">
            <div className="relative bg-white rounded-none sm:rounded-3xl flex flex-col w-full max-w-[480px] min-h-screen sm:min-h-fit shadow-2xl">

                {/* Header */}
                <div className="flex flex-col items-center justify-center px-5 py-8 border-b border-primary/10 bg-brand-yellow sm:rounded-t-3xl">
                    <LuPackage className="text-4xl text-primary mb-2 opacity-80" />
                    <h1 className="text-2xl font-extrabold text-primary">Form Pesanan</h1>
                    <p className="text-primary/60 text-sm mt-1">Silakan isi detail pesanan Anda</p>
                </div>

                <div className="flex-1 px-5 py-6 space-y-6">

                    {errorMessage && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-semibold animate-in fade-in slide-in-from-top-2">
                            {errorMessage}
                        </div>
                    )}

                    {/* Customer Name */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-primary/60">Nama Customer *</label>
                        <input className="w-full h-11 px-4 rounded-xl border-2 border-primary/10 bg-primary/5 text-primary text-sm font-medium focus:outline-none focus:border-primary/30" placeholder="Nama pemesan" autoCapitalize="words" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: toTitleCase(e.target.value) }))} />
                    </div>

                    {/* Customer Phone */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-primary/60">Nomor WhatsApp *</label>
                        <input type="tel" className="w-full h-11 px-4 rounded-xl border-2 border-primary/10 bg-primary/5 text-primary text-sm font-medium focus:outline-none focus:border-primary/30" placeholder="Contoh: 081234567890" value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value.replace(/[^0-9]/g, '') }))} />
                    </div>

                    {/* Pickup Date & Time */}
                    <div className="flex gap-3">
                        <div className="flex-1 space-y-1.5 flex flex-col">
                            <label className="text-[10px] font-black uppercase tracking-wider text-primary/60">Tanggal Pickup *</label>
                            <div className="flex-1 min-h-[44px]">
                                <DatePicker selected={form.pickup_date ? new Date(`${form.pickup_date}T00:00:00`) : null} onChange={(date: Date | null) => { if (date) { const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000); setForm(f => ({ ...f, pickup_date: local.toISOString().split('T')[0] })); } }} filterDate={filterPassedDates} dateFormat="dd/MM/yyyy" className="w-full h-11 px-4 rounded-xl border-2 border-primary/10 bg-primary/5 text-primary text-sm font-medium focus:outline-none focus:border-primary/30" placeholderText="Pilih Tanggal" />
                            </div>
                        </div>
                        <div className="w-36 space-y-1.5 relative">
                            <label className="text-[10px] font-black uppercase tracking-wider text-primary/60">Waktu *</label>
                            <button type="button" onClick={() => setShowTimePicker(!showTimePicker)} className="w-full h-11 px-4 flex items-center justify-center gap-1 rounded-xl border-2 border-primary/10 bg-primary/5 hover:bg-primary/10 transition-colors text-primary text-sm font-extrabold focus:outline-none focus:border-primary/30">
                                <span>{form.pickup_time.split(':')[0] || '--'}</span>
                                <span className="opacity-50">:</span>
                                <span>{form.pickup_time.split(':')[1] || '--'}</span>
                                <LuChevronDown className={`ml-auto transition-transform ${showTimePicker ? 'rotate-180' : ''}`} />
                            </button>
                            {showTimePicker && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowTimePicker(false)} />
                                    <div className="absolute top-[calc(100%+8px)] right-0 w-48 bg-white rounded-2xl shadow-2xl border-2 border-primary/5 z-20 flex overflow-hidden animate-in zoom-in-95 duration-200">
                                        <div className="flex-1 border-r border-primary/5 max-h-56 overflow-y-auto">
                                            <div className="sticky top-0 bg-white/90 backdrop-blur pb-2 pt-3"><div className="text-[10px] font-black uppercase text-primary/40 text-center">Jam</div></div>
                                            <div className="p-1.5 space-y-0.5">
                                                {[11, 12, 13, 14, 15, 16, 17].map(hNum => {
                                                    const hDisplay = String(hNum).padStart(2, '0');
                                                    const isSelected = form.pickup_time.split(':')[0] === hDisplay;
                                                    const isAvail = getIsHourAvailable(hDisplay + ':00');
                                                    return (
                                                        <button key={hDisplay} type="button" disabled={!isAvail} onClick={() => { const mm = form.pickup_time.split(':')[1] || '00'; setForm(f => ({ ...f, pickup_time: `${hDisplay}:${mm}` })); }}
                                                            className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${!isAvail ? 'opacity-30 cursor-not-allowed' : isSelected ? 'bg-primary text-brand-yellow' : 'text-primary/70 hover:bg-primary/5'}`}>
                                                            {hDisplay}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="flex-1 max-h-56 overflow-y-auto">
                                            <div className="sticky top-0 bg-white/90 backdrop-blur pb-2 pt-3"><div className="text-[10px] font-black uppercase text-primary/40 text-center">Menit</div></div>
                                            <div className="p-1.5 space-y-0.5">
                                                {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => {
                                                    const isSelected = form.pickup_time.split(':')[1] === m;
                                                    return <button key={m} type="button" onClick={() => { const hh = form.pickup_time.split(':')[0] || '11'; setForm(f => ({ ...f, pickup_time: `${hh}:${m}` })); }} className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${isSelected ? 'bg-primary text-brand-yellow' : 'text-primary/70 hover:bg-primary/5'}`}>{m}</button>;
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
                        <label className="text-[10px] font-black uppercase tracking-wider text-primary/60">Pesanan *</label>
                        {form.pesanan.map((item, idx) => (
                            <div key={idx} className="bg-primary/5 rounded-2xl p-4 space-y-3">
                                <div className="flex justify-between items-center pb-2 border-b border-primary/5">
                                    <span className="text-[11px] font-black uppercase text-primary/60 tracking-widest">Item #{idx + 1}</span>
                                    {form.pesanan.length > 1 && (
                                        <button onClick={() => setForm(f => ({ ...f, pesanan: f.pesanan.filter((_, i) => i !== idx) }))} className="text-[10px] font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-lg hover:bg-red-100 flex items-center gap-1">
                                            <LuTrash2 /> Hapus
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-2 flex-1">
                                        {(['FULL', 'HALF', 'HAMPERS'] as const).map(bt => {
                                            const isSelected = item.box_type === bt;
                                            const menuData = menus.find(m => m.name === bt);
                                            const priceStr = menuData ? `Rp ${menuData.price / 1000}k` : '...';
                                            const Icon = bt === 'HALF' ? LuLayoutTemplate : bt === 'HAMPERS' ? LuGift : LuLayoutGrid;
                                            return (
                                                <button key={bt} onClick={() => setForm(f => ({ ...f, pesanan: f.pesanan.map((p, i) => { if (i !== idx) return p; if (p.box_type === bt) return p; return { ...p, box_type: bt, name: '' }; }) }))}
                                                    className={`flex-1 min-w-[65px] rounded-xl p-2.5 flex flex-col items-center relative transition-all shadow-sm border-2 ${isSelected ? 'bg-white border-blue-600' : 'bg-white/50 border-primary/10 opacity-70 hover:opacity-100'}`}>
                                                    {isSelected && <div className="absolute -top-1.5 -right-1.5 bg-blue-600 rounded-full h-4 w-4 flex items-center justify-center shadow-sm"><LuCheck className="text-[10px] text-white stroke-[3]" /></div>}
                                                    <Icon className={`text-[22px] mb-1.5 ${isSelected ? 'text-primary' : 'text-primary/40'}`} />
                                                    <span className={`text-[10px] font-black uppercase tracking-tight leading-none ${isSelected ? 'text-primary' : 'text-primary/60'}`}>{bt}</span>
                                                    <span className={`text-[9px] font-medium mt-1 ${isSelected ? 'text-primary/70' : 'text-primary/40'}`}>{priceStr}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-white rounded-xl border-2 border-primary/10 px-1 py-1 shadow-sm shrink-0">
                                        <button onClick={() => setForm(f => ({ ...f, pesanan: f.pesanan.map((p, i) => i === idx ? { ...p, qty: Math.max(1, p.qty - 1) } : p) }))} className="text-primary font-black text-sm w-7 h-9 flex items-center justify-center hover:bg-black/5 rounded-lg">−</button>
                                        <span className="text-[13px] font-black text-primary min-w-[16px] text-center">{item.qty}</span>
                                        <button onClick={() => setForm(f => ({ ...f, pesanan: f.pesanan.map((p, i) => i === idx ? { ...p, qty: p.qty + 1 } : p) }))} className="text-primary font-black text-sm w-7 h-9 flex items-center justify-center hover:bg-black/5 rounded-lg">+</button>
                                    </div>
                                </div>
                                <div className="pt-2">
                                    <div className="flex flex-col gap-2">
                                        {/* Toggle Collapse Button */}
                                        <button
                                            onClick={() => setForm(f => ({ ...f, pesanan: f.pesanan.map((p, i) => i === idx ? { ...p, isExpanded: !p.isExpanded } : p) }))}
                                            className="flex flex-col w-full text-left bg-white border-2 border-primary/10 rounded-xl p-3 hover:border-primary/30 transition-all shadow-sm"
                                        >
                                            <div className="flex justify-between items-center w-full">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-primary/60">
                                                    Pilih Rasa (Max {item.box_type === 'HAMPERS' ? 3 : item.box_type === 'FULL' ? 2 : 1} Varian)
                                                </span>
                                                <LuChevronDown className={`text-primary/40 transition-transform duration-200 ${item.isExpanded ? 'rotate-180' : ''}`} />
                                            </div>

                                            {/* Preview selected flavors when collapsed */}
                                            {!item.isExpanded && (
                                                <div className="mt-1.5">
                                                    {item.name ? (
                                                        <span className="text-sm font-bold text-primary line-clamp-2">{item.name}</span>
                                                    ) : (
                                                        <span className="text-xs font-semibold text-red-500">* Belum ada rasa yang dipilih</span>
                                                    )}
                                                </div>
                                            )}
                                        </button>

                                        {/* Collapsible Content */}
                                        <div className={`transition-all duration-300 overflow-hidden ${item.isExpanded ? 'opacity-100 max-h-[1000px] mt-1' : 'opacity-0 max-h-0'}`}>
                                            <div className="grid grid-cols-2 gap-2">
                                                {variants.filter(v => v.is_active).map(v => {
                                                    const maxFlavors = item.box_type === 'HAMPERS' ? 3 : item.box_type === 'FULL' ? 2 : 1;
                                                    let selectedFlavors: string[] = item.name ? (item.name.startsWith('Mix ') ? item.name.replace('Mix ', '').split(' Dan ') : [item.name]) : [];
                                                    const isChecked = selectedFlavors.includes(v.variant_name);
                                                    const isDisabled = !isChecked && selectedFlavors.length >= maxFlavors;
                                                    return (
                                                        <label key={v.id} className={`relative flex items-center gap-2 p-2 rounded-xl border-2 transition-all cursor-pointer ${isChecked ? 'border-primary bg-primary/5 text-primary' : isDisabled ? 'border-primary/5 bg-primary/5 text-primary/30 opacity-50 cursor-not-allowed' : 'border-primary/10 bg-white text-primary/70 hover:border-primary/30'}`}>
                                                            <input type="checkbox" className="peer sr-only" checked={isChecked} disabled={isDisabled} onChange={e => {
                                                                let newFlavors = [...selectedFlavors];
                                                                if (e.target.checked) { if (newFlavors.length < maxFlavors) newFlavors.push(v.variant_name); }
                                                                else { newFlavors = newFlavors.filter(f => f !== v.variant_name); }
                                                                let newName = newFlavors.length > 1 ? `Mix ${[...newFlavors].sort().join(' Dan ')}` : newFlavors[0] || '';
                                                                setForm(f => ({ ...f, pesanan: f.pesanan.map((p, i) => i === idx ? { ...p, name: newName } : p) }));
                                                            }} />
                                                            <div className={`w-4 h-4 rounded flex items-center justify-center border-2 transition-colors ${isChecked ? 'bg-primary border-primary text-brand-yellow' : 'border-primary/20'}`}>
                                                                {isChecked && <LuCheck className="text-[10px] stroke-[4]" />}
                                                            </div>
                                                            <span className="text-xs font-bold leading-tight select-none flex-1 line-clamp-2 break-words text-left">{v.variant_name}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                            {!item.name && item.isExpanded && <p className="text-[10px] text-red-500 font-bold mt-2">* Silahkan pilih minimal 1 rasa</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={() => setForm(f => ({ ...f, pesanan: [...f.pesanan, emptyItem()] }))}
                            className="flex items-center justify-center gap-1.5 w-full py-3 text-[11px] font-black text-primary bg-primary/10 rounded-2xl hover:bg-primary/20 transition-colors"
                        >
                            <LuPlus className="text-sm" /> Tambah Item
                        </button>
                    </div>

                    {/* Catatan Pesanan — above payment */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-primary/60">Catatan Pesanan (opsional)</label>
                        <textarea rows={3} className="w-full px-4 py-3 rounded-xl border-2 border-primary/10 bg-primary/5 text-primary text-sm font-medium focus:outline-none focus:border-primary/30 resize-none" placeholder="Tambahan info pesanan..." value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
                    </div>

                    {/* Payment Method — REQUIRED */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-primary/60">Metode Pembayaran *</label>
                        <div className="relative">
                            <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value as typeof form.payment_method }))} className="w-full h-11 px-4 pr-10 rounded-xl border-2 border-primary/10 bg-primary/5 text-primary text-sm font-medium focus:outline-none focus:border-primary/30 appearance-none">
                                <option value="">Pilih metode pembayaran</option>
                                <option value="TRANSFER">Transfer</option>
                                <option value="CASH">Cash</option>
                            </select>
                            <LuChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-primary/40" />
                        </div>
                    </div>

                    {/* Delivery Method */}
                    <div className="hidden space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-wider text-primary/60">Metode Pengambilan *</label>
                        <div className="space-y-2">
                            {DELIVERY_OPTIONS.filter(d => !d.hidden).map(({ key, label, desc, icon: Icon }) => {
                                const isSelected = deliveryMethod === key;
                                return (
                                    <button key={key} onClick={() => setDeliveryMethod(key)}
                                        className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all ${isSelected ? 'border-primary bg-primary text-brand-yellow' : 'border-primary/10 bg-primary/5 text-primary hover:border-primary/30'}`}>
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-brand-yellow/20' : 'bg-white/70'}`}>
                                            <Icon className={`text-lg ${isSelected ? 'text-brand-yellow' : 'text-primary/60'}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-extrabold ${isSelected ? 'text-brand-yellow' : 'text-primary'}`}>{label}</p>
                                            <p className={`text-xs font-medium ${isSelected ? 'text-brand-yellow/70' : 'text-primary/50'}`}>{desc}</p>
                                        </div>
                                        {isSelected && <LuCheck className="text-brand-yellow shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Store Delivery — Map & Address Section */}
                        {deliveryMethod === 'store_delivery' && (
                            <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className={`rounded-2xl overflow-hidden border border-primary/10 shadow-md ${showConfirm ? 'hidden' : ''}`} style={{ height: 260 }}>
                                    <LeafletMap destLat={destLat} destLng={destLng} onMapClick={onMapClick} />
                                </div>

                                {destLat && destLng && (
                                    <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
                                        <LuMapPin className="text-green-600 mt-0.5 shrink-0" size={14} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-green-700 uppercase mb-0.5">Koordinat Dipilih</p>
                                            <p className="text-xs font-medium text-green-700">{destLat.toFixed(6)}, {destLng.toFixed(6)}</p>
                                        </div>
                                    </div>
                                )}

                                {!destLat && (
                                    <p className="text-xs text-primary/50 font-medium text-center py-2">
                                        <LuMapPin className="inline mr-1" size={12} />
                                        Tap peta untuk menentukan lokasi pengiriman
                                    </p>
                                )}

                                {/* Delivery Address — auto-filled from pin */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-primary/60">Alamat Lengkap Pengiriman *</label>
                                    <textarea rows={3} value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)}
                                        placeholder="Tap peta untuk mengisi otomatis, atau ketik manual..."
                                        className="w-full px-4 py-3 rounded-xl border-2 border-primary/10 bg-primary/5 text-primary text-sm font-medium focus:outline-none focus:border-primary/30 resize-none" />
                                </div>

                                {/* Catatan untuk driver */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-primary/60">Catatan untuk Driver (opsional)</label>
                                    <textarea rows={2} value={driverNote} onChange={e => setDriverNote(e.target.value)}
                                        placeholder="Contoh: Jangan dikocok, paket mudah pecah..."
                                        className="w-full px-4 py-3 rounded-xl border-2 border-primary/10 bg-primary/5 text-primary text-sm font-medium focus:outline-none focus:border-primary/30 resize-none" />
                                </div>
                            </div>
                        )}
                    </div>



                    {/* Total Estimasi */}
                    {menus.length > 0 && (
                        <div className="pt-2">
                            {deliveryMethod === 'store_delivery' && (destLat && destLng) && (
                                <div className="flex flex-col gap-1.5 mb-3 border-b border-primary/10 pb-3">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-primary/60">Estimasi Pesanan</span>
                                        <span className="text-sm font-bold text-primary">
                                            Rp {form.pesanan.reduce((sum, item) => sum + (menus.find(m => m.name === item.box_type)?.price || 0) * item.qty, 0).toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-primary/60">Ongkir (Grab Instant)</span>
                                            {shippingLoading && <LuRefreshCw size={10} className="animate-spin text-primary/40" />}
                                        </div>
                                        <span className="text-sm font-bold text-primary">
                                            {shippingFee ? `Rp ${shippingFee.toLocaleString('id-ID')}` : '-'}
                                        </span>
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-between items-end">
                                <div><span className="text-[10px] font-black uppercase tracking-wider text-primary/60">Estimasi Total</span></div>
                                <span className="text-xl font-extrabold text-primary">
                                    Rp {(
                                        form.pesanan.reduce((sum, item) => sum + (menus.find(m => m.name === item.box_type)?.price || 0) * item.qty, 0) +
                                        (shippingFee || 0)
                                    ).toLocaleString('id-ID')}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Submit */}
                <div className="px-5 py-5 border-t border-primary/10 bg-white sm:rounded-b-3xl mt-auto">
                    <button onClick={handleReviewOrder} disabled={submitting} className="w-full h-13 bg-primary text-brand-yellow font-extrabold text-[15px] rounded-2xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 py-3.5">
                        {submitting ? 'Mengirim...' : 'Review & Kirim Pesanan'}
                    </button>
                </div>
            </div>

            {/* Confirmation Sheet */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm sm:items-center sm:justify-center">
                    <div className="bg-white w-full max-w-[480px] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-extrabold text-primary mb-1">Konfirmasi Pesanan</h2>
                        <p className="text-sm text-primary/60 mb-5">Mohon cek kembali detail pesanan</p>
                        <div className="p-4 bg-primary/5 rounded-2xl space-y-3 text-sm mb-6">
                            {[
                                { label: 'Nama', value: form.customer_name },
                                { label: 'No. WhatsApp', value: form.customer_phone },
                                { label: 'Jadwal', value: `${form.pickup_date} pukul ${form.pickup_time}` },
                                { label: 'Metode Bayar', value: form.payment_method },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex justify-between border-b border-primary/10 pb-2 gap-4">
                                    <span className="text-primary/50 shrink-0">{label}</span>
                                    <span className="font-bold text-primary text-right">{value || '-'}</span>
                                </div>
                            ))}
                            <div>
                                <span className="text-[10px] font-black uppercase text-primary/60 block mb-2">Daftar Menu</span>
                                {form.pesanan.filter(p => p.name.trim().length > 0 && p.qty > 0).map((item, idx) => {
                                    const price = menus.find(m => m.name === item.box_type)?.price || 0;
                                    return (
                                        <div key={idx} className="flex justify-between items-start gap-3 py-1">
                                            <div>
                                                <div className="font-bold text-primary">{item.qty}x {item.box_type === 'FULL' ? 'Box Besar' : item.box_type === 'HALF' ? 'Box Kecil' : 'Hampers'}</div>
                                                <div className="text-xs text-primary/70">{normalizeVariant(item.name)}</div>
                                            </div>
                                            <div className="font-bold text-primary whitespace-nowrap">Rp {(price * item.qty).toLocaleString('id-ID')}</div>
                                        </div>
                                    );
                                })}
                                {menus.length > 0 && (
                                    <>
                                        {deliveryMethod === 'store_delivery' && shippingFee !== null && (
                                            <div className="flex justify-between items-start gap-3 py-1 mt-1 text-primary/80">
                                                <div className="text-xs">Ongkir (Grab Instant)</div>
                                                <div className="font-bold whitespace-nowrap">Rp {shippingFee.toLocaleString('id-ID')}</div>
                                            </div>
                                        )}
                                        <div className="flex justify-between pt-3 border-t border-primary/10 mt-2">
                                            <span className="font-black text-primary">Total Pembayaran</span>
                                            <span className="font-black text-primary text-lg">Rp {(
                                                form.pesanan.reduce((sum, item) => sum + (menus.find(m => m.name === item.box_type)?.price || 0) * item.qty, 0) +
                                                (shippingFee || 0)
                                            ).toLocaleString('id-ID')}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowConfirm(false)} disabled={submitting} className="flex-1 py-3.5 rounded-xl font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-all text-sm">Cek Lagi</button>
                            <button onClick={submitOrder} disabled={submitting} className="flex-1 py-3.5 rounded-xl font-bold text-brand-yellow bg-primary hover:bg-primary/90 transition-all text-sm shadow-lg disabled:opacity-50">
                                {submitting ? 'Memproses...' : 'Kirim Pesanan!'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className={`shadow-xl rounded-2xl p-4 flex items-start gap-3 w-80 max-w-[90vw] ${toast.type === 'success' ? 'bg-green-500 text-white' : toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-primary text-brand-yellow'}`}>
                        <div className="flex-1"><h4 className="font-bold text-sm mb-0.5">{toast.title}</h4><p className="text-xs opacity-90">{toast.body}</p></div>
                        <button onClick={() => setToast(null)} className="p-1 hover:bg-black/10 rounded-lg"><MdClose className="text-lg" /></button>
                    </div>
                </div>
            )}
        </div>
    );
}
