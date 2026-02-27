'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { LuMenu, LuSettings, LuCheck, LuX, LuChevronDown, LuChevronUp } from 'react-icons/lu';
import { useUserRole } from '@/hooks/useUserRole';

export default function ConfigPage() {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const userRoleData = useUserRole();

    const [menus, setMenus] = useState<any[]>([]);
    const [variants, setVariants] = useState<any[]>([]);
    const [quotas, setQuotas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isQuotaOpen, setIsQuotaOpen] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(true);
    const [isVariantOpen, setIsVariantOpen] = useState(true);

    const [newQuotaDate, setNewQuotaDate] = useState('');
    const [newQuotaQty, setNewQuotaQty] = useState('50');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    const fetchData = async () => {
        setLoading(true);
        try {
            const [mRes, vRes, qRes] = await Promise.all([
                fetch(`${apiUrl}/api/menu`),
                fetch(`${apiUrl}/api/variants`),
                fetch(`${apiUrl}/api/daily-quota`),
            ]);
            const mData = await mRes.json();
            const vData = await vRes.json();
            const qData = await qRes.json();

            if (mData.status === 'ok') setMenus(mData.data);
            if (vData.status === 'ok') setVariants(vData.data);
            if (qData.status === 'ok') setQuotas(qData.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleMenu = async (id: number, currentActive: boolean) => {
        try {
            await fetch(`${apiUrl}/api/menu/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !currentActive }),
            });
            fetchData();
        } catch (e) {
            console.error('Failed to update menu', e);
        }
    };

    const updateMenuPrice = async (id: number, currentPrice: number, newPriceStr: string) => {
        const newPrice = parseInt(newPriceStr, 10);
        if (isNaN(newPrice) || newPrice === currentPrice) return;

        try {
            await fetch(`${apiUrl}/api/menu/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ price: newPrice }),
            });
            fetchData();
        } catch (e) {
            console.error('Failed to update menu price', e);
        }
    };

    const toggleVariant = async (id: number, currentActive: boolean) => {
        try {
            await fetch(`${apiUrl}/api/variants/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !currentActive }),
            });
            fetchData();
        } catch (e) {
            console.error('Failed to update variant', e);
        }
    };

    const addQuota = async () => {
        if (!newQuotaDate || !newQuotaQty) return alert('Pilih tanggal dan isi kuota');
        try {
            const res = await fetch(`${apiUrl}/api/daily-quota`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: newQuotaDate, qty: parseInt(newQuotaQty, 10) }),
            });
            const json = await res.json();
            if (json.status === 'ok') {
                setNewQuotaDate('');
                fetchData();
            } else {
                alert(json.message || 'Gagal menambah kuota');
            }
        } catch (e) {
            console.error(e);
            alert('Gagal menambah kuota');
        }
    };

    const updateQuotaQty = async (id: number, currentQty: number, newQtyStr: string) => {
        const qty = parseInt(newQtyStr, 10);
        if (isNaN(qty) || qty === currentQty) return;
        try {
            const res = await fetch(`${apiUrl}/api/daily-quota/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qty }),
            });
            if (res.ok) fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="bg-brand-yellow font-display text-primary min-h-screen">
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
                                <div className="flex-1 min-w-[130px] space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-primary/60">Tanggal</label>
                                    <input
                                        type="date"
                                        value={newQuotaDate}
                                        onChange={e => setNewQuotaDate(e.target.value)}
                                        className="w-full h-10 px-3 rounded-xl border border-primary/10 bg-primary/5 text-sm font-bold text-primary focus:outline-none"
                                    />
                                </div>
                                <div className="w-24 space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-primary/60">Kuota (Box)</label>
                                    <input
                                        type="number"
                                        value={newQuotaQty}
                                        onChange={e => setNewQuotaQty(e.target.value)}
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
                                    {quotas.map((q) => {
                                        const d = new Date(q.date);
                                        const dateStr = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
                                        return (
                                            <div key={q.id} className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
                                                <div className="flex-1">
                                                    <p className="font-bold text-primary text-sm leading-tight">{dateStr}</p>
                                                    <p className="text-[10px] font-black text-primary/40 leading-none mt-1">{q.date}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase text-primary/50">Max:</span>
                                                    <input
                                                        type="number"
                                                        defaultValue={q.qty}
                                                        onBlur={e => updateQuotaQty(q.id, q.qty, e.target.value)}
                                                        className="w-16 h-8 px-2 text-center text-sm font-bold text-primary bg-primary/5 border border-primary/10 rounded-lg focus:outline-none focus:border-primary/30"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
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
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={m.is_active}
                                                    onChange={() => toggleMenu(m.id, m.is_active)}
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                            </label>
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
                                            <p className="font-bold text-primary text-xs sm:text-sm line-clamp-2 pr-4">{v.variant_name}</p>

                                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={v.is_active}
                                                    onChange={() => toggleVariant(v.id, v.is_active)}
                                                />
                                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}
