"use client";
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { userAPI, thongBaoAPI, messageAPI } from '@/lib/api';
import { webSocketService } from '@/lib/websocket';
import BackendImage from '@/components/BackendImage';
import Link from 'next/link';
import { getValidSrc } from '@/lib/image';
import { AdminThemeProvider } from '@/context/AdminThemeContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [hostRequestCount, setHostRequestCount] = useState(0);
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Stable userId reference that doesn't change between renders
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    const id = (typeof window !== 'undefined' && localStorage.getItem('adminId')) || '';
    if (id) {
      setUserId(id);

      // Load avatar from localStorage first for immediate display
      const cachedAvatar = typeof window !== 'undefined' && localStorage.getItem('adminAvatar');
      if (cachedAvatar) {
        setUserAvatar(cachedAvatar);
      }

      // Fetch fresh profile
      userAPI.getProfile(Number(id))
        .then(data => {
          if (data.urlAnhDaiDien) {
            setUserAvatar(data.urlAnhDaiDien);
            localStorage.setItem('adminAvatar', data.urlAnhDaiDien);
          }
        })
        .catch(err => console.error('Failed to fetch admin profile', err));

      // Connect WebSocket once — stable connection across route changes
      webSocketService.connect(Number(id), () => {}, () => {});
    }
  }, []); // Only run once on mount

  // Separate effect for notification count — runs on mount AND on route/pathname change
  useEffect(() => {
    if (!userId) return;

    const fetchCounts = () => {
      thongBaoAPI.getCounts(Number(userId))
        .then(data => {
          setHostRequestCount(data.hostRequests ?? 0);
        })
        .catch(err => console.error('Failed to fetch notification counts', err));

      // Số tin nhắn chưa đọc từ các chủ nhà (hội thoại admin trong tin_nhan)
      messageAPI.listAdminThreads(Number(userId))
        .then(threads => {
          const unread = (Array.isArray(threads) ? threads : []).filter((t: any) => t.hasUnread).length;
          setInboxUnreadCount(unread);
        })
        .catch(err => console.error('Failed to fetch inbox unread', err));
    };

    // Fetch immediately on mount / route change
    fetchCounts();

    // Poll every 10s to keep badge updated (faster for real-time feel)
    const interval = setInterval(fetchCounts, 10000);

    // Listen for WebSocket notifications and host request approval events
    const handleHostUpdated = () => fetchCounts();
    window.addEventListener('notifications-updated', handleHostUpdated);
    window.addEventListener('hostRequestApproved', handleHostUpdated);
    window.addEventListener('hostRequestUpdated', handleHostUpdated);
    window.addEventListener('chat-messages-updated', handleHostUpdated);

    // Realtime: chủ nhà nhắn tin → tăng badge hộp thư ngay
    const handleInboxMessage = (e: Event) => {
      const message = (e as CustomEvent).detail;
      if (!message?.isAdminThread) return;
      const adminId = Number(userId);
      const isInvolved = message.nguoiGui?.maNguoiDung === adminId || message.nguoiNhan?.maNguoiDung === adminId;
      if (!isInvolved) return;
      const isMine = message.nguoiGui?.maNguoiDung === adminId;
      if (!isMine) {
        setInboxUnreadCount(prev => prev + 1);
      }
      fetchCounts();
    };
    window.addEventListener('ws-chat-message', handleInboxMessage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('notifications-updated', handleHostUpdated);
      window.removeEventListener('hostRequestApproved', handleHostUpdated);
      window.removeEventListener('hostRequestUpdated', handleHostUpdated);
      window.removeEventListener('chat-messages-updated', handleHostUpdated);
      window.removeEventListener('ws-chat-message', handleInboxMessage);
    };
  }, [userId]); // Don't include pathname — it resets the interval unnecessarily

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Tổng quan', path: '/admin' },
    { name: 'Người dùng', path: '/admin/users' },
    { name: 'Phòng', path: '/admin/listings' },
    { name: 'Thanh toán', path: '/admin/payments' },
    { name: 'Khuyến mãi', path: '/admin/promotions' },
    { name: 'Quy định giá', path: '/admin/pricing-rules' },
    { name: 'Quy định', path: '/admin/regulations' },
    { name: 'Hộp thư', path: '/admin/inbox' },
  ];

  const handleLogout = async () => {
    try {
      const { authAPI } = await import('@/lib/api');
      await authAPI.logout();
    } catch (e) {
      console.error('Admin logout error:', e);
    }
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminId');
    localStorage.removeItem('adminAvatar');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('token');
    router.replace('/');
  };

  return (
    <AdminThemeProvider>
    <div className="min-h-screen bg-[#F7F7F7] dark:bg-[#0d0d0d] transition-colors duration-200">
      {/* Admin Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        isScrolled
          ? 'bg-white dark:bg-[#161616] shadow-sm dark:shadow-black/20 border-b border-transparent dark:border-[#2a2a2a]'
          : 'bg-white dark:bg-[#161616] border-b border-gray-200 dark:border-[#2a2a2a]'
        }`}>
        <div className="admin-container h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 -ml-2 rounded-full text-gray-500 hover:bg-gray-100 md:hidden transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                )}
              </svg>
            </button>

            {/* Logo */}
            <Link href="/admin" className="flex items-center gap-2">
              <svg className="h-8 w-8 text-[#FF385C]" viewBox="0 0 32 32" fill="currentColor">
                <path d="M16 1c2.008 0 3.463.963 4.751 3.269l.533 1.025c1.954 3.83 6.114 12.54 7.1 14.836l.145.353c.667 1.591.91 3.162.726 4.692-.246 2.05-1.453 3.92-3.317 5.154-1.64 1.085-3.653 1.671-5.818 1.671-2.286 0-4.354-.644-6.013-1.827a9.677 9.677 0 0 1-3.657-5.184l-.145-.353C9.29 22.338 13.45 13.628 15.404 9.8l.533-1.026C17.225 6.48 18.68 5.516 20.688 5.516c1.504 0 2.905.586 3.946 1.651 1.04 1.065 1.613 2.48 1.613 3.985 0 1.498-.574 2.913-1.613 3.978-1.04 1.066-2.442 1.652-3.946 1.652-1.46 0-2.82-.55-3.85-1.553l-.175-.179-.175.179c-1.03 1.003-2.39 1.553-3.85 1.553-1.504 0-2.906-.586-3.946-1.652C7.652 14.065 7.08 12.65 7.08 11.152c0-1.505.573-2.92 1.613-3.985C9.733 6.102 11.134 5.516 12.638 5.516c2.008 0 3.463.963 4.751 3.269l.533 1.025c.233.456.483.94.748 1.44L16 1zm0 2c-1.27 0-2.383.638-3.18 2.056l-.52.998c-1.936 3.794-6.095 12.503-7.082 14.801-.59 1.41-.807 2.79-.644 4.146.217 1.81 1.283 3.46 2.928 4.55 1.463.968 3.24 1.449 5.136 1.449 1.91 0 3.69-.492 5.137-1.46 1.645-1.09 2.71-2.74 2.927-4.55.163-1.356-.054-2.736-.644-4.146-.987-2.298-5.146-11.007-7.082-14.8l-.521-1C18.383 3.638 17.27 3 16 3zm4.688 4.516c.96 0 1.854.374 2.518 1.054.664.68 1.03 1.584 1.03 2.543 0 .96-.366 1.863-1.03 2.543-.664.68-1.558 1.054-2.518 1.054-.92 0-1.78-.345-2.43-1.005l-.088-.093-.088.093c-.65.66-1.51 1.005-2.43 1.005-.96 0-1.854-.374-2.518-1.054-.664-.68-1.03-1.584-1.03-2.543 0-.96.366-1.863 1.03-2.543.664-.68 1.558-1.054 2.518-1.054 1.27 0 2.383.638 3.18 2.056l.52.998c.148.29.306.596.472.913.166-.317.324-.623.472-.913l.52-.998c.797-1.418 1.91-2.056 3.18-2.056z"></path>
              </svg>
              <span className="text-[#FF385C] text-xl font-bold tracking-tight hidden sm:block">ngpngyn.haneul <span className="text-gray-800 dark:text-gray-100 font-semibold">admin</span></span>
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
                  {item.name === 'Người dùng' && hostRequestCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                      {hostRequestCount > 9 ? '9+' : hostRequestCount}
                    </span>
                  )}
                  {item.name === 'Hộp thư' && inboxUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#FF385C] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm animate-pulse">
                      {inboxUnreadCount > 9 ? '9+' : inboxUnreadCount}
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
              {hostRequestCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full border-2 border-white"></span>
              )}
            </button>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all relative"
              >
                {userAvatar ? (
                  <BackendImage src={getValidSrc(userAvatar)} alt="Admin avatar" fill className="object-cover" sizes="40px" />
                ) : (
                  <div className="w-full h-full bg-gray-900 text-white flex items-center justify-center">
                    <span className="text-sm font-medium">A</span>
                  </div>
                )}
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1e1e1e] rounded-xl shadow-lg border border-gray-100 dark:border-[#333] py-2 animate-in fade-in slide-in-from-top-2">
                  <Link href="/admin/settings" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5">
                    Cài đặt
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-white/5"
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
                    className={`px-4 py-3 rounded-xl text-base font-medium transition-all ${isActive
                      ? 'bg-[#FF385C]/10 text-[#FF385C]'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                      }`}
                  >
                    {item.name}
                    {item.name === 'Hộp thư' && inboxUnreadCount > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-[#FF385C] text-white text-[10px] font-bold rounded-full">
                        {inboxUnreadCount > 9 ? '9+' : inboxUnreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content — pt = header (5rem) + khoảng cách dưới nav */}
      <main className="pt-[6rem] pb-12 min-h-screen overflow-visible text-gray-900 dark:text-gray-100">
        {children}
      </main>
    </div>
    </AdminThemeProvider>
  );
}
