'use client';

import { MdClose } from 'react-icons/md';
import type { ToastState } from '@/hooks/useToast';

export default function Toast({ toast, onClose }: { toast: ToastState | null; onClose: () => void }) {
    if (!toast) return null;

    return (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 fade-in duration-300">
            <div className={`shadow-xl rounded-2xl p-4 flex items-start gap-3 w-80 max-w-[90vw] ${toast.type === 'success' ? 'bg-green-500 text-white' : toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-primary text-brand-yellow'}`}>
                <div className="flex-1">
                    <h4 className="font-bold text-sm mb-0.5">{toast.title}</h4>
                    <p className="text-xs opacity-90">{toast.body}</p>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-black/10 rounded-lg transition-colors">
                    <MdClose className="text-lg" />
                </button>
            </div>
        </div>
    );
}
