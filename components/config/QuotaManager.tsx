'use client';

import { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { LuCalendar, LuCheck, LuChevronDown, LuChevronUp, LuTrash2, LuX } from 'react-icons/lu';
import type { Store } from '@/types/menu';
import { fetchJson } from '@/utils/fetchJson';
import { API_URL } from '@/utils/config';
import { getTodayStr } from '@/utils/format';
import { Card, ConfirmBar, EmptyState, Field, SectionHeader, buttonPrimary, inputClass } from './ui';

type Notify = (title: string, message: string, type: 'success' | 'error') => void;

export interface DailyQuota { id: number; date: string; qty: number; used_qty?: number; remaining_qty?: number }
export interface HourlyQuota { id: number; time_str: string; qty: number; is_active: boolean; remaining_qty?: number }

const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);

/** Daily box quota per date and per-hour pickup slots for the selected store (HALF counts as 0.5 box). */
export default function QuotaManager({ store, quotas, hourlyQuotas, onChanged, notify }: {
    store: Store;
    quotas: DailyQuota[];
    hourlyQuotas: HourlyQuota[];
    onChanged: () => void;
    notify: Notify;
}) {
    const [newDate, setNewDate] = useState('');
    const [newQty, setNewQty] = useState('');
    // Pickup slots start at the store's opening hour.
    const openHour = (store.open_time ?? '00:00').slice(0, 2) + ':00';
    const hourOptions = HOURS.filter(h => h >= openHour && !hourlyQuotas.some(q => q.time_str === h));
    const [newHour, setNewHour] = useState('');
    const [newHourQty, setNewHourQty] = useState('');
    const [showPast, setShowPast] = useState(false);
    const [confirm, setConfirm] = useState<{ kind: 'daily' | 'hourly'; id: number; label: string } | null>(null);

    const today = getTodayStr();
    const upcoming = quotas.filter(q => q.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    const past = quotas.filter(q => q.date < today);

    const call = async (fn: () => Promise<unknown>, ok: string) => {
        try {
            await fn();
            notify('✅ Tersimpan', ok, 'success');
            onChanged();
        } catch (e) {
            notify('❌ Gagal', e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
        }
    };
    const json = (method: string, body: unknown) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

    const addDaily = () => call(async () => {
        await fetchJson(`${API_URL}/api/daily-quota`, json('POST', { date: newDate, qty: Number(newQty), store_id: store.id }));
        setNewDate('');
    }, 'Kuota tanggal ditambahkan');

    const updateDaily = (q: DailyQuota, value: string) => {
        const qty = Number(value);
        if (!value.trim() || isNaN(qty) || qty === q.qty) return;
        call(() => fetchJson(`${API_URL}/api/daily-quota/${q.id}`, json('PUT', { qty })), 'Kuota diperbarui');
    };

    const saveHourly = (time_str: string, qty: number, is_active: boolean, msg: string) =>
        call(() => fetchJson(`${API_URL}/api/hourly-quota`, json('POST', { time_str, qty, is_active, store_id: store.id })), msg);

    const remove = () => {
        if (!confirm) return;
        const url = confirm.kind === 'daily' ? `${API_URL}/api/daily-quota/${confirm.id}` : `${API_URL}/api/hourly-quota/${confirm.id}`;
        call(() => fetchJson(url, { method: 'DELETE' }), `${confirm.label} dihapus`);
        setConfirm(null);
    };

    const dateLabel = (date: string) => new Date(`${date}T00:00:00+07:00`).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' });

    const dailyRow = (q: DailyQuota) => (
        <li key={q.id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-primary">{dateLabel(q.date)}</span>
                <span className="block text-xs text-primary/50 tabular-nums">Terpakai {q.used_qty ?? 0} · sisa {q.remaining_qty ?? q.qty}</span>
            </span>
            <input aria-label={`Kuota ${q.date}`} type="number" min="0" defaultValue={q.qty} onBlur={e => updateDaily(q, e.target.value)} className={`${inputClass} w-20 text-right tabular-nums`} />
            <span className="text-xs font-bold text-primary/50">box</span>
            <button type="button" onClick={() => setConfirm({ kind: 'daily', id: q.id, label: `Kuota ${dateLabel(q.date)}` })} className="w-9 h-9 flex items-center justify-center rounded-xl text-red-500 hover:bg-red-50" title="Hapus kuota"><LuTrash2 /></button>
        </li>
    );

    return (
        <div className="space-y-8">
            {confirm && (
                // Bottom sheet on phones so it's visible wherever the row was; inline from sm up.
                <div className="fixed inset-x-0 bottom-0 z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] bg-white border-t border-primary/10 shadow-2xl sm:static sm:p-0 sm:bg-transparent sm:border-0 sm:shadow-none">
                    <ConfirmBar message={`Hapus ${confirm.label}?`} confirmLabel="Hapus" onConfirm={remove} onCancel={() => setConfirm(null)} />
                </div>
            )}

            <section className="space-y-4">
                <SectionHeader title="Kuota harian" description="Jumlah box yang bisa dipesan per tanggal. Box Kecil dihitung 0,5 box. Tanggal tanpa kuota tidak bisa dipilih pelanggan." />
                <Card className="grid gap-3 grid-cols-2 sm:grid-cols-[1fr_140px_auto] items-end">
                    <Field label="Tanggal" className="col-span-2 sm:col-span-1">
                        <div className="relative">
                            <DatePicker
                                id="quota-date"
                                selected={newDate ? new Date(`${newDate}T00:00:00`) : null}
                                onChange={(dt: Date | null) => {
                                    if (dt) setNewDate(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`);
                                }}
                                minDate={new Date()}
                                dateFormat="dd/MM/yyyy"
                                placeholderText="Pilih tanggal"
                                className={inputClass}
                            />
                            <LuCalendar className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary/40" />
                        </div>
                    </Field>
                    <Field label="Kuota (box)">
                        <input id="quota-qty" className={inputClass} type="number" min="0" value={newQty} onChange={e => setNewQty(e.target.value)} placeholder="mis. 50" />
                    </Field>
                    <button type="button" className={buttonPrimary} disabled={!newDate || !newQty} onClick={addDaily}>Tambah</button>
                </Card>
                {upcoming.length === 0 ? (
                    <EmptyState title="Belum ada tanggal yang dibuka">Tambahkan kuota untuk tanggal-tanggal ke depan.</EmptyState>
                ) : (
                    <Card className="p-0 sm:p-0 overflow-hidden"><ul className="divide-y divide-primary/10">{upcoming.map(dailyRow)}</ul></Card>
                )}
                {past.length > 0 && (
                    <div>
                        <button type="button" onClick={() => setShowPast(v => !v)} className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary/50">
                            Tanggal sudah lewat ({past.length}) {showPast ? <LuChevronUp /> : <LuChevronDown />}
                        </button>
                        {showPast && <Card className="p-0 sm:p-0 overflow-hidden mt-2 opacity-70"><ul className="divide-y divide-primary/10">{past.map(dailyRow)}</ul></Card>}
                    </div>
                )}
            </section>

            <section className="space-y-4">
                <SectionHeader title="Kuota per jam" description={`Slot jam pickup/antar dan kapasitasnya. Jam dimulai dari jam buka ${store.name} (${store.open_time ?? 'belum diatur'}).`} />
                <Card className="grid gap-3 grid-cols-2 sm:grid-cols-[1fr_140px_auto] items-end">
                    <Field label="Jam">
                        <select id="hourly-time" className={inputClass} value={newHour} onChange={e => setNewHour(e.target.value)}>
                            <option value="">Pilih jam…</option>
                            {hourOptions.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </Field>
                    <Field label="Kapasitas (box)">
                        <input id="hourly-qty" className={inputClass} type="number" min="0" value={newHourQty} onChange={e => setNewHourQty(e.target.value)} placeholder="mis. 10" />
                    </Field>
                    <button type="button" className={buttonPrimary} disabled={!newHour || !newHourQty}
                        onClick={() => { saveHourly(newHour, Number(newHourQty), true, `Slot ${newHour} ditambahkan`); setNewHour(''); }}>
                        Tambah
                    </button>
                </Card>
                {hourlyQuotas.length === 0 ? (
                    <EmptyState title="Belum ada slot jam" />
                ) : (
                    <Card className="p-0 sm:p-0 overflow-hidden">
                        <ul className="divide-y divide-primary/10">
                            {[...hourlyQuotas].sort((a, b) => a.time_str.localeCompare(b.time_str)).map(hq => (
                                <li key={hq.id} className="flex items-center gap-3 px-4 py-2.5">
                                    <span className="flex-1">
                                        <span className={`block text-base font-extrabold tabular-nums ${hq.is_active ? 'text-primary' : 'text-primary/40'}`}>{hq.time_str}</span>
                                        <span className="block text-xs text-primary/50">{hq.is_active ? 'Aktif' : 'Nonaktif'}</span>
                                    </span>
                                    <input aria-label={`Kapasitas ${hq.time_str}`} type="number" min="0" defaultValue={hq.qty}
                                        onBlur={e => { const v = Number(e.target.value); if (e.target.value.trim() && v !== hq.qty) saveHourly(hq.time_str, v, hq.is_active, `Slot ${hq.time_str} diperbarui`); }}
                                        className={`${inputClass} w-20 text-right tabular-nums`} />
                                    <span className="text-xs font-bold text-primary/50">box</span>
                                    <button type="button" onClick={() => saveHourly(hq.time_str, hq.qty, !hq.is_active, `Slot ${hq.time_str} ${hq.is_active ? 'dinonaktifkan' : 'diaktifkan'}`)}
                                        className={`w-9 h-9 flex items-center justify-center rounded-xl border ${hq.is_active ? 'border-green-200 text-green-700 bg-green-50' : 'border-primary/15 text-primary/40 bg-white'}`}
                                        title={hq.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                                        {hq.is_active ? <LuCheck /> : <LuX />}
                                    </button>
                                    <button type="button" onClick={() => setConfirm({ kind: 'hourly', id: hq.id, label: `Slot ${hq.time_str}` })} className="w-9 h-9 flex items-center justify-center rounded-xl text-red-500 hover:bg-red-50" title="Hapus slot"><LuTrash2 /></button>
                                </li>
                            ))}
                        </ul>
                    </Card>
                )}
            </section>
        </div>
    );
}
