'use client';

import { useEffect, useState } from 'react';
import { LuChevronDown, LuCopy, LuPlus, LuTrash2 } from 'react-icons/lu';
import type { Store, Variant } from '@/types/menu';
import { fetchJson } from '@/utils/fetchJson';
import { API_URL } from '@/utils/config';
import { formatRupiah } from '@/utils/format';
import { ConfirmBar, buttonPrimary, buttonSecondary, inputClass } from './config/ui';
import { shortStoreNames } from './StoreSwitcher';

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

type Suggestions = Record<string, { qty_gram: number; uses: number }[]>;

interface Props {
    variant: Variant;
    storeId: number;
    storeName?: string;
    /** All stores, to offer "copy this recipe to …". */
    stores?: Store[];
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
export default function VariantRecipeEditor({ variant, storeId, storeName, stores = [], stocks, onNotify, onSaved }: Props) {
    const [rows, setRows] = useState<RecipeRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hpp, setHpp] = useState<{ FULL: HppResult | null; HALF: HppResult | null }>({ FULL: null, HALF: null });
    // Bumped after every save so HPP is recomputed from the stored recipe.
    const [hppVersion, setHppVersion] = useState(0);

    const gramStocks = stocks.filter(s => s.store_id === storeId && isGram(s.unit));
    const [suggestions, setSuggestions] = useState<Suggestions>({});
    const [copyTarget, setCopyTarget] = useState<Store | null>(null);
    const [copying, setCopying] = useState(false);
    const otherStores = stores.filter(s => s.id !== storeId);
    const shortNames = shortStoreNames(stores);

    // Grams used before for each ingredient (any flavor, any store), most used first.
    useEffect(() => {
        let cancelled = false;
        fetchJson(`${API_URL}/api/variant-recipe/suggestions`)
            .then(json => { if (!cancelled && json.status === 'ok') setSuggestions(json.data); })
            .catch(() => undefined);
        return () => { cancelled = true; };
    }, [hppVersion]);

    const suggestionsFor = (stockId: number | '') => {
        if (stockId === '') return [];
        const item = gramStocks.find(s => s.id === stockId);
        return item ? suggestions[item.item_name.trim().toLowerCase()] ?? [] : [];
    };

    // Picking an ingredient pre-fills its most used gram value (only when the field is empty).
    const pickIngredient = (i: number, stockId: number | '') => {
        const top = suggestionsFor(stockId)[0];
        setRows(prev => prev.map((r, idx) => (idx === i ? { stock_id: stockId, qty_gram: r.qty_gram.trim() === '' && top ? String(top.qty_gram) : r.qty_gram } : r)));
    };

    const copyToStore = async (target: Store) => {
        setCopying(true);
        try {
            const json = await fetchJson(`${API_URL}/api/variant-recipe/copy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from_store_id: storeId, to_store_id: target.id, variant_ids: [variant.id], make_available: true }),
            });
            const created: string[] = json.data.created_stock ?? [];
            onNotify('✅ Disalin', `Resep ${variant.variant_name} disalin ke ${target.name} dan langsung dijual${created.length ? `. Bahan baru (stok 0): ${created.join(', ')}` : ''}`, 'success');
            setCopyTarget(null);
            onSaved?.();
        } catch (e) {
            onNotify('❌ Gagal', e instanceof Error ? e.message : 'Gagal menyalin resep', 'error');
        } finally {
            setCopying(false);
        }
    };

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
                        Harga modal belum diisi: {missingNames.join(', ')} (dihitung Rp 0). Isi di halaman Stok → ikon pensil bahan → Harga modal.
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
                    rows.map((row, i) => {
                        const chips = suggestionsFor(row.stock_id).filter(sg => String(sg.qty_gram) !== row.qty_gram.trim()).slice(0, 3);
                        return (
                        <div key={i} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            {/* Wrappers own the widths: inputClass is w-full, and iOS draws native selects oddly. */}
                            <div className="relative flex-1 min-w-0">
                                <select
                                    aria-label="Bahan"
                                    value={row.stock_id}
                                    onChange={e => pickIngredient(i, e.target.value ? Number(e.target.value) : '')}
                                    className={`${inputClass} appearance-none pr-9 truncate ${row.stock_id === '' ? 'text-primary/40' : ''}`}
                                >
                                    <option value="">Pilih bahan…</option>
                                    {gramStocks.map(s => (
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
                                title="Hapus bahan dari resep"
                            >
                                <LuTrash2 />
                            </button>
                        </div>
                        {chips.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pl-1">
                                <span className="text-[11px] font-semibold text-primary/50">Pernah dipakai:</span>
                                {chips.map(sg => (
                                    <button
                                        key={sg.qty_gram}
                                        type="button"
                                        onClick={() => updateRow(i, { qty_gram: String(sg.qty_gram) })}
                                        className="h-7 px-2.5 rounded-full bg-primary/5 border border-primary/10 text-xs font-bold text-primary tabular-nums hover:bg-primary/10"
                                        title={`Dipakai di ${sg.uses} resep`}
                                    >
                                        {sg.qty_gram} g
                                    </button>
                                ))}
                            </div>
                        )}
                        </div>
                        );
                    })
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

            {otherStores.length > 0 && rows.some(r => r.stock_id !== '') && (
                <div className="pt-3 border-t border-primary/10 space-y-2">
                    {copyTarget ? (
                        <ConfirmBar
                            message={`Resep ${variant.variant_name} disalin ke ${copyTarget.name} (resep lama di sana diganti) dan rasa ini langsung dijual di ${copyTarget.name}. Bahan yang belum ada dibuat dengan stok 0.`}
                            confirmLabel="Salin"
                            busy={copying}
                            onConfirm={() => copyToStore(copyTarget)}
                            onCancel={() => setCopyTarget(null)}
                        />
                    ) : (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-primary/60">Resep sama di store lain?</span>
                            {otherStores.map(s => (
                                <button key={s.id} type="button" className={`${buttonSecondary} h-9 sm:h-9`} onClick={() => setCopyTarget(s)} title={`Salin resep tersimpan ke ${s.name}`}>
                                    <LuCopy /> Salin ke {shortNames[s.id]}
                                </button>
                            ))}
                        </div>
                    )}
                    <p className="text-[11px] text-primary/50">Yang disalin adalah resep yang sudah disimpan.</p>
                </div>
            )}
        </div>
    );
}
