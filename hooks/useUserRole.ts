'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { fetchJson } from '@/utils/fetchJson';
import { API_URL } from '@/utils/config';

interface UserRole {
    user_id: string;
    email: string;
    role: string;
    allowed_pages: string[];
}

const DEFAULT_ROLE: UserRole = {
    user_id: '',
    email: '',
    role: 'staff',
    allowed_pages: ['orders'],
};

export function useUserRole(requiredPage?: string) {
    const [userRole, setUserRole] = useState<UserRole>(DEFAULT_ROLE);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        let cancelled = false;

        const fetchRole = async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    if (!cancelled) setLoading(false);
                    return;
                }

                const json = await fetchJson(`${API_URL}/api/user-role/${user.id}`);
                if (cancelled) return;

                if (json.status === 'ok' && json.data) {
                    setUserRole(json.data);
                } else {
                    // Fallback: use email from auth, default permissions
                    setUserRole({ ...DEFAULT_ROLE, user_id: user.id, email: user.email ?? '' });
                }
            } catch {
                // Keep defaults on error
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchRole();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (loading || !requiredPage) return;
        if (!userRole.allowed_pages.includes(requiredPage)) {
            router.replace('/orders');
        }
    }, [loading, requiredPage, userRole.allowed_pages, router]);

    return {
        role: userRole.role,
        email: userRole.email,
        allowedPages: userRole.allowed_pages,
        userId: userRole.user_id,
        loading,
    };
}
