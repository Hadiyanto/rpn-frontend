'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { LuHistory, LuPencil, LuTrash2, LuX } from 'react-icons/lu';
import { useUserRole } from '@/hooks/useUserRole';
import { fetchJson } from '@/utils/fetchJson';
import { API_URL } from '@/utils/config';
import PageHeader from '@/components/PageHeader';
import { dateTimeLocalToISO, toDateTimeLocal } from '@/utils/datetime';

interface HistoryRow {
    id: number;
    type: 'IN' | 'OUT' | 'ADJUSTMENT';
    qty_change: string;
    final_qty: string;
    notes: string | null;
    created_at: string;
    /** Same moment as an absolute ISO time (created_at has no zone). */
    created_at_iso?: string;
    order_id: number | null;
    total_price: string | null;
    unit_cost: string | null;
}

interface Boxes { full: number; half: number }

/** GET /api/stocks/:id/history/report */
interface Report {
    stock: { id: number; item_name: string; unit: string; qty: number; price_per_unit: number | null };
    /** By when stock moved: opening + in − out = closing. */
    ledger: { opening: number; total_in: number; total_out: number; out_orders: number; out_manual: number; closing: number; orders: number; boxes: Boxes };
    /** Like the Sales page: pickup date in the period, without UNPAID/CANCELLED. */
    sales: { orders: number; boxes: Boxes; usage: number };
    movements: HistoryRow[];
}

const day = (d: Date) => toDateTimeLocal(d).slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const PRESETS: { key: string; label: string; range: () => [string, string] }[] = [
    { key: 'today', label: 'Hari ini', range: () => [day(new Date()), day(new Date())] },
    { key: 'yesterday', label: 'Kemarin', range: () => [day(addDays(new Date(), -1)), day(addDays(new Date(), -1))] },
    { key: '7d', label: '7 hari', range: () => [day(addDays(new Date(), -6)), day(new Date())] },
    { key: 'month', label: 'Bulan ini', range: () => { const n = new Date(); return [day(new Date(n.getFullYear(), n.getMonth(), 1)), day(n)]; } },
];

// Booked by an order: has order_id, or (older rows / deleted orders) only names it in the note.
const isOrderMovement = (h: HistoryRow) => h.order_id != null || /^(Reversal )?Order #\d+$/.test(h.notes ?? '');

type Direction = 'ALL' | 'IN' | 'OUT';
const DIRECTIONS: { key: Direction; label: string }[] = [
    { key: 'ALL', label: 'Semua' }, { key: 'IN', label: 'Masuk' }, { key: 'OUT', label: 'Keluar' },
];

const fmt = (n: number | string) => Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 });
const boxesText = (b: Boxes) => [b.full ? `${b.full} Box Besar` : '', b.half ? `${b.half} Box Kecil` : ''].filter(Boolean).join(' · ') || '0 box';
const timeText = (iso: string) => new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function StockHistoryPage() {
    const router = useRouter();
    const params = useParams();
    const stockId = params.id as string;
    useUserRole('stock');

    const [preset, setPreset] = useState('today');
    const [[from, to], setRange] = useState<[string, string]>(PRESETS[0].range());
    const [report, setReport] = useState<Report | null>(null);
    const [direction, setDirection] = useState<Direction>('ALL');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Editing a manual movement: the server re-runs this item's history afterwards.
    const [editing, setEditing] = useState<HistoryRow | null>(null);
    const [editQty, setEditQty] = useState('');
    const [editTotal, setEditTotal] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [editDate, setEditDate] = useState('');
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState('');

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const json = await fetchJson(`${API_URL}/api/stocks/${stockId}/history/report?from=${from}&to=${to}`);
            if (json.status === 'ok') setReport(json.data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Gagal memuat riwayat');
        } finally {
            setLoading(false);
        }
    }, [stockId, from, to]);

    useEffect(() => {
        if (stockId) fetchHistory();
    }, [stockId, fetchHistory]);

    const pickPreset = (key: string) => {
        const p = PRESETS.find(x => x.key === key);
        if (!p) return;
        setPreset(key);
        setRange(p.range());
    };
    const setFrom = (v: string) => { setPreset(''); setRange([v, v > to ? v : to]); };
    const setTo = (v: string) => { setPreset(''); setRange([v < from ? v : from, v]); };

    const openEdit = (h: HistoryRow) => {
        setEditing(h);
        // OUT is entered as a positive amount; ADJUSTMENT keeps its sign.
        setEditQty(String(h.type === 'ADJUSTMENT' ? Number(h.qty_change) : Math.abs(Number(h.qty_change))));
        setEditTotal(h.total_price == null ? '' : String(Number(h.total_price)));
        setEditNotes(h.notes ?? '');
        setEditDate(toDateTimeLocal(new Date(h.created_at_iso ?? h.created_at)));
        setEditError('');
    };

    const saveEdit = async () => {
        if (!editing) return;
        setSaving(true);
        setEditError('');
        try {
            await fetchJson(`${API_URL}/api/stocks/history/${editing.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    qty: parseFloat(editQty),
                    ...(editing.type === 'IN' ? { total_price: editTotal.trim() === '' ? null : parseFloat(editTotal) } : {}),
                    notes: editNotes.trim() || null,
                    created_at: dateTimeLocalToISO(editDate),
                }),
            });
            setEditing(null);
            fetchHistory();
        } catch (e) {
            setEditError(e instanceof Error ? e.message : 'Gagal menyimpan');
        } finally {
            setSaving(false);
        }
    };

    const deleteMovement = async () => {
        if (!editing) return;
        const change = Number(editing.qty_change);
        const label = `${editing.type} ${change > 0 ? '+' : ''}${fmt(change)} ${report?.stock.unit ?? ''} (${timeText(editing.created_at_iso ?? editing.created_at)})`;
        if (!confirm(`Hapus pergerakan ${label}?\n\nSaldo, harga modal, dan HPP order sesudahnya akan dihitung ulang.`)) return;
        setSaving(true);
        setEditError('');
        try {
            await fetchJson(`${API_URL}/api/stocks/history/${editing.id}`, { method: 'DELETE' });
            setEditing(null);
            fetchHistory();
        } catch (e) {
            setEditError(e instanceof Error ? e.message : 'Gagal menghapus');
        } finally {
            setSaving(false);
        }
    };

    const unit = report?.stock.unit ?? '';
    const movements = (report?.movements ?? []).filter(h =>
        direction === 'ALL' || (direction === 'IN' ? Number(h.qty_change) > 0 : Number(h.qty_change) < 0));
    const L = report?.ledger;
    const S = report?.sales;

    return (
        <div className="bg-brand-white min-h-screen font-display text-primary pb-20 p-0 m-0">
            <PageHeader
                title={report ? report.stock.item_name : 'Riwayat Stok'}
                subtitle={report ? `Riwayat stok · saldo sekarang ${fmt(report.stock.qty)} ${unit}` : 'Pergerakan barang'}
                icon={<LuHistory />}
                onBack={() => router.back()}
            />

            <div className="p-3 space-y-3 max-w-3xl mx-auto">
                {/* Filter tanggal */}
                <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-50 space-y-2">
                    <div className="flex gap-1.5 overflow-x-auto">
                        {PRESETS.map(p => (
                            <button key={p.key} onClick={() => pickPreset(p.key)}
                                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${preset === p.key ? 'bg-primary text-brand-yellow' : 'bg-primary/5 text-primary/70 hover:bg-primary/10'}`}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="date" value={from} max={to} onChange={e => e.target.value && setFrom(e.target.value)}
                            className="flex-1 min-w-0 h-9 px-2 rounded-lg border border-gray-200 text-xs font-bold text-primary outline-none focus:border-primary" />
                        <span className="text-xs text-primary/40">s/d</span>
                        <input type="date" value={to} min={from} max={day(new Date())} onChange={e => e.target.value && setTo(e.target.value)}
                            className="flex-1 min-w-0 h-9 px-2 rounded-lg border border-gray-200 text-xs font-bold text-primary outline-none focus:border-primary" />
                    </div>
                </div>

                {error && <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl">{error}</div>}

                {loading && !report ? (
                    <div className="animate-pulse space-y-2">
                        <div className="h-24 bg-white/60 rounded-2xl" />
                        <div className="h-12 bg-white/60 rounded-xl" />
                        <div className="h-12 bg-white/60 rounded-xl" />
                    </div>
                ) : report && L && S && (
                    <div className={`space-y-3 transition-opacity ${loading ? 'opacity-50' : ''}`}>
                        {/* Ringkasan saldo (per waktu stok bergerak) */}
                        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-50">
                            <p className="text-[10px] font-black uppercase text-primary/50 mb-2">Saldo periode ini</p>
                            <div className="grid grid-cols-4 gap-1.5 text-center">
                                {[
                                    { label: 'Stok awal', value: fmt(L.opening), cls: 'text-primary' },
                                    { label: 'Masuk', value: `+${fmt(L.total_in)}`, cls: 'text-green-600' },
                                    { label: 'Keluar', value: `−${fmt(L.total_out)}`, cls: 'text-red-500' },
                                    { label: 'Stok akhir', value: fmt(L.closing), cls: L.closing < 0 ? 'text-red-600' : 'text-primary' },
                                ].map(c => (
                                    <div key={c.label} className="bg-primary/5 rounded-xl py-2 px-1">
                                        <p className="text-[9px] font-bold uppercase text-primary/50">{c.label}</p>
                                        <p className={`text-sm font-black ${c.cls}`}>{c.value}</p>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[11px] text-primary/60 mt-2">
                                Keluar: {fmt(L.out_orders)} {unit} dari order · {fmt(L.out_manual)} {unit} manual
                            </p>
                            <p className="text-[11px] text-primary/60">
                                Dipakai <b className="text-primary">{L.orders} order</b> · {boxesText(L.boxes)} <span className="text-primary/40">(menurut tanggal order masuk)</span>
                            </p>
                        </div>

                        {/* Sesuai Sales (tanggal pickup) */}
                        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-50">
                            <p className="text-[10px] font-black uppercase text-primary/50 mb-1">Sesuai Sales <span className="normal-case font-bold text-primary/40">· tanggal pickup, tanpa UNPAID/CANCELLED</span></p>
                            <div className="flex items-baseline justify-between gap-3 text-sm">
                                <span className="font-bold text-primary">{S.orders} order · {boxesText(S.boxes)}</span>
                                <span className="font-black text-primary whitespace-nowrap">{fmt(S.usage)} {unit}</span>
                            </div>
                        </div>

                        {/* Pergerakan */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 divide-y divide-gray-100">
                            <div className="px-3 py-2 flex items-center justify-between gap-2">
                                <p className="text-[10px] font-black uppercase text-primary/50">{movements.length} pergerakan</p>
                                <div className="flex gap-1">
                                    {DIRECTIONS.map(d => (
                                        <button key={d.key} onClick={() => setDirection(d.key)}
                                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${direction === d.key
                                                ? d.key === 'IN' ? 'bg-green-600 text-white' : d.key === 'OUT' ? 'bg-red-500 text-white' : 'bg-primary text-brand-yellow'
                                                : 'bg-primary/5 text-primary/60 hover:bg-primary/10'}`}>
                                            {d.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {movements.length === 0 && (
                                <p className="px-3 py-6 text-center text-xs font-medium text-primary/40">Tidak ada pergerakan di periode ini.</p>
                            )}
                            {movements.map(h => {
                                const change = Number(h.qty_change);
                                return (
                                    <div key={h.id} className="px-3 py-2 flex items-start gap-2">
                                        <span className={`mt-0.5 shrink-0 w-12 text-center text-[9px] font-black uppercase py-0.5 rounded-full ${h.type === 'IN' ? 'bg-green-100 text-green-700' : h.type === 'OUT' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {h.type === 'ADJUSTMENT' ? 'ADJ' : h.type}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-primary truncate">
                                                {h.order_id ? `Order #${h.order_id}` : h.notes || (h.type === 'IN' ? 'Stok masuk' : 'Penyesuaian')}
                                            </p>
                                            <p className="text-[10px] text-gray-400 truncate">
                                                {timeText(h.created_at_iso ?? h.created_at)}
                                                {h.unit_cost != null && ` · @Rp ${fmt(h.unit_cost)}`}
                                                {h.total_price != null && ` · beli Rp ${fmt(h.total_price)}`}
                                                {h.order_id && h.notes && h.notes !== `Order #${h.order_id}` && ` · ${h.notes}`}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className={`text-sm font-black leading-tight ${change > 0 ? 'text-green-600' : 'text-red-500'}`}>{change > 0 ? '+' : ''}{fmt(change)}</p>
                                            <p className="text-[10px] text-gray-400">saldo {fmt(h.final_qty)}</p>
                                        </div>
                                        {!isOrderMovement(h) ? (
                                            <button onClick={() => openEdit(h)} aria-label="Edit" className="shrink-0 p-1 mt-0.5 text-primary/40 hover:text-primary">
                                                <LuPencil size={13} />
                                            </button>
                                        ) : <span className="shrink-0 w-[21px]" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {editing && (
                <div className="fixed inset-0 z-[100] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => !saving && setEditing(null)}>
                    <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-extrabold text-primary">Edit Pergerakan {editing.type}</h2>
                            <button onClick={() => setEditing(null)} disabled={saving} className="p-1 text-primary/50 hover:text-primary"><LuX /></button>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-primary/60 ml-1">
                                {editing.type === 'ADJUSTMENT' ? 'Perubahan (+/-)' : editing.type === 'IN' ? 'Jumlah Masuk' : 'Jumlah Keluar'}
                            </label>
                            <input type="number" inputMode="decimal" value={editQty} onChange={e => setEditQty(e.target.value)}
                                className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm font-bold text-primary focus:border-primary outline-none" />
                        </div>
                        {editing.type === 'IN' && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-primary/60 ml-1">Total Harga Beli (Opsional)</label>
                                <input type="number" inputMode="decimal" value={editTotal} onChange={e => setEditTotal(e.target.value)} placeholder="mis. 700000"
                                    className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm font-bold text-primary focus:border-primary outline-none" />
                                {parseFloat(editQty) > 0 && parseFloat(editTotal) >= 0 && (
                                    <p className="text-xs font-medium text-gray-500 ml-1">
                                        ≈ Rp {(parseFloat(editTotal) / parseFloat(editQty)).toLocaleString('id-ID', { maximumFractionDigits: 2 })} / unit
                                    </p>
                                )}
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-primary/60 ml-1">Tanggal</label>
                            <input type="datetime-local" value={editDate} max={toDateTimeLocal(new Date())} onChange={e => setEditDate(e.target.value)}
                                className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm font-bold text-primary focus:border-primary outline-none" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-primary/60 ml-1">Catatan</label>
                            <input value={editNotes} onChange={e => setEditNotes(e.target.value)}
                                className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm font-medium text-primary focus:border-primary outline-none" />
                        </div>
                        <p className="text-[11px] font-medium text-gray-500 bg-brand-yellow/10 rounded-xl p-2.5">
                            Saldo, harga modal, dan HPP order setelah tanggal ini akan dihitung ulang otomatis, juga saat pergerakan ini dihapus.
                        </p>
                        {editError && <p className="text-xs font-bold text-red-600">{editError}</p>}
                        <div className="flex gap-2">
                            <button onClick={deleteMovement} disabled={saving}
                                className="h-12 px-4 bg-red-50 text-red-600 border border-red-100 font-extrabold text-sm rounded-xl disabled:opacity-50 flex items-center gap-1.5">
                                <LuTrash2 size={15} /> Hapus
                            </button>
                            <button onClick={saveEdit} disabled={saving || !editQty}
                                className="flex-1 h-12 bg-primary text-brand-yellow font-extrabold text-sm rounded-xl disabled:opacity-50">
                                {saving ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
