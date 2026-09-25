'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LuArrowUpRight, LuSettings } from 'react-icons/lu';
import PageHeader from '@/components/PageHeader';
import StoreSwitcher from '@/components/StoreSwitcher';
import Sidebar from '@/components/Sidebar';
import Toast from '@/components/Toast';
import SetupChecklist from '@/components/config/SetupChecklist';
import MenuBoxManager from '@/components/config/MenuBoxManager';
import VariantManager from '@/components/config/VariantManager';
import QuotaManager, { type DailyQuota, type HourlyQuota } from '@/components/config/QuotaManager';
import StoreSettings from '@/components/config/StoreSettings';
import type { StockItem } from '@/components/VariantRecipeEditor';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/useToast';
import { fetchJson } from '@/utils/fetchJson';
import { API_URL } from '@/utils/config';
import type { Menu, Store, Variant } from '@/types/menu';

// WhatsApp settings are hidden for now (components/WhatsAppManager.tsx still exists).
const TABS = [
    { key: 'setup', label: 'Setup' },
    { key: 'menu', label: 'Menu box' },
    { key: 'varian', label: 'Varian & resep' },
    { key: 'kuota', label: 'Kuota' },
    { key: 'store', label: 'Store' },
] as const;
type TabKey = typeof TABS[number]['key'];

const isTab = (v: string | null): v is TabKey => TABS.some(t => t.key === v);

export default function ConfigPage() {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const userRoleData = useUserRole('config');
    const router = useRouter();
    const { toast, showToast, hideToast } = useToast();

    const [tab, setTab] = useState<TabKey>('setup');
    const [stores, setStores] = useState<Store[]>([]);
    const [activeStoreId, setActiveStoreId] = useState<number | null>(null);
    const [menus, setMenus] = useState<Menu[]>([]);
    const [variants, setVariants] = useState<Variant[]>([]);
    const [stocks, setStocks] = useState<StockItem[]>([]);
    const [quotas, setQuotas] = useState<DailyQuota[]>([]);
    const [hourlyQuotas, setHourlyQuotas] = useState<HourlyQuota[]>([]);
    const [loading, setLoading] = useState(true);
    // Bumped after every change so the setup checklist re-reads its status.
    const [version, setVersion] = useState(0);
    const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    // Keep the active tab chip visible in the horizontally scrolling tab row (phones).
    useEffect(() => {
        tabRefs.current[tab]?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }, [tab]);

    // Tab comes from ?tab= so checklist links and reloads land on the right section.
    useEffect(() => {
        const fromUrl = new URLSearchParams(window.location.search).get('tab');
        if (isTab(fromUrl)) setTab(fromUrl);
    }, []);

    const selectTab = (key: TabKey) => {
        setTab(key);
        const url = new URL(window.location.href);
        url.searchParams.set('tab', key);
        window.history.replaceState(null, '', url.toString());
    };

    const navigate = (href: string) => {
        const target = new URL(href, window.location.origin);
        const nextTab = target.searchParams.get('tab');
        if (target.pathname === '/config' && isTab(nextTab)) selectTab(nextTab);
        else router.push(href);
    };

    const loadStores = useCallback(async () => {
        try {
            const json = await fetchJson(`${API_URL}/api/stores`);
            setStores(json.data);
            setActiveStoreId(prev => prev ?? json.data[0]?.id ?? null);
        } catch (e) {
            showToast('❌ Error', e instanceof Error ? e.message : 'Gagal memuat daftar store', 'error');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadStoreData = useCallback(async (storeId: number) => {
        setLoading(true);
        try {
            const [m, v, s, q, h] = await Promise.all([
                fetchJson(`${API_URL}/api/menu`),
                fetchJson(`${API_URL}/api/variants`),
                fetchJson(`${API_URL}/api/stocks?store_id=${storeId}`),
                fetchJson(`${API_URL}/api/daily-quota?store_id=${storeId}`),
                fetchJson(`${API_URL}/api/hourly-quota?store_id=${storeId}`),
            ]);
            setMenus(m.data);
            setVariants(v.data);
            setStocks(s.data);
            setQuotas(q.data);
            setHourlyQuotas(h.data);
        } catch (e) {
            showToast('❌ Error', e instanceof Error ? e.message : 'Gagal memuat konfigurasi', 'error');
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => { loadStores(); }, [loadStores]);
    useEffect(() => { if (activeStoreId) loadStoreData(activeStoreId); }, [activeStoreId, loadStoreData]);

    const refresh = () => {
        if (activeStoreId) loadStoreData(activeStoreId);
        setVersion(v => v + 1);
    };

    const activeStore = stores.find(s => s.id === activeStoreId) ?? null;
    const notify = (title: string, message: string, type: 'success' | 'error') => showToast(title, message, type);

    return (
        <div className="bg-brand-white font-display text-primary min-h-screen">
            <Sidebar
                open={isSidebarOpen}
                onClose={() => setSidebarOpen(false)}
                allowedPages={userRoleData.allowedPages}
                userEmail={userRoleData.email}
                userRole={userRoleData.role}
            />

            <PageHeader title="Konfigurasi" subtitle="Menu, rasa, resep, kuota, dan data store" icon={<LuSettings />} onMenu={() => setSidebarOpen(true)}>
                <StoreSwitcher stores={stores} value={activeStoreId} onChange={setActiveStoreId} />
                <nav className="-mx-4 sm:mx-0 px-4 sm:px-0 -mb-3 flex gap-5 overflow-x-auto scrollbar-hide border-t border-primary/10 sm:border-t-0" aria-label="Bagian konfigurasi">
                    {TABS.map(t => {
                        const active = tab === t.key;
                        return (
                            <button
                                key={t.key}
                                ref={el => { tabRefs.current[t.key] = el; }}
                                onClick={() => selectTab(t.key)}
                                aria-current={active ? 'page' : undefined}
                                className={`shrink-0 whitespace-nowrap h-11 text-sm font-bold border-b-2 transition-colors focus:outline-none focus-visible:text-primary
                                    ${active ? 'border-primary text-primary' : 'border-transparent text-primary/50 hover:text-primary'}`}
                            >
                                {t.label}
                            </button>
                        );
                    })}
                    <Link href="/config/salary" className="shrink-0 whitespace-nowrap h-11 text-sm font-bold border-b-2 border-transparent text-primary/50 hover:text-primary inline-flex items-center gap-1 focus:outline-none">
                        Gaji <LuArrowUpRight />
                    </Link>
                </nav>
            </PageHeader>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
                {!activeStore ? (
                    <div className="h-40 rounded-2xl bg-white/60 animate-pulse" />
                ) : loading && tab !== 'setup' ? (
                    <div className="space-y-3 animate-pulse">
                        <div className="h-8 w-48 rounded-lg bg-white/70" />
                        <div className="h-40 rounded-2xl bg-white/60" />
                    </div>
                ) : (
                    <>
                        {tab === 'setup' && <SetupChecklist storeId={activeStore.id} storeName={activeStore.name} refreshKey={version} onNavigate={navigate} />}
                        {tab === 'menu' && <MenuBoxManager menus={menus} stores={stores} onChanged={refresh} notify={notify} />}
                        {tab === 'varian' && <VariantManager variants={variants} stores={stores} stocks={stocks} activeStoreId={activeStore.id} onChanged={refresh} notify={notify} />}
                        {tab === 'kuota' && <QuotaManager key={activeStore.id} store={activeStore} quotas={quotas} hourlyQuotas={hourlyQuotas} onChanged={refresh} notify={notify} />}
                        {tab === 'store' && <StoreSettings store={activeStore} onSaved={() => { loadStores(); refresh(); }} notify={notify} />}
                    </>
                )}
            </main>

            <Toast toast={toast} onClose={hideToast} />
        </div>
    );
}
