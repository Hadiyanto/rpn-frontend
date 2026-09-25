'use client';

import { useEffect, useState } from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import type { Variant } from '@/types/menu';
import { fetchJson } from '@/utils/fetchJson';
import { API_URL } from '@/utils/config';
import { formatRupiah } from '@/utils/format';
import { buttonPrimary, buttonSecondary, inputClass } from './config/ui';

export interface StockItem {
    id: number;
    item_name: string;
    unit: string | null;
    qty: number;
    store_id: number;
    price_per_unit?: number | null;
}

interface RecipeRow {
    stock_id: number | '';
    qty_gram: string;
}

interface HppResult {
    hpp: number;
    breakdown: { stock_id: number; item_name: string; qty_gram: number; price_per_unit: number | null; subtotal: number }[];
    missing_price: number[];
}

interface Props {
    variant: Variant;
    storeId: number;
    storeName?: string;
    stocks: StockItem[];
    onNotify: (title: string, message: string, type: 'success' | 'error') => void;
    onSaved?: () => void;
}

const GRAM_UNITS = ['gram', 'g', 'gr'];
const isGram = (unit: string | null | undefined) => GRAM_UNITS.includes((unit ?? '').trim().toLowerCase());

/**
 * Recipe of one flavor at one store: grams of each gram-based stock item used by ONE Box Besar.
 * A Box Kecil uses the menu's "porsi resep" share of it; a mixed box uses 1/N per flavor.
 * The HPP shown is computed by the backend from the saved recipe and the latest purchase prices.
 */
export default function VariantRecipeEditor({ variant, storeId, storeName, stocks, onNotify, onSaved }: Props) {
    const [rows, setRows] = useState<RecipeRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hpp, setHpp] = useState<{ FULL: HppResult | null; HALF: HppResult | null }>({ FULL: null, HALF: null });
    // Bumped after every save so HPP is recomputed from the stored recipe.
    const [hppVersion, setHppVersion] = useState(0);

    const gramStocks = stocks.filter(s => s.store_id === storeId && isGram(s.unit));

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetchJson(`${API_URL}/api/variant-recipe?store_id=${storeId}&variant_id=${variant.id}`)
            .then(json => {
                if (cancelled || json.status !== 'ok') return;
                setRows(json.data.map((r: { stock_id: number; qty_gram: number }) => ({ stock_id: r.stock_id, qty_gram: String(r.qty_gram) })));
            })
            .catch(() => onNotify('❌ Error', 'Gagal memuat resep', 'error'))
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [variant.id, storeId]);

    useEffect(() => {
        let cancelled = false;
        const load = (boxType: 'FULL' | 'HALF') =>
            fetchJson(`${API_URL}/api/variant-hpp?variant_ids=${variant.id}&box_type=${boxType}&store_id=${storeId}`)
                .then(json => (json.status === 'ok' ? (json.data as HppResult) : null))
                .catch(() => null);
        Promise.all([load('FULL'), load('HALF')]).then(([FULL, HALF]) => {
            if (!cancelled) setHpp({ FULL, HALF });
        });
        return () => { cancelled = true; };
    }, [variant.id, storeId, hppVersion]);

    const updateRow = (i: number, patch: Partial<RecipeRow>) => setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

    const saveRecipe = async () => {
        const items = rows.filter(r => r.stock_id !== '' && r.qty_gram.trim() !== '').map(r => ({ stock_id: Number(r.stock_id), qty_gram: Number(r.qty_gram) }));
        setSaving(true);
        try {
            const json = await fetchJson(`${API_URL}/api/variant-recipe`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ variant_id: variant.id, store_id: storeId, items }),
            });
            if (json.status === 'ok') {
                setRows(json.data.map((r: { stock_id: number; qty_gram: number }) => ({ stock_id: r.stock_id, qty_gram: String(r.qty_gram) })));
                onNotify('✅ Tersimpan', `Resep ${variant.variant_name} disimpan`, 'success');
                setHppVersion(v => v + 1);
                onSaved?.();
            }
        } catch (e) {
            onNotify('❌ Gagal', e instanceof Error ? e.message : 'Gagal menyimpan resep', 'error');
        } finally {
            setSaving(false);
        }
    };

    const missingNames = (hpp.FULL?.breakdown ?? []).filter(l => l.price_per_unit === null).map(l => l.item_name);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-brand-yellow/20 px-4 py-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary/60">HPP bahan baku</span>
                <span className="text-sm font-extrabold text-primary tabular-nums">Box Besar {hpp.FULL ? formatRupiah(Math.round(hpp.FULL.hpp)) : '…'}</span>
                <span className="text-sm font-extrabold text-primary tabular-nums">Box Kecil {hpp.HALF ? formatRupiah(Math.round(hpp.HALF.hpp)) : '…'}</span>
                {missingNames.length > 0 && (
                    <span className="w-full text-xs font-semibold text-red-600">
                        Harga beli belum diisi: {missingNames.join(', ')} (dihitung Rp 0). Isi lewat Stok Masuk + Total Harga Beli di halaman Stok.
                    </span>
                )}
            </div>

            <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary/60">
                    Bahan untuk 1 Box Besar{storeName ? ` · ${storeName}` : ''}
                </p>
                {gramStocks.length === 0 && (
                    <p className="text-sm font-semibold text-red-600">Belum ada bahan bersatuan gram di store ini. Tambahkan dulu di halaman Stok.</p>
                )}
                {loading ? (
                    <div className="h-10 bg-primary/5 rounded-xl animate-pulse" />
                ) : rows.length === 0 ? (
                    <p className="text-sm text-primary/50">Belum ada bahan di resep ini.</p>
                ) : (
                    rows.map((row, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <select
                                aria-label="Bahan"
                                value={row.stock_id}
                                onChange={e => updateRow(i, { stock_id: e.target.value ? Number(e.target.value) : '' })}
                                className={`${inputClass} flex-1 min-w-0`}
                            >
                                <option value="">Pilih bahan…</option>
                                {gramStocks.map(s => (
                                    <option key={s.id} value={s.id}>{s.item_name}</option>
                                ))}
                            </select>
                            <input
                                aria-label="Gram"
                                type="number"
                                min="0"
                                step="0.01"
                                value={row.qty_gram}
                                onChange={e => updateRow(i, { qty_gram: e.target.value })}
                                placeholder="gram"
                                className={`${inputClass} w-24 text-right tabular-nums`}
                            />
                            <span className="text-xs font-bold text-primary/50 w-3">g</span>
                            <button
                                type="button"
                                onClick={() => setRows(prev => prev.filter((_, idx) => idx !== i))}
                                className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl text-red-500 hover:bg-red-50"
                                title="Hapus bahan dari resep"
                            >
                                <LuTrash2 />
                            </button>
                        </div>
                    ))
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                    <button type="button" onClick={() => setRows(prev => [...prev, { stock_id: '', qty_gram: '' }])} disabled={gramStocks.length === 0} className={buttonSecondary}>
                        <LuPlus /> Bahan
                    </button>
                    <button type="button" onClick={saveRecipe} disabled={saving || loading} className={buttonPrimary}>
                        {saving ? 'Menyimpan…' : 'Simpan resep'}
                    </button>
                </div>
            </div>
        </div>
    );
}
