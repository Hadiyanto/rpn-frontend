'use client';

import { useEffect, useRef, useState } from 'react';
import { LuImagePlus } from 'react-icons/lu';
import type { Store } from '@/types/menu';
import { fetchJson } from '@/utils/fetchJson';
import { API_URL } from '@/utils/config';
import { uploadImage } from '@/utils/upload';
import { Card, Field, SectionHeader, StickyActions, buttonPrimary, inputClass } from './ui';

type Notify = (title: string, message: string, type: 'success' | 'error') => void;

type Form = Record<'name' | 'address' | 'phone' | 'latitude' | 'longitude' | 'area_id' | 'open_time' | 'bank_name' | 'bank_account_number' | 'bank_account_name' | 'qris_image_url', string>;

const toForm = (s: Store): Form => ({
    name: s.name ?? '',
    address: s.address ?? '',
    phone: s.phone ?? '',
    latitude: s.latitude == null ? '' : String(s.latitude),
    longitude: s.longitude == null ? '' : String(s.longitude),
    area_id: s.area_id ?? '',
    open_time: s.open_time ?? '',
    bank_name: s.bank_name ?? '',
    bank_account_number: s.bank_account_number ?? '',
    bank_account_name: s.bank_account_name ?? '',
    qris_image_url: s.qris_image_url ?? '',
});

/** Everything customers see about the selected store: address, opening hour, payment details, delivery origin. */
export default function StoreSettings({ store, onSaved, notify }: { store: Store; onSaved: () => void; notify: Notify }) {
    const [form, setForm] = useState<Form>(toForm(store));
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setForm(toForm(store)); }, [store]);

    const set = (key: keyof Form) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [key]: e.target.value }));
    const orNull = (v: string) => v.trim() || null;

    const pickQris = async (file: File | undefined) => {
        if (!file) return;
        setUploading(true);
        try {
            const url = await uploadImage(file);
            setForm(f => ({ ...f, qris_image_url: url }));
        } catch (e) {
            notify('❌ Gagal', e instanceof Error ? e.message : 'Gagal mengunggah QRIS', 'error');
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const save = async () => {
        setSaving(true);
        try {
            await fetchJson(`${API_URL}/api/stores/${store.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name.trim(),
                    address: orNull(form.address),
                    phone: orNull(form.phone),
                    area_id: orNull(form.area_id),
                    latitude: form.latitude ? Number(form.latitude) : null,
                    longitude: form.longitude ? Number(form.longitude) : null,
                    open_time: orNull(form.open_time),
                    bank_name: orNull(form.bank_name),
                    bank_account_number: orNull(form.bank_account_number),
                    bank_account_name: orNull(form.bank_account_name),
                    qris_image_url: orNull(form.qris_image_url),
                }),
            });
            notify('✅ Tersimpan', `Data ${form.name} disimpan`, 'success');
            onSaved();
        } catch (e) {
            notify('❌ Gagal', e instanceof Error ? e.message : 'Gagal menyimpan store', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <SectionHeader title="Data store" description="Dipakai di halaman order, instruksi pembayaran, dan titik asal pengiriman." />
            <div className="grid gap-4 lg:grid-cols-2 items-start">
                <Card className="space-y-4">
                    <h3 className="text-sm font-extrabold text-primary">Profil & lokasi</h3>
                    <Field label="Nama store"><input id="store-name" className={inputClass} value={form.name} onChange={set('name')} /></Field>
                    <Field label="Alamat">
                        <textarea id="store-address" rows={3} className={`${inputClass} h-auto py-2 resize-none`} value={form.address} onChange={set('address')} />
                    </Field>
                    <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
                        <Field label="Telepon"><input id="store-phone" className={inputClass} value={form.phone} onChange={set('phone')} /></Field>
                        <Field label="Jam buka" hint="Jam paling awal yang bisa dipilih"><input id="store-open" type="time" className={inputClass} value={form.open_time} onChange={set('open_time')} /></Field>
                        <Field label="Latitude"><input id="store-lat" className={inputClass} value={form.latitude} onChange={set('latitude')} placeholder="-6.26" /></Field>
                        <Field label="Longitude"><input id="store-lng" className={inputClass} value={form.longitude} onChange={set('longitude')} placeholder="106.84" /></Field>
                    </div>
                    <Field label="Biteship area ID" hint="Wajib untuk pengiriman oleh toko"><input id="store-area" className={inputClass} value={form.area_id} onChange={set('area_id')} /></Field>
                </Card>

                <Card className="space-y-4">
                    <h3 className="text-sm font-extrabold text-primary">Pembayaran</h3>
                    <div className="grid grid-cols-[96px_1fr] sm:grid-cols-[110px_1fr] gap-3">
                        <Field label="Bank"><input id="store-bank" className={inputClass} value={form.bank_name} onChange={set('bank_name')} placeholder="BCA" /></Field>
                        <Field label="No. rekening"><input id="store-account" className={inputClass} value={form.bank_account_number} onChange={set('bank_account_number')} inputMode="numeric" /></Field>
                    </div>
                    <Field label="Atas nama"><input id="store-account-name" className={inputClass} value={form.bank_account_name} onChange={set('bank_account_name')} /></Field>
                    <div className="space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-primary/60">QRIS</span>
                        <div className="flex items-center gap-4">
                            {form.qris_image_url
                                ? <img src={form.qris_image_url} alt="QRIS" className="w-28 h-28 rounded-xl object-contain border border-primary/10 bg-white" />
                                : <div className="w-28 h-28 rounded-xl bg-primary/5 border border-dashed border-primary/20 flex items-center justify-center text-primary/30"><LuImagePlus size={28} /></div>}
                            <div className="flex flex-col gap-2 text-sm">
                                <input ref={fileRef} id="store-qris" type="file" accept="image/*" className="hidden" onChange={e => pickQris(e.target.files?.[0])} />
                                <button type="button" className="font-bold text-primary hover:underline text-left disabled:opacity-50" disabled={uploading} onClick={() => fileRef.current?.click()}>
                                    {uploading ? 'Mengunggah…' : form.qris_image_url ? 'Ganti gambar QRIS' : 'Unggah gambar QRIS'}
                                </button>
                                {form.qris_image_url && <button type="button" className="font-bold text-red-600 hover:underline text-left" onClick={() => setForm(f => ({ ...f, qris_image_url: '' }))}>Hapus</button>}
                                <span className="text-xs text-primary/50">Tanpa gambar, opsi QRIS tidak menampilkan kode.</span>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
            <StickyActions>
                <span />
                <button type="button" className={`${buttonPrimary} flex-1 sm:flex-none`} disabled={saving || !form.name.trim()} onClick={save}>{saving ? 'Menyimpan…' : 'Simpan data store'}</button>
            </StickyActions>
        </div>
    );
}
