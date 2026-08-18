'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReservationsRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/hosting/bookings');
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C]" />
        </div>
    );
}
