'use client';

import { useEffect, useState } from 'react';
import { LuChevronDown, LuPlus, LuTrash2 } from 'react-icons/lu';
import type { Store, Variant } from '@/types/menu';
import { fetchJson } from '@/utils/fetchJson';
import { API_URL } from '@/utils/config';
import { formatRupiah } from '@/utils/format';
import { buttonPrimary, buttonSecondary, inputClass } from './config/ui';
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
    hpp_ingredients?: number;
    hpp_packaging?: number;
    hpp_labor?: number;
    labor?: { per_full_box: number; target_boxes: number; reference_store_id: number; reference_store_name: string | null } | null;
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
    // Base ingredients ("bahan dasar") are added to every box automatically, so they're not offered here.
    const [baseItems, setBaseItems] = useState<{ stock_id: number; item_name: string }[]>([]);
    const baseIds = new Set(baseItems.map(b => b.stock_id));

    useEffect(() => {
        let cancelled = false;
        fetchJson(`${API_URL}/api/base-recipe?store_id=${storeId}`)
            .then(json => { if (!cancelled) setBaseItems(json.data ?? []); })
            .catch(() => undefined);
        return () => { cancelled = true; };
    }, [storeId]);
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

    // "Simpan juga ke": other stores' recipe of this flavor, to save the same recipe there too.
    // Pre-ticked when that store has no recipe yet or still has the same one (kept in sync).
    const [otherRecipes, setOtherRecipes] = useState<Record<number, { item_name: string; qty_gram: number }[]>>({});
    const [alsoTo, setAlsoTo] = useState<number[]>([]);
    const recipeKey = (lines: { item_name: string; qty_gram: number }[]) =>
        lines.map(l => `${l.item_name.trim().toLowerCase()}:${Number(l.qty_gram)}`).sort().join('|');

    const loadOtherRecipes = async (ownKey: string) => {
        const entries = await Promise.all(otherStores.map(async st => {
            try {
                const json = await fetchJson(`${API_URL}/api/variant-recipe?store_id=${st.id}&variant_id=${variant.id}`);
                return [st.id, json.data as { item_name: string; qty_gram: number }[]] as const;
            } catch {
                return [st.id, null] as const;
            }
        }));
        const next: Record<number, { item_name: string; qty_gram: number }[]> = {};
        const tick: number[] = [];
        for (const [id, lines] of entries) {
            if (!lines) continue;
            next[id] = lines;
            if (lines.length === 0 || recipeKey(lines) === ownKey) tick.push(id);
        }
        setOtherRecipes(next);
        setAlsoTo(tick);
    };

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetchJson(`${API_URL}/api/variant-recipe?store_id=${storeId}&variant_id=${variant.id}`)
            .then(json => {
                if (cancelled || json.status !== 'ok') return;
                setRows(json.data.map((r: { stock_id: number; qty_gram: number }) => ({ stock_id: r.stock_id, qty_gram: String(r.qty_gram) })));
                loadOtherRecipes(recipeKey(json.data));
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

    // Selling price at this store; empty = not sold in that box type here. Saved with the recipe
    // and copied along to the stores ticked under "Simpan juga ke".
    const storedPrice = variant.prices?.[String(storeId)];
    const initialPrice = {
        full: storedPrice?.price_full == null ? '' : String(Number(storedPrice.price_full)),
        half: storedPrice?.price_half == null ? '' : String(Number(storedPrice.price_half)),
    };
    const [price, setPrice] = useState(initialPrice);
    const [savedPrice, setSavedPrice] = useState(initialPrice);
    useEffect(() => {
        setPrice(initialPrice);
        setSavedPrice(initialPrice);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [variant.id, storeId]);
    const priceOf = (box: 'FULL' | 'HALF') => {
        const v = parseFloat(box === 'FULL' ? price.full : price.half);
        return Number.isFinite(v) ? v : null;
    };

    const saveRecipe = async () => {
        const items = rows.filter(r => r.stock_id !== '' && r.qty_gram.trim() !== '').map(r => ({ stock_id: Number(r.stock_id), qty_gram: Number(r.qty_gram) }));
        setSaving(true);
        try {
            if (price.full !== savedPrice.full || price.half !== savedPrice.half) {
                await fetchJson(`${API_URL}/api/variant-price`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ variant_id: variant.id, store_id: storeId, price_full: price.full.trim() || null, price_half: price.half.trim() || null }),
                });
                setSavedPrice(price);
            }
            const json = await fetchJson(`${API_URL}/api/variant-recipe`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ variant_id: variant.id, store_id: storeId, items }),
            });
            if (json.status === 'ok') {
                setRows(json.data.map((r: { stock_id: number; qty_gram: number }) => ({ stock_id: r.stock_id, qty_gram: String(r.qty_gram) })));
                // Same recipe to the ticked stores (ingredients matched by name; missing ones created with stock 0).
                const targets = items.length > 0 ? otherStores.filter(st => alsoTo.includes(st.id)) : [];
                const created = new Set<string>();
                const failed: string[] = [];
                for (const target of targets) {
                    try {
                        const copy = await fetchJson(`${API_URL}/api/variant-recipe/copy`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ from_store_id: storeId, to_store_id: target.id, variant_ids: [variant.id], make_available: true }),
                        });
                        for (const name of copy.data.created_stock ?? []) created.add(name);
                    } catch {
                        failed.push(target.name);
                    }
                }
                const done = targets.filter(t => !failed.includes(t.name)).map(t => shortNames[t.id] ?? t.name);
                onNotify(
                    failed.length ? '⚠️ Sebagian tersimpan' : '✅ Tersimpan',
                    `Resep ${variant.variant_name} disimpan${done.length ? ` juga di ${done.join(', ')} (langsung dijual)` : ''}`
                        + `${created.size ? `. Bahan baru (stok 0): ${[...created].join(', ')}` : ''}`
                        + `${failed.length ? `. Gagal disalin ke ${failed.join(', ')}` : ''}`,
                    failed.length ? 'error' : 'success',
                );
                loadOtherRecipes(recipeKey(json.data));
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
            <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary/60">Harga jual{storeName ? ` · ${storeName}` : ''}</p>
                <div className="grid grid-cols-2 gap-2">
                    {(['FULL', 'HALF'] as const).map(box => (
                        <label key={box} className="space-y-1">
                            <span className="text-xs font-semibold text-primary/60">{box === 'FULL' ? 'Box Besar' : 'Box Kecil'}</span>
                            <div className="relative">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-primary/50">Rp</span>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    min="0"
                                    value={box === 'FULL' ? price.full : price.half}
                                    onChange={e => setPrice(p => box === 'FULL' ? { ...p, full: e.target.value } : { ...p, half: e.target.value })}
                                    placeholder="Kosong = tidak dijual"
                                    className={`${inputClass} pl-9 tabular-nums`}
                                />
                            </div>
                        </label>
                    ))}
                </div>
                <p className="text-[11px] text-primary/50">Box mix dihargai rasa termahal di dalamnya. Harga kosong = rasa ini tidak bisa dipilih untuk box itu di store ini. Disimpan dengan tombol Simpan resep.</p>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-brand-yellow/20 px-4 py-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary/60">HPP bahan baku</span>
                {(['FULL', 'HALF'] as const).map(box => {
                    const h = hpp[box];
                    return (
                        <span key={box} className="text-sm font-extrabold text-primary tabular-nums">
                            {box === 'FULL' ? 'Box Besar' : 'Box Kecil'} {h ? formatRupiah(Math.round(h.hpp)) : '…'}
                            {h && ((h.hpp_packaging ?? 0) > 0 || (h.hpp_labor ?? 0) > 0) && (
                                <span className="ml-1 text-[11px] font-semibold text-primary/60">
                                    (bahan {formatRupiah(Math.round(h.hpp_ingredients ?? 0))}
                                    {(h.hpp_packaging ?? 0) > 0 && <> + kemasan {formatRupiah(Math.round(h.hpp_packaging ?? 0))}</>}
                                    {(h.hpp_labor ?? 0) > 0 && <> + tenaga kerja {formatRupiah(Math.round(h.hpp_labor ?? 0))}</>})
                                </span>
                            )}
                            {h && priceOf(box) !== null && priceOf(box)! > 0 && (() => {
                                const sell = priceOf(box)!;
                                const margin = ((sell - h.hpp) / sell) * 100;
                                return (
                                    <span className="ml-1 text-[11px] font-bold text-primary/70" title="Margin terhadap HPP di sistem (belum termasuk biaya yang tidak tercatat, mis. pisang atau sewa)">
                                        · jual {formatRupiah(sell)} · margin {margin.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%
                                    </span>
                                );
                            })()}
                        </span>
                    );
                })}
                {hpp.FULL?.labor && (hpp.FULL.hpp_labor ?? 0) > 0 && (
                    <span className="w-full text-[11px] text-primary/50">
                        Tenaga kerja: perkiraan gaji {hpp.FULL.labor.target_boxes} box/hari ÷ {hpp.FULL.labor.target_boxes}
                        {hpp.FULL.labor.reference_store_id !== storeId && hpp.FULL.labor.reference_store_name ? ` · acuan ${hpp.FULL.labor.reference_store_name}` : ''}.
                        Atur di tab Store.
                    </span>
                )}
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
                {baseItems.length > 0 && (
                    <p className="text-[11px] text-primary/50">
                        Bahan dasar otomatis ikut di setiap box: <b>{baseItems.map(b => b.item_name).join(', ')}</b> (atur di atas daftar rasa).
                    </p>
                )}
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
                                    {gramStocks.filter(s => !baseIds.has(s.id) || s.id === row.stock_id).map(s => (
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
                        {saving ? 'Menyimpan…' : 'Simpan resep & harga'}
                    </button>
                </div>
            </div>

            {otherStores.length > 0 && (
                <div className="pt-3 border-t border-primary/10 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-primary/60">Simpan juga ke</p>
                    <div className="flex flex-wrap gap-2">
                        {otherStores.map(st => {
                            const theirs = otherRecipes[st.id];
                            const ownKey = recipeKey(rows.filter(r => r.stock_id !== '' && r.qty_gram.trim() !== '').map(r => ({
                                item_name: gramStocks.find(g => g.id === r.stock_id)?.item_name ?? '', qty_gram: Number(r.qty_gram),
                            })));
                            const status = !theirs ? '' : theirs.length === 0 ? 'belum ada resep' : recipeKey(theirs) === ownKey ? 'sama' : 'berbeda, akan diganti';
                            const checked = alsoTo.includes(st.id);
                            return (
                                <label key={st.id} className={`flex items-center gap-2 h-11 px-3 rounded-xl border cursor-pointer ${checked ? 'border-primary/40 bg-primary/5' : 'border-primary/10'}`}>
                                    <input type="checkbox" className="w-4 h-4 accent-primary" checked={checked}
                                        onChange={e => setAlsoTo(ids => e.target.checked ? [...ids, st.id] : ids.filter(id => id !== st.id))} />
                                    <span className="text-sm font-semibold text-primary">{shortNames[st.id] ?? st.name}</span>
                                    {status && <span className={`text-[11px] font-bold ${status.startsWith('berbeda') ? 'text-amber-700' : 'text-primary/50'}`}>{status}</span>}
                                </label>
                            );
                        })}
                    </div>
                    <p className="text-[11px] text-primary/50">Saat Simpan resep, resep dan harga jual yang sama ikut disimpan di store yang dicentang dan rasa ini langsung dijual di sana. Bahan yang belum ada dibuat dengan stok 0.</p>
                </div>
            )}
        </div>
    );
}
