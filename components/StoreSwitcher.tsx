'use client';

interface StoreOption {
    id: number;
    name: string;
}

/**
 * Store names usually share a brand prefix ("Raja Pisang Nugget Kalibata", "… Depok"). Showing
 * only the part that differs keeps the switcher readable on a phone. Derived from the names
 * themselves, so nothing is hardcoded; falls back to the full name when nothing is left.
 */
export function shortStoreNames(stores: StoreOption[]): Record<number, string> {
    const result: Record<number, string> = {};
    if (stores.length < 2) {
        for (const s of stores) result[s.id] = s.name;
        return result;
    }
    const words = stores.map(s => s.name.trim().split(/\s+/));
    let common = 0;
    while (words.every(w => w.length > common + 1 && w[common].toLowerCase() === words[0][common].toLowerCase())) common++;
    for (let i = 0; i < stores.length; i++) {
        result[stores[i].id] = words[i].slice(common).join(' ') || stores[i].name;
    }
    return result;
}

/**
 * Store picker: a full-width segmented control for up to 3 stores (+ "Semua" when `allowAll`),
 * a select beyond that. With `allowAll`, `null` means all stores.
 */
export default function StoreSwitcher({ stores, value, onChange, allowAll = false, label = 'Pilih store' }: {
    stores: StoreOption[];
    value: number | null;
    onChange: (storeId: number | null) => void;
    allowAll?: boolean;
    label?: string;
}) {
    if (stores.length <= 1) return null;
    const short = shortStoreNames(stores);
    const options: { id: number | null; label: string; title: string }[] = [
        ...(allowAll ? [{ id: null, label: 'Semua', title: 'Semua store' }] : []),
        ...stores.map(s => ({ id: s.id, label: short[s.id], title: s.name })),
    ];

    if (stores.length > 3) {
        return (
            <select
                aria-label={label}
                value={value ?? ''}
                onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
                className="w-full h-10 px-3 rounded-xl border border-primary/15 bg-white text-base sm:text-sm font-bold text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
                {options.map(o => <option key={o.id ?? 'all'} value={o.id ?? ''}>{o.title}</option>)}
            </select>
        );
    }

    return (
        <div role="radiogroup" aria-label={label} className="flex w-full sm:w-auto sm:inline-flex p-1 rounded-xl bg-primary/10">
            {options.map(s => {
                const active = s.id === value;
                return (
                    <button
                        key={s.id ?? 'all'}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        title={s.title}
                        onClick={() => onChange(s.id)}
                        className={`flex-1 sm:flex-none min-w-0 h-9 px-4 rounded-lg text-sm font-bold truncate transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
                            ${active ? 'bg-white text-primary shadow-sm' : 'text-primary/60 hover:text-primary'}`}
                    >
                        {s.label}
                    </button>
                );
            })}
        </div>
    );
}
