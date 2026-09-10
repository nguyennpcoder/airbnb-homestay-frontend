'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import api from '@/lib/api';

// Icons
const FiHome = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
);

const FiSearch = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const FiHeart = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
);

const FiMessageSquare = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 10c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 18l1.395-3.72C3.512 13.042 3 11.574 3 10c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);

const FiUser = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

function MobileNavContent() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [unreadCount, setUnreadCount] = useState(0);
    const activeTab = searchParams.get('tab');

    useEffect(() => {
        const userId = localStorage.getItem('userId');
        if (!userId) return;

        const fetchCount = () => {
            api.get(`/thong-bao/user/${userId}/counts`)
                .then(res => {
                    const data = res.data;
                    if (data.unreadMessages !== undefined) setUnreadCount(data.unreadMessages);
                })
                .catch(err => console.error("Error fetching unread count", err));
        };

        fetchCount();
        const handleUpdate = () => fetchCount();
        window.addEventListener('notifications-updated', handleUpdate);
        return () => window.removeEventListener('notifications-updated', handleUpdate);
    }, []);

    // Don't show on admin or hosting pages
    if (pathname.startsWith('/admin') || pathname.startsWith('/hosting')) return null;

    const navItems = [
        { label: 'Khám phá', href: '/', icon: <FiSearch />, active: pathname === '/' },
        { label: 'Yêu thích', href: '/profile?tab=yeu-thich', icon: <FiHeart />, active: pathname === '/profile' && activeTab === 'yeu-thich' },
        { label: 'Chuyến đi', href: '/profile?tab=chuyen-di', icon: <FiHome />, active: pathname === '/profile' && activeTab === 'chuyen-di' },
        { label: 'Tin nhắn', href: '/profile?tab=nhan-tin', icon: <FiMessageSquare />, active: pathname === '/profile' && activeTab === 'nhan-tin', badge: unreadCount },
        { label: 'Hồ sơ', href: '/profile', icon: <FiUser />, active: pathname === '/profile' && !activeTab },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-[100] md:hidden">
            <div className="flex justify-around items-center h-16">
                {navItems.map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${item.active ? 'text-[#FF385C]' : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        <div className="relative">
                            {item.icon}
                            {item.badge !== undefined && item.badge > 0 && (
                                <span className="absolute -top-1 -right-1 bg-[#FF385C] text-white text-[10px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full px-1 border-2 border-white">
                                    {item.badge}
                                </span>
                            )}
                        </div>
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </Link>
                ))}
            </div>
        </nav>
    );
}

export default function MobileNav() {
    return (
        <Suspense fallback={null}>
            <MobileNavContent />
        </Suspense>
    );
}
