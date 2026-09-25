'use client';

import { useState } from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import type { BoxType, Menu, Store } from '@/types/menu';
import { fetchJson } from '@/utils/fetchJson';
import { API_URL } from '@/utils/config';
import { BOX_TYPES, boxLabelID } from '@/utils/box';
import { formatRupiah } from '@/utils/format';
import { Card, ConfirmBar, EmptyState, Field, SectionHeader, StatusPill, buttonDanger, buttonPrimary, buttonSecondary, inputClass } from './ui';

type Notify = (title: string, message: string, type: 'success' | 'error') => void;

interface Draft {
    price: string;
    description: string;
    max_flavors: string;
    box_multiplier: string;
    weight_gram: string;
    length_cm: string;
    width_cm: string;
    height_cm: string;
    is_active: boolean;
    store_ids: number[];
}

const toDraft = (m: Menu): Draft => ({
    price: String(m.price ?? ''),
    description: m.description ?? '',
    max_flavors: String(m.max_flavors ?? ''),
    box_multiplier: String(m.box_multiplier ?? ''),
    weight_gram: String(m.weight_gram ?? ''),
    length_cm: String(m.length_cm ?? ''),
    width_cm: String(m.width_cm ?? ''),
    height_cm: String(m.height_cm ?? ''),
    is_active: m.is_active !== false,
    store_ids: m.store_ids ?? [],
});

const numberOrUndefined = (v: string) => (v.trim() === '' ? undefined : Number(v));

/**
 * The two box types (Box Besar = FULL, Box Kecil = HALF). Names are fixed because orders and
 * the order pages key on them; the backend fills the product rules (max flavors, recipe share,
 * shipping size) when a box is created.
 */
export default function MenuBoxManager({ menus, stores, onChanged, notify }: { menus: Menu[]; stores: Store[]; onChanged: () => void; notify: Notify }) {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [newBox, setNewBox] = useState<{ type: BoxType; price: string } | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);

    const boxes = menus.filter(m => (BOX_TYPES as readonly string[]).includes(m.name));
    const missing = BOX_TYPES.filter(t => !boxes.some(m => m.name === t));

    const startEdit = (m: Menu) => { setEditingId(m.id); setDraft(toDraft(m)); setConfirmDeleteId(null); };

    const save = async (m: Menu) => {
        if (!draft) return;
        setBusy(true);
        try {
            await fetchJson(`${API_URL}/api/menu/${m.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    price: numberOrUndefined(draft.price),
                    description: draft.description,
                    max_flavors: numberOrUndefined(draft.max_flavors),
                    box_multiplier: numberOrUndefined(draft.box_multiplier),
                    weight_gram: numberOrUndefined(draft.weight_gram),
                    length_cm: numberOrUndefined(draft.length_cm),
                    width_cm: numberOrUndefined(draft.width_cm),
                    height_cm: numberOrUndefined(draft.height_cm),
                    is_active: draft.is_active,
                    store_ids: draft.store_ids,
                }),
            });
            notify('✅ Tersimpan', `${boxLabelID(m.name)} diperbarui`, 'success');
            setEditingId(null);
            onChanged();
        } catch (e) {
            notify('❌ Gagal', e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
        } finally {
            setBusy(false);
        }
    };

    const create = async () => {
        if (!newBox) return;
        setBusy(true);
        try {
            await fetchJson(`${API_URL}/api/menu`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newBox.type, price: Number(newBox.price || 0), store_ids: stores.map(s => s.id) }),
            });
            notify('✅ Ditambahkan', `${boxLabelID(newBox.type)} dibuat`, 'success');
            setNewBox(null);
            onChanged();
        } catch (e) {
            notify('❌ Gagal', e instanceof Error ? e.message : 'Gagal menambah box', 'error');
        } finally {
            setBusy(false);
        }
    };

    const remove = async (m: Menu) => {
        setBusy(true);
        try {
            await fetchJson(`${API_URL}/api/menu/${m.id}`, { method: 'DELETE' });
            notify('✅ Dihapus', `${boxLabelID(m.name)} dihapus`, 'success');
            setConfirmDeleteId(null);
            setEditingId(null);
            onChanged();
        } catch (e) {
            notify('❌ Gagal', e instanceof Error ? e.message : 'Gagal menghapus', 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-4">
            <SectionHeader
                title="Menu box"
                description="Box Kecil selalu 1 rasa. Box Besar bisa campur sampai 3 rasa berbeda. Porsi resep menentukan berapa bagian resep Box Besar yang dipakai (Box Kecil = 0,5)."
                action={missing.length > 0 && !newBox && (
                    <button type="button" className={buttonPrimary} onClick={() => setNewBox({ type: missing[0], price: '' })}>
                        <LuPlus /> Tambah box
                    </button>
                )}
            />

            {newBox && (
                <Card className="space-y-4">
                    <div className="grid gap-3 grid-cols-2 sm:grid-cols-[1fr_1fr_auto] items-end">
                        <Field label="Jenis box">
                            <select className={inputClass} value={newBox.type} onChange={e => setNewBox({ ...newBox, type: e.target.value as BoxType })}>
                                {missing.map(t => <option key={t} value={t}>{boxLabelID(t)} ({t})</option>)}
                            </select>
                        </Field>
                        <Field label="Harga (Rp)">
                            <input className={inputClass} type="number" min="0" inputMode="numeric" value={newBox.price} onChange={e => setNewBox({ ...newBox, price: e.target.value })} placeholder="mis. 65000" />
                        </Field>
                        <div className="col-span-2 sm:col-span-1 flex gap-2">
                            <button type="button" className={`${buttonSecondary} flex-1 sm:flex-none`} onClick={() => setNewBox(null)}>Batal</button>
                            <button type="button" className={`${buttonPrimary} flex-1 sm:flex-none`} disabled={busy || !newBox.price} onClick={create}>Simpan</button>
                        </div>
                    </div>
                    <p className="text-xs text-primary/50">Maks rasa, porsi resep, dan ukuran kirim diisi otomatis sesuai jenis box. Bisa diubah setelah dibuat.</p>
                </Card>
            )}

            {boxes.length === 0 && !newBox && <EmptyState title="Belum ada box">Tambahkan Box Besar dan Box Kecil supaya pelanggan bisa memesan.</EmptyState>}

            <div className="grid gap-4 md:grid-cols-2">
                {boxes.map(m => {
                    const isEditing = editingId === m.id && draft;
                    return (
                        <Card key={m.id} className="space-y-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-primary/50">{m.name}</p>
                                    <h3 className="text-lg font-extrabold text-primary">{boxLabelID(m.name)}</h3>
                                </div>
                                <StatusPill state={m.is_active === false ? 'off' : 'done'}>{m.is_active === false ? 'Nonaktif' : 'Aktif'}</StatusPill>
                            </div>

                            {!isEditing ? (
                                <>
                                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                                        <dt className="text-primary/50">Harga</dt><dd className="font-bold text-primary text-right tabular-nums">{formatRupiah(Number(m.price))}</dd>
                                        <dt className="text-primary/50">Maks rasa</dt><dd className="font-bold text-primary text-right">{m.max_flavors ?? '—'}</dd>
                                        <dt className="text-primary/50">Porsi resep</dt><dd className="font-bold text-primary text-right tabular-nums">{m.box_multiplier ?? '—'}×</dd>
                                        <dt className="text-primary/50">Ukuran kirim</dt><dd className="font-bold text-primary text-right tabular-nums">{m.length_cm ?? '—'}×{m.width_cm ?? '—'}×{m.height_cm ?? '—'} cm · {m.weight_gram ?? '—'} g</dd>
                                        <dt className="text-primary/50">Dijual di</dt><dd className="font-bold text-primary text-right">{stores.filter(s => (m.store_ids ?? []).includes(s.id)).map(s => s.name).join(', ') || '—'}</dd>
                                    </dl>
                                    <button type="button" className={`${buttonSecondary} w-full sm:w-auto`} onClick={() => startEdit(m)}>Edit</button>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <Field label="Harga (Rp)"><input className={inputClass} type="number" min="0" value={draft.price} onChange={e => setDraft({ ...draft, price: e.target.value })} /></Field>
                                        <Field label="Maks rasa" hint={m.name === 'HALF' ? 'Box Kecil selalu 1 rasa' : '1–3 rasa berbeda'}>
                                            <input className={inputClass} type="number" min="1" max={m.name === 'HALF' ? 1 : 3} disabled={m.name === 'HALF'} value={draft.max_flavors} onChange={e => setDraft({ ...draft, max_flavors: e.target.value })} />
                                        </Field>
                                        <Field label="Porsi resep" hint="1 = resep Box Besar penuh"><input className={inputClass} type="number" step="0.05" min="0.05" value={draft.box_multiplier} onChange={e => setDraft({ ...draft, box_multiplier: e.target.value })} /></Field>
                                        <Field label="Berat kirim (g)"><input className={inputClass} type="number" min="1" value={draft.weight_gram} onChange={e => setDraft({ ...draft, weight_gram: e.target.value })} /></Field>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <Field label="Panjang (cm)"><input className={inputClass} type="number" min="1" value={draft.length_cm} onChange={e => setDraft({ ...draft, length_cm: e.target.value })} /></Field>
                                        <Field label="Lebar (cm)"><input className={inputClass} type="number" min="1" value={draft.width_cm} onChange={e => setDraft({ ...draft, width_cm: e.target.value })} /></Field>
                                        <Field label="Tinggi (cm)"><input className={inputClass} type="number" min="1" value={draft.height_cm} onChange={e => setDraft({ ...draft, height_cm: e.target.value })} /></Field>
                                    </div>
                                    <Field label="Deskripsi"><input className={inputClass} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="mis. isi 10 pcs" /></Field>
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
                                        Aktif (tampil di halaman order)
                                    </label>
                                    {confirmDeleteId === m.id ? (
                                        <ConfirmBar message={`Hapus ${boxLabelID(m.name)}? Pelanggan tidak bisa memesan box ini lagi.`} confirmLabel="Hapus" busy={busy} onConfirm={() => remove(m)} onCancel={() => setConfirmDeleteId(null)} />
                                    ) : (
                                        <div className="flex flex-wrap gap-2 justify-between">
                                            <button type="button" className={buttonDanger} onClick={() => setConfirmDeleteId(m.id)}><LuTrash2 /> Hapus</button>
                                            <div className="flex gap-2 flex-1 sm:flex-none justify-end">
                                                <button type="button" className={`${buttonSecondary} flex-1 sm:flex-none`} onClick={() => setEditingId(null)}>Batal</button>
                                                <button type="button" className={`${buttonPrimary} flex-1 sm:flex-none`} disabled={busy} onClick={() => save(m)}>Simpan</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
