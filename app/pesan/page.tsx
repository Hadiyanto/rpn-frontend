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
    const [submittedOrder, setSubmittedOrder] = useState<any>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [uploading, setUploading] = useState(false);

    const [form, setForm] = useState({
        customer_name: '',
        customer_phone: '',
        pickup_date: '', // Set via useEffect to prevent hydration error
        pickup_time: ':', // Intentionally empty hour and minute
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
        setErrorMessage('');
        if (!form.customer_name.trim()) {
            setErrorMessage('Nama customer wajib diisi');
            return window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (!form.customer_phone.trim()) {
            setErrorMessage('Nomor WhatsApp wajib diisi');
            return window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (!form.pickup_date) {
            setErrorMessage('Tanggal pickup wajib diisi');
            return window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        const [hh, mm] = form.pickup_time.split(':');
        if (!hh || !mm) {
            setErrorMessage('Waktu pickup (Jam & Menit) wajib dipilih');
            return window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        const validItems = form.pesanan.filter(p => p.name.trim().length > 0 && p.qty > 0);
        if (validItems.length === 0) {
            setErrorMessage('Minimal 1 pesanan (dengan nama) wajib diisi');
            return window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        setShowConfirm(true);
    };

    const submitOrder = async () => {
        setSubmitting(true);
        setErrorMessage('');
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
                setSubmittedOrder(json.data);

                // Send WhatsApp Notification to customer
                try {
                    const orderDetails = payload.pesanan.map(p => `- ${p.qty}x ${p.box_type === 'FULL' ? 'Full Box' : 'Half Box'} (${p.name})`).join('\n');
                    const totalBox = payload.pesanan.reduce((sum, p) => sum + p.qty, 0);
                    const totalAmount = payload.pesanan.reduce((sum, p) => {
                        const m = menus.find(x => x.name === p.box_type);
                        return sum + (p.qty * (m?.price || 0));
                    }, 0);

                    const uploadLink = `${window.location.origin}/pesan`;
                    const waMessage = `Hai ${form.customer_name}, pesanannya sudah diterima ya.\n\nDetail Pesanan:\n${orderDetails}\n\nJumlah: ${totalBox} box\nTotal: Rp ${totalAmount.toLocaleString('id-ID')}\n\nPembayaran bisa melalui:\nBank: BCA\nNo Rek: 123456789\nA/N: Anggita Prima\n\nMohon konfirmasi bukti pembayarannya melalui link berikut:\n${uploadLink}\n\nTerima kasih,\nAnggita`;

                    let waPhone = form.customer_phone.replace(/[^0-9]/g, '');
                    if (waPhone.startsWith('0')) {
                        waPhone = '62' + waPhone.substring(1);
                    }

                    fetch(`${apiUrl}/api/whatsapp/send`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            recipient: 'individual',
                            phone: waPhone,
                            message: waMessage
                        }),
                    }).catch(e => console.error('Failed to send WA message:', e));
                } catch (waErr) {
                    console.error('Error constructing WA message:', waErr);
                }

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

    const handleUploadTransfer = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !submittedOrder) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('image', file);

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

            // 1. Upload to Cloudinary
            const uploadRes = await fetch(`${apiUrl}/api/upload-image`, {
                method: 'POST',
                body: formData,
            });
            const uploadJson = await uploadRes.json();

            if (uploadJson.status !== 'ok') {
                alert('Gagal mengupload gambar');
                setUploading(false);
                return;
            }

            // 2. Update Order
            const updateRes = await fetch(`${apiUrl}/api/order/${submittedOrder.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transfer_img_url: uploadJson.imageUrl }),
            });

            const updateJson = await updateRes.json();
            if (updateJson.status === 'ok') {
                setSubmittedOrder({ ...submittedOrder, transfer_img_url: uploadJson.imageUrl });
            } else {
                alert('Gagal memperbarui pesanan dengan bukti transfer');
            }
        } catch {
            alert('Terjadi kesalahan jaringan saat mengupload bukti');
        } finally {
            setUploading(false);
        }
    };

    if (submittedOrder) {
        // Safe check for price, assuming variant calculation is same
        const totalPrice = submittedOrder.items.reduce((sum: number, item: any) => sum + (menus.find(m => m.name === item.box_type)?.price || 0) * item.qty, 0);

        return (
            <div className="bg-brand-yellow font-display text-primary min-h-screen flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-[480px] bg-white rounded-3xl p-8 shadow-xl">
                    <div className="text-center mb-6">
                        <LuCheck className="text-6xl text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-extrabold text-primary mb-2">Terima Kasih!</h2>
                        <p className="text-primary/70">
                            Pesanan Kak <strong>{submittedOrder.customer_name}</strong> telah berhasil kami terima.
                        </p>
                    </div>

                    <div className="bg-primary/5 rounded-2xl p-5 mb-6 space-y-4">
                        <div className="border-b border-primary/10 pb-3 flex justify-between">
                            <span className="text-sm text-primary/60 font-medium">Order ID</span>
                            <span className="text-sm font-black text-primary">#{submittedOrder.id}</span>
                        </div>
                        <div className="border-b border-primary/10 pb-3 flex justify-between">
                            <span className="text-sm text-primary/60 font-medium">Nama</span>
                            <span className="text-sm font-bold text-primary text-right">{submittedOrder.customer_name}</span>
                        </div>
                        <div className="border-b border-primary/10 pb-3">
                            <span className="text-[10px] font-black uppercase text-primary/60 block mb-2">Item Pesanan</span>
                            <div className="space-y-2">
                                {submittedOrder.items.map((item: any, idx: number) => {
                                    const price = menus.find(m => m.name === item.box_type)?.price || 0;
                                    return (
                                        <div key={idx} className="flex justify-between items-start gap-3">
                                            <div className="flex-1">
                                                <div className="font-bold text-primary text-sm">{item.qty}x Box {item.box_type === 'FULL' ? 'Besar' : 'Kecil'}</div>
                                                <div className="text-xs text-primary/70">{item.name}</div>
                                            </div>
                                            <div className="font-bold text-primary text-sm whitespace-nowrap">
                                                Rp {(price * item.qty).toLocaleString('id-ID')}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex justify-between pt-1">
                            <span className="font-black text-primary">Total Harga</span>
                            <span className="font-black text-primary text-lg">
                                Rp {totalPrice.toLocaleString('id-ID')}
                            </span>
                        </div>
                    </div>

                    {submittedOrder.payment_method === 'TRANSFER' && (
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-center mb-6">
                            <p className="text-sm font-semibold text-blue-900 mb-2">Silahkan transfer ke rekening BCA:</p>
                            <p className="text-2xl font-black text-blue-700 tracking-wider mb-1">1234567</p>
                            <p className="text-sm font-bold text-blue-800">a/n Anggita Prima</p>

                            {!submittedOrder.transfer_img_url ? (
                                <div className="mt-4 pt-4 border-t border-blue-200">
                                    <p className="text-xs text-blue-800 mb-2 font-bold">Upload Bukti Transfer Anda di Sini:</p>
                                    <label className={`block w-full text-sm font-bold text-center py-3 rounded-xl cursor-pointer transition-all ${uploading ? 'bg-blue-200 text-blue-500' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'}`}>
                                        {uploading ? 'Sedang Mengupload...' : 'Pilih Foto / Gambar'}
                                        <input type="file" accept="image/*" className="hidden" onChange={handleUploadTransfer} disabled={uploading} />
                                    </label>
                                </div>
                            ) : (
                                <div className="mt-4 pt-4 border-t border-blue-200">
                                    <div className="flex items-center justify-center gap-1.5 text-green-700 font-bold text-sm bg-green-100 py-2.5 rounded-xl border border-green-200">
                                        <LuCheck className="text-lg" />
                                        Bukti Transfer Berhasil Disimpan
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {(submittedOrder.payment_method !== 'TRANSFER' || submittedOrder.transfer_img_url) && (
                        <button
                            onClick={() => {
                                setSubmittedOrder(null);
                                setForm({
                                    customer_name: '',
                                    customer_phone: '',
                                    pickup_date: getTodayStr(),
                                    pickup_time: ':',
                                    note: '',
                                    payment_method: '',
                                    pesanan: [emptyItem()],
                                });
                            }}
                            className="w-full h-13 bg-primary text-brand-yellow font-extrabold text-[15px] rounded-2xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all py-3.5"
                        >
                            Buat Pesanan Baru
                        </button>
                    )}
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

                    {/* Error Message */}
                    {errorMessage && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-semibold animate-in fade-in slide-in-from-top-2">
                            {errorMessage}
                        </div>
                    )}

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

                    {/* Customer Phone */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-primary/60">Nomor WhatsApp *</label>
                        <input
                            type="tel"
                            className="w-full h-11 px-4 rounded-xl border-2 border-primary/10 bg-primary/5 text-primary text-sm font-medium focus:outline-none focus:border-primary/30"
                            placeholder="Contoh: 081234567890"
                            value={form.customer_phone}
                            onChange={e => {
                                let val = e.target.value.replace(/[^0-9]/g, '');
                                setForm(f => ({ ...f, customer_phone: val }));
                            }}
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
                                    value={form.pickup_time.split(':')[0] || ''}
                                    onChange={e => {
                                        const mm = form.pickup_time.split(':')[1] || '';
                                        setForm(f => ({ ...f, pickup_time: `${e.target.value}:${mm}` }));
                                    }}
                                    className="flex-1 bg-transparent text-primary text-sm font-medium text-center focus:outline-none appearance-none m-0 p-0"
                                >
                                    <option value="" disabled>--</option>
                                    {[11, 12, 13, 14, 15, 16, 17].map(hNum => {
                                        const h = String(hNum).padStart(2, '0');
                                        return <option key={h} value={h}>{h}</option>;
                                    })}
                                </select>
                                <span className="flex items-center text-primary font-black text-sm">:</span>
                                <select
                                    value={form.pickup_time.split(':')[1] || ''}
                                    onChange={e => {
                                        const hh = form.pickup_time.split(':')[0] || '';
                                        setForm(f => ({ ...f, pickup_time: `${hh}:${e.target.value}` }));
                                    }}
                                    className="flex-1 bg-transparent text-primary text-sm font-medium text-center focus:outline-none appearance-none m-0 p-0"
                                >
                                    <option value="" disabled>--</option>
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
                                                onClick={() => {
                                                    setForm(f => ({
                                                        ...f,
                                                        pesanan: f.pesanan.map((p, i) => {
                                                            if (i !== idx) return p;
                                                            let newP = { ...p, box_type: bt };

                                                            // Auto-trim flavors if they switch from FULL (2) to HALF (1) and have 2 selected
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
                                {/* Item name as Checkboxes (Max 2) */}
                                <div className="pt-2">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-primary/60 block mb-2">
                                        Pilih Rasa (Max {item.box_type === 'FULL' ? 2 : 1} Varian)
                                    </label>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                        {variants
                                            .filter(v => v.is_active)
                                            .map(v => {
                                                const maxFlavors = item.box_type === 'FULL' ? 2 : 1;
                                                // Extract currently selected flavors from the normalized `item.name`
                                                // It could be empty, "FlavorA", or "Mix FlavorA Dan FlavorB"
                                                let selectedFlavors: string[] = [];
                                                if (item.name) {
                                                    if (item.name.startsWith('Mix ')) {
                                                        selectedFlavors = item.name.replace('Mix ', '').split(' Dan ');
                                                    } else {
                                                        selectedFlavors = [item.name];
                                                    }
                                                }

                                                const isChecked = selectedFlavors.includes(v.variant_name);
                                                const isDisabled = !isChecked && selectedFlavors.length >= maxFlavors;

                                                return (
                                                    <label
                                                        key={v.id}
                                                        className={`relative flex items-center gap-2 p-2 rounded-xl border-2 transition-all cursor-pointer ${isChecked
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

                                                                // Re-normalize list to string
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
                                                        <div className={`w-4 h-4 rounded flex items-center justify-center border-2 transition-colors ${isChecked ? 'bg-primary border-primary text-brand-yellow' : 'border-primary/20 peer-focus-visible:border-primary/50'
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
