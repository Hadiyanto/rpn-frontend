'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LuCopy, LuPlus, LuSave, LuSettings, LuTrash2 } from 'react-icons/lu';
import Sidebar from '@/components/Sidebar';
import Toast from '@/components/Toast';
import PageHeader from '@/components/PageHeader';
import StoreSwitcher, { shortStoreNames } from '@/components/StoreSwitcher';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/useToast';
import { fetchJson } from '@/utils/fetchJson';
import { API_URL } from '@/utils/config';
import { formatRupiah } from '@/utils/format';
import { Card, buttonPrimary, buttonSecondary, inputClass } from '@/components/config/ui';

interface Tier { min_box: number; max_box: number | null; amount: number; is_fixed: boolean }
/** Form model: base salary covering the first N boxes, then bonus tiers that follow each other. */
interface Bonus { to: string; rate: string }

const SIMULATE = [15, 20, 25, 30, 35];

/** Same rule as the backend (salary.service computeSalary). */
const computeSalary = (tiers: Tier[], boxes: number) => tiers.reduce((sum, t) => {
    if (boxes < t.min_box) return sum;
    if (t.is_fixed) return sum + t.amount;
    const to = t.max_box === null ? boxes : Math.min(boxes, t.max_box);
    return sum + Math.max(0, to - t.min_box + 1) * t.amount;
}, 0);

export default function SalaryConfigPage() {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const userRoleData = useUserRole('config');
    const router = useRouter();
    const { toast, showToast, hideToast } = useToast();

    const [stores, setStores] = useState<{ id: number; name: string }[]>([]);
    const [storeId, setStoreId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [baseAmount, setBaseAmount] = useState('');
    const [baseUpTo, setBaseUpTo] = useState('15');
    const [bonuses, setBonuses] = useState<Bonus[]>([]);
    const [savedKey, setSavedKey] = useState('');

    useEffect(() => {
        fetchJson(`${API_URL}/api/stores`)
            .then(json => {
                setStores(json.data);
                setStoreId(json.data[0]?.id ?? null);
            })
            .catch(() => showToast('❌ Error', 'Gagal memuat daftar store', 'error'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const applyTiers = (tiers: Tier[]) => {
        const sorted = [...tiers].sort((a, b) => a.min_box - b.min_box);
        const base = sorted[0]?.is_fixed ? sorted[0] : null;
        const nextBase = base ? String(Number(base.amount)) : '';
        const nextUpTo = base ? String(base.max_box ?? '') : '15';
        const nextBonuses = (base ? sorted.slice(1) : sorted).map(t => ({ to: t.max_box === null ? '' : String(t.max_box), rate: String(Number(t.amount)) }));
        setBaseAmount(nextBase);
        setBaseUpTo(nextUpTo);
        setBonuses(nextBonuses);
        setSavedKey(JSON.stringify([nextBase, nextUpTo, nextBonuses]));
    };

    useEffect(() => {
        if (!storeId) return;
        let cancelled = false;
        setLoading(true);
        fetchJson(`${API_URL}/api/salary-config?store_id=${storeId}`)
            .then(json => { if (!cancelled) applyTiers(json.data); })
            .catch(() => showToast('❌ Error', 'Gagal memuat konfigurasi gaji', 'error'))
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId]);

    // Bonus tier i starts right after the previous tier ends, so there are never gaps or overlaps.
    const fromOf = (i: number) => {
        const prevTo = i === 0 ? parseInt(baseUpTo) : parseInt(bonuses[i - 1].to);
        return Number.isFinite(prevTo) ? prevTo + 1 : null;
    };

    const buildTiers = (): Tier[] | string => {
        const upTo = parseInt(baseUpTo);
        const amount = parseFloat(baseAmount);
        if (!(amount >= 0) || !(upTo >= 0)) return 'Isi gaji pokok dan jumlah box yang sudah termasuk.';
        const tiers: Tier[] = [{ min_box: 0, max_box: upTo, amount, is_fixed: true }];
        for (let i = 0; i < bonuses.length; i++) {
            const from = fromOf(i);
            const last = i === bonuses.length - 1;
            const to = bonuses[i].to.trim() === '' ? null : parseInt(bonuses[i].to);
            const rate = parseFloat(bonuses[i].rate);
            if (from === null) return `Isi batas akhir tingkat ${i}.`;
            if (to === null && !last) return 'Hanya tingkat terakhir yang boleh tanpa batas akhir.';
            if (to !== null && to < from) return `Tingkat ${i + 1}: box akhir harus ≥ ${from}.`;
            if (!(rate >= 0)) return `Tingkat ${i + 1}: isi bonus per box.`;
            tiers.push({ min_box: from, max_box: to, amount: rate, is_fixed: false });
        }
        return tiers;
    };

    const tiers = buildTiers();
    const dirty = JSON.stringify([baseAmount, baseUpTo, bonuses]) !== savedKey;
    const hasSalary = baseAmount.trim() !== '' || bonuses.length > 0;

    const save = async () => {
        if (!storeId) return;
        if (typeof tiers === 'string') { showToast('⚠️ Periksa lagi', tiers, 'error'); return; }
        setSaving(true);
        try {
            const json = await fetchJson(`${API_URL}/api/salary-config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ store_id: storeId, tiers }),
            });
            applyTiers(json.data);
            showToast('✅ Tersimpan', 'Konfigurasi gaji disimpan', 'success');
        } catch (e) {
            showToast('❌ Gagal', e instanceof Error ? e.message : 'Gagal menyimpan konfigurasi', 'error');
        } finally {
            setSaving(false);
        }
    };

    const copyTo = async (targetId: number) => {
        if (!storeId) return;
        try {
            await fetchJson(`${API_URL}/api/salary-config/copy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from_store_id: storeId, to_store_id: targetId }),
            });
            showToast('✅ Disalin', `Konfigurasi gaji disalin ke ${stores.find(s => s.id === targetId)?.name}`, 'success');
        } catch (e) {
            showToast('❌ Gagal', e instanceof Error ? e.message : 'Gagal menyalin konfigurasi', 'error');
        }
    };

    const shortNames = shortStoreNames(stores);
    const others = stores.filter(s => s.id !== storeId);
    const input = `${inputClass} text-right tabular-nums`;

    return (
        <div className="bg-brand-white font-display text-primary min-h-screen">
            <Sidebar
                open={isSidebarOpen}
                onClose={() => setSidebarOpen(false)}
                allowedPages={userRoleData.allowedPages}
                userEmail={userRoleData.email}
                userRole={userRoleData.role}
            />

            <PageHeader title="Setting Gaji" subtitle="Gaji pokok + bonus per box, per store" icon={<LuSettings />} onMenu={() => setSidebarOpen(true)}>
                <StoreSwitcher stores={stores} value={storeId} onChange={setStoreId} />
            </PageHeader>

            <main className="max-w-2xl mx-auto px-4 sm:px-6 py-5 space-y-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-primary/60">Gaji harian {stores.find(s => s.id === storeId)?.name}</p>
                    <button onClick={() => router.push('/salary')} className="text-xs font-bold underline text-primary/80">Ke Generate Gaji →</button>
                </div>

                {loading ? (
                    <div className="h-48 rounded-2xl bg-white/60 animate-pulse" />
                ) : (
                    <>
                        <Card className="space-y-3">
                            <h2 className="text-sm font-extrabold text-primary">Gaji pokok per hari</h2>
                            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-primary">
                                <span>Rp</span>
                                <div className="w-36"><input type="number" inputMode="numeric" min="0" value={baseAmount} onChange={e => setBaseAmount(e.target.value)} placeholder="150000" className={input} /></div>
                                <span>sudah termasuk</span>
                                <div className="w-20"><input type="number" inputMode="numeric" min="0" value={baseUpTo} onChange={e => setBaseUpTo(e.target.value)} className={input} /></div>
                                <span>box pertama</span>
                            </div>
                            {!hasSalary && <p className="text-xs text-primary/50">Kosong = store ini belum menggaji (gaji Rp 0).</p>}
                        </Card>

                        <Card className="space-y-3">
                            <h2 className="text-sm font-extrabold text-primary">Bonus per box</h2>
                            {bonuses.length === 0 && <p className="text-xs text-primary/50">Belum ada bonus.</p>}
                            {bonuses.map((b, i) => (
                                <div key={i} className="flex flex-wrap items-center gap-2 text-sm font-semibold text-primary">
                                    <span className="w-20">Box {fromOf(i) ?? '?'} –</span>
                                    <div className="w-20">
                                        <input type="number" inputMode="numeric" value={b.to} placeholder="∞"
                                            onChange={e => setBonuses(prev => prev.map((x, idx) => idx === i ? { ...x, to: e.target.value } : x))} className={input} />
                                    </div>
                                    <span>Rp</span>
                                    <div className="w-28">
                                        <input type="number" inputMode="numeric" min="0" value={b.rate} placeholder="5000"
                                            onChange={e => setBonuses(prev => prev.map((x, idx) => idx === i ? { ...x, rate: e.target.value } : x))} className={input} />
                                    </div>
                                    <span>/ box</span>
                                    <button type="button" onClick={() => setBonuses(prev => prev.filter((_, idx) => idx !== i))}
                                        className="ml-auto w-10 h-10 flex items-center justify-center rounded-xl text-red-500 hover:bg-red-50" title="Hapus tingkat">
                                        <LuTrash2 />
                                    </button>
                                </div>
                            ))}
                            <p className="text-[11px] text-primary/50">Box awal tiap tingkat otomatis melanjutkan tingkat sebelumnya. Kosongkan box akhir tingkat terakhir kalau berlaku terus ke atas; kalau diisi, box di atasnya tidak dapat bonus.</p>
                            <button type="button" className={buttonSecondary} onClick={() => setBonuses(prev => {
                                const from = prev.length === 0 ? (parseInt(baseUpTo) || 0) + 1 : (parseInt(prev[prev.length - 1].to) || 0) + 1;
                                return [...prev, { to: String(from + 4), rate: '' }];
                            })}>
                                <LuPlus /> Tingkat bonus
                            </button>
                        </Card>

                        <Card className="space-y-2">
                            <h2 className="text-sm font-extrabold text-primary">Simulasi</h2>
                            {typeof tiers === 'string' ? (
                                <p className="text-xs font-semibold text-amber-700">{tiers}</p>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                    {SIMULATE.map(n => {
                                        const total = computeSalary(tiers, n);
                                        return (
                                            <div key={n} className="rounded-xl bg-primary/5 px-3 py-2">
                                                <p className="text-[11px] font-bold text-primary/60">{n} box</p>
                                                <p className="text-sm font-extrabold text-primary tabular-nums">{formatRupiah(total)}</p>
                                                <p className="text-[10px] text-primary/50 tabular-nums">{formatRupiah(Math.round(total / n))}/box</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>

                        <div className="flex flex-wrap gap-2">
                            <button type="button" className={buttonPrimary} onClick={save} disabled={saving || !dirty}>
                                <LuSave /> {saving ? 'Menyimpan…' : 'Simpan'}
                            </button>
                            {!dirty && hasSalary && others.map(s => (
                                <button key={s.id} type="button" className={buttonSecondary} onClick={() => copyTo(s.id)}>
                                    <LuCopy /> Salin ke {shortNames[s.id] ?? s.name}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </main>

            <Toast toast={toast} onClose={hideToast} />
        </div>
    );
}
