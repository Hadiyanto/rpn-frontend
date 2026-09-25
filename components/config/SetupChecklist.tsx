'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LuCheck, LuChevronRight, LuCircleDashed, LuCircleDot } from 'react-icons/lu';
import { fetchJson } from '@/utils/fetchJson';
import { API_URL } from '@/utils/config';
import { Card, SectionHeader, StatusPill } from './ui';

interface SetupStep {
    key: string;
    title: string;
    state: 'done' | 'partial' | 'todo';
    detail: string;
    href: string;
}

const ICON = { done: LuCheck, partial: LuCircleDot, todo: LuCircleDashed };
const LABEL = { done: 'Selesai', partial: 'Sebagian', todo: 'Belum' };

/** What this store still needs before it can take orders. Steps link to the tab that fixes them. */
export default function SetupChecklist({ storeId, storeName, refreshKey, onNavigate }: { storeId: number; storeName?: string; refreshKey: number; onNavigate: (href: string) => void }) {
    const [steps, setSteps] = useState<SetupStep[] | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        fetchJson(`${API_URL}/api/setup-status?store_id=${storeId}`)
            .then(json => { if (!cancelled) { setSteps(json.data); setError(''); } })
            .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Gagal memuat status setup'); });
        return () => { cancelled = true; };
    }, [storeId, refreshKey]);

    const done = steps?.filter(s => s.state === 'done').length ?? 0;

    return (
        <div className="space-y-4">
            <SectionHeader
                title="Checklist setup"
                description={`Yang perlu disiapkan ${storeName ?? 'store ini'} sebelum menerima order. Klik langkah untuk membuka pengaturannya.`}
                action={steps && <StatusPill state={done === steps.length ? 'done' : 'partial'}>{done} / {steps.length} selesai</StatusPill>}
            />
            {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
            <Card className="p-0 sm:p-0 overflow-hidden">
                {!steps && !error && (
                    <div className="p-5 space-y-3 animate-pulse">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-10 rounded-xl bg-primary/5" />)}
                    </div>
                )}
                <ol className="divide-y divide-primary/10">
                    {steps?.map((step, i) => {
                        const Icon = ICON[step.state];
                        const isInternal = step.href.startsWith('/config');
                        const content = (
                            <>
                                <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${step.state === 'done' ? 'bg-green-100 text-green-700' : step.state === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-primary/5 text-primary/40'}`}>
                                    <Icon />
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className="block text-sm font-bold text-primary">{i + 1}. {step.title}</span>
                                    <span className="block text-xs text-primary/60 sm:truncate">{step.detail}</span>
                                </span>
                                <span className="hidden sm:inline-flex"><StatusPill state={step.state}>{LABEL[step.state]}</StatusPill></span>
                                <LuChevronRight className="text-primary/30 shrink-0" />
                            </>
                        );
                        const cls = 'w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-3 text-left hover:bg-primary/5 active:bg-primary/10 transition-colors';
                        return (
                            <li key={step.key}>
                                {isInternal
                                    ? <button type="button" className={cls} onClick={() => onNavigate(step.href)}>{content}</button>
                                    : <Link href={step.href} className={cls}>{content}</Link>}
                            </li>
                        );
                    })}
                </ol>
            </Card>
        </div>
    );
}
