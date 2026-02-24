'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LuGalleryThumbnails, LuReceipt, LuWallet, LuClipboardList, LuUser } from 'react-icons/lu';

export default function BottomNav() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname.startsWith(path) && (path !== '/' || pathname === '/');

    return (
        <>
            <nav className="fixed bottom-0 z-50 bg-white border-t-2 border-primary/10 w-full max-w-[480px]">
                <div className="flex h-20 items-center justify-around w-full px-2">
                    {/* <Link href="/" className={`flex flex-col items-center gap-1 ${isActive('/') ? 'text-primary' : 'text-primary/50'}`}>
                        <LuGalleryThumbnails className="text-2xl" />
                        <span className="text-[10px] font-bold uppercase">Beranda</span>
                    </Link> */}
                    {/* <Link href="/sales" className={`flex flex-col items-center gap-1 ${isActive('/sales') ? 'text-primary' : 'text-primary/50'}`}>
                        <LuReceipt className="text-2xl" />
                        <span className="text-[10px] font-bold uppercase">Penjualan</span>
                    </Link> */}
                    <Link href="/orders" className={`flex flex-col items-center gap-1 ${isActive('/orders') ? 'text-primary' : 'text-primary/50'}`}>
                        <LuClipboardList className="text-2xl" />
                        <span className="text-[10px] font-bold uppercase">Orders</span>
                    </Link>
                    {/* <Link href="/expenses" className={`flex flex-col items-center gap-1 ${isActive('/expenses') ? 'text-primary' : 'text-primary/50'}`}>
                        <LuWallet className="text-2xl" />
                        <span className="text-[10px] font-bold uppercase">Pengeluaran</span>
                    </Link>
                    <Link href="/profile" className={`flex flex-col items-center gap-1 ${isActive('/profile') ? 'text-primary' : 'text-primary/50'}`}>
                        <LuUser className="text-2xl" />
                        <span className="text-[10px] font-bold uppercase">Profil</span>
                    </Link> */}
                </div>
            </nav>
        </>
    );
}
