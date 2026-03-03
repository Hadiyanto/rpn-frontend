'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { LuMenu, LuPlus, LuHistory, LuPackage } from 'react-icons/lu';
import { MdClose } from 'react-icons/md';
import { useUserRole } from '@/hooks/useUserRole';
import { useRouter } from 'next/navigation';

export default function StockPage() {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const userRoleData = useUserRole();
    const router = useRouter();

    const [stocks, setStocks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStock, setSelectedStock] = useState<any>(null);
    const [qtyChange, setQtyChange] = useState('');
    const [isIncrement, setIsIncrement] = useState(false); // Default: OUT
    const [notes, setNotes] = useState('');

    const [toast, setToast] = useState<{ title: string; body: string; type: 'success' | 'error' | 'info' } | null>(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    const showToast = (title: string, body: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ title, body, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchStocks = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/stocks`);
            const json = await res.json();
            if (json.status === 'ok') {
                setStocks(json.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStocks();
    }, []);

    const handleAdjustStock = async () => {
        if (!selectedStock || !qtyChange) {
            showToast('⚠️ Peringatan', 'Harap isi jumlah perubahan stok.', 'error');
            return;
        }

        const inputQty = parseFloat(qtyChange);
        if (isNaN(inputQty) || inputQty < 0) {
            showToast('⚠️ Peringatan', 'Harap masukkan jumlah yang valid.', 'error');
            return;
        }

        // Jika Unchecked (isIncrement = false): Mode Sisa Stok (Target)
        // Jika Checked (isIncrement = true): Mode Tambah Stok (Delta)
        const type = isIncrement ? 'IN' : (inputQty < Number(selectedStock.qty) ? 'OUT' : 'IN');

        await executeAdjustment(
            selectedStock.id,
            inputQty,
            type,
            notes || (isIncrement ? 'Stok tambahan' : 'Penyesuaian stok fisik'),
            !isIncrement // is_target = true jika mode Sisa Stok (unchecked)
        );
    };

    const executeAdjustment = async (stock_id: number, qty_change: number, type: string, n: string, is_target: boolean = false) => {
        try {
            const res = await fetch(`${apiUrl}/api/stocks/adjust`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stock_id,
                    qty_change,
                    type,
                    is_target,
                    notes: n
                }),
            });
            const json = await res.json();
            if (json.status === 'ok') {
                showToast('✅ Berhasil', 'Stok berhasil diperbarui', 'success');
                setIsModalOpen(false);
                setQtyChange('');
                setNotes('');
                fetchStocks();
            } else {
                showToast('❌ Gagal', json.message || 'Gagal update stok', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('❌ Error', 'Terjadi kesalahan sistem', 'error');
        }
    };

    const openAdjustModal = (stock: any) => {
        setSelectedStock(stock);
        setQtyChange('');
        setIsIncrement(false); // Reset to default OUT
        setNotes('');
        setIsModalOpen(true);
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
                                <LuPackage className="text-primary/70" />
                                Stock Barang
                            </h1>
                            <p className="text-xs font-bold text-primary/60">Kelola inventaris dan stok harian</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-3 pb-24 space-y-2">
                {loading ? (
                    <div className="animate-pulse space-y-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-16 bg-white/50 rounded-xl"></div>
                        ))}
                    </div>
                ) : stocks.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-2xl shadow-sm mx-2">
                        <LuPackage className="mx-auto text-4xl text-primary/20 mb-2" />
                        <p className="text-sm font-medium text-primary/50">Belum ada barang di sistem.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {stocks.map((stock) => (
                            <div
                                key={stock.id}
                                className="bg-white rounded-xl p-3 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow"
                            >
                                <div
                                    className="flex-1 min-w-0 cursor-pointer pr-2"
                                    onClick={() => openAdjustModal(stock)}
                                >
                                    <h3 className="font-bold text-sm text-primary truncate leading-tight">
                                        {stock.item_name}
                                    </h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-sm font-black text-primary">{stock.qty}</span>
                                        <span className="text-[10px] font-bold text-primary/50 uppercase">
                                            {stock.unit}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => openAdjustModal(stock)}
                                        className="px-3 py-2 bg-brand-yellow/30 hover:bg-brand-yellow/50 text-primary font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                                    >
                                        <LuPlus size={14} /> Penyesuaian
                                    </button>

                                    <button
                                        onClick={() => router.push(`/stock/${stock.id}/history`)}
                                        className="p-2.5 text-primary/40 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                                        title="Lihat Riwayat"
                                    >
                                        <LuHistory size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Adjust Stock Modal */}
            {isModalOpen && selectedStock && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-brand-yellow/10">
                            <div>
                                <h3 className="font-extrabold text-lg text-primary">Penyesuaian Stok</h3>
                                <p className="text-xs font-medium text-primary/60">{selectedStock.item_name}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white rounded-full text-gray-400 hover:text-gray-600 shadow-sm transition-colors">
                                <MdClose className="text-xl" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <span className="text-xs font-bold text-gray-500 uppercase">Stok Saat Ini</span>
                                <span className="text-lg font-black text-primary">{selectedStock.qty} <span className="text-xs font-bold uppercase ml-1 opacity-60">{selectedStock.unit}</span></span>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-brand-yellow/5 rounded-xl border border-brand-yellow/20 cursor-pointer" onClick={() => setIsIncrement(!isIncrement)}>
                                    <div>
                                        <p className="text-xs font-extrabold text-primary uppercase">Stok Masuk (IN)</p>
                                        <p className="text-[10px] font-bold text-primary/50">Centang jika ini adalah stok tambahan</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={isIncrement}
                                        onChange={(e) => setIsIncrement(e.target.checked)}
                                        className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-primary/60 ml-1">
                                        {isIncrement ? 'Jumlah Tambahan' : 'Stok Tersedia (Sisa)'}
                                    </label>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        value={qtyChange}
                                        onChange={e => setQtyChange(e.target.value)}
                                        placeholder={isIncrement ? "0" : selectedStock.qty.toString()}
                                        className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm font-bold text-primary focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-gray-300 placeholder:font-medium"
                                    />
                                    {qtyChange && !isNaN(parseFloat(qtyChange)) && (
                                        <p className="text-xs font-medium text-gray-500 ml-1 mt-1">
                                            Hasil Akhir: <span className={`font-bold ${isIncrement ? 'text-green-600' : (parseFloat(qtyChange) > Number(selectedStock.qty) ? 'text-green-600' : (parseFloat(qtyChange) < Number(selectedStock.qty) ? 'text-red-500' : 'text-primary'))}`}>
                                                {isIncrement ? (Number(selectedStock.qty) + parseFloat(qtyChange)) : parseFloat(qtyChange)}
                                            </span> {selectedStock.unit}
                                            {!isIncrement && parseFloat(qtyChange) !== Number(selectedStock.qty) && (
                                                <span className="text-[10px] ml-2 opacity-60">
                                                    ({parseFloat(qtyChange) - Number(selectedStock.qty) > 0 ? '+' : ''}{parseFloat(qtyChange) - Number(selectedStock.qty)})
                                                </span>
                                            )}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-primary/60 ml-1">Catatan (Opsional)</label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Contoh: Stok masuk harian"
                                    className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm font-medium text-primary focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-gray-300"
                                />
                            </div>

                            <button
                                onClick={handleAdjustStock}
                                className="w-full h-12 mt-2 bg-primary text-brand-yellow font-extrabold text-sm rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
                            >
                                Simpan Perubahan
                            </button>
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
