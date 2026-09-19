'use client';

import { useState } from 'react';

export interface ToastState {
    title: string;
    body: string;
    type: 'success' | 'error' | 'info';
}

export function useToast() {
    const [toast, setToast] = useState<ToastState | null>(null);

    const showToast = (title: string, body: string, type: ToastState['type'] = 'info') => {
        setToast({ title, body, type });
        setTimeout(() => setToast(null), 3000);
    };

    return { toast, showToast, hideToast: () => setToast(null) };
}
