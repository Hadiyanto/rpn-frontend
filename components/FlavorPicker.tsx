'use client';

import { LuCheck } from 'react-icons/lu';
import type { Variant } from '@/types/menu';
import { buildSelection, selectedVariants, type FlavorSelection } from '@/utils/flavors';

interface FlavorPickerProps {
    name: string;
    variantIds?: number[];
    variants: Variant[];
    maxFlavors: number;
    onChange: (selection: FlavorSelection) => void;
    /** Show variant thumbnails (customer-facing pages). */
    showImages?: boolean;
    /** Tailwind radius class for the option cards. */
    radiusClass?: string;
}

/**
 * Flavor checkboxes for one order item: 1 to `maxFlavors` different flavors (Box Kecil = 1,
 * Box Besar up to 3). One checkbox per flavor, so a flavor can't be picked twice.
 * Shared by the public order page and /orders.
 */
export default function FlavorPicker({
    name,
    variantIds,
    variants,
    maxFlavors,
    onChange,
    showImages = true,
    radiusClass = 'rounded-xl',
}: FlavorPickerProps) {
    const active = variants.filter(v => v.is_active);
    const chosen = selectedVariants({ name, variant_ids: variantIds }, variants);
    const chosenIds = new Set(chosen.map(v => v.id));

    const toggle = (v: Variant, checked: boolean) => {
        let next = chosen;
        if (checked) {
            // Box Kecil (1 rasa): picking another flavor replaces the current one.
            if (maxFlavors === 1) next = [v];
            else if (next.length < maxFlavors) next = [...next, v];
        } else {
            next = next.filter(c => c.id !== v.id);
        }
        onChange(buildSelection(next));
    };

    return (
        <>
            {active.map(v => {
                const isChecked = chosenIds.has(v.id);
                const isDisabled = maxFlavors > 1 && !isChecked && chosen.length >= maxFlavors;
                return (
                    <label key={v.id} className={`relative flex items-center gap-2 p-2 ${radiusClass} border-2 transition-all cursor-pointer ${isChecked ? 'border-primary bg-primary/5 text-primary' : isDisabled ? 'border-primary/5 bg-primary/5 text-primary/30 opacity-50 cursor-not-allowed' : 'border-primary/10 bg-white text-primary/70 hover:border-primary/30'}`}>
                        <input type="checkbox" className="peer sr-only" checked={isChecked} disabled={isDisabled} onChange={e => toggle(v, e.target.checked)} />
                        <div className={`w-4 h-4 rounded flex items-center justify-center border-2 transition-colors shrink-0 ${isChecked ? 'bg-primary border-primary text-brand-yellow' : 'border-primary/20'}`}>
                            {isChecked && <LuCheck className="text-[10px] stroke-[4]" />}
                        </div>
                        {showImages && v.image_url && <img src={v.image_url} alt={v.variant_name} className="w-8 h-8 rounded-lg object-cover shrink-0" />}
                        <span className="text-xs font-bold leading-tight select-none flex-1 line-clamp-2 break-words text-left">{v.variant_name}</span>
                    </label>
                );
            })}
        </>
    );
}
