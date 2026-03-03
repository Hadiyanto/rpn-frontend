'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { LuMenu, LuBanknote, LuSettings, LuPlus, LuTrash, LuSave } from 'react-icons/lu';
import { MdClose } from 'react-icons/md';
import { useUserRole } from '@/hooks/useUserRole';
import { useRouter } from 'next/navigation';

export default function SalaryConfigPage() {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const userRoleData = useUserRole();
    const router = useRouter();

    const [configs, setConfigs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ title: string; body: string; type: 'success' | 'error' | 'info' } | null>(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    const showToast = (title: string, body: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ title, body, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/salary-config`);
            const json = await res.json();
            if (json.status === 'ok') {
                setConfigs(json.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const handleSave = async () => {
        try {
            const res = await fetch(`${apiUrl}/api/salary-config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(configs),
            });
            const json = await res.json();
            if (json.status === 'ok') {
                showToast('✅ Berhasil', 'Konfigurasi gaji berhasil disimpan', 'success');
                fetchConfig();
            } else {
                showToast('❌ Gagal', json.message || 'Gagal menyimpan konfigurasi', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('❌ Error', 'Sistem gagal tersambung otomatis', 'error');
        }
    };

    const handleAddRow = () => {
        const lastBox = configs.length > 0 ? configs[configs.length - 1].max_box : 0;
        setConfigs([...configs, {
            min_box: lastBox ? lastBox + 1 : 0,
            max_box: null,
            amount: 0,
            is_fixed: false
        }]);
    };

    const handleRemoveRow = (index: number) => {
        const newConfigs = [...configs];
        newConfigs.splice(index, 1);
        setConfigs(newConfigs);
    };

    const updateRow = (index: number, field: string, value: any) => {
        const newConfigs = [...configs];
        newConfigs[index][field] = value;
        setConfigs(newConfigs);
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
            <div className="sticky top-0 z-40 bg-brand-yellow/90 backdrop-blur-md border-b border-primary/10">
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
                                Setting Gaji
                            </h1>
                            <p className="text-xs font-bold text-primary/60">Atur rentang komisi box</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-5 pb-24 space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-primary/60">Tabel Aturan Gaji</p>
                    <button
                        onClick={() => router.push('/salary')}
                        className="text-xs font-bold uppercase underline text-primary/80"
                    >
                        Ke Generate Gaji &rarr;
                    </button>
                </div>

                {loading ? (
                    <div className="animate-pulse space-y-3">
                        <div className="h-16 bg-white/50 rounded-2xl"></div>
                        <div className="h-16 bg-white/50 rounded-2xl"></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {configs.map((c, idx) => (
                            <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm border border-primary/5 flex flex-wrap gap-4 items-end relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20"></div>

                                <div className="flex-[2] min-w-[120px]">
                                    <label className="text-[10px] font-black uppercase text-primary/60 mb-1 block">Rentang Box (Min - Max)</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={c.min_box}
                                            onChange={(e) => updateRow(idx, 'min_box', parseInt(e.target.value))}
                                            className="w-full h-10 px-3 text-center rounded-xl border border-primary/10 bg-primary/5 text-sm font-bold text-primary focus:outline-none"
                                        />
                                        <span className="font-black text-primary/30">-</span>
                                        <input
                                            type="number"
                                            value={c.max_box === null ? '' : c.max_box}
                                            placeholder="~"
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                updateRow(idx, 'max_box', val === '' ? null : parseInt(val));
                                            }}
                                            className="w-full h-10 px-3 text-center rounded-xl border border-primary/10 bg-primary/5 text-sm font-bold text-primary focus:outline-none"
                                        />
                                    </div>
                                    <p className="text-[9px] font-bold text-primary/40 mt-1 uppercase">Kosongkan Max = Keatas</p>
                                </div>

                                <div className="flex-[2] min-w-[120px]">
                                    <label className="text-[10px] font-black uppercase text-primary/60 mb-1 block">Nominal (Rp)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={c.amount}
                                            onChange={(e) => updateRow(idx, 'amount', parseFloat(e.target.value))}
                                            className="w-full h-10 pl-8 pr-3 rounded-xl border border-primary/10 bg-primary/5 text-sm font-bold text-primary focus:outline-none"
                                        />
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-primary/40 text-xs">Rp</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 cursor-pointer bg-primary/5 px-3 h-10 rounded-xl border border-primary/10">
                                        <input
                                            type="checkbox"
                                            checked={c.is_fixed}
                                            onChange={(e) => updateRow(idx, 'is_fixed', e.target.checked)}
                                            className="w-4 h-4 rounded text-primary border-primary/30 focus:ring-primary"
                                        />
                                        <span className="text-xs font-bold text-primary">Fix Rate</span>
                                    </label>

                                    <button
                                        onClick={() => handleRemoveRow(idx)}
                                        className="h-10 w-10 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                                    >
                                        <LuTrash size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        <div className="flex gap-3">
                            <button
                                onClick={handleAddRow}
                                className="flex-1 py-3 border-2 border-dashed border-primary/20 text-primary/60 hover:border-primary hover:text-primary hover:bg-primary/5 rounded-2xl font-bold flex justify-center items-center gap-2 transition-all"
                            >
                                <LuPlus size={18} /> Tambah Rentang
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Floating Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-primary/5 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <button
                    onClick={handleSave}
                    className="w-full h-12 bg-primary text-brand-yellow font-extrabold text-sm rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                >
                    <LuSave size={18} />
                    Simpan Konfigurasi
                </button>
            </div>

            {/* Toast */}
            {toast && (
                <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className={`shadow-xl rounded-2xl p-4 flex items-start gap-3 w-80 max-w-[90vw] ${toast.type === 'success' ? 'bg-green-500 text-white' : toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-primary text-brand-yellow'}`}>
                        <div className="flex-1">
                            <h4 className="font-bold text-sm mb-0.5">{toast.title}</h4>
                            <p className="text-xs opacity-90">{toast.body}</p>
                        </div>
                        <button onClick={() => setToast(null)} className="p-1 hover:bg-black/10 rounded-lg transition-colors">
                            <MdClose className="text-lg" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
