'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import WhatsAppManager from '@/components/WhatsAppManager';
import { LuMenu, LuSettings, LuCheck, LuX, LuChevronDown, LuChevronUp, LuCalendar, LuTrash2 } from 'react-icons/lu';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import { fetchJson } from '@/utils/fetchJson';
import { API_URL } from '@/utils/config';
import type { Menu, Variant } from '@/types/menu';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

function getTodayStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function ConfigPage() {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const userRoleData = useUserRole('config');

    const [menus, setMenus] = useState<Menu[]>([]);
    const [variants, setVariants] = useState<Variant[]>([]);
    const [quotas, setQuotas] = useState<any[]>([]);
    const [hourlyQuotas, setHourlyQuotas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [stores, setStores] = useState<any[]>([]);
    const [activeStoreId, setActiveStoreId] = useState<number | null>(null);
    const [storeForms, setStoreForms] = useState<Record<number, any>>({});
    const [isStoreOpen, setIsStoreOpen] = useState(false);

    const [isQuotaOpen, setIsQuotaOpen] = useState(true);
    const [isPastQuotaOpen, setIsPastQuotaOpen] = useState(false);
    const [isHourlyQuotaOpen, setIsHourlyQuotaOpen] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(true);
    const [isVariantOpen, setIsVariantOpen] = useState(true);

    const [newQuotaDate, setNewQuotaDate] = useState('');
    const [newQuotaQty, setNewQuotaQty] = useState('50');
    const [newQuotaHampers, setNewQuotaHampers] = useState('0');

    const [newHourlyTime, setNewHourlyTime] = useState('12:00');
    const [newHourlyQty, setNewHourlyQty] = useState('10');
    const [newHourlyHampers, setNewHourlyHampers] = useState('0');

    const { toast, showToast, hideToast } = useToast();

    const fetchData = async (storeId: number) => {
        setLoading(true);
        try {
            const [mData, vData, qData, hqData] = await Promise.all([
                fetchJson(`${API_URL}/api/menu`),
                fetchJson(`${API_URL}/api/variants`),
                fetchJson(`${API_URL}/api/daily-quota?store_id=${storeId}`),
                fetchJson(`${API_URL}/api/hourly-quota?store_id=${storeId}`),
            ]);

            if (mData.status === 'ok') setMenus(mData.data);
            if (vData.status === 'ok') setVariants(vData.data);
            if (qData.status === 'ok') setQuotas(qData.data);
            if (hqData.status === 'ok') setHourlyQuotas(hqData.data);
        } catch (e) {
            console.error(e);
            showToast('❌ Error', 'Gagal memuat data konfigurasi', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJson(`${API_URL}/api/stores`)
            .then(json => {
                if (json.status === 'ok') {
                    setStores(json.data);
                    const forms: Record<number, any> = {};
                    json.data.forEach((s: any) => { forms[s.id] = { name: s.name, address: s.address ?? '', phone: s.phone ?? '', latitude: s.latitude ?? '', longitude: s.longitude ?? '', area_id: s.area_id ?? '' }; });
                    setStoreForms(forms);
                    if (json.data.length > 0) setActiveStoreId(json.data[0].id);
                }
            })
            .catch(err => { console.error(err); showToast('❌ Error', 'Gagal memuat daftar store', 'error'); });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (activeStoreId) fetchData(activeStoreId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeStoreId]);

    const updateMenuPrice = async (id: number, currentPrice: number, newPriceStr: string) => {
        const newPrice = parseInt(newPriceStr, 10);
        if (isNaN(newPrice) || newPrice === currentPrice) return;

        try {
            await fetchJson(`${API_URL}/api/menu/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ price: newPrice }),
            });
            if (activeStoreId) fetchData(activeStoreId);
        } catch (e) {
            console.error('Failed to update menu price', e);
            showToast('❌ Error', 'Gagal mengubah harga menu', 'error');
        }
    };

    const toggleMenuStore = async (id: number, currentStoreIds: number[] = []) => {
        if (!activeStoreId) return;
        const newStoreIds = currentStoreIds.includes(activeStoreId)
            ? currentStoreIds.filter(s => s !== activeStoreId)
            : [...currentStoreIds, activeStoreId];
        try {
            await fetchJson(`${API_URL}/api/menu/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ store_ids: newStoreIds }),
            });
            if (activeStoreId) fetchData(activeStoreId);
        } catch (e) {
            console.error('Failed to update menu store availability', e);
            showToast('❌ Error', 'Gagal mengubah ketersediaan store', 'error');
        }
    };

    const toggleVariantStore = async (id: number, currentStoreIds: number[] = []) => {
        if (!activeStoreId) return;
        const newStoreIds = currentStoreIds.includes(activeStoreId)
            ? currentStoreIds.filter(s => s !== activeStoreId)
            : [...currentStoreIds, activeStoreId];
        try {
            await fetchJson(`${API_URL}/api/variants/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ store_ids: newStoreIds }),
            });
            if (activeStoreId) fetchData(activeStoreId);
        } catch (e) {
            console.error('Failed to update variant store availability', e);
            showToast('❌ Error', 'Gagal mengubah ketersediaan store', 'error');
        }
    };

    const saveStore = async (id: number) => {
        const form = storeForms[id];
        try {
            await fetchJson(`${API_URL}/api/stores/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    address: form.address,
                    phone: form.phone || null,
                    area_id: form.area_id || null,
                    latitude: form.latitude ? Number(form.latitude) : null,
                    longitude: form.longitude ? Number(form.longitude) : null,
                }),
            });
            showToast('✅ Berhasil', 'Data store berhasil disimpan!', 'success');
            setStores(prev => prev.map(s => s.id === id ? { ...s, ...form } : s));
        } catch (e) {
            console.error('Failed to update store', e);
            showToast('❌ Error', 'Gagal menyimpan data store', 'error');
        }
    };

    const addQuota = async () => {
        if (!newQuotaDate || !newQuotaQty || !activeStoreId) {
            showToast('⚠️ Peringatan', 'Pilih tanggal dan isi kuota terlebih dahulu', 'error');
            return;
        }
        try {
            const json = await fetchJson(`${API_URL}/api/daily-quota`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: newQuotaDate, qty: parseInt(newQuotaQty, 10), hampers_qty: parseInt(newQuotaHampers || '0', 10), store_id: activeStoreId }),
            });
            if (json.status === 'ok') {
                showToast('✅ Berhasil', 'Kuota berhasil ditambahkan!', 'success');
                setNewQuotaDate('');
                if (activeStoreId) fetchData(activeStoreId);
            } else {
                showToast('❌ Gagal', json.message || 'Gagal menambah kuota', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('❌ Error', 'Gagal menambah kuota', 'error');
        }
    };

    const updateQuotaQty = async (id: number, currentQty: number, currentHampersQty: number, newQtyStr: string, newHampersQtyStr: string) => {
        const qty = parseInt(newQtyStr, 10);
        const hampers_qty = parseInt(newHampersQtyStr, 10);
        if (isNaN(qty) || isNaN(hampers_qty) || (qty === currentQty && hampers_qty === currentHampersQty)) return;
        try {
            await fetchJson(`${API_URL}/api/daily-quota/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qty, hampers_qty }),
            });
            if (activeStoreId) fetchData(activeStoreId);
        } catch (e) {
            console.error(e);
            showToast('❌ Error', 'Gagal mengubah kuota', 'error');
        }
    };

    const deleteQuota = async (id: number) => {
        if (!confirm('Hapus kuota tanggal ini?')) return;
        try {
            await fetchJson(`${API_URL}/api/daily-quota/${id}`, { method: 'DELETE' });
            showToast('✅ Berhasil', 'Kuota berhasil dihapus', 'success');
            if (activeStoreId) fetchData(activeStoreId);
        } catch (e) {
            console.error(e);
            showToast('❌ Error', 'Gagal menghapus kuota', 'error');
        }
    };

    const addHourlyQuota = async () => {
        if (!newHourlyTime || !newHourlyQty || !activeStoreId) {
            showToast('⚠️ Peringatan', 'Pilih jam dan isi kuota terlebih dahulu', 'error');
            return;
        }
        try {
            const json = await fetchJson(`${API_URL}/api/hourly-quota`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ time_str: newHourlyTime, qty: parseInt(newHourlyQty, 10), hampers_qty: parseInt(newHourlyHampers || '0', 10), is_active: true, store_id: activeStoreId }),
            });
            if (json.status === 'ok') {
                showToast('✅ Berhasil', 'Kuota Per Jam ditambahkan!', 'success');
                // Optional: reset fields
                if (activeStoreId) fetchData(activeStoreId);
            } else {
                showToast('❌ Gagal', json.message || 'Gagal menambah kuota', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('❌ Error', 'Error saat menambah kuota', 'error');
        }
    };

    const updateHourlyQuotaQty = async (id: number, time_str: string, is_active: boolean, currentQty: number, currentHampersQty: number, newQtyStr: string, newHampersQtyStr: string) => {
        const qty = parseInt(newQtyStr, 10);
        const hampers_qty = parseInt(newHampersQtyStr, 10);
        if (isNaN(qty) || isNaN(hampers_qty) || (qty === currentQty && hampers_qty === currentHampersQty)) return;
        try {
            await fetchJson(`${API_URL}/api/hourly-quota`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ time_str, qty, hampers_qty, is_active, store_id: activeStoreId }),
            });
            if (activeStoreId) fetchData(activeStoreId);
        } catch (e) {
            console.error(e);
            showToast('❌ Error', 'Gagal mengubah kuota per jam', 'error');
        }
    };

    const toggleHourlyQuotaActive = async (id: number, time_str: string, is_active: boolean, qty: number, hampers_qty: number) => {
        try {
            await fetchJson(`${API_URL}/api/hourly-quota`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ time_str, qty, hampers_qty, is_active: !is_active, store_id: activeStoreId }),
            });
            if (activeStoreId) fetchData(activeStoreId);
        } catch (e) {
            console.error(e);
            showToast('❌ Error', 'Gagal mengubah status jam', 'error');
        }
    };

    const deleteHourlyQuota = async (id: number) => {
        if (!confirm('Hapus slot jam ini?')) return;
        try {
            await fetchJson(`${API_URL}/api/hourly-quota/${id}`, { method: 'DELETE' });
            showToast('✅ Berhasil', 'Slot jam berhasil dihapus', 'success');
            if (activeStoreId) fetchData(activeStoreId);
        } catch (e) {
            console.error(e);
            showToast('❌ Error', 'Gagal menghapus slot jam', 'error');
        }
    };

    const todayStr = getTodayStr();
    const upcomingQuotas = quotas.filter(q => q.date >= todayStr);
    const pastQuotas = quotas.filter(q => q.date < todayStr);

    const renderQuotaCard = (q: any) => {
        const d = new Date(q.date);
        const dateStr = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
        return (
            <div key={q.id} className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex-1">
                    <p className="font-bold text-primary text-sm leading-tight">{dateStr}</p>
                    <p className="text-[10px] font-black text-primary/40 leading-none mt-1">{q.date}</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-primary/50">Box:</span>
                    <input
                        type="number"
                        defaultValue={q.qty}
                        onBlur={e => updateQuotaQty(q.id, q.qty, q.hampers_qty, e.target.value, String(q.hampers_qty))}
                        className="w-14 h-8 px-2 text-center text-sm font-bold text-primary bg-primary/5 border border-primary/10 rounded-lg focus:outline-none focus:border-primary/30"
                    />
                    <span className="text-[10px] font-black uppercase text-primary/50 ml-1">Hmp:</span>
                    <input
                        type="number"
                        defaultValue={q.hampers_qty}
                        onBlur={e => updateQuotaQty(q.id, q.qty, q.hampers_qty, String(q.qty), e.target.value)}
                        className="w-14 h-8 px-2 text-center text-sm font-bold text-primary bg-primary/5 border border-primary/10 rounded-lg focus:outline-none focus:border-primary/30"
                    />
                    <button
                        onClick={() => deleteQuota(q.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        title="Hapus kuota"
                    >
                        <LuTrash2 className="text-sm" />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-brand-white font-display text-primary min-h-screen">
            <Sidebar
                open={isSidebarOpen}
                onClose={() => setSidebarOpen(false)}
                allowedPages={userRoleData.allowedPages}
                userEmail={userRoleData.email}
                userRole={userRoleData.role}
            />

            {/* Header */}
            <div className="sticky top-0 z-50 bg-brand-yellow/90 backdrop-blur-md border-b border-primary/10">
                <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 -ml-2 rounded-xl hover:bg-black/5 transition-colors"
                        >
                            <LuMenu className="text-2xl text-primary" />
                        </button>
                        <div>
                            <h1 className="text-xl font-extrabold text-primary flex items-center gap-2">
                                <LuSettings className="text-primary/70" />
                                Configuration
                            </h1>
                            <p className="text-xs font-bold text-primary/60">Kelola Menu & Varian Tampil</p>
                        </div>
                    </div>
                </div>
                {/* Store tabs — quota harian & per-jam di-scope ke store yang dipilih */}
                <div className="flex gap-2 overflow-x-auto pb-3 px-5 scrollbar-hide">
                    {stores.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setActiveStoreId(s.id)}
                            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${activeStoreId === s.id
                                ? 'bg-primary text-brand-yellow shadow-md'
                                : 'bg-white/60 text-primary/60 border border-primary/10'
                                }`}
                        >
                            {s.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="p-5 pb-24 space-y-8">
                {/* Daily Quota Section */}
                <section>
                    <button
                        onClick={() => setIsQuotaOpen(!isQuotaOpen)}
                        className="w-fulltext-left flex items-center justify-between border-b-2 border-primary/10 pb-2 mb-4 group"
                    >
                        <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                            Kuota Harian
                            <span className="bg-primary/10 px-2 py-0.5 rounded-full text-xs">{quotas.length}</span>
                        </h2>
                        {isQuotaOpen ? <LuChevronUp className="text-primary/60 group-hover:text-primary transition-colors" /> : <LuChevronDown className="text-primary/60 group-hover:text-primary transition-colors" />}
                    </button>

                    {isQuotaOpen && (
                        <>
                            {/* Add Quota Form */}
                            <div className="bg-white rounded-2xl p-4 shadow-sm mb-4 flex flex-wrap gap-3 items-end animate-in fade-in slide-in-from-top-2">
                                <div className="flex-1 min-w-[130px] space-y-1.5 flex flex-col">
                                    <label className="text-[10px] font-black uppercase text-primary/60">Tanggal</label>
                                    <div className="relative w-full">
                                        <DatePicker
                                            selected={newQuotaDate ? new Date(`${newQuotaDate}T00:00:00`) : null}
                                            onChange={(dt: Date | null) => {
                                                if (dt) {
                                                    const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000);
                                                    setNewQuotaDate(local.toISOString().split('T')[0]);
                                                }
                                            }}
                                            dateFormat="dd/MM/yyyy"
                                            className="w-full h-10 px-3 rounded-xl border border-primary/10 bg-primary/5 text-sm font-bold text-primary focus:outline-none"
                                        />
                                        <LuCalendar className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary/40 text-sm" />
                                    </div>
                                </div>
                                <div className="w-20 space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-primary/60">Box Qty</label>
                                    <input
                                        type="number"
                                        value={newQuotaQty}
                                        onChange={e => setNewQuotaQty(e.target.value)}
                                        className="w-full h-10 px-3 rounded-xl border border-primary/10 bg-primary/5 text-sm font-bold text-primary focus:outline-none"
                                    />
                                </div>
                                <div className="w-24 space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-primary/60">Hampers Qty</label>
                                    <input
                                        type="number"
                                        value={newQuotaHampers}
                                        onChange={e => setNewQuotaHampers(e.target.value)}
                                        className="w-full h-10 px-3 rounded-xl border border-primary/10 bg-primary/5 text-sm font-bold text-primary focus:outline-none"
                                    />
                                </div>
                                <button
                                    onClick={addQuota}
                                    className="h-10 px-4 bg-primary text-brand-yellow font-bold text-sm rounded-xl hover:opacity-90 transition-opacity"
                                >
                                    Tambah
                                </button>
                            </div>

                            {loading ? (
                                <div className="animate-pulse space-y-3">
                                    <div className="h-12 bg-white/50 rounded-2xl"></div>
                                    <div className="h-12 bg-white/50 rounded-2xl"></div>
                                </div>
                            ) : (
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-top-4">
                                    {upcomingQuotas.map(renderQuotaCard)}
                                </div>
                            )}

                            <button
                                onClick={() => setIsPastQuotaOpen(!isPastQuotaOpen)}
                                className="w-full flex items-center justify-between mt-4 pt-3 border-t border-primary/10 text-left"
                            >
                                <span className="text-xs font-black uppercase text-primary/50">
                                    Tanggal Sudah Lewat ({pastQuotas.length})
                                </span>
                                {isPastQuotaOpen ? <LuChevronUp className="text-primary/50" /> : <LuChevronDown className="text-primary/50" />}
                            </button>
                            {isPastQuotaOpen && (
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-3 opacity-60 animate-in fade-in slide-in-from-top-4">
                                    {pastQuotas.map(renderQuotaCard)}
                                </div>
                            )}
                        </>
                    )}
                </section>

                {/* Hourly Quota Section */}
                <section>
                    <button
                        onClick={() => setIsHourlyQuotaOpen(!isHourlyQuotaOpen)}
                        className="w-full text-left flex items-center justify-between border-b-2 border-primary/10 pb-2 mb-4 group"
                    >
                        <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                            Kuota Per Jam
                            <span className="bg-primary/10 px-2 py-0.5 rounded-full text-xs">{hourlyQuotas.length}</span>
                        </h2>
                        {isHourlyQuotaOpen ? <LuChevronUp className="text-primary/60 group-hover:text-primary transition-colors" /> : <LuChevronDown className="text-primary/60 group-hover:text-primary transition-colors" />}
                    </button>

                    {isHourlyQuotaOpen && (
                        <>
                            {/* Add Hourly Quota Form */}
                            <div className="bg-white rounded-2xl p-4 shadow-sm mb-4 flex flex-wrap gap-3 items-end animate-in fade-in slide-in-from-top-2">
                                <div className="w-24 space-y-1.5 flex flex-col">
                                    <label className="text-[10px] font-black uppercase text-primary/60">Jam Pickup</label>
                                    <select
                                        value={newHourlyTime}
                                        onChange={e => setNewHourlyTime(e.target.value)}
                                        className="w-full h-10 px-2 rounded-xl border border-primary/10 bg-primary/5 text-sm font-bold text-primary focus:outline-none"
                                    >
                                        {[11, 12, 13, 14, 15, 16, 17].map(h => {
                                            const hh = String(h).padStart(2, '0') + ':00';
                                            return <option key={hh} value={hh}>{hh}</option>;
                                        })}
                                    </select>
                                </div>
                                <div className="w-20 space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-primary/60">Box Qty</label>
                                    <input
                                        type="number"
                                        value={newHourlyQty}
                                        onChange={e => setNewHourlyQty(e.target.value)}
                                        className="w-full h-10 px-3 rounded-xl border border-primary/10 bg-primary/5 text-sm font-bold text-primary focus:outline-none"
                                    />
                                </div>
                                <div className="w-24 space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-primary/60">Hmp Qty</label>
                                    <input
                                        type="number"
                                        value={newHourlyHampers}
                                        onChange={e => setNewHourlyHampers(e.target.value)}
                                        className="w-full h-10 px-3 rounded-xl border border-primary/10 bg-primary/5 text-sm font-bold text-primary focus:outline-none"
                                    />
                                </div>
                                <button
                                    onClick={addHourlyQuota}
                                    className="h-10 px-4 bg-primary text-brand-yellow font-bold text-sm rounded-xl hover:opacity-90 transition-opacity"
                                >
                                    Simpan Jam
                                </button>
                            </div>

                            {loading ? (
                                <div className="animate-pulse space-y-3">
                                    <div className="h-12 bg-white/50 rounded-2xl"></div>
                                </div>
                            ) : hourlyQuotas.length === 0 ? (
                                <p className="text-sm font-medium text-primary/50 text-center py-4">Belum ada aturan kuota jam yang dibuat.</p>
                            ) : (
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-top-4">
                                    {hourlyQuotas.map((hq) => (
                                        <div key={hq.id} className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
                                            <div className="flex-1">
                                                <p className="font-extrabold text-primary text-lg leading-tight">{hq.time_str}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`w-2 h-2 rounded-full ${hq.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                    <span className="text-[10px] font-black uppercase text-primary/40">{hq.is_active ? 'Aktif' : 'Nonaktif'}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                                <span className="text-[10px] font-black uppercase text-primary/50">Box:</span>
                                                <input
                                                    type="number"
                                                    defaultValue={hq.qty}
                                                    onBlur={e => updateHourlyQuotaQty(hq.id, hq.time_str, hq.is_active, hq.qty, hq.hampers_qty, e.target.value, String(hq.hampers_qty))}
                                                    className="w-14 h-8 text-center text-sm font-bold bg-primary/5 border border-primary/10 rounded-lg text-primary focus:outline-none focus:border-primary/30"
                                                />
                                                <span className="text-[10px] font-black uppercase text-primary/50 ml-1">Hmp:</span>
                                                <input
                                                    type="number"
                                                    defaultValue={hq.hampers_qty}
                                                    onBlur={e => updateHourlyQuotaQty(hq.id, hq.time_str, hq.is_active, hq.qty, hq.hampers_qty, String(hq.qty), e.target.value)}
                                                    className="w-14 h-8 text-center text-sm font-bold bg-primary/5 border border-primary/10 rounded-lg text-primary focus:outline-none focus:border-primary/30"
                                                />
                                                <button
                                                    onClick={() => toggleHourlyQuotaActive(hq.id, hq.time_str, hq.is_active, hq.qty, hq.hampers_qty)}
                                                    title={hq.is_active ? "Nonaktifkan Jam Ini" : "Aktifkan Jam Ini"}
                                                    className={`w-8 h-8 flex items-center justify-center rounded-lg border-2 transition-colors ml-1 ${hq.is_active
                                                        ? 'border-green-500/20 text-green-600 bg-green-50 hover:bg-green-100'
                                                        : 'border-red-500/20 text-red-600 bg-red-50 hover:bg-red-100'
                                                        }`}
                                                >
                                                    {hq.is_active ? <LuCheck size={16} strokeWidth={3} /> : <LuX size={16} strokeWidth={3} />}
                                                </button>
                                                <button
                                                    onClick={() => deleteHourlyQuota(hq.id)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                                    title="Hapus slot jam"
                                                >
                                                    <LuTrash2 className="text-sm" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </section>

                {/* WhatsApp Section */}
                <section>
                    <button
                        className="w-full flex justify-between items-center border-b-2 border-primary/10 pb-2 mb-4 group cursor-default"
                    >
                        <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                            Koneksi WhatsApp
                        </h2>
                    </button>
                    <WhatsAppManager />
                </section>

                {/* Menu List */}
                <section>
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="w-full justify-between flex items-center border-b-2 border-primary/10 pb-2 mb-4 group"
                    >
                        <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                            Daftar Box/Menu
                            <span className="bg-primary/10 px-2 py-0.5 rounded-full text-xs">{menus.length}</span>
                        </h2>
                        {isMenuOpen ? <LuChevronUp className="text-primary/60 group-hover:text-primary transition-colors" /> : <LuChevronDown className="text-primary/60 group-hover:text-primary transition-colors" />}
                    </button>

                    {isMenuOpen && (
                        <>
                            {loading ? (
                                <div className="animate-pulse space-y-3">
                                    <div className="h-14 bg-white/50 rounded-2xl"></div>
                                    <div className="h-14 bg-white/50 rounded-2xl"></div>
                                </div>
                            ) : (
                                <div className="grid gap-3 sm:grid-cols-2 animate-in fade-in slide-in-from-top-4">
                                    {menus.map((m) => (
                                        <div key={m.id} className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
                                            <div>
                                                <p className="font-bold text-primary text-sm mb-1">{m.name} <span className="text-primary/40 font-normal">({m.description})</span></p>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs text-primary/60 font-medium tracking-wide">Rp</span>
                                                    <input
                                                        type="number"
                                                        defaultValue={m.price}
                                                        onBlur={(e) => updateMenuPrice(m.id, m.price, e.target.value)}
                                                        className="w-24 px-2 py-1 text-xs font-bold text-primary bg-primary/5 border border-primary/10 rounded-lg focus:outline-none focus:border-primary/30"
                                                    />
                                                </div>
                                                <label className="flex items-center gap-1.5 mt-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={(m.store_ids ?? []).includes(activeStoreId ?? -1)}
                                                        onChange={() => toggleMenuStore(m.id, m.store_ids)}
                                                        className="w-3.5 h-3.5 rounded accent-primary"
                                                    />
                                                    <span className="text-[10px] font-bold text-primary/60">Tersedia di {stores.find(s => s.id === activeStoreId)?.name}</span>
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </section>

                {/* Variant List */}
                <section>
                    <button
                        onClick={() => setIsVariantOpen(!isVariantOpen)}
                        className="w-full flex items-center justify-between border-b-2 border-primary/10 pb-2 mb-4 group"
                    >
                        <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                            Daftar Varian Rasa
                            <span className="bg-primary/10 px-2 py-0.5 rounded-full text-xs">{variants.length}</span>
                        </h2>
                        {isVariantOpen ? <LuChevronUp className="text-primary/60 group-hover:text-primary transition-colors" /> : <LuChevronDown className="text-primary/60 group-hover:text-primary transition-colors" />}
                    </button>

                    {isVariantOpen && (
                        <>
                            {loading ? (
                                <div className="animate-pulse space-y-3">
                                    <div className="h-14 bg-white/50 rounded-2xl"></div>
                                    <div className="h-14 bg-white/50 rounded-2xl"></div>
                                </div>
                            ) : (
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-top-4">
                                    {variants.map((v) => (
                                        <div key={v.id} className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <p className="font-bold text-primary text-xs sm:text-sm line-clamp-2">{v.variant_name}</p>
                                                <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={(v.store_ids ?? []).includes(activeStoreId ?? -1)}
                                                        onChange={() => toggleVariantStore(v.id, v.store_ids)}
                                                        className="w-3.5 h-3.5 rounded accent-primary"
                                                    />
                                                    <span className="text-[10px] font-bold text-primary/60">Tersedia di {stores.find(s => s.id === activeStoreId)?.name}</span>
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </section>

                {/* Kelola Store */}
                <section>
                    <button
                        onClick={() => setIsStoreOpen(!isStoreOpen)}
                        className="w-full flex items-center justify-between border-b-2 border-primary/10 pb-2 mb-4 group"
                    >
                        <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                            Kelola Store
                            <span className="bg-primary/10 px-2 py-0.5 rounded-full text-xs">{stores.length}</span>
                        </h2>
                        {isStoreOpen ? <LuChevronUp className="text-primary/60 group-hover:text-primary transition-colors" /> : <LuChevronDown className="text-primary/60 group-hover:text-primary transition-colors" />}
                    </button>

                    {isStoreOpen && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                            {stores.map(s => {
                                const form = storeForms[s.id] ?? {};
                                const setField = (key: string, value: string) => setStoreForms(prev => ({ ...prev, [s.id]: { ...prev[s.id], [key]: value } }));
                                return (
                                    <div key={s.id} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-primary/60">Nama Store</label>
                                            <input
                                                value={form.name ?? ''}
                                                onChange={e => setField('name', e.target.value)}
                                                className="w-full h-10 px-3 rounded-xl border border-primary/10 bg-primary/5 text-sm font-bold text-primary focus:outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-primary/60">Alamat</label>
                                            <textarea
                                                rows={2}
                                                value={form.address ?? ''}
                                                onChange={e => setField('address', e.target.value)}
                                                className="w-full px-3 py-2 rounded-xl border border-primary/10 bg-primary/5 text-sm font-medium text-primary focus:outline-none resize-none"
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            <div className="flex-1 min-w-[110px] space-y-1.5">
                                                <label className="text-[10px] font-black uppercase text-primary/60">Telepon</label>
                                                <input
                                                    value={form.phone ?? ''}
                                                    onChange={e => setField('phone', e.target.value)}
                                                    className="w-full h-10 px-3 rounded-xl border border-primary/10 bg-primary/5 text-sm font-bold text-primary focus:outline-none"
                                                />
                                            </div>
                                            <div className="w-28 space-y-1.5">
                                                <label className="text-[10px] font-black uppercase text-primary/60">Latitude</label>
                                                <input
                                                    value={form.latitude ?? ''}
                                                    onChange={e => setField('latitude', e.target.value)}
                                                    className="w-full h-10 px-3 rounded-xl border border-primary/10 bg-primary/5 text-sm font-bold text-primary focus:outline-none"
                                                />
                                            </div>
                                            <div className="w-28 space-y-1.5">
                                                <label className="text-[10px] font-black uppercase text-primary/60">Longitude</label>
                                                <input
                                                    value={form.longitude ?? ''}
                                                    onChange={e => setField('longitude', e.target.value)}
                                                    className="w-full h-10 px-3 rounded-xl border border-primary/10 bg-primary/5 text-sm font-bold text-primary focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-primary/60">Biteship Area ID</label>
                                            <input
                                                value={form.area_id ?? ''}
                                                onChange={e => setField('area_id', e.target.value)}
                                                placeholder="mis. IDNP6IDNC148IDND841IDZ12750"
                                                className="w-full h-10 px-3 rounded-xl border border-primary/10 bg-primary/5 text-sm font-bold text-primary focus:outline-none"
                                            />
                                        </div>
                                        <button
                                            onClick={() => saveStore(s.id)}
                                            className="h-10 px-4 bg-primary text-brand-yellow font-bold text-sm rounded-xl hover:opacity-90 transition-opacity"
                                        >
                                            Simpan
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>

            <Toast toast={toast} onClose={hideToast} />
        </div>
    );
}
