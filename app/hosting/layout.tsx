'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { hostAPI, userAPI, thongBaoAPI, messageAPI } from '@/lib/api';
import Image from 'next/image';
import { AdminThemeProvider, useAdminTheme, type AdminThemeMode } from '@/context/AdminThemeContext';
import HostAdminChatWidget from '@/components/HostAdminChatWidget';

function HostingContent({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { theme, setTheme } = useAdminTheme();
    const [loading, setLoading] = useState(true);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [userAvatar, setUserAvatar] = useState<string | null>(null);
    const [hostName, setHostName] = useState<string>('');
    const [notificationCount, setNotificationCount] = useState<number>(0);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const checkAccess = async () => {
            const userId = localStorage.getItem('userId');

            if (!userId) {
                router.push('/login');
                return;
            }

            try {
                const data = await userAPI.getProfile(Number(userId));
                if (!data.laChuNha) {
                    router.push('/');
                } else {
                    setLoading(false);
                    if (data.urlAnhDaiDien) {
                        setUserAvatar(data.urlAnhDaiDien);
                    }
                    setHostName(data.hoTen || data.email || 'Host');

                    return () => clearInterval(interval);
                }
            } catch (error) {
                console.error('Error checking host status:', error);
                router.push('/');
            }
        };

        checkAccess();

        // Close mobile menu on route change
        setIsMobileMenuOpen(false);

        syncNotifications();
        const handleRefresh = () => syncNotifications();
        window.addEventListener('notifications-updated', handleRefresh);
        window.addEventListener('chat-messages-updated', handleRefresh);

        const interval = setInterval(syncNotifications, 10000);

        return () => {
            window.removeEventListener('notifications-updated', handleRefresh);
            window.removeEventListener('chat-messages-updated', handleRefresh);
            clearInterval(interval);
        };
    }, [router, pathname]);

    const syncNotifications = async () => {
        const userId = localStorage.getItem('userId');
        if (!userId) return;
        try {
            const [thongBaoData, tinNhanData] = await Promise.all([
                thongBaoAPI.getCounts(Number(userId)),
                messageAPI.unreadCount(Number(userId), 'host'),
            ]);
            // Use pendingRequests from thong_bao, but unreadMessages from tin_nhan (actual messages)
            setNotificationCount((tinNhanData.unreadMessages || 0) + (thongBaoData.pendingRequests || 0));
        } catch (error) {
            // console.error('Error fetching notification count:', error);
        }
    };

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            if(mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)){
                setIsMobileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = async () => {
        try {
            const { authAPI } = await import('@/lib/api');
            await authAPI.logout();
        } catch (e) {
            console.error('Hosting logout error:', e);
        }
        localStorage.removeItem('userId');
        localStorage.removeItem('userAvatar');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userDisplayName');
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('token');
        window.location.href = '/';
    };

    const navItems = [
        { name: 'Bảng điều khiển', path: '/hosting' },
        { name: 'Đặt chỗ & lịch', path: '/hosting/bookings' },
        { name: 'Phòng cho thuê', path: '/hosting/listings' },
        { name: 'Tiện ích', path: '/hosting/amenities' },
        { name: 'Đánh giá', path: '/hosting/reviews' },
        { name: 'Thanh toán', path: '/hosting/payments' },
        { name: 'Hộp thư đến', path: '/hosting/inbox', badge: notificationCount },
        { name: 'Qui định', path: '/hosting/regulations' },
    ];

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C]"></div></div>;
    }

    return (
        <div className="min-h-screen bg-[#F7F7F7] dark:bg-[#0d0d0d] transition-colors duration-200">
            {/* Hosting Header */}
            <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
                isScrolled
                  ? 'bg-white dark:bg-[#161616] shadow-sm dark:shadow-black/20 border-b border-transparent dark:border-[#2a2a2a]'
                  : 'bg-white dark:bg-[#161616] border-b border-gray-200 dark:border-[#2a2a2a]'
                }`}>
                <div className="admin-container h-20 flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-4">
                        {/* Hamburger Menu (Mobile) */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isMobileMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                                )}
                            </svg>
                        </button>

                        <Link href="/hosting" className="flex items-center gap-2">
                            <svg className="h-8 w-8 text-[#FF385C]" viewBox="0 0 32 32" fill="currentColor">
                                <path d="M16 1c2.008 0 3.463.963 4.751 3.269l.533 1.025c1.954 3.83 6.114 12.54 7.1 14.836l.145.353c.667 1.591.91 3.162.726 4.692-.246 2.05-1.453 3.92-3.317 5.154-1.64 1.085-3.653 1.671-5.818 1.671-2.286 0-4.354-.644-6.013-1.827a9.677 9.677 0 0 1-3.657-5.184l-.145-.353C9.29 22.338 13.45 13.628 15.404 9.8l.533-1.026C17.225 6.48 18.68 5.516 20.688 5.516c1.504 0 2.905.586 3.946 1.651 1.04 1.065 1.613 2.48 1.613 3.985 0 1.498-.574 2.913-1.613 3.978-1.04 1.066-2.442 1.652-3.946 1.652-1.46 0-2.82-.55-3.85-1.553l-.175-.179-.175.179c-1.03 1.003-2.39 1.553-3.85 1.553-1.504 0-2.906-.586-3.946-1.652C7.652 14.065 7.08 12.65 7.08 11.152c0-1.505.573-2.92 1.613-3.985C9.733 6.102 11.134 5.516 12.638 5.516c2.008 0 3.463.963 4.751 3.269l.533 1.025c.233.456.483.94.748 1.44L16 1zm0 2c-1.27 0-2.383.638-3.18 2.056l-.52.998c-1.936 3.794-6.095 12.503-7.082 14.801-.59 1.41-.807 2.79-.644 4.146.217 1.81 1.283 3.46 2.928 4.55 1.463.968 3.24 1.449 5.136 1.449 1.91 0 3.69-.492 5.137-1.46 1.645-1.09 2.71-2.74 2.927-4.55.163-1.356-.054-2.736-.644-4.146-.987-2.298-5.146-11.007-7.082-14.8l-.521-1C18.383 3.638 17.27 3 16 3zm4.688 4.516c.96 0 1.854.374 2.518 1.054.664.68 1.03 1.584 1.03 2.543 0 .96-.366 1.863-1.03 2.543-.664.68-1.558 1.054-2.518 1.054-.92 0-1.78-.345-2.43-1.005l-.088-.093-.088.093c-.65.66-1.51 1.005-2.43 1.005-.96 0-1.854-.374-2.518-1.054-.664-.68-1.03-1.584-1.03-2.543 0-.96.366-1.863 1.03-2.543.664-.68 1.558-1.054 2.518-1.054 1.27 0 2.383.638 3.18 2.056l.52.998c.148.29.306.596.472.913.166-.317.324-.623.472-.913l.52-.998c.797-1.418 1.91-2.056 3.18-2.056z"></path>
                            </svg>
                            <span className="text-[#FF385C] text-xl font-bold tracking-tight hidden md:block">Hosting</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium ml-0.5 hidden md:inline">{hostName}</span>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center gap-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    className={`relative px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${isActive
                                        ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-gray-100'
                                        }`}
                                >
                                    {item.name}
                                    {'badge' in item && item.badge && item.badge > 0 && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF385C] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                                            {item.badge > 9 ? '9+' : item.badge}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Menu */}
                    <div className="flex items-center gap-2 md:gap-4">
                        <button className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors relative">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                            {notificationCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full border-2 border-white"></span>
                            )}
                        </button>

                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all relative"
                            >
                                {userAvatar ? (
                                    <Image src={userAvatar} alt="Host avatar" fill className="object-cover" sizes="40px" />
                                ) : (
                                    <div className="w-full h-full bg-gray-900 text-white flex items-center justify-center">
                                        <span className="text-sm font-medium">H</span>
                                    </div>
                                )}
                            </button>

                            {isDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1e1e1e] rounded-xl shadow-lg border border-gray-100 dark:border-[#333] py-2 animate-in fade-in slide-in-from-top-2">
                                    <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5">
                                        Hồ sơ
                                    </Link>
                                    <Link href="/" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5">
                                        Chế độ khách hàng
                                    </Link>

                                    {/* Theme Toggle */}
                                    <div className="px-4 py-2.5 border-t border-gray-100 dark:border-[#333] mt-1 pt-2">
                                        <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Giao diện</p>
                                        <div className="flex gap-1">
                                            {([
                                                { mode: 'light' as AdminThemeMode, icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>, label: 'Sáng' },
                                                { mode: 'dark' as AdminThemeMode, icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>, label: 'Tối' },
                                                { mode: 'system' as AdminThemeMode, icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>, label: 'Hệ thống' },
                                            ] as const).map(opt => (
                                                <button
                                                    key={opt.mode}
                                                    onClick={() => setTheme(opt.mode)}
                                                    title={opt.label}
                                                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                        theme === opt.mode
                                                            ? 'bg-[#FF385C]/10 text-[#FF385C] ring-1 ring-[#FF385C]/30'
                                                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                                                    }`}
                                                >
                                                    {opt.icon}
                                                    <span>{opt.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleLogout}
                                        className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-white/5 border-t border-gray-100 dark:border-[#333] mt-1 pt-2"
                                    >
                                        Đăng xuất
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation Menu */}
                {isMobileMenuOpen && (
                  <div
                    ref={mobileMenuRef}
                    className="md:hidden absolute top-20 left-0 right-0 bg-white dark:bg-[#161616] border-b border-gray-200 dark:border-[#2a2a2a] shadow-lg px-6 py-4 z-40 animate-in slide-in-from-top-4 duration-200"
                  >
                    <nav className="flex flex-col gap-2">
                        {navItems.map((item) => {
                            const isActive = pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`px-4 py-3 rounded-xl text-base font-medium transition-all flex items-center justify-between ${isActive
                                      ? 'bg-[#FF385C]/10 text-[#FF385C]'
                                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                                      }`}
                                >
                                    <span>{item.name}</span>
                                    {'badge' in item && item.badge && item.badge > 0 && (
                                        <span className="w-5 h-5 bg-[#FF385C] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>
                  </div>
                )}
            </header>

            {/* Main Content */}
            <main className="pt-[6rem] pb-12 min-h-screen overflow-visible text-gray-900 dark:text-gray-100">
                {children}
            </main>

            {/* Chat nổi chủ nhà ↔ admin */}
            <HostAdminChatWidget />
        </div>
    );
}

export default function HostingLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminThemeProvider>
            <HostingContent>{children}</HostingContent>
        </AdminThemeProvider>
    );
}
