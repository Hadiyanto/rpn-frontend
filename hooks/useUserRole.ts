'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

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

export function useUserRole() {
    const [userRole, setUserRole] = useState<UserRole>(DEFAULT_ROLE);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRole = async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    setLoading(false);
                    return;
                }

                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
                const res = await fetch(`${apiUrl}/api/user-role/${user.id}`);
                const json = await res.json();

                if (json.status === 'ok' && json.data) {
                    setUserRole(json.data);
                } else {
                    // Fallback: use email from auth, default permissions
                    setUserRole({ ...DEFAULT_ROLE, user_id: user.id, email: user.email ?? '' });
                }
            } catch {
                // Keep defaults on error
            } finally {
                setLoading(false);
            }
        };

        fetchRole();
    }, []);

    return {
        role: userRole.role,
        email: userRole.email,
        allowedPages: userRole.allowed_pages,
        userId: userRole.user_id,
        loading,
    };
}
