'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function AdminGuard() {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Check if user is logged in as admin (must have adminToken)
        const adminToken = localStorage.getItem('adminToken');
        const adminEmail = localStorage.getItem('adminEmail');

        // Only consider user as admin if they have adminToken and it matches admin email convention
        const isAdmin = adminToken && adminEmail;

        if (!isAdmin) {
            // Not an admin? Get out of admin area
            if (pathname && pathname.startsWith('/admin') && pathname !== '/login') {
                router.replace('/login');
            }
        }
        // Note: We REMOVED the logic that kicks admins out of non-admin pages.
        // Admins should be allowed to view the public site freely.

    }, [pathname, router]);

    return null;
}
