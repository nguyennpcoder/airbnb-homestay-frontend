'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import BackendImage from '@/components/BackendImage';
import Link from 'next/link';
import SearchBar from './SearchBar';
import HostRequestModal from './HostRequestModal';
import { getValidSrc } from '@/lib/image';

// Icons - using SVG as fallback until react-icons is installed
type IconProps = { className?: string };

const FiGlobe = ({ className }: IconProps) => (
  <svg className={`w-5 h-5 ${className || ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

const FiMenu = ({ className }: IconProps) => (
  <svg className={`w-5 h-5 ${className || ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const FiHome = ({ className }: IconProps) => (
  <svg className={`w-5 h-5 ${className || ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const FiLightbulb = ({ className }: IconProps) => (
  <svg className={`w-5 h-5 ${className || ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const FiBell = ({ className }: IconProps) => (
  <svg className={`w-5 h-5 ${className || ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const FiSearch = ({ className }: IconProps) => (
  <svg className={`w-5 h-5 ${className || ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

interface HeaderUser {
  maNguoiDung?: number | string;
  hoTen?: string;
  email?: string;
  urlAnhDaiDien?: string | null;
  laChuNha?: boolean;
  source?: 'backend' | 'social';
}

const getSocialProfileFromStorage = (): HeaderUser | null => {
  if (typeof window === 'undefined') return null;
  const storedAvatar = localStorage.getItem('userAvatar');
  const storedEmail = localStorage.getItem('userEmail') || undefined;
  const displayName = localStorage.getItem('userDisplayName') || storedEmail?.split('@')[0];
  if (storedAvatar || storedEmail || displayName) {
    return {
      hoTen: displayName || 'Khách',
      email: storedEmail,
      urlAnhDaiDien: storedAvatar,
      maNguoiDung: localStorage.getItem('userId') || undefined,
      source: 'social',
    };
  }
  return null;
};

export default function Header() {
  const [activeTab, setActiveTab] = useState('noi_luu_tru');
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [showHostModal, setShowHostModal] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // Listen for real-time profile updates (host approval/rejection)
  useEffect(() => {
    const handleProfileUpdate = async () => {
      const userId = localStorage.getItem('userId');
      if (!userId || !/^\d+$/.test(userId)) return;
      try {
        const { userAPI } = await import('@/lib/api');
        const data = await userAPI.getProfile(Number(userId));
        setUser(prev => prev ? { ...prev, ...data, laChuNha: data.laChuNha } : data);
      } catch {}
    };

    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, []);

  // Load user for header avatar - re-run on pathname change to catch login/redirects
  useEffect(() => {
    const fetchUser = async () => {
      if (typeof window === 'undefined') return;

      const userId = localStorage.getItem('userId');
      if (!userId) {
        setUser(null);
        return;
      }

      const socialProfile = getSocialProfileFromStorage();

      if (!/^\d+$/.test(userId)) {
        setUser(socialProfile);
        return;
      }

      try {
        const { userAPI } = await import('@/lib/api');
        const data = await userAPI.getProfile(Number(userId));

        setUser({
          ...data,
          urlAnhDaiDien: data.urlAnhDaiDien || socialProfile?.urlAnhDaiDien || null,
          source: 'backend',
        });
      } catch (error: any) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem('userId');
          localStorage.removeItem('userAvatar');
          localStorage.removeItem('userDisplayName');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('isAdmin');
          setUser(null);
          return;
        }
        if (socialProfile) {
          setUser(socialProfile);
        }
      }
    };

    fetchUser();
  }, [pathname]); // Re-run on route change to catch login redirects

  // Animated indicator state
  const navRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [indicator, setIndicator] = useState<{ width: number; left: number }>({ width: 0, left: 0 });

  // Intro video visibility per tab
  const [showIntroVideo, setShowIntroVideo] = useState<Record<string, boolean>>({
    noi_luu_tru: true,
    trai_nghiem: true,
    dich_vu: true,
  });

  const updateIndicator = () => {
    requestAnimationFrame(() => {
      const keys = ['noi_luu_tru', 'trai_nghiem', 'dich_vu'];
      const idx = keys.indexOf(activeTab);
      const el = tabRefs.current[idx];
      if (el && navRef.current) {
        const navRect = navRef.current.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        setIndicator({ width: elRect.width, left: elRect.left - navRect.left });
      }
    });
  };

  useEffect(() => {
    updateIndicator();
    // Add a small timeout to handle font loading or layout shifts
    const timer = setTimeout(updateIndicator, 50);
    return () => clearTimeout(timer);
  }, [activeTab, pathname]);

  useEffect(() => {
    const onResize = () => updateIndicator();
    window.addEventListener('resize', onResize);
    // Initial update
    updateIndicator();
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Sync active tab with current route
  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith('/experiences')) {
      setActiveTab('trai_nghiem');
    } else if (pathname.startsWith('/services')) {
      setActiveTab('dich_vu');
    } else {
      setActiveTab('noi_luu_tru');
    }
  }, [pathname]);

  // Scroll detection
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (pathname?.startsWith('/admin') || pathname?.startsWith('/hosting')) return null;

  // Only show search bar on these exact paths or sub-paths if needed
  // User requested: "chỉ hiển thị duy nhất 3 page là nơi lưu trú, trải nghiệm, dịch vụ"
  // Nơi lưu trú = '/'
  // Trải nghiệm = '/experiences'
  // Dịch vụ = '/services'
  const ALLOWED_SEARCH_PATHS = ['/', '/experiences', '/services'];
  const showSearchBar = pathname && (pathname === '/' || pathname.startsWith('/experiences') || pathname.startsWith('/services'));

  const isProductPage = pathname?.startsWith('/phong/');
  const isScrolledOrProduct = isScrolled || isProductPage;
  const isProfilePage = pathname?.startsWith('/profile');

  return (
    <header className={`${isProductPage ? 'absolute' : 'fixed'} top-0 left-0 right-0 bg-white z-50 transition-all duration-300 ${isScrolled && !isProfilePage ? 'shadow-md border-b border-gray-200' : ''}`}>
      <div className="container-custom">
        <div className={`flex items-center justify-between transition-all duration-300 ${isScrolledOrProduct || !showSearchBar ? 'h-16 md:h-20' : 'h-20 md:h-24'}`}>
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1 transition-transform duration-200 ease-out hover:scale-[1.02] flex-shrink-0 group">
            <div className="text-[#FF385C]">
              <svg className="block h-8 w-auto fill-current" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false">
                <path d="M16 1c2.008 0 3.463.963 4.751 3.269l.533 1.025c1.954 3.83 6.114 12.54 7.1 14.836l.145.353c.667 1.591.91 3.162.726 4.692-.246 2.05-1.453 4.192-3.689 5.48-1.508.869-3.32 1.345-5.566 1.345-2.246 0-4.058-.476-5.566-1.345-2.236-1.288-3.443-3.43-3.689-5.48-.184-1.53.059-3.101.726-4.692l.145-.353c.986-2.296 5.146-11.006 7.1-14.836l.533-1.025C12.537 1.963 13.992 1 16 1zm0 2c-1.239 0-2.053.539-2.987 2.211-.065.116-.133.238-.2.361-.23.419-4.27 7.64-6.196 11.588l-.164.35c-.566 1.35-.77 2.66-.61 3.992.19 1.576 1.135 3.235 2.87 4.234 1.173.676 2.614 1.064 4.287 1.064 1.673 0 3.114-.388 4.287-1.064 1.735-.999 2.68-2.658 2.87-4.234.16-1.332-.044-2.642-.61-3.992l-.164-.35c-1.926-3.948-5.966-11.169-6.196-11.588-.067-.123-.135-.245-.2-.361C18.053 3.539 17.239 3 16 3zm0 13.04c2.02 0 3.659 1.623 3.659 3.625 0 2.001-1.639 3.625-3.659 3.625-2.02 0-3.659-1.624-3.659-3.625 0-2.002 1.639-3.625 3.659-3.625zm0 2c-1.01 0-1.83 1.02-1.83 2.279 0 1.259.82 2.279 1.83 2.279 1.01 0 1.83-1.02 1.83-2.279 0-1.259-.82-2.279-1.83-2.279z"></path>
              </svg>
            </div>
            <span className="text-xl font-bold text-[#FF385C] hidden lg:block tracking-tighter">ngpngyn.haneul</span>
          </Link>

          {/* Middle Section: Navigation Tabs OR Compact Search Bar */}
          <div className="flex-1 flex justify-center px-8">
            {(showSearchBar && isScrolledOrProduct) ? (
              /* Compact Search Bar - Professional design inspired by Airbnb */
              <button
                onClick={() => router.push('/search')}
                className="group flex items-center w-full md:w-auto min-w-0 md:min-w-[360px] lg:min-w-[420px] bg-white border border-gray-200/80 rounded-full shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer divide-x divide-gray-200"
              >
                <div className="flex-1 px-5 py-2.5 text-left">
                  <span className="block text-[13px] font-semibold text-gray-900 leading-tight">Bạn sẽ đi đâu?</span>
                  <span className="block text-[12px] text-gray-500 leading-tight mt-0.5">Bất kỳ đâu · Bất kỳ tuần nào</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2.5">
                  <div className="w-8 h-8 bg-[#FF385C] rounded-full flex items-center justify-center text-white group-hover:bg-[#E31C5F] transition-colors duration-200 shadow-sm group-hover:shadow-md">
                    <FiSearch className="w-3.5 h-3.5" />
                  </div>
                </div>
              </button>
            ) : (
              /* Navigation Tabs */
              <nav ref={navRef} className="relative hidden md:flex items-end gap-0 justify-center pb-1">
                {[
                  { key: 'noi_luu_tru', href: '/', label: 'Nơi lưu trú', img: '/header1.avif', video: '/house-twirl-selected.webm' },
                  { key: 'trai_nghiem', href: '/experiences', label: 'Trải nghiệm', img: '/header2.avif', video: '/balloon-twirl.webm', badge: 'MỚI' },
                  { key: 'dich_vu', href: '/services', label: 'Dịch vụ', img: '/header3.avif', video: '/consierge-twirl.webm', badge: 'MỚI' },
                ].map((tab, idx) => (
                  <Link
                    key={tab.key}
                    href={tab.href}
                    ref={(el) => {
                      tabRefs.current[idx] = el;
                    }}
                    onClick={() => setActiveTab(tab.key)}
                    className="relative flex items-center group px-0 mx-2"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="relative w-[3.5rem] h-[3.5rem] transition-transform duration-300 ease-out group-hover:translate-y-[-2px] group-hover:scale-[1.03]">
                        {showIntroVideo[tab.key] ? (
                          <video
                            src={tab.video}
                            autoPlay
                            muted
                            playsInline
                            className="absolute inset-0 w-full h-full object-contain"
                            onEnded={() => setShowIntroVideo((s) => ({ ...s, [tab.key]: false }))}
                          />
                        ) : (
                          <BackendImage
                            src={tab.img}
                            alt={tab.label}
                            fill
                            className="object-contain opacity-0 transition-opacity duration-500"
                            onLoad={(event) => {
                              const img = event.target as HTMLImageElement;
                              img.classList.remove('opacity-0');
                            }}
                          />
                        )}
                      </div>
                      <span className={`text-[15px] transition-colors duration-300 ease-out ${activeTab === tab.key ? 'font-semibold text-black' : 'text-gray-600 group-hover:text-black'}`}>{tab.label}</span>
                    </div>
                    {tab.badge && (
                      <span className="absolute -top-1 -right-2 bg-[#FF385C] text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold">
                        {tab.badge}
                      </span>
                    )}
                  </Link>
                ))}

                {/* Shared animated indicator */}
                <span
                  className="absolute bottom-2 h-[2.5px] bg-black rounded-full transition-[left,width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ width: `${indicator.width}px`, left: `${indicator.left}px` }}
                />
              </nav>
            )}
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4 flex-shrink-0">
            {user?.laChuNha ? (
              <Link
                href="/hosting"
                className="hidden md:block px-4 py-2 rounded-full hover:bg-gray-100 transition-colors text-sm font-semibold"
              >
                Chế độ chủ nhà
              </Link>
            ) : user ? (
              <button
                onClick={() => setShowHostModal(true)}
                className="hidden md:block px-4 py-2 rounded-full hover:bg-gray-100 transition-colors text-sm font-semibold"
              >
                Trở thành host
              </button>
            ) : null}
            <button className="hidden md:block p-2 rounded-full hover:bg-gray-100 transition-colors active:scale-95">
              <FiGlobe />
            </button>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center space-x-2 px-2 py-1 border border-gray-300 rounded-full hover:shadow-md transition-all duration-200 active:scale-95 bg-white"
              >
                <div className="pl-2">
                  <FiMenu />
                </div>
                {user?.urlAnhDaiDien ? (
                  <div className="w-8 h-8 rounded-full overflow-hidden relative border border-gray-200">
                    <BackendImage
                      src={getValidSrc(user.urlAnhDaiDien)}
                      alt={user.hoTen || 'User'}
                      fill
                      className="object-cover"
                      sizes="32px"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false"><path d="M16 .7C7.56.7.7 7.56.7 16S7.56 31.3 16 31.3 31.3 24.44 31.3 16 24.44.7 16 .7zm0 28c-4.02 0-7.6-1.88-9.93-4.81a12.43 12.43 0 0 1 6.45-4.4A6.5 6.5 0 0 1 9.5 14a6.5 6.5 0 0 1 13 0 6.51 6.51 0 0 1-3.02 5.5 12.42 12.42 0 0 1 6.45 4.4c-2.33 2.93-5.91 4.8-9.93 4.8z"></path></svg>
                  </div>
                )}
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-[280px] bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden origin-top-right transition-[opacity,transform] duration-200 ease-out opacity-100 translate-y-0 scale-100">
                  {/* Menu Items */}
                  <div className="py-2">
                    {/* Trung tâm trợ giúp */}
                    <Link
                      href="/help"
                      onClick={() => setShowMenu(false)}
                      className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="font-medium text-gray-900">Trung tâm trợ giúp</span>
                    </Link>

                    {/* Divider */}
                    <div className="border-t border-gray-200 my-2"></div>

                    {/* Host section - only show when logged in */}
                    {user && (
                      <>
                        <div className="px-4 py-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {user?.laChuNha ? (
                                <>
                                  <Link
                                    href="/hosting"
                                    onClick={() => setShowMenu(false)}
                                    className="block font-semibold text-gray-900 mb-1 hover:text-gray-700"
                                  >
                                    Chế độ chủ nhà
                                  </Link>
                                  <p className="text-sm text-gray-600">
                                    Quản lý nhà/phòng cho thuê, lịch đặt phòng và tin nhắn của bạn.
                                  </p>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => { setShowHostModal(true); setShowMenu(false); }}
                                    className="block w-full text-left font-semibold text-gray-900 mb-1 hover:text-gray-700"
                                  >
                                    Trở thành host
                                  </button>
                                  <p className="text-sm text-gray-600">
                                    Bắt đầu đón tiếp khách và kiếm thêm thu nhập thật dễ dàng.
                                  </p>
                                </>
                              )}
                            </div>
                            <div className="ml-4 flex-shrink-0">
                              <div className="w-16 h-16 bg-gradient-to-br from-pink-100 to-pink-200 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.02]">
                                <svg className="w-8 h-8 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Giới thiệu host */}
                        <Link
                          href="/host/intro"
                          onClick={() => setShowMenu(false)}
                          className="block px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700"
                        >
                          Giới thiệu host
                        </Link>

                        {/* Tìm host hỗ trợ */}
                        <Link
                          href="/host/support"
                          onClick={() => setShowMenu(false)}
                          className="block px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700"
                        >
                          Tìm host hỗ trợ
                        </Link>

                        {/* Divider */}
                        <div className="border-t border-gray-200 my-2"></div>
                      </>
                    )}

                    {user ? (
                      <>
                        <Link
                          href="/profile"
                          onClick={() => setShowMenu(false)}
                          className="block px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700"
                        >
                          Hồ sơ của tôi
                        </Link>
                        <Link
                          href="/settings"
                          onClick={() => setShowMenu(false)}
                          className="block px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700"
                        >
                          Cài đặt tài khoản
                        </Link>
                        <button
                          onClick={async () => {
                            try {
                              const { authAPI } = await import('@/lib/api');
                              await authAPI.logout();
                            } catch (e) {
                              console.error('Logout error:', e);
                            }
                            // Clear local session data
                            localStorage.removeItem('userId');
                            localStorage.removeItem('userAvatar');
                            localStorage.removeItem('userDisplayName');
                            localStorage.removeItem('userEmail');
                            localStorage.removeItem('isAdmin');
                            localStorage.removeItem('token');
                            setUser(null);
                            setShowMenu(false);
                            // Redirect to homepage
                            window.location.href = '/';
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700 active:scale-[0.99]"
                        >
                          Đăng xuất
                        </button>
                      </>
                    ) : (
                      <Link
                        href="/login"
                        onClick={() => setShowMenu(false)}
                        className="block px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700"
                      >
                        Đăng nhập hoặc đăng ký
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Full Search Bar (Collapsible) */}
        {showSearchBar && (
          <div
            className={`transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isScrolledOrProduct ? 'h-0 opacity-0 scale-95 pointer-events-none overflow-hidden' : 'h-16 md:h-20 opacity-100 scale-100'
              }`}
          >
            <SearchBar />
          </div>
        )}
      </div>

      {/* Host Request Modal */}
      <HostRequestModal
        isOpen={showHostModal}
        onClose={() => setShowHostModal(false)}
        userId={user?.maNguoiDung || ''}
        userName={user?.hoTen}
      />
    </header>
  );
}
