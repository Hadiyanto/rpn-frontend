'use client';

import { useEffect, useState } from 'react';
import { LuChevronDown, LuCopy, LuLayers, LuPlus, LuTrash2 } from 'react-icons/lu';
import type { Store } from '@/types/menu';
import type { StockItem } from '@/components/VariantRecipeEditor';
import { shortStoreNames } from '@/components/StoreSwitcher';
import { fetchJson } from '@/utils/fetchJson';
import { API_URL } from '@/utils/config';
import { formatRupiah } from '@/utils/format';
import { Card, buttonPrimary, buttonSecondary, inputClass } from './ui';

type Notify = (title: string, message: string, type: 'success' | 'error') => void;

interface Row {
    stock_id: number | '';
    qty_gram: string;
}

const GRAM_UNITS = ['gram', 'g', 'gr'];
const isGram = (unit: string | null | undefined) => GRAM_UNITS.includes((unit ?? '').trim().toLowerCase());

/**
 * "Bahan dasar": ingredients every box uses whatever the flavor (e.g. T.Panir, T.Sasa), per store.
 * Grams are per Box Besar; a Box Kecil uses its menu "porsi resep" share. Not split between flavors.
 */
export default function BaseRecipeEditor({ storeId, stores, stocks, notify, onChanged }: {
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

    const gramStocks = stocks.filter(s => s.store_id === storeId && isGram(s.unit));
    const otherStores = stores.filter(s => s.id !== storeId);
    const shortNames = shortStoreNames(stores);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetchJson(`${API_URL}/api/base-recipe?store_id=${storeId}`)
            .then(json => {
                if (cancelled) return;
                const loaded = json.data.map((r: { stock_id: number; qty_gram: number }) => ({ stock_id: r.stock_id, qty_gram: Number(r.qty_gram) > 0 ? String(r.qty_gram) : '' }));
                setRows(loaded);
                setSaved(loaded);
            })
            .catch(() => notify('❌ Error', 'Gagal memuat bahan dasar', 'error'))
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId]);

    const dirty = JSON.stringify(rows) !== JSON.stringify(saved);
    const unmeasured = saved.filter(r => r.qty_gram === '').length;
    const costPerFullBox = rows.reduce((sum, r) => {
        const stock = gramStocks.find(s => s.id === r.stock_id);
        return sum + (parseFloat(r.qty_gram) || 0) * Number(stock?.price_per_unit ?? 0);
    }, 0);

    const updateRow = (i: number, patch: Partial<Row>) => setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

    const save = async () => {
        const items = rows.filter(r => r.stock_id !== '').map(r => ({ stock_id: r.stock_id, qty_gram: r.qty_gram.trim() === '' ? 0 : Number(r.qty_gram) }));
        setSaving(true);
        try {
            const json = await fetchJson(`${API_URL}/api/base-recipe`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ store_id: storeId, items }),
            });
            const next = json.data.map((r: { stock_id: number; qty_gram: number }) => ({ stock_id: r.stock_id, qty_gram: Number(r.qty_gram) > 0 ? String(r.qty_gram) : '' }));
            setRows(next);
            setSaved(next);
            notify('✅ Tersimpan', 'Bahan dasar diperbarui', 'success');
            onChanged();
        } catch (e) {
            notify('❌ Gagal', e instanceof Error ? e.message : 'Gagal menyimpan bahan dasar', 'error');
        } finally {
            setSaving(false);
        }
    };

    const copyTo = async (target: Store) => {
        setCopying(target.id);
        try {
            const json = await fetchJson(`${API_URL}/api/base-recipe/copy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from_store_id: storeId, to_store_id: target.id }),
            });
            const created: string[] = json.data.created_stock ?? [];
            notify('✅ Disalin', `Bahan dasar disalin ke ${target.name}${created.length ? `. Bahan baru (stok 0): ${created.join(', ')}` : ''}`, 'success');
            onChanged();
        } catch (e) {
            notify('❌ Gagal', e instanceof Error ? e.message : 'Gagal menyalin bahan dasar', 'error');
        } finally {
            setCopying(null);
        }
    };

    return (
        <Card className="mt-3 space-y-3">
            <div className="flex items-start gap-3">
                <div className="w-9 h-9 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><LuLayers /></div>
                <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-extrabold text-primary">Bahan dasar semua box</h3>
                    <p className="text-xs text-primary/60">
                        Dipakai di setiap box apa pun rasanya, jadi tidak perlu dimasukkan ke resep tiap rasa.
                        Gram untuk 1 Box Besar; Box Kecil otomatis mengikuti porsi resepnya (½).
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="h-11 rounded-xl bg-primary/5 animate-pulse" />
            ) : (
                <>
                    {rows.length === 0 && <p className="text-xs text-primary/50">Belum ada bahan dasar di store ini.</p>}
                    {rows.map((row, i) => {
                        const taken = new Set(rows.filter((_, idx) => idx !== i).map(r => r.stock_id));
                        return (
                            <div key={i} className="flex items-center gap-2">
                                <div className="relative flex-1 min-w-0">
                                    <select
                                        aria-label="Bahan dasar"
                                        value={row.stock_id}
                                        onChange={e => updateRow(i, { stock_id: e.target.value ? Number(e.target.value) : '' })}
                                        className={`${inputClass} appearance-none pr-9 truncate ${row.stock_id === '' ? 'text-primary/40' : ''}`}
                                    >
                                        <option value="">Pilih bahan…</option>
                                        {gramStocks.filter(s => !taken.has(s.id)).map(s => (
                                            <option key={s.id} value={s.id}>{s.item_name}</option>
                                        ))}
                                    </select>
                                    <LuChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary/50" />
                                </div>
                                <div className="relative w-24 shrink-0">
                                    <input
                                        aria-label="Gram"
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        step="0.01"
                                        value={row.qty_gram}
                                        onChange={e => updateRow(i, { qty_gram: e.target.value })}
                                        placeholder="0"
                                        className={`${inputClass} pr-7 text-right tabular-nums`}
                                    />
                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-primary/50">g</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setRows(prev => prev.filter((_, idx) => idx !== i))}
                                    className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl text-red-500 hover:bg-red-50"
                                    title="Hapus dari bahan dasar"
                                >
                                    <LuTrash2 />
                                </button>
                            </div>
                        );
                    })}

                    {unmeasured > 0 && !dirty && (
                        <p className="text-[11px] font-semibold text-amber-700">{unmeasured} bahan belum diisi gram, jadi belum ikut dipotong dari stok maupun HPP.</p>
                    )}
                    {costPerFullBox > 0 && (
                        <p className="text-[11px] font-semibold text-primary/60">≈ {formatRupiah(costPerFullBox)} per Box Besar (sudah termasuk di HPP tiap rasa).</p>
                    )}

                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setRows(prev => [...prev, { stock_id: '', qty_gram: '' }])} disabled={gramStocks.length === 0} className={buttonSecondary}>
                            <LuPlus /> Bahan
                        </button>
                        <button type="button" onClick={save} disabled={!dirty || saving} className={buttonPrimary}>
                            {saving ? 'Menyimpan…' : 'Simpan bahan dasar'}
                        </button>
                        {!dirty && saved.length > 0 && otherStores.map(s => (
                            <button key={s.id} type="button" onClick={() => copyTo(s)} disabled={copying !== null} className={buttonSecondary}>
                                <LuCopy /> {copying === s.id ? 'Menyalin…' : `Salin ke ${shortNames[s.id] ?? s.name}`}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </Card>
    );
}
