'use client';

import type { ReactNode } from 'react';
import { LuChevronLeft, LuMenu } from 'react-icons/lu';

/**
 * Sticky page header shared by admin pages: menu button, icon + title (+ subtitle from sm up),
 * an optional action on the right, and optional rows below it (store switcher, tabs).
 */
export default function PageHeader({ title, subtitle, icon, onMenu, onBack, action, children }: {
    title: string;
    subtitle?: string;
    icon?: ReactNode;
    /** Opens the sidebar. Detail pages pass `onBack` instead to show a back button. */
    onMenu?: () => void;
    onBack?: () => void;
    action?: ReactNode;
    children?: ReactNode;
}) {
    return (
        <header className="sticky top-0 z-40 bg-brand-yellow/95 backdrop-blur-md border-b border-primary/10 pt-[env(safe-area-inset-top,0px)]">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <div className="h-14 sm:h-16 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onBack ?? onMenu}
                        className="w-10 h-10 -ml-2 shrink-0 flex items-center justify-center rounded-xl text-primary hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        aria-label={onBack ? 'Kembali' : 'Buka menu'}
                    >
                        {onBack ? <LuChevronLeft className="text-2xl" /> : <LuMenu className="text-2xl" />}
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg sm:text-xl font-extrabold text-primary flex items-center gap-2 leading-tight truncate">
                            {icon && <span className="text-primary/70 shrink-0 flex">{icon}</span>}
                            <span className="truncate">{title}</span>
                        </h1>
                        {subtitle && <p className="hidden sm:block text-xs font-semibold text-primary/60 truncate">{subtitle}</p>}
                    </div>
                    {action && <div className="shrink-0">{action}</div>}
                </div>
                {children && <div className="pb-3 space-y-2.5">{children}</div>}
            </div>
        </header>
    );
}

/** Class for a filter chip (date, status, payment …) in a header chip row. */
export const chipClass = (active: boolean) =>
    `shrink-0 h-9 px-4 rounded-full text-sm font-bold whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${active
        ? 'bg-primary text-brand-yellow'
        : 'bg-white/70 text-primary/60 border border-primary/10 hover:text-primary'}`;

/** Horizontally scrolling row of chips that runs edge to edge on phones. */
export function ChipRow({ children, label }: { children: ReactNode; label?: string }) {
    return (
        <div role="group" aria-label={label} className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto scrollbar-hide">
            {children}
        </div>
    );
}

/** Round icon button for header actions (notifications, refresh …). */
export const headerIconButton =
    'relative w-10 h-10 rounded-full bg-white/70 flex items-center justify-center border border-primary/10 text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';
