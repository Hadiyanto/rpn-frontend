'use client';

import type { ReactNode } from 'react';

// Shared building blocks for the /config screens, so every tab uses the same spacing,
// labels and controls.

// Inputs are 16px on phones (below that, iOS Safari zooms the page on focus) and 44px tall
// for comfortable tapping; they shrink back to 14px / 40px from the sm breakpoint.
export const inputClass =
    'w-full h-11 sm:h-10 px-3 rounded-xl border border-primary/15 bg-white text-base sm:text-sm font-semibold text-primary placeholder:text-primary/30 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 disabled:bg-primary/5 disabled:text-primary/40';

const buttonBase = 'h-11 sm:h-10 px-4 inline-flex items-center justify-center gap-1.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors';

export const buttonPrimary = `${buttonBase} bg-primary text-brand-yellow hover:opacity-90`;

export const buttonSecondary = `${buttonBase} bg-primary/10 text-primary hover:bg-primary/15`;

export const buttonDanger = `${buttonBase} text-red-600 hover:bg-red-50`;

/**
 * Save/cancel row for long forms: pinned to the bottom of the screen on phones (above the
 * home indicator), a normal row from the sm breakpoint.
 */
export function StickyActions({ children }: { children: ReactNode }) {
    return (
        <div className="sticky bottom-0 z-10 -mx-4 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] bg-white/95 backdrop-blur border-t border-primary/10 sm:static sm:mx-0 sm:px-0 sm:pt-0 sm:pb-0 sm:bg-transparent sm:backdrop-blur-none sm:border-0">
            <div className="flex flex-wrap items-center gap-2 justify-between">{children}</div>
        </div>
    );
}

export function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: ReactNode; className?: string }) {
    return (
        <label className={`flex flex-col gap-1.5 ${className}`}>
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary/60">{label}</span>
            {children}
            {hint && <span className="text-[11px] text-primary/50">{hint}</span>}
        </label>
    );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <div className={`bg-white rounded-2xl border border-primary/10 p-4 sm:p-5 ${className}`}>{children}</div>;
}

/** Back link used by master/detail screens on phones. */
export function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
    return (
        <button type="button" onClick={onClick} className="lg:hidden inline-flex items-center gap-1 h-10 -ml-1 px-1 text-sm font-bold text-primary/70">
            ← {label}
        </button>
    );
}

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0 flex-1 basis-60">
                <h2 className="text-lg font-extrabold text-primary">{title}</h2>
                {description && <p className="text-sm text-primary/60 mt-0.5 max-w-prose">{description}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}

export function StatusPill({ state, children }: { state: 'done' | 'partial' | 'todo' | 'off'; children: ReactNode }) {
    const styles = {
        done: 'bg-green-50 text-green-700',
        partial: 'bg-amber-50 text-amber-700',
        todo: 'bg-red-50 text-red-600',
        off: 'bg-primary/5 text-primary/50',
    }[state];
    return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${styles}`}>{children}</span>;
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
    return (
        <div className="rounded-2xl border border-dashed border-primary/20 bg-white/60 p-6 text-center">
            <p className="text-sm font-bold text-primary/70">{title}</p>
            {children && <div className="mt-2 text-sm text-primary/50">{children}</div>}
        </div>
    );
}

/** In-page confirmation (the app runs in environments where window.confirm may be blocked). */
export function ConfirmBar({ message, confirmLabel, onConfirm, onCancel, busy }: { message: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void; busy?: boolean }) {
    return (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-red-50 border border-red-100 p-3">
            <p className="text-sm font-semibold text-red-700 w-full sm:w-auto sm:flex-1">{message}</p>
            <button type="button" onClick={onCancel} className={`${buttonSecondary} flex-1 sm:flex-none`}>Batal</button>
            <button type="button" onClick={onConfirm} disabled={busy} className={`${buttonBase} flex-1 sm:flex-none bg-red-600 text-white hover:bg-red-700`}>
                {confirmLabel}
            </button>
        </div>
    );
}
