'use client';

import { useMemo, useRef, useState } from 'react';
import { LuCopy, LuImagePlus, LuPlus, LuSearch, LuTrash2, LuX } from 'react-icons/lu';
import type { Store, Variant } from '@/types/menu';
import { fetchJson } from '@/utils/fetchJson';
import { API_URL } from '@/utils/config';
import { uploadImage } from '@/utils/upload';
import VariantRecipeEditor, { type StockItem } from '@/components/VariantRecipeEditor';
import { shortStoreNames } from '@/components/StoreSwitcher';
import { BackButton, Card, ConfirmBar, EmptyState, Field, SectionHeader, StatusPill, StickyActions, buttonDanger, buttonPrimary, buttonSecondary, inputClass } from './ui';

type Notify = (title: string, message: string, type: 'success' | 'error') => void;

interface Draft {
    id: number | null;
    variant_name: string;
    image_url: string;
    is_active: boolean;
    store_ids: number[];
}

/**
 * Flavors (Choco, Choco Cheese, Vanila, …): create, edit, (de)activate, delete, and the
 * per-store recipe with its HPP. Each flavor has its own recipe; a Box Besar may mix up to 3.
 */
export default function VariantManager({ variants, stores, stocks, activeStoreId, onChanged, notify }: {
    variants: Variant[];
    stores: Store[];
    stocks: StockItem[];
    activeStoreId: number;
    onChanged: () => void;
    notify: Notify;
}) {
    const [query, setQuery] = useState('');
    const [showInactive, setShowInactive] = useState(true);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [busy, setBusy] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const [bulkTarget, setBulkTarget] = useState<Store | null>(null);
    const [bulkBusy, setBulkBusy] = useState(false);
    const otherStores = stores.filter(s => s.id !== activeStoreId);
    const shortNames = shortStoreNames(stores);

    // Copy every saved recipe of the selected store to another store.
    const copyAll = async (target: Store) => {
        setBulkBusy(true);
        try {
            const json = await fetchJson(`${API_URL}/api/variant-recipe/copy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from_store_id: activeStoreId, to_store_id: target.id }),
            });
            const created: string[] = json.data.created_stock ?? [];
            notify('✅ Disalin', `${json.data.copied_variants} resep disalin ke ${target.name}${created.length ? `. Bahan baru (stok 0): ${created.join(', ')}` : ''}`, 'success');
            setBulkTarget(null);
            onChanged();
        } catch (e) {
            notify('❌ Gagal', e instanceof Error ? e.message : 'Gagal menyalin resep', 'error');
        } finally {
            setBulkBusy(false);
        }
    };

    const activeStore = stores.find(s => s.id === activeStoreId);
    const list = useMemo(() => {
        const q = query.trim().toLowerCase();
        return variants
            .filter(v => (showInactive || v.is_active) && (!q || v.variant_name.toLowerCase().includes(q)))
            .sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.variant_name.localeCompare(b.variant_name));
    }, [variants, query, showInactive]);
    const selected = variants.find(v => v.id === selectedId) ?? null;

    // On phones the detail replaces the list, so start it at the top of the screen.
    const scrollTopOnPhone = () => {
        if (window.matchMedia('(max-width: 1023px)').matches) window.scrollTo({ top: 0 });
    };

    const openNew = () => {
        scrollTopOnPhone();
        setSelectedId(null);
        setConfirmDelete(false);
        setDraft({ id: null, variant_name: '', image_url: '', is_active: true, store_ids: stores.map(s => s.id) });
    };
    const openEdit = (v: Variant) => {
        scrollTopOnPhone();
        setSelectedId(v.id);
        setConfirmDelete(false);
        setDraft({ id: v.id, variant_name: v.variant_name, image_url: v.image_url ?? '', is_active: v.is_active !== false, store_ids: v.store_ids ?? [] });
    };
    const close = () => { setDraft(null); setSelectedId(null); setConfirmDelete(false); };

    const pickImage = async (file: File | undefined) => {
        if (!file || !draft) return;
        setUploading(true);
        try {
            const url = await uploadImage(file);
            setDraft(d => (d ? { ...d, image_url: url } : d));
        } catch (e) {
            notify('❌ Gagal', e instanceof Error ? e.message : 'Gagal mengunggah gambar', 'error');
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const save = async () => {
        if (!draft) return;
        setBusy(true);
        try {
            const body = JSON.stringify({ variant_name: draft.variant_name, image_url: draft.image_url || null, is_active: draft.is_active, store_ids: draft.store_ids });
            const json = draft.id
                ? await fetchJson(`${API_URL}/api/variants/${draft.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body })
                : await fetchJson(`${API_URL}/api/variants`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
            notify('✅ Tersimpan', `Rasa ${json.data.variant_name} disimpan`, 'success');
            // After creating, stay on the flavor so its recipe can be filled in right away.
            setSelectedId(json.data.id);
            setDraft({ ...draft, id: json.data.id, variant_name: json.data.variant_name });
            onChanged();
        } catch (e) {
            notify('❌ Gagal', e instanceof Error ? e.message : 'Gagal menyimpan rasa', 'error');
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (!draft?.id) return;
        setBusy(true);
        try {
            await fetchJson(`${API_URL}/api/variants/${draft.id}`, { method: 'DELETE' });
            notify('✅ Dihapus', `Rasa ${draft.variant_name} dihapus`, 'success');
            close();
            onChanged();
        } catch (e) {
            // 409: already ordered → can only be deactivated.
            notify('❌ Tidak bisa dihapus', e instanceof Error ? e.message : 'Gagal menghapus rasa', 'error');
            setConfirmDelete(false);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className={draft ? 'hidden lg:block' : ''}>
            <SectionHeader
                title="Varian rasa & resep"
                description="Setiap rasa punya resepnya sendiri (misalnya Choco Cheese bukan campuran Choco + Cheese). Resep dan HPP berlaku per store."
                action={
                    <div className="flex flex-wrap gap-2">
                        {otherStores.map(s => (
                            <button key={s.id} type="button" className={buttonSecondary} onClick={() => setBulkTarget(s)} title={`Salin semua resep ${activeStore?.name ?? ''} ke ${s.name}`}>
                                <LuCopy /> Salin semua resep ke {shortNames[s.id]}
                            </button>
                        ))}
                        <button type="button" className={buttonPrimary} onClick={openNew}><LuPlus /> Tambah rasa</button>
                    </div>
                }
            />
            {bulkTarget && (
                <div className="mt-3">
                    <ConfirmBar
                        message={`Semua resep ${activeStore?.name ?? ''} disalin ke ${bulkTarget.name}. Resep rasa yang sama di ${bulkTarget.name} akan diganti, dan bahan yang belum ada dibuat dengan stok 0.`}
                        confirmLabel="Salin semua"
                        busy={bulkBusy}
                        onConfirm={() => copyAll(bulkTarget)}
                        onCancel={() => setBulkTarget(null)}
                    />
                </div>
            )}
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-start">
                {/* List (on phones it gives way to the detail screen) */}
                <Card className={`p-0 sm:p-0 overflow-hidden ${draft ? 'hidden lg:block' : ''}`}>
                    <div className="p-3 border-b border-primary/10 flex flex-wrap items-center gap-2">
                        <div className="relative flex-1 min-w-[160px]">
                            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40" />
                            <input className={`${inputClass} pl-9`} value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari rasa…" aria-label="Cari rasa" />
                        </div>
                        <label className="flex items-center gap-2 text-xs font-bold text-primary/60">
                            <input type="checkbox" className="accent-primary" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
                            Tampilkan nonaktif
                        </label>
                    </div>
                    {list.length === 0 ? (
                        <div className="p-4"><EmptyState title={variants.length === 0 ? 'Belum ada rasa' : 'Tidak ada yang cocok'}>{variants.length === 0 && 'Mulai dengan menambah rasa, misalnya Choco atau Vanila Cheese.'}</EmptyState></div>
                    ) : (
                        <ul className="divide-y divide-primary/10 lg:max-h-[560px] lg:overflow-y-auto">
                            {list.map(v => {
                                const inStore = (v.store_ids ?? []).includes(activeStoreId);
                                return (
                                    <li key={v.id}>
                                        <button type="button" onClick={() => openEdit(v)}
                                            className={`w-full flex items-center gap-3 px-3 py-3 lg:py-2.5 text-left transition-colors ${selectedId === v.id ? 'bg-primary/10' : 'hover:bg-primary/5 active:bg-primary/10'}`}>
                                            {v.image_url
                                                ? <img src={v.image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                                : <span className="w-10 h-10 rounded-lg bg-primary/5 shrink-0" />}
                                            <span className="flex-1 min-w-0">
                                                <span className={`block text-sm font-bold truncate ${v.is_active ? 'text-primary' : 'text-primary/40 line-through'}`}>{v.variant_name}</span>
                                                <span className="block text-xs text-primary/50 truncate">{stores.filter(s => (v.store_ids ?? []).includes(s.id)).map(s => s.name).join(', ') || 'Tidak dijual di store mana pun'}</span>
                                            </span>
                                            {!v.is_active ? <StatusPill state="off">Nonaktif</StatusPill> : !inStore && <StatusPill state="partial">Tidak di {activeStore?.name}</StatusPill>}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Card>

                {/* Detail */}
                {draft ? (
                    <Card className="space-y-5">
                        <BackButton onClick={close} label="Semua rasa" />
                        <div className="flex items-start justify-between gap-3">
                            <h3 className="text-base font-extrabold text-primary">{draft.id ? 'Edit rasa' : 'Rasa baru'}</h3>
                            <button type="button" onClick={close} className="hidden lg:flex w-9 h-9 items-center justify-center rounded-xl hover:bg-primary/5 text-primary/60" aria-label="Tutup"><LuX /></button>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-[auto_1fr] items-start">
                            <div className="flex sm:flex-col items-center gap-3 sm:gap-2">
                                {draft.image_url
                                    ? <img src={draft.image_url} alt={draft.variant_name} className="w-24 h-24 rounded-2xl object-cover border border-primary/10" />
                                    : <div className="w-24 h-24 rounded-2xl bg-primary/5 border border-dashed border-primary/20 flex items-center justify-center text-primary/30"><LuImagePlus size={28} /></div>}
                                <input ref={fileRef} id="variant-image" type="file" accept="image/*" className="hidden" onChange={e => pickImage(e.target.files?.[0])} />
                                <div className="flex gap-3 sm:gap-1">
                                    <button type="button" className="text-sm sm:text-xs font-bold text-primary hover:underline disabled:opacity-50" disabled={uploading} onClick={() => fileRef.current?.click()}>
                                        {uploading ? 'Mengunggah…' : draft.image_url ? 'Ganti' : 'Unggah foto'}
                                    </button>
                                    {draft.image_url && <button type="button" className="text-sm sm:text-xs font-bold text-red-600 hover:underline" onClick={() => setDraft({ ...draft, image_url: '' })}>Hapus</button>}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <Field label="Nama rasa">
                                    <input id="variant-name" className={inputClass} value={draft.variant_name} onChange={e => setDraft({ ...draft, variant_name: e.target.value })} placeholder="mis. Choco Cheese" />
                                </Field>
                                <div className="space-y-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary/60">Dijual di</span>
                                    <div className="flex flex-wrap gap-2">
                                        {stores.map(s => {
                                            const on = draft.store_ids.includes(s.id);
                                            return (
                                                <button key={s.id} type="button" onClick={() => setDraft({ ...draft, store_ids: on ? draft.store_ids.filter(id => id !== s.id) : [...draft.store_ids, s.id] })}
                                                    className={`px-4 py-2 sm:px-3 sm:py-1.5 rounded-full text-sm sm:text-xs font-bold border transition-colors ${on ? 'bg-primary text-brand-yellow border-primary' : 'bg-white text-primary/60 border-primary/15'}`}>
                                                    {s.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <label className="flex items-center gap-2 text-sm font-semibold text-primary">
                                    <input type="checkbox" className="w-4 h-4 accent-primary" checked={draft.is_active} onChange={e => setDraft({ ...draft, is_active: e.target.checked })} />
                                    Aktif (bisa dipilih pelanggan)
                                </label>
                            </div>
                        </div>

                        {confirmDelete ? (
                            <ConfirmBar message={`Hapus rasa ${draft.variant_name} beserta resepnya? Rasa yang sudah pernah dipesan hanya bisa dinonaktifkan.`} confirmLabel="Hapus" busy={busy} onConfirm={remove} onCancel={() => setConfirmDelete(false)} />
                        ) : (
                            <StickyActions>
                                {draft.id ? <button type="button" className={buttonDanger} onClick={() => setConfirmDelete(true)}><LuTrash2 /> Hapus</button> : <span />}
                                <div className="flex gap-2 flex-1 sm:flex-none justify-end">
                                    <button type="button" className={`${buttonSecondary} hidden sm:inline-flex`} onClick={close}>Batal</button>
                                    <button type="button" className={`${buttonPrimary} flex-1 sm:flex-none`} disabled={busy || !draft.variant_name.trim()} onClick={save}>{busy ? 'Menyimpan…' : 'Simpan rasa'}</button>
                                </div>
                            </StickyActions>
                        )}

                        {selected && draft.id && (
                            <div className="pt-4 border-t border-primary/10">
                                <VariantRecipeEditor
                                    key={`${selected.id}-${activeStoreId}`}
                                    variant={selected}
                                    storeId={activeStoreId}
                                    storeName={activeStore?.name}
                                    stores={stores}
                                    stocks={stocks}
                                    onNotify={notify}
                                    onSaved={onChanged}
                                />
                            </div>
                        )}
                        {!draft.id && <p className="text-xs text-primary/50">Simpan rasa dulu, lalu isi resepnya di sini.</p>}
                    </Card>
                ) : (
                    <div className="hidden lg:block">
                        <EmptyState title="Pilih rasa untuk mengedit">Atau tambah rasa baru. Resep diisi per store yang sedang dipilih di atas.</EmptyState>
                    </div>
                )}
            </div>
        </div>
    );
}
