'use client';

import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import {
    LuX,
    LuHouse,
    LuClipboardList,
    LuShoppingCart,
    LuReceipt,
    LuLogOut,
    LuUser,
    LuChartBar,
    LuBanknote,
    LuArrowLeftRight,
} from 'react-icons/lu';

interface SidebarProps {
    open: boolean;
    onClose: () => void;
    allowedPages?: string[];
    userEmail?: string;
    userRole?: string;
}

const NAV_ITEMS = [
    { label: 'Home', icon: LuHouse, href: '/orders', key: 'orders' },
    { label: 'Sales', icon: LuClipboardList, href: '/sales', key: 'sales' },
    { label: 'Analytics', icon: LuChartBar, href: '/analytics', key: 'analytics' },
    { label: 'Finance', icon: LuBanknote, href: '/finance', key: 'finance' },
    { label: 'Cash Flow', icon: LuArrowLeftRight, href: '/cashflow', key: 'cashflow' },
];

export default function Sidebar({ open, onClose, allowedPages, userEmail, userRole }: SidebarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();

    const visibleItems = allowedPages
        ? NAV_ITEMS.filter(item => allowedPages.includes(item.key))
        : NAV_ITEMS; // show all if no allowedPages provided (backwards compat)

    const handleNav = (href: string) => {
        onClose();
        router.push(href);
    };

    const handleLogout = async () => {
        onClose();
        await supabase.auth.signOut();
        router.push('/');
    };

    const displayRole = userRole
        ? userRole.charAt(0).toUpperCase() + userRole.slice(1)
        : 'Admin';

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={`fixed top-0 left-0 h-full w-72 max-w-[80vw] z-[70] flex flex-col bg-primary shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-12 pb-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-brand-yellow flex items-center justify-center">
                            <LuUser className="text-primary text-lg" />
                        </div>
                        <div>
                            <p className="text-brand-yellow text-sm font-extrabold leading-tight">
                                {userEmail || 'Raja Pisang Nugget'}
                            </p>
                            <p className="text-white/40 text-[10px] font-medium">{displayRole}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                    >
                        <LuX className="text-white text-sm" />
                    </button>
                </div>

                {/* Nav Items */}
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {visibleItems.map(({ label, icon: Icon, href }) => {
                        const isActive = pathname === href;
                        return (
                            <button
                                key={label}
                                onClick={() => handleNav(href)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-left transition-all ${isActive
                                    ? 'bg-brand-yellow text-primary'
                                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                <Icon className="text-lg shrink-0" />
                                {label}
                            </button>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className="px-4 pb-10 border-t border-white/10 pt-4">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-red-400 hover:bg-red-500/10 transition-all"
                    >
                        <LuLogOut className="text-lg shrink-0" />
                        Logout
                    </button>
                </div>
            </div>
        </>
    );
}
