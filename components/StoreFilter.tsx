'use client';

import { LuChevronDown } from 'react-icons/lu';

interface Store {
    id: number;
    name: string;
}

export default function StoreFilter({ stores, value, onChange }: { stores: Store[]; value: number | null; onChange: (storeId: number | null) => void }) {
    return (
        <div className="relative">
            <select
                value={value ?? ''}
                onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
                className="appearance-none cursor-pointer pl-3 pr-7 h-9 rounded-full border border-primary/10 bg-white/60 text-primary text-xs font-bold focus:outline-none"
            >
                <option value="">Semua Store</option>
                {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                ))}
            </select>
            <LuChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/50 text-xs" />
        </div>
    );
}
