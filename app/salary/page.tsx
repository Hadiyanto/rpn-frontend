'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { LuMenu, LuBanknote, LuSettings, LuCalendarSearch, LuWallet } from 'react-icons/lu';
import { MdClose } from 'react-icons/md';
import { useUserRole } from '@/hooks/useUserRole';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useRouter } from 'next/navigation';

export default function SalaryPage() {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const userRoleData = useUserRole();
    const router = useRouter();

    const [salaries, setSalaries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [previewing, setPreviewing] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

    // Default selected date for generation is today
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [toast, setToast] = useState<{ title: string; body: string; type: 'success' | 'error' | 'info' } | null>(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    const showToast = (title: string, body: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ title, body, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchSalaries = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/daily-salary`);
            const json = await res.json();
            if (json.status === 'ok') {
                setSalaries(json.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSalaries();
    }, []);

    const handlePreviewSalary = async () => {
        setPreviewing(true);
        try {
            // Use Jakarta Time (GMT+7) exactly to avoid timezone overlaps at midnight
            const jakartaFormatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Jakarta',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            const dateStr = jakartaFormatter.format(selectedDate); // Output: YYYY-MM-DD

            const res = await fetch(`${apiUrl}/api/daily-salary/preview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: dateStr })
            });
            const json = await res.json();

            if (json.status === 'ok') {
                setPreviewData(json.data);
                setIsPreviewModalOpen(true);
            } else {
                showToast('❌ Gagal', json.message || 'Gagal menghitung gaji', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('❌ Error', 'Kesalahan server', 'error');
        } finally {
            setPreviewing(false);
        }
    };

    const handleConfirmGenerate = async () => {
        setGenerating(true);
        try {
            const dateStr = previewData.date; // Use the date from preview data to be safe

            const res = await fetch(`${apiUrl}/api/daily-salary/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: dateStr })
            });
            const json = await res.json();

            if (json.status === 'ok') {
                showToast('✅ Berhasil', `Gaji untuk tanggal ${dateStr} berhasil disimpan ke DB.`, 'success');
                setIsPreviewModalOpen(false);
                setPreviewData(null);
                fetchSalaries();
            } else {
                showToast('❌ Gagal', json.message || 'Gagal menyimpan gaji', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('❌ Error', 'Kesalahan server', 'error');
        } finally {
            setGenerating(false);
        }
    };

    const formatDate = (isoStr: string) => {
        const d = new Date(isoStr);
        return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
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
                                <LuBanknote className="text-primary/70" />
                                Gaji Karyawan
                            </h1>
                            <p className="text-xs font-bold text-primary/60">Generate dan riwayat gaji harian</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-5 pb-24 space-y-6">

                {/* Generatator Box */}
                <div className="bg-white rounded-3xl p-5 shadow-xl border border-primary/5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-extrabold text-primary">Generate Gaji Harian</h2>
                        <button
                            onClick={() => router.push('/config/salary')}
                            className="p-1.5 bg-brand-yellow text-primary rounded-lg hover:bg-brand-yellow/80 hover:shadow-md transition-all active:scale-95"
                            title="Konfigurasi Rumus Gaji"
                        >
                            <LuSettings size={16} />
                        </button>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="relative w-full">
                            <label className="text-[10px] uppercase font-black tracking-wider text-primary/50 ml-1 mb-1 block">Pilih Tanggal Acuan (Penjualan)</label>
                            <div className="relative">
                                <DatePicker
                                    selected={selectedDate}
                                    onChange={(dt: Date | null) => dt && setSelectedDate(dt)}
                                    dateFormat="dd/MM/yyyy"
                                    className="w-full h-12 pl-10 pr-4 rounded-xl border-2 border-primary/10 bg-primary/5 text-primary text-sm font-bold focus:outline-none focus:border-primary/30 focus:bg-white transition-colors"
                                />
                                <LuCalendarSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-primary/40 pointer-events-none" />
                            </div>
                        </div>

                        <button
                            onClick={handlePreviewSalary}
                            disabled={previewing}
                            className={`w-full h-12 mt-2 font-extrabold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${previewing ? 'bg-primary/50 text-brand-yellow/50 cursor-not-allowed' : 'bg-primary text-brand-yellow hover:opacity-90 active:scale-[0.98] shadow-primary/20'
                                }`}
                        >
                            <LuBanknote size={18} />
                            {previewing ? 'Menghitung Detail...' : 'Hitung & Lihat Detail'}
                        </button>
                        <p className="text-[10px] text-center font-bold text-primary/40 leading-tight">
                            Gaji dihitung dari jumlah box terjual pada hari tersebut. Harap pastikan hari tersebut sudah ditutup transaksinya.
                        </p>
                    </div>
                </div>

                {/* History List */}
                <div>
                    <h2 className="text-sm font-extrabold text-primary mb-3 pl-1">Riwayat Gaji Terecord</h2>
                    {loading ? (
                        <div className="animate-pulse space-y-3">
                            <div className="h-24 bg-white/50 rounded-2xl"></div>
                            <div className="h-24 bg-white/50 rounded-2xl"></div>
                        </div>
                    ) : salaries.length === 0 ? (
                        <div className="text-center py-10 bg-white rounded-2xl border border-primary/5 shadow-sm">
                            <LuWallet className="mx-auto text-4xl text-primary/20 mb-2" />
                            <p className="text-sm font-medium text-primary/50">Belum ada history gaji tercatat.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {salaries.map((s) => (
                                <div key={s.id} className="bg-white rounded-2xl p-4 shadow-sm border border-primary/5 hover:border-primary/20 transition-colors flex justify-between items-center relative overflow-hidden">
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-green-500 rounded-l-2xl"></div>
                                    <div className="pl-3">
                                        <p className="text-[10px] font-black uppercase text-primary/40 mb-0.5">{s.date}</p>
                                        <h3 className="font-exrabold text-sm text-primary mb-1">{formatDate(s.date)}</h3>
                                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-primary/5 rounded-lg border border-primary/10">
                                            <span className="text-xs font-black text-primary">{s.total_boxes}</span>
                                            <span className="text-[9px] font-bold text-primary/60 uppercase">Box Terjual</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold uppercase text-primary/50 mb-0.5">Total Gaji</p>
                                        <p className="text-lg font-black text-green-600">Rp {Number(s.total_salary).toLocaleString('id-ID')}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>

            {/* Preview Modal */}
            {isPreviewModalOpen && previewData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-brand-yellow/10">
                            <div>
                                <h3 className="font-extrabold text-lg text-primary">Preview Gaji</h3>
                                <p className="text-xs font-medium text-primary/60">{formatDate(previewData.date)}</p>
                            </div>
                            <button onClick={() => setIsPreviewModalOpen(false)} className="p-2 bg-white rounded-full text-gray-400 hover:text-gray-600 shadow-sm transition-colors">
                                <MdClose className="text-xl" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] uppercase font-black tracking-wider text-primary/50 mb-1">Total Box (Asli)</p>
                                    <p className="font-bold text-primary/70">{previewData.totalBoxesRaw}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase font-black tracking-wider text-primary/50 mb-1">Total Box (Dibulatkan)</p>
                                    <p className="text-2xl font-black text-primary">{previewData.totalBoxesRounded}</p>
                                </div>
                            </div>

                            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 text-center">
                                <p className="text-[10px] uppercase font-black tracking-wider text-primary/50 mb-1">Total Gaji Kalkulatif</p>
                                <p className="text-3xl font-black text-green-600">Rp {Number(previewData.totalSalary).toLocaleString('id-ID')}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button
                                    onClick={() => setIsPreviewModalOpen(false)}
                                    className="w-full h-12 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm rounded-xl transition-colors"
                                >
                                    Batalkan
                                </button>
                                <button
                                    onClick={handleConfirmGenerate}
                                    disabled={generating}
                                    className={`w-full h-12 flex items-center justify-center font-extrabold text-sm rounded-xl shadow-lg transition-all ${generating ? 'bg-primary/50 text-brand-yellow/50 cursor-not-allowed' : 'bg-primary text-brand-yellow hover:opacity-90 active:scale-[0.98] shadow-primary/20'
                                        }`}
                                >
                                    {generating ? 'Menyimpan...' : 'Simpan ke DB'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
