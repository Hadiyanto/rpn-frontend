'use client';

import { useMemo, useState } from 'react';
import { LuCircleAlert, LuCopy, LuPencil } from 'react-icons/lu';
import type { Store, Variant } from '@/types/menu';
import { fetchJson } from '@/utils/fetchJson';
import { API_URL } from '@/utils/config';
import { shortStoreNames } from '@/components/StoreSwitcher';
import { Card, EmptyState, SectionHeader, StatusPill } from './ui';

type Notify = (title: string, message: string, type: 'success' | 'error') => void;

/**
 * Which flavor is sold at which store. A store can only be switched on once it has the
 * flavor's recipe; otherwise the row shows how to fix it (copy the recipe from a store that
 * has it, or create one).
 */
export default function AvailabilityManager({ variants, stores, onChanged, onOpenRecipe, notify }: {
    variants: Variant[];
    stores: Store[];
    onChanged: () => void;
    /** Open the recipe editor for this flavor at this store. */
    onOpenRecipe: (variantId: number, storeId: number) => void;
    notify: Notify;
}) {
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const short = shortStoreNames(stores);
    const active = useMemo(
        () => [...variants].filter(v => v.is_active !== false).sort((a, b) => a.variant_name.localeCompare(b.variant_name)),
        [variants],
    );
    const missingCount = stores.map(s => ({ store: s, count: active.filter(v => !(v.recipe_store_ids ?? []).includes(s.id)).length }));

    const toggle = async (v: Variant, store: Store, on: boolean) => {
        const next = on ? [...new Set([...(v.store_ids ?? []), store.id])] : (v.store_ids ?? []).filter(id => id !== store.id);
        setBusyKey(`${v.id}-${store.id}`);
        try {
            await fetchJson(`${API_URL}/api/variants/${v.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ store_ids: next }),
            });
            onChanged();
        } catch (e) {
            notify('❌ Gagal', e instanceof Error ? e.message : 'Gagal mengubah ketersediaan', 'error');
        } finally {
            setBusyKey(null);
        }
    };

    const copyFrom = async (v: Variant, from: Store, to: Store) => {
        setBusyKey(`copy-${v.id}-${to.id}`);
        try {
            const json = await fetchJson(`${API_URL}/api/variant-recipe/copy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from_store_id: from.id, to_store_id: to.id, variant_ids: [v.id], make_available: true }),
            });
            const created: string[] = json.data.created_stock ?? [];
            notify('✅ Disalin', `${v.variant_name} sekarang dijual di ${to.name}${created.length ? `. Bahan baru (stok 0): ${created.join(', ')}` : ''}`, 'success');
            onChanged();
        } catch (e) {
            notify('❌ Gagal', e instanceof Error ? e.message : 'Gagal menyalin resep', 'error');
        } finally {
            setBusyKey(null);
        }
    };

    return (
        <div className="space-y-4">
            <SectionHeader
                title="Ketersediaan rasa"
                description="Rasa hanya bisa dijual di store yang sudah punya resepnya. Store tanpa resep dikunci sampai resepnya dibuat atau disalin."
            />

            {missingCount.some(m => m.count > 0) && (
                <div className="flex flex-wrap gap-2">
                    {missingCount.filter(m => m.count > 0).map(m => (
                        <span key={m.store.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 text-xs font-bold">
                            <LuCircleAlert /> {m.count} rasa belum punya resep di {short[m.store.id]}
                        </span>
                    ))}
                </div>
            )}

            {active.length === 0 ? (
                <EmptyState title="Belum ada rasa aktif">Tambahkan rasa di tab Varian & resep.</EmptyState>
            ) : (
                <Card className="p-0 sm:p-0 overflow-hidden">
                    {/* Column headers (from sm up) */}
                    <div className="hidden sm:grid gap-3 px-5 py-2.5 bg-primary/5 text-[11px] font-bold uppercase tracking-wider text-primary/50"
                        style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${stores.length}, 7.5rem)` }}>
                        <span>Rasa</span>
                        {stores.map(s => <span key={s.id} className="text-center truncate" title={s.name}>{short[s.id]}</span>)}
                    </div>
                    <ul className="divide-y divide-primary/10">
                        {active.map(v => {
                            const withRecipe = v.recipe_store_ids ?? [];
                            const missing = stores.filter(s => !withRecipe.includes(s.id));
                            const source = stores.find(s => withRecipe.includes(s.id));
                            return (
                                <li key={v.id} className="px-4 sm:px-5 py-3 space-y-2.5">
                                    <div className="grid gap-3 items-center grid-cols-1 sm:[grid-template-columns:var(--cols)]"
                                        style={{ ['--cols' as string]: `minmax(0,1fr) repeat(${stores.length}, 7.5rem)` }}>
                                        <div className="flex items-center gap-3 min-w-0">
                                            {v.image_url
                                                ? <img src={v.image_url} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                                                : <span className="w-9 h-9 rounded-lg bg-primary/5 shrink-0" />}
                                            <span className="text-sm font-bold text-primary truncate">{v.variant_name}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 sm:contents">
                                            {stores.map(s => {
                                                const hasRecipe = withRecipe.includes(s.id);
                                                const on = (v.store_ids ?? []).includes(s.id);
                                                const busy = busyKey === `${v.id}-${s.id}`;
                                                return (
                                                    <label key={s.id}
                                                        className={`flex items-center justify-between sm:justify-center gap-2 h-11 px-3 rounded-xl border sm:border-0 sm:px-0 ${hasRecipe ? 'border-primary/15 cursor-pointer' : 'border-dashed border-primary/15 cursor-not-allowed opacity-60'}`}
                                                        title={hasRecipe ? `${on ? 'Berhenti jual' : 'Jual'} di ${s.name}` : `Belum ada resep di ${s.name}`}>
                                                        <span className="sm:hidden text-sm font-bold text-primary/70 truncate">{short[s.id]}</span>
                                                        <input
                                                            type="checkbox"
                                                            role="switch"
                                                            aria-label={`${v.variant_name} di ${s.name}`}
                                                            className="peer sr-only"
                                                            checked={on && hasRecipe}
                                                            disabled={!hasRecipe || busy}
                                                            onChange={e => toggle(v, s, e.target.checked)}
                                                        />
                                                        <span aria-hidden className={`relative w-11 h-6 rounded-full transition-colors shrink-0 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 ${on && hasRecipe ? 'bg-primary' : 'bg-primary/20'}`}>
                                                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on && hasRecipe ? 'translate-x-5' : ''}`} />
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {missing.length > 0 && (
                                        <div className="flex flex-col gap-2 rounded-xl bg-amber-50 px-3 py-2.5">
                                            {missing.map(m => (
                                                <div key={m.id} className="flex flex-wrap items-center gap-2">
                                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 flex-1 min-w-[180px]">
                                                        <LuCircleAlert className="shrink-0" /> Belum ada resep di {m.name}. {source ? `Salin dari ${short[source.id]} atau buat baru.` : 'Buat resepnya dulu.'}
                                                    </span>
                                                    {source && (
                                                        <button type="button" disabled={busyKey === `copy-${v.id}-${m.id}`} onClick={() => copyFrom(v, source, m)}
                                                            className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg bg-white text-amber-900 text-xs font-bold border border-amber-200 hover:bg-amber-100 disabled:opacity-50">
                                                            <LuCopy /> Salin dari {short[source.id]} &amp; jual
                                                        </button>
                                                    )}
                                                    <button type="button" onClick={() => onOpenRecipe(v.id, m.id)}
                                                        className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg text-amber-900 text-xs font-bold hover:bg-amber-100">
                                                        <LuPencil /> Buat resep di {short[m.id]}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </Card>
            )}
            <p className="text-xs text-primary/50 flex items-center gap-2"><StatusPill state="off">Rasa nonaktif</StatusPill> tidak ditampilkan di sini; aktifkan dulu di tab Varian & resep.</p>
        </div>
    );
}
