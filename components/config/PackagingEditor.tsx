'use client';

import { useEffect, useState } from 'react';
import { LuChevronDown, LuCopy, LuPackage, LuPlus, LuTrash2 } from 'react-icons/lu';
import type { Store } from '@/types/menu';
import type { StockItem } from '@/components/VariantRecipeEditor';
import { shortStoreNames } from '@/components/StoreSwitcher';
import { fetchJson } from '@/utils/fetchJson';
import { API_URL } from '@/utils/config';
import { formatRupiah } from '@/utils/format';
import { Card, buttonPrimary, buttonSecondary, inputClass } from './ui';

type Notify = (title: string, message: string, type: 'success' | 'error') => void;
type Mode = 'per_box' | 'per_boxes' | 'per_order';

interface Row {
    stock_id: number | '';
    /** Encodes box_type + mode for the "per" dropdown: FULL | HALF | ALL | N | ORDER */
    per: 'FULL' | 'HALF' | 'ALL' | 'N' | 'ORDER';
    qty: string;
    n: string;
}

interface ApiRule {
    stock_id: number;
    box_type: string | null;
    mode: Mode;
    qty: number;
    boxes_per_unit: number | null;
}

const PER_OPTIONS: { value: Row['per']; label: string }[] = [
    { value: 'FULL', label: 'Box Besar' },
    { value: 'HALF', label: 'Box Kecil' },
    { value: 'ALL', label: 'Setiap box' },
    { value: 'N', label: 'Setiap N box' },
    { value: 'ORDER', label: 'Order' },
];

const GRAM_UNITS = ['gram', 'g', 'gr'];
const isGram = (unit: string | null | undefined) => GRAM_UNITS.includes((unit ?? '').trim().toLowerCase());

const fromApi = (r: ApiRule): Row => ({
    stock_id: r.stock_id,
    per: r.mode === 'per_order' ? 'ORDER' : r.mode === 'per_boxes' ? 'N' : r.box_type === 'FULL' ? 'FULL' : r.box_type === 'HALF' ? 'HALF' : 'ALL',
    qty: String(Number(r.qty)),
    n: r.boxes_per_unit ? String(r.boxes_per_unit) : '2',
});

const toApi = (r: Row) => ({
    stock_id: r.stock_id,
    box_type: r.per === 'FULL' || r.per === 'HALF' ? r.per : null,
    mode: (r.per === 'ORDER' ? 'per_order' : r.per === 'N' ? 'per_boxes' : 'per_box') as Mode,
    qty: Number(r.qty),
    boxes_per_unit: r.per === 'N' ? Number(r.n) : null,
});

/** Same rule as the backend (packaging.service computePackagingUsage), for the cost preview. */
const unitsFor = (row: Row, boxes: { FULL: number; HALF: number }) => {
    const count = row.per === 'FULL' ? boxes.FULL : row.per === 'HALF' ? boxes.HALF : boxes.FULL + boxes.HALF;
    if (count <= 0) return 0;
    const qty = parseFloat(row.qty) || 0;
    if (row.per === 'ORDER') return qty;
    if (row.per === 'N') return Math.ceil(count / Math.max(2, parseInt(row.n) || 2)) * qty;
    return count * qty;
};

/**
 * "Kemasan & perlengkapan": counted items (boxes, forks, bags, stickers) deducted per order.
 * Per store; the items themselves are ordinary stock rows (priced on the Stok page).
 */
export default function PackagingEditor({ storeId, stores, stocks, notify, onChanged }: {
    storeId: number;
    stores: Store[];
    stocks: StockItem[];
    notify: Notify;
    onChanged: () => void;
}) {
    const [rows, setRows] = useState<Row[]>([]);
    const [saved, setSaved] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [copying, setCopying] = useState<number | null>(null);

    // Packaging is counted, so gram ingredients aren't offered here.
    const items = stocks.filter(s => s.store_id === storeId && !isGram(s.unit));
    const otherStores = stores.filter(s => s.id !== storeId);
    const shortNames = shortStoreNames(stores);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetchJson(`${API_URL}/api/packaging-rule?store_id=${storeId}`)
            .then(json => {
                if (cancelled) return;
                const loaded = (json.data as ApiRule[]).map(fromApi);
                setRows(loaded);
                setSaved(loaded);
            })
            .catch(() => notify('❌ Error', 'Gagal memuat aturan kemasan', 'error'))
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId]);

    const dirty = JSON.stringify(rows) !== JSON.stringify(saved);
    const updateRow = (i: number, patch: Partial<Row>) => setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    const priceOf = (stockId: number | '') => {
        const p = items.find(s => s.id === stockId)?.price_per_unit;
        return p == null ? null : Number(p);
    };
    const missingPrice = [...new Set(rows.filter(r => r.stock_id !== '' && priceOf(r.stock_id) === null).map(r => items.find(s => s.id === r.stock_id)?.item_name ?? ''))];
    const orderCost = (boxes: { FULL: number; HALF: number }) =>
        rows.reduce((sum, r) => sum + unitsFor(r, boxes) * (priceOf(r.stock_id) ?? 0), 0);

    const save = async () => {
        const invalid = rows.find(r => r.stock_id === '' || !(parseFloat(r.qty) > 0) || (r.per === 'N' && !(parseInt(r.n) >= 2)));
        if (invalid) {
            notify('⚠️ Periksa lagi', 'Setiap baris harus punya barang, jumlah > 0, dan "setiap N box" minimal 2.', 'error');
            return;
        }
        setSaving(true);
        try {
            const json = await fetchJson(`${API_URL}/api/packaging-rule`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ store_id: storeId, items: rows.map(toApi) }),
            });
            const next = (json.data as ApiRule[]).map(fromApi);
            setRows(next);
            setSaved(next);
            notify('✅ Tersimpan', 'Aturan kemasan diperbarui', 'success');
            onChanged();
        } catch (e) {
            notify('❌ Gagal', e instanceof Error ? e.message : 'Gagal menyimpan aturan kemasan', 'error');
        } finally {
            setSaving(false);
        }
    };

    const copyTo = async (target: Store) => {
        setCopying(target.id);
        try {
            const json = await fetchJson(`${API_URL}/api/packaging-rule/copy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from_store_id: storeId, to_store_id: target.id }),
            });
            const created: string[] = json.data.created_stock ?? [];
            notify('✅ Disalin', `Aturan kemasan disalin ke ${target.name}${created.length ? `. Barang baru (stok 0): ${created.join(', ')}` : ''}`, 'success');
            onChanged();
        } catch (e) {
            notify('❌ Gagal', e instanceof Error ? e.message : 'Gagal menyalin aturan kemasan', 'error');
        } finally {
            setCopying(null);
        }
    };

    return (
        <Card className="mt-3 space-y-3">
            <div className="flex items-start gap-3">
                <div className="w-9 h-9 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><LuPackage /></div>
                <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-extrabold text-primary">Kemasan & perlengkapan</h3>
                    <p className="text-xs text-primary/60">
                        Barang yang dihitung per buah (box, garpu, plastik, sticker). Terpotong otomatis setiap ada order.
                        Stok dan harganya diatur di halaman Stok.
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="h-11 rounded-xl bg-primary/5 animate-pulse" />
            ) : (
                <>
                    {rows.length === 0 && <p className="text-xs text-primary/50">Belum ada aturan kemasan di store ini.</p>}
                    {rows.map((row, i) => (
                        <div key={i} className="rounded-xl border border-primary/10 p-2 space-y-2 sm:border-0 sm:p-0">
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1 min-w-0">
                                    <select
                                        aria-label="Barang"
                                        value={row.stock_id}
                                        onChange={e => updateRow(i, { stock_id: e.target.value ? Number(e.target.value) : '' })}
                                        className={`${inputClass} appearance-none pr-9 truncate ${row.stock_id === '' ? 'text-primary/40' : ''}`}
                                    >
                                        <option value="">Pilih barang…</option>
                                        {items.map(s => <option key={s.id} value={s.id}>{s.item_name}</option>)}
                                    </select>
                                    <LuChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary/50" />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setRows(prev => prev.filter((_, idx) => idx !== i))}
                                    className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl text-red-500 hover:bg-red-50 sm:order-last"
                                    title="Hapus aturan"
                                >
                                    <LuTrash2 />
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-16 shrink-0">
                                    <input
                                        aria-label="Jumlah"
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        step="1"
                                        value={row.qty}
                                        onChange={e => updateRow(i, { qty: e.target.value })}
                                        placeholder="1"
                                        className={`${inputClass} text-right tabular-nums`}
                                    />
                                </div>
                                <span className="text-xs font-bold text-primary/50 shrink-0">per</span>
                                <div className="relative flex-1 min-w-0">
                                    <select
                                        aria-label="Per"
                                        value={row.per}
                                        onChange={e => updateRow(i, { per: e.target.value as Row['per'] })}
                                        className={`${inputClass} appearance-none pr-9 truncate`}
                                    >
                                        {PER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                    <LuChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary/50" />
                                </div>
                                {row.per === 'N' && (
                                    <div className="relative w-20 shrink-0">
                                        <input
                                            aria-label="N box"
                                            type="number"
                                            inputMode="numeric"
                                            min="2"
                                            step="1"
                                            value={row.n}
                                            onChange={e => updateRow(i, { n: e.target.value })}
                                            className={`${inputClass} pr-9 text-right tabular-nums`}
                                        />
                                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-primary/50">box</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {missingPrice.length > 0 && (
                        <p className="text-[11px] font-semibold text-red-600">Harga modal belum diisi: {missingPrice.join(', ')} (dihitung Rp 0). Isi di halaman Stok.</p>
                    )}
                    {rows.length > 0 && (
                        <p className="text-[11px] font-semibold text-primary/60">
                            Biaya kemasan per order: 1 Box Besar ≈ {formatRupiah(Math.round(orderCost({ FULL: 1, HALF: 0 })))}
                            {' · '}2 Box Besar ≈ {formatRupiah(Math.round(orderCost({ FULL: 2, HALF: 0 })))}
                            {' · '}3 Box Besar ≈ {formatRupiah(Math.round(orderCost({ FULL: 3, HALF: 0 })))}
                            {' · '}1 Box Kecil ≈ {formatRupiah(Math.round(orderCost({ FULL: 0, HALF: 1 })))}
                        </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setRows(prev => [...prev, { stock_id: '', per: 'ALL', qty: '1', n: '2' }])} disabled={items.length === 0} className={buttonSecondary}>
                            <LuPlus /> Barang
                        </button>
                        <button type="button" onClick={save} disabled={!dirty || saving} className={buttonPrimary}>
                            {saving ? 'Menyimpan…' : 'Simpan kemasan'}
                        </button>
                        {!dirty && saved.length > 0 && otherStores.map(s => (
                            <button key={s.id} type="button" onClick={() => copyTo(s)} disabled={copying !== null} className={buttonSecondary}>
                                <LuCopy /> {copying === s.id ? 'Menyalin…' : `Salin ke ${shortNames[s.id] ?? s.name}`}
                            </button>
                        ))}
                    </div>
                    {items.length === 0 && <p className="text-[11px] text-primary/50">Belum ada barang bersatuan pcs di store ini. Tambahkan dulu di halaman Stok.</p>}
                </>
            )}
        </Card>
    );
}
