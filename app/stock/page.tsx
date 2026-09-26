'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { LuPlus, LuHistory, LuPackage, LuPencil, LuTrash2 } from 'react-icons/lu';
import PageHeader from '@/components/PageHeader';
import StoreSwitcher from '@/components/StoreSwitcher';
import { MdClose } from 'react-icons/md';
import { useUserRole } from '@/hooks/useUserRole';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';
import { fetchJson } from '@/utils/fetchJson';
import { API_URL } from '@/utils/config';

export default function StockPage() {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const userRoleData = useUserRole('stock');
    const router = useRouter();

    const [stocks, setStocks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Stock is per store: every store keeps its own physical inventory.
    const [stores, setStores] = useState<{ id: number; name: string }[]>([]);
    const [activeStoreId, setActiveStoreId] = useState<number | null>(null);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [newItemUnit, setNewItemUnit] = useState('gram');
    const [newItemQty, setNewItemQty] = useState('');
    // Purchase price: "Rp {priceTotal} for {priceAmount} {unit}" → price per unit (HPP).
    const [priceTotal, setPriceTotal] = useState('');
    const [priceAmount, setPriceAmount] = useState('');
    const [currentPricePerUnit, setCurrentPricePerUnit] = useState<number | null>(null);
    // null = creating a new item; otherwise the id of the item being edited.
    const [editingStockId, setEditingStockId] = useState<number | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStock, setSelectedStock] = useState<any>(null);
    const [qtyChange, setQtyChange] = useState('');
    const [isIncrement, setIsIncrement] = useState(false); // Default: OUT
    const [notes, setNotes] = useState('');
    const [totalPrice, setTotalPrice] = useState('');

    const { toast, showToast, hideToast } = useToast();

    const fetchStocks = async (storeId: number | null = activeStoreId) => {
        if (!storeId) return;
        setLoading(true);
        try {
            const json = await fetchJson(`${API_URL}/api/stocks?store_id=${storeId}`);
            if (json.status === 'ok') {
                setStocks(json.data);
            }
        } catch (e) {
            console.error(e);
            showToast('❌ Error', 'Gagal memuat data stok', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJson(`${API_URL}/api/stores`)
            .then(json => {
                if (json.status === 'ok') {
                    setStores(json.data);
                    if (json.data.length > 0) setActiveStoreId(json.data[0].id);
                    else setLoading(false);
                }
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
                showToast('❌ Error', 'Gagal memuat daftar store', 'error');
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (activeStoreId) fetchStocks(activeStoreId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeStoreId]);

    const closeItemModal = () => {
        setIsCreateOpen(false);
        setEditingStockId(null);
        setNewItemName('');
        setNewItemUnit('gram');
        setNewItemQty('');
        setPriceTotal('');
        setPriceAmount('');
        setCurrentPricePerUnit(null);
    };

    // Amount defaults to the initial stock when creating ("bought 5000 g for Rp 700.000").
    const effectivePriceAmount = priceAmount.trim() || (!editingStockId ? newItemQty.trim() : '');
    const computedPricePerUnit = (() => {
        const total = parseFloat(priceTotal);
        const amount = parseFloat(effectivePriceAmount);
        return total >= 0 && amount > 0 ? total / amount : null;
    })();
    const formatPerUnit = (n: number) => `Rp ${n.toLocaleString('id-ID', { maximumFractionDigits: 2 })}`;

    const openCreateItem = () => {
        closeItemModal();
        setIsCreateOpen(true);
    };

    const openEditItem = (stock: { id: number; item_name?: string; unit?: string | null; price_per_unit?: number | null }) => {
        setEditingStockId(stock.id);
        setNewItemName(stock.item_name ?? '');
        setNewItemUnit(stock.unit ?? 'gram');
        setNewItemQty('');
        setPriceTotal('');
        setPriceAmount('');
        setCurrentPricePerUnit(stock.price_per_unit ?? null);
        setIsCreateOpen(true);
    };

    const handleCreateStock = async () => {
        if (!activeStoreId || !newItemName.trim() || !newItemUnit.trim()) {
            showToast('⚠️ Peringatan', 'Nama bahan dan satuan wajib diisi.', 'error');
            return;
        }
        if (priceTotal.trim() && computedPricePerUnit === null) {
            showToast('⚠️ Peringatan', `Isi juga jumlah (${newItemUnit}) yang didapat dari harga tersebut.`, 'error');
            return;
        }
        try {
            const json = editingStockId
                ? await fetchJson(`${API_URL}/api/stocks/${editingStockId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        item_name: newItemName.trim(),
                        unit: newItemUnit.trim(),
                        // Only sent when a new purchase price was entered; otherwise the stored one stays.
                        ...(computedPricePerUnit !== null ? { price_per_unit: computedPricePerUnit } : {}),
                    }),
                })
                : await fetchJson(`${API_URL}/api/stocks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        item_name: newItemName.trim(),
                        unit: newItemUnit.trim(),
                        store_id: activeStoreId,
                        qty: newItemQty ? parseFloat(newItemQty) : 0,
                        price_per_unit: computedPricePerUnit,
                    }),
                });
            if (json.status === 'ok') {
                showToast('✅ Berhasil', editingStockId ? 'Bahan diperbarui' : 'Bahan ditambahkan', 'success');
                closeItemModal();
                fetchStocks();
            }
        } catch (e) {
            showToast('❌ Gagal', e instanceof Error ? e.message : 'Gagal menyimpan bahan', 'error');
        }
    };

    const handleDeleteStock = async () => {
        if (!editingStockId) return;
        if (!confirm(`Hapus bahan "${newItemName}" beserta riwayat stoknya?`)) return;
        try {
            await fetchJson(`${API_URL}/api/stocks/${editingStockId}`, { method: 'DELETE' });
            showToast('✅ Berhasil', 'Bahan dihapus', 'success');
            closeItemModal();
            fetchStocks();
        } catch (e) {
            showToast('❌ Gagal', e instanceof Error ? e.message : 'Gagal menghapus bahan', 'error');
        }
    };

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
            !isIncrement, // is_target = true jika mode Sisa Stok (unchecked)
            // Purchase price only applies to stock-in; it sets the HPP price per unit.
            isIncrement && totalPrice.trim() ? parseFloat(totalPrice) : null
        );
    };

    const executeAdjustment = async (stock_id: number, qty_change: number, type: string, n: string, is_target: boolean = false, total_price: number | null = null) => {
        try {
            const json = await fetchJson(`${API_URL}/api/stocks/adjust`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stock_id,
                    qty_change,
                    type,
                    is_target,
                    notes: n,
                    total_price,
                }),
            });
            if (json.status === 'ok') {
                showToast('✅ Berhasil', 'Stok berhasil diperbarui', 'success');
                setIsModalOpen(false);
                setQtyChange('');
                setNotes('');
                setTotalPrice('');
                fetchStocks();
            } else {
                showToast('❌ Gagal', json.message || 'Gagal update stok', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('❌ Error', e instanceof Error ? e.message : 'Terjadi kesalahan sistem', 'error');
        }
    };

    const openAdjustModal = (stock: any) => {
        setSelectedStock(stock);
        setQtyChange('');
        setIsIncrement(false); // Reset to default OUT
        setNotes('');
        setTotalPrice('');
        setIsModalOpen(true);
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

            <PageHeader
                title="Stok Barang"
                subtitle="Kelola inventaris dan stok harian per store"
                icon={<LuPackage />}
                onMenu={() => setSidebarOpen(true)}
                action={
                    <button
                        onClick={openCreateItem}
                        disabled={!activeStoreId}
                        className="h-10 px-3.5 inline-flex items-center gap-1.5 bg-primary text-brand-yellow font-bold text-sm rounded-xl hover:opacity-90 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        <LuPlus size={16} /> Bahan
                    </button>
                }
            >
                {/* Stock is per store */}
                <StoreSwitcher stores={stores} value={activeStoreId} onChange={setActiveStoreId} />
            </PageHeader>

            {/* Create Stock Item Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-extrabold text-primary">{editingStockId ? 'Edit Bahan' : 'Tambah Bahan'}</h2>
                            <button onClick={closeItemModal} className="p-2 rounded-xl hover:bg-black/5">
                                <MdClose className="text-xl text-primary" />
                            </button>
                        </div>
                        <p className="text-xs font-bold text-primary/50">Store: {stores.find(s => s.id === activeStoreId)?.name}</p>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-primary/60">Nama Bahan</label>
                            <input
                                value={newItemName}
                                onChange={e => setNewItemName(e.target.value)}
                                placeholder="mis. Tepung Terigu"
                                className="w-full h-10 px-3 rounded-xl border border-primary/10 bg-primary/5 text-sm font-bold text-primary focus:outline-none"
                            />
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1 space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-primary/60">Satuan</label>
                                <select
                                    value={newItemUnit}
                                    onChange={e => setNewItemUnit(e.target.value)}
                                    className="w-full h-10 px-3 rounded-xl border border-primary/10 bg-primary/5 text-sm font-bold text-primary focus:outline-none"
                                >
                                    <option value="gram">gram</option>
                                    <option value="ml">ml</option>
                                    <option value="pcs">pcs</option>
                                    <option value="kg">kg</option>
                                    <option value="liter">liter</option>
                                </select>
                            </div>
                            {!editingStockId && (
                            <div className="flex-1 space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-primary/60">Input Stok</label>
                                <input
                                    type="number"
                                    value={newItemQty}
                                    onChange={e => setNewItemQty(e.target.value)}
                                    placeholder="0"
                                    className="w-full h-10 px-3 rounded-xl border border-primary/10 bg-primary/5 text-sm font-bold text-primary focus:outline-none"
                                />
                            </div>
                            )}
                        </div>
                        {/* Purchase price → price per unit, used for HPP */}
                        <div className="space-y-2 rounded-2xl bg-primary/5 p-3">
                            <div className="flex items-baseline justify-between gap-2">
                                <label htmlFor="stock-price-total" className="text-[10px] font-black uppercase text-primary/60">Harga modal {editingStockId ? '' : '(opsional)'}</label>
                                {editingStockId && (
                                    <span className="text-[11px] font-bold text-primary/60">
                                        Sekarang: {currentPricePerUnit != null ? `${formatPerUnit(currentPricePerUnit)}/${newItemUnit}` : 'belum ada'}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-primary/60">Rp</span>
                                <input
                                    id="stock-price-total"
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    value={priceTotal}
                                    onChange={e => setPriceTotal(e.target.value)}
                                    placeholder="700000"
                                    className="flex-1 min-w-0 h-11 px-3 rounded-xl border border-primary/10 bg-white text-base sm:text-sm font-bold text-primary focus:outline-none"
                                />
                                <span className="text-sm font-bold text-primary/60">untuk</span>
                                <input
                                    id="stock-price-amount"
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    value={priceAmount}
                                    onChange={e => setPriceAmount(e.target.value)}
                                    placeholder={!editingStockId && newItemQty ? newItemQty : '5000'}
                                    className="w-24 h-11 px-3 rounded-xl border border-primary/10 bg-white text-base sm:text-sm font-bold text-primary focus:outline-none"
                                />
                                <span className="text-sm font-bold text-primary/60 w-10 truncate">{newItemUnit}</span>
                            </div>
                            {editingStockId && (
                                <p className="text-[11px] text-primary/50">Mengisi di sini langsung <b>mengganti</b> harga modal (untuk koreksi). Pembelian baru sebaiknya lewat Penyesuaian → Stok Masuk, supaya harga dirata-rata dengan sisa stok.</p>
                            )}
                            <p className="text-[11px] font-semibold text-primary/60">
                                {computedPricePerUnit !== null
                                    ? <>≈ <b className="text-primary">{formatPerUnit(computedPricePerUnit)}</b> / {newItemUnit}. Dipakai untuk menghitung HPP.</>
                                    : !editingStockId && newItemQty
                                        ? `Kosongkan "untuk" kalau harganya untuk jumlah stok yang diinput (${newItemQty} ${newItemUnit}).`
                                        : 'Contoh: Rp 700.000 untuk 5000 gram = Rp 140/gram.'}
                            </p>
                        </div>
                        <p className="text-[10px] font-bold text-primary/50">Hanya bahan bersatuan <b>gram</b> yang bisa dipakai di resep (auto-potong stok & HPP).</p>
                        <button
                            onClick={handleCreateStock}
                            className="w-full h-11 bg-primary text-brand-yellow font-bold text-sm rounded-xl hover:opacity-90"
                        >
                            Simpan
                        </button>
                        {editingStockId && (
                            <button
                                onClick={handleDeleteStock}
                                className="w-full h-10 flex items-center justify-center gap-1.5 text-red-600 font-bold text-xs rounded-xl hover:bg-red-50"
                            >
                                <LuTrash2 /> Hapus Bahan
                            </button>
                        )}
                    </div>
                </div>
            )}

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
                                        {stock.price_per_unit != null ? (
                                            <span className="text-[10px] font-bold text-primary/40 ml-1">
                                                · Rp {Number(stock.price_per_unit).toLocaleString('id-ID', { maximumFractionDigits: 2 })}/{stock.unit}
                                            </span>
                                        ) : (
                                            <button type="button" onClick={e => { e.stopPropagation(); openEditItem(stock); }}
                                                className="ml-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                                                Belum ada harga
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => openEditItem(stock)}
                                        className="p-2.5 text-primary/40 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                                        title="Edit / hapus bahan"
                                    >
                                        <LuPencil size={16} />
                                    </button>
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

                            {isIncrement && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-primary/60 ml-1">Total Harga Beli (Opsional)</label>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        value={totalPrice}
                                        onChange={e => setTotalPrice(e.target.value)}
                                        placeholder="mis. 700000"
                                        className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm font-bold text-primary focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-gray-300 placeholder:font-medium"
                                    />
                                    {totalPrice && parseFloat(qtyChange) > 0 && !isNaN(parseFloat(totalPrice)) && (() => {
                                        // Same rule as the backend: average what's on hand with this purchase.
                                        const inQty = parseFloat(qtyChange);
                                        const inCost = parseFloat(totalPrice) / inQty;
                                        const onHand = Number(selectedStock.qty);
                                        const current = selectedStock.price_per_unit == null ? null : Number(selectedStock.price_per_unit);
                                        const next = current === null || !(onHand > 0) ? inCost : (onHand * current + inQty * inCost) / (onHand + inQty);
                                        const rp = (n: number) => `Rp ${n.toLocaleString('id-ID', { maximumFractionDigits: 2 })}`;
                                        return (
                                            <p className="text-xs font-medium text-gray-500 ml-1 space-y-0.5">
                                                <span className="block">Harga beli ini ≈ <b className="text-primary">{rp(inCost)}</b> / {selectedStock.unit}</span>
                                                <span className="block">
                                                    Harga modal baru (rata-rata): <b className="text-primary">{rp(next)}</b> / {selectedStock.unit}
                                                    {current !== null && onHand > 0 && <> — dari sisa {onHand} {selectedStock.unit} @ {rp(current)}</>}
                                                </span>
                                            </p>
                                        );
                                    })()}
                                </div>
                            )}

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

            <Toast toast={toast} onClose={hideToast} />
        </div>
    );
}
