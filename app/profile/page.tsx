'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import BackendImage from '@/components/BackendImage';
import { useSearchParams, useRouter } from 'next/navigation';
import FavoritesList from '@/components/FavoritesList';
import TripsList from '@/components/TripsList';
import MessagesPanel from '@/components/MessagesPanel';
import { userAPI, User, wishlistAPI, thongBaoAPI, messageAPI, paymentAPI, quyDinhAPI, QuyDinh, chinhSachHuyAPI, ChinhSachHoanTien, reviewsAPI } from '@/lib/api';
import { webSocketService } from '@/lib/websocket';
import { ProfileSkeleton } from '@/components/ProfileSkeleton';
import WalletCard from '@/components/WalletCard';
import TransactionListModal from '@/components/modals/TransactionListModal';

import { getValidSrc } from '@/lib/image';

// ────────────────────────── Transaction type ──────────────────────────
interface WalletTransaction {
  id: string;
  type: 'payment' | 'refund' | 'topup';
  title: string;
  date: string;
  amount: number;
  provider?: string;
}

function ProfileContent() {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('tab') || 'menu';
  const hostIdParam = searchParams.get('hostId');
  const targetHostId = hostIdParam ? Number(hostIdParam) : null;
  const roomIdParam = searchParams.get('roomId');
  const targetRoomId = roomIdParam ? Number(roomIdParam) : null;
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userReviews, setUserReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  const fetchProfile = async () => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      try {
        const data = await userAPI.getProfile(Number(userId));
        setProfile(data);
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  // Connect WebSocket for real-time profile updates (host approval/rejection)
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    const uid = Number(userId);

    const onChatMessage = () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('chat-messages-updated'));
      }
    };

    webSocketService.connect(uid, onChatMessage, () => {});

    // Debounced profile refresh — avoids re-fetching on every single notification
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchProfile(), 500);
    };

    window.addEventListener('profile-updated', debouncedFetch);
    window.addEventListener('notifications-updated', debouncedFetch);

    // Polling fallback: re-fetch profile every 15s in case WebSocket is not connected
    const pollInterval = setInterval(() => fetchProfile(), 15000);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      clearInterval(pollInterval);
      window.removeEventListener('profile-updated', debouncedFetch);
      window.removeEventListener('notifications-updated', debouncedFetch);
      webSocketService.removeMessageHandler(uid, onChatMessage);
    };
  }, []);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    const fetchCount = async () => {
      try {
        const data = await messageAPI.unreadCount(Number(userId), 'guest');
        if (data.unreadMessages !== undefined) setUnreadCount(data.unreadMessages);
      } catch (err) {
        // console.error("Error fetching unread count", err);
      }
    };
    fetchCount();

    // Refresh on any relevant event
    const handleUpdate = () => fetchCount();
    window.addEventListener('notifications-updated', handleUpdate);
    window.addEventListener('chat-messages-updated', handleUpdate);

    // Polling fallback: re-fetch every 10s to stay in sync
    const pollInterval = setInterval(fetchCount, 10000);

    return () => {
      window.removeEventListener('notifications-updated', handleUpdate);
      window.removeEventListener('chat-messages-updated', handleUpdate);
      clearInterval(pollInterval);
    };
  }, []);

  // Fetch favorites count — refresh every time the user visits the yeu-thich tab
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    wishlistAPI.getCount(Number(userId))
      .then(count => setFavoritesCount(count))
      .catch(() => {});
  }, [activeTab]);

  // Force refresh profile when switching to vi tab to get latest wallet balance
  useEffect(() => {
    if (activeTab === 'vi') {
      fetchProfile();
      fetchTransactions();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'yeu-thich' && favorites.length === 0) {
      const userId = localStorage.getItem('userId');
      if (userId) {
        setLoadingFavorites(true);
        wishlistAPI.list(Number(userId))
          .then(data => {
            setFavorites(data || []);
            setLoadingFavorites(false);
          })
          .catch(() => setLoadingFavorites(false));
      }
    }
  }, [activeTab]);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      setLoadingReviews(true);
      reviewsAPI.listByUser(Number(userId))
        .then(data => {
          if (Array.isArray(data)) setUserReviews(data);
          setLoadingReviews(false);
        })
        .catch(err => {
          console.error("Error fetching user reviews", err);
          setLoadingReviews(false);
        });
    }
  }, []);

  // ────────────────────────── Fetch transactions ──────────────────────────
  const fetchTransactions = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    setLoadingTransactions(true);
    try {
      const payments = await paymentAPI.getByUser(Number(userId));
      const txns: WalletTransaction[] = [];

      if (Array.isArray(payments)) {
        payments.forEach((p: any) => {
          const phongName = p?.booking?.phong?.tieuDe || 'Phòng';
          const status = p?.status?.toUpperCase?.() || '';
          const amount = Math.abs(p?.amount || 0);
          const date = p?.paymentDate || '';
          const provider = p?.provider || '';

          if (status === 'HOAN_TIEN') {
            txns.push({
              id: `refund-${p.id}`,
              type: 'refund',
              title: `Hoàn tiền: ${phongName}`,
              date,
              amount,
              provider,
            });
          } else if (status === 'DA_XAC_NHAN') {
            txns.push({
              id: `pay-${p.id}`,
              type: 'payment',
              title: `Thanh toán ${phongName}`,
              date,
              amount,
              provider,
            });
          }
        });
      }

      txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(txns);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  if (loading) return <ProfileSkeleton />;

  const firstName = profile?.hoTen?.split(' ')[0] || '';
  const setActiveTab = (tab: string) => {
    if (tab === 'gioi-thieu') {
      router.push('/profile?tab=gioi-thieu');
    } else {
      router.push(`/profile?tab=${tab}`);
    }
  };

  // ────────────────────────── Profile completion calculation ──────────────────────────
  const completionFields = [
    { key: 'hoTen', label: 'Tên', done: !!profile?.hoTen },
    { key: 'email', label: 'Email', done: !!profile?.email },
    { key: 'soDienThoai', label: 'SĐT', done: !!(profile as any)?.soDienThoai },
    { key: 'urlAnhDaiDien', label: 'Ảnh đại diện', done: !!profile?.urlAnhDaiDien },
    { key: 'xacMinhDanhTinh', label: 'Xác minh danh tính', done: !!profile?.xacMinhDanhTinh },
    { key: 'gioiThieu', label: 'Giới thiệu', done: !!(profile as any)?.gioiThieu },
  ];
  const completionPercent = Math.round((completionFields.filter(f => f.done).length / completionFields.length) * 100);
  const remainingSteps = completionFields.filter(f => !f.done).length;
  const joinDate = profile?.ngayTao ? new Date(profile.ngayTao) : new Date();
  const joinMonth = joinDate.getMonth() + 1;
  const joinYear = joinDate.getFullYear();

  const navItems = [
    { key: 'gioi-thieu', label: 'Cá nhân', icon: <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden relative mr-3">{profile?.urlAnhDaiDien ? <BackendImage src={getValidSrc(profile.urlAnhDaiDien)} alt="P" fill className="object-cover" sizes="24px" /> : <span className="flex items-center justify-center h-full text-[10px] font-bold">{firstName.charAt(0)}</span>}</div> },
    { key: 'chuyen-di', label: 'Chuyến đi', icon: <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
    { key: 'nhan-tin', label: 'Tin nhắn', icon: <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 10c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 18l1.395-3.72C3.512 13.042 3 11.574 3 10c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>, badge: unreadCount },
    { key: 'yeu-thich', label: 'Yêu thích', icon: <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>, badge: favoritesCount },
    { key: 'vi', label: 'Ví', icon: <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> },
    { key: 'noi-quy', label: 'Nội quy', icon: <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
  ];

  const formatTransactionDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      if (diff < 86400000 && now.getDate() === d.getDate()) {
        return `Hôm nay, ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
      }
      if (diff < 172800000 && now.getDate() - d.getDate() === 1) {
        return `Hôm qua, ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
      }
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const displayedTransactions = transactions.slice(0, 4);

  return (
    <div className="min-h-screen bg-white">
      <div className="pt-20 pb-24 md:pb-12">
        <div className="container-custom">
          {/* Mobile Menu View */}
          <div className={`${activeTab !== 'menu' && activeTab !== '' ? 'hidden md:block' : 'block'} md:hidden`}>
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Hồ sơ</h1>
              <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden relative">
                <BackendImage src={getValidSrc(profile?.urlAnhDaiDien)} alt="P" fill className="object-cover" />
              </div>
            </div>

            <div className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className="w-full flex items-center justify-between py-4 border-b border-gray-100 last:border-0 active:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    {item.icon}
                    <span className="text-lg text-gray-800">{item.label}</span>
                  </div>
                  <div className="flex items-center">
                    {item.badge ? <span className="mr-3 bg-[#FF385C] text-white text-xs font-bold px-2 py-0.5 rounded-full">{item.badge}</span> : null}
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </button>
              ))}
              {profile?.laChuNha && !profile?.laAdmin && (
                <Link href="/hosting" className="w-full flex items-center justify-between py-4 border-b border-gray-100 last:border-0 active:bg-gray-50 transition-colors">
                  <div className="flex items-center">
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    <span className="text-lg text-gray-800">Chế độ chủ nhà</span>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-8">
            <div className="hidden md:block w-64 flex-shrink-0 sticky top-24 h-fit">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Hồ sơ</h1>
              <nav className="space-y-2">
                {navItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors text-left ${activeTab === item.key || (item.key === 'gioi-thieu' && (activeTab === 'menu' || activeTab === '')) ? 'bg-gray-100 font-semibold text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    {item.badge ? <span className="bg-[#FF385C] text-white text-xs font-bold px-2 py-0.5 rounded-full">{item.badge}</span> : null}
                  </button>
                ))}
                {profile?.laChuNha && !profile?.laAdmin && (
                  <Link
                    href="/hosting"
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors text-left text-gray-600 hover:bg-gray-50 mt-4 border border-dashed border-gray-200"
                  >
                    <div className="flex items-center">
                      <svg className="w-6 h-6 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                      <span className="font-semibold">Chế độ chủ nhà</span>
                    </div>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </Link>
                )}
              </nav>
            </div>

            <div className={`flex-1 min-w-0 ${activeTab === 'menu' || activeTab === '' ? 'hidden md:block' : 'block'}`}>
              <div className="md:hidden flex items-center mb-6">
                <button onClick={() => setActiveTab('menu')} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                  <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h2 className="text-xl font-bold text-gray-900 ml-2">
                  {navItems.find(i => i.key === activeTab)?.label || 'Chi tiết'}
                </h2>
              </div>

              {/* ═══════════════════════ TAB: Giới thiệu ═══════════════════════ */}
              {(activeTab === 'gioi-thieu' || activeTab === 'menu' || activeTab === '') && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* ──── Giới thiệu bản thân ──── */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
                    <div className="flex items-start justify-between mb-8">
                      <h2 className="text-2xl font-bold text-gray-900">Giới thiệu bản thân</h2>
                      <Link href="/profile/edit" className="text-[#FF385C] hover:underline font-semibold text-sm">Chỉnh sửa</Link>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
                      <div className="relative flex-shrink-0">
                        <div className="w-28 h-28 rounded-full overflow-hidden relative shadow-xl" style={{ background: 'linear-gradient(135deg, #FF385C 0%, #BD1E59 50%, #6F019C 100%)', padding: '3px' }}>
                          <div className="w-full h-full rounded-full overflow-hidden bg-white relative">
                            <BackendImage src={getValidSrc(profile?.urlAnhDaiDien)} alt="P" fill className="object-cover" sizes="112px" />
                          </div>
                        </div>
                        {profile?.xacMinhDanhTinh && (
                          <span className="absolute bottom-1 right-1 flex items-center justify-center w-8 h-8 rounded-full bg-[#FF385C] border-2 border-white shadow-md">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <div className="text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                          <h3 className="text-2xl font-bold text-gray-900">{profile?.hoTen || 'Chưa có tên'}</h3>
                        </div>
                        <div className="flex items-center justify-center sm:justify-start gap-2 mb-3 flex-wrap">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-sm font-semibold text-gray-700">
                            {profile?.laAdmin ? (
                              <>
                                <svg className="w-3.5 h-3.5 text-purple-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                Quản trị viên
                              </>
                            ) : profile?.laChuNha ? (
                              <>
                                <svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                Chủ nhà
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                Khách
                              </>
                            )}
                          </span>
                          <span className="text-sm text-gray-400">Đã tham gia từ tháng {joinMonth}/{joinYear}</span>
                        </div>
                        {(profile?.thanhPhoSong || profile?.congViec) && (
                          <div className="flex items-center justify-center sm:justify-start gap-2 mb-3 flex-wrap">
                            {profile?.thanhPhoSong && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-sm font-medium text-gray-600">
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                {profile.thanhPhoSong}
                              </span>
                            )}
                            {profile?.congViec && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-sm font-medium text-gray-600">
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                {profile.congViec}
                              </span>
                            )}
                          </div>
                        )}
                        {(profile as any)?.gioiThieu && (
                          <p className="text-sm text-gray-600 leading-relaxed mb-3 italic">
                            {(profile as any).gioiThieu}
                          </p>
                        )}
                        <div className="flex items-center justify-center sm:justify-start gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4 text-[#FF385C]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                            {userReviews.length} đánh giá
                          </span>
                          {profile?.xacMinhDanhTinh && (
                            <span className="flex items-center gap-1 text-[#FF385C]">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                              Đã xác minh danh tính
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ──── Độ hoàn thiện hồ sơ ──── */}
                  {(() => {
                    const checks = [
                      { label: 'Họ tên', done: !!profile?.hoTen },
                      { label: 'Ảnh đại diện', done: !!profile?.urlAnhDaiDien },
                      { label: 'Số điện thoại', done: !!(profile as any)?.soDienThoai },
                      { label: 'Xác minh danh tính', done: !!profile?.xacMinhDanhTinh },
                      { label: 'Xác nhận email', done: !!profile?.emailDaXacNhan },
                      { label: 'Nhận tin tiếp thị', done: !!(profile as any)?.nhanTinNhanTiepThi },
                    ];
                    const doneCount = checks.filter(c => c.done).length;
                    const percent = Math.round((doneCount / checks.length) * 100);
                    return (
                      <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold text-gray-900">Độ hoàn thiện hồ sơ</h3>
                          <span className="text-sm font-bold text-[#FF385C]">{percent}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full mb-5 overflow-hidden">
                          <div className="h-full bg-[#FF385C] rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {checks.map((c, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${c.done ? 'bg-green-100' : 'bg-gray-100'}`}>
                                {c.done ? (
                                  <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                ) : (
                                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                )}
                              </div>
                              <span className={`text-sm ${c.done ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{c.label}</span>
                            </div>
                          ))}
                        </div>
                        {percent < 100 && (
                          <Link href="/profile/edit" className="mt-6 inline-block w-full sm:w-auto text-center bg-black text-white font-bold px-8 py-3 rounded-xl transition-transform active:scale-95 shadow-md">Bắt đầu hoàn thiện</Link>
                        )}
                      </div>
                    );
                  })()}

                  {/* ──── Đánh giá của bạn ──── */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        <h3 className="text-lg font-bold text-gray-900">Đánh giá của bạn</h3>
                      </div>
                      {userReviews.length > 0 && (
                        <button className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">Xem tất cả</button>
                      )}
                    </div>
                    {loadingReviews ? (
                      <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-[#FF385C] border-t-transparent rounded-full animate-spin"></div></div>
                    ) : userReviews.length > 0 ? (
                      <div className="space-y-4">
                        {userReviews.map((review: any) => (
                          <div
                            key={review.maDanhGia}
                            onClick={() => review.maSanPham && router.push(`/phong/${review.maSanPhong || review.maSanPham}?scrollToReview=${review.maDanhGia}`)}
                            className={`flex gap-4 p-4 rounded-xl border border-gray-100 transition-all hover:shadow-md hover:border-gray-200 ${review.maSanPham ? 'cursor-pointer' : ''}`}
                          >
                            {review.urlAnhPhong && (
                              <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 relative bg-gray-100">
                                <Image
                                  src={getValidSrc(review.urlAnhPhong)}
                                  alt={review.tieuDePhong || 'Phòng'}
                                  fill
                                  className="object-cover"
                                  sizes="80px"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              {review.tieuDePhong && (
                                <p className="text-sm font-semibold text-gray-900 truncate mb-1">{review.tieuDePhong}</p>
                              )}
                              <div className="flex items-center gap-2 mb-2">
                                <div className="flex text-[#FF385C]">
                                  {[...Array(5)].map((_, i) => (
                                    <svg key={i} className={`w-3.5 h-3.5 fill-current ${i < Math.round(review.diemSo) ? '' : 'text-gray-200'}`} viewBox="0 0 32 32"><path d="M15.094 1.579l-4.124 8.885-9.86 1.27a1 1 0 0 0-.54 1.736l7.293 6.815-1.991 9.692a1 1 0 0 0 1.488 1.081L16 24.248l8.64 4.81a1 1 0 0 0 1.488-1.08l-1.991-9.693 7.293-6.815a1 1 0 0 0-.54-1.735l-9.86-1.271-4.127-8.885a1 1 0 0 0-1.798 0z"></path></svg>
                                  ))}
                                </div>
                                <span className="text-xs font-semibold text-gray-500">{review.diemSo?.toFixed(1)}</span>
                                <span className="text-xs text-gray-300">·</span>
                                <span className="text-xs text-gray-400">{new Date(review.ngayTao).toLocaleDateString('vi-VN')}</span>
                              </div>
                              {review.binhLuan && (
                                <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{review.binhLuan}</p>
                              )}
                            </div>
                            {review.maSanPham && (
                              <div className="flex-shrink-0 self-center">
                                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                        <h4 className="font-bold text-gray-900 mb-1">Bạn chưa có đánh giá nào.</h4>
                        <p className="text-sm text-gray-500 mb-4 max-w-xs mx-auto leading-relaxed">Sau mỗi chuyến đi, những đánh giá của bạn sẽ xuất hiện tại đây để chia sẻ kinh nghiệm cho cộng đồng.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'chuyen-di' && profile?.maNguoiDung && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900 mb-8 border-b pb-4">Chuyến đi của bạn</h2>
                  <TripsList userId={profile.maNguoiDung} />
                </div>
              )}

              {activeTab === 'nhan-tin' && <MessagesPanel userId={profile?.maNguoiDung} hostId={targetHostId} roomId={targetRoomId} />}

              {activeTab === 'yeu-thich' && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900 mb-8 border-b pb-4">Danh sách yêu thích</h2>
                  {loadingFavorites ? (
                    <div className="text-center py-20"><div className="w-12 h-12 border-4 border-[#FF385C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p className="text-gray-500 animate-pulse">Đang chuẩn bị danh sách...</p></div>
                  ) : (
                    <FavoritesList favorites={favorites} onRemove={(id) => {
                      setFavorites(prev => prev.filter(item => (item.maPhong ?? item.maSanPham) !== id));
                      setFavoritesCount(prev => Math.max(0, prev - 1));
                    }} />
                  )}
                </div>
              )}

              {/* ═══════════════════════ TAB: Ví ═══════════════════════ */}
              {activeTab === 'vi' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Ví của tôi</h2>
                    <div className="flex justify-center py-4">
                      <WalletCard balance={profile?.soDu || 0} />
                    </div>
                  </div>

                  {/* ──── Giao dịch gần đây ──── */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-gray-900">Giao dịch gần đây</h3>
                      {transactions.length > 4 && (
                        <button
                          onClick={() => setShowTransactionModal(true)}
                          className="text-sm font-semibold text-[#FF385C] hover:underline flex items-center gap-1"
                        >
                          Xem tất cả
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                      )}
                    </div>

                    {loadingTransactions ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="flex items-center gap-4 animate-pulse">
                            <div className="w-11 h-11 rounded-full bg-gray-100" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-gray-100 rounded w-2/3" />
                              <div className="h-3 bg-gray-50 rounded w-1/3" />
                            </div>
                            <div className="h-4 bg-gray-100 rounded w-24" />
                          </div>
                        ))}
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="text-center py-10">
                        <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                        <p className="text-sm text-gray-500">Chưa có giao dịch nào</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {displayedTransactions.map(tx => (
                          <div key={tx.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                              tx.type === 'payment' ? 'bg-red-50 text-[#FF385C]' : 'bg-green-50 text-green-600'
                            }`}>
                              {tx.type === 'payment' ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{tx.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-xs text-gray-400">{formatTransactionDate(tx.date)}</p>
                                {tx.provider && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                                    {tx.provider}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className={`text-sm font-bold whitespace-nowrap ${
                              tx.type === 'payment' ? 'text-[#FF385C]' : 'text-green-600'
                            }`}>
                              {tx.type === 'payment' ? '-' : '+'}{tx.amount.toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ═══════════════════════ TAB: Nội quy ═══════════════════════ */}
              {activeTab === 'noi-quy' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Quy định & Nội quy</h2>
                    <RegulationsSection />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <TransactionListModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        transactions={transactions}
      />
    </div>
  );
}

function RegulationsSection() {
  const [quyDinhs, setQuyDinhs] = useState<QuyDinh[]>([]);
  const [policies, setPolicies] = useState<ChinhSachHoanTien[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRegulations = async () => {
      try {
        const [qd, cs] = await Promise.all([
          quyDinhAPI.list({ doiTuong: 'khach' }),
          chinhSachHuyAPI.list(),
        ]);
        setQuyDinhs(Array.isArray(qd) ? qd : []);
        setPolicies(Array.isArray(cs) ? cs : []);
      } catch {
        console.error('Failed to fetch regulations');
      } finally {
        setLoading(false);
      }
    };
    fetchRegulations();
  }, []);

  const nhomLabels: Record<string, string> = {
    gia_ca: 'Quy định về giá',
    hoan_tien: 'Hoàn tiền',
    noi_quy: 'Nội quy chỗ ở',
    giao_tiep: 'Giao tiếp & hỗ trợ',
    chung: 'Quy định chung',
  };

  const grouped = quyDinhs.reduce<Record<string, QuyDinh[]>>((acc, q) => {
    (acc[q.nhom] = acc[q.nhom] || []).push(q);
    return acc;
  }, {});

  return (
    <div>
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF385C]"></div>
        </div>
      ) : (
        <>
          {policies.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Chính sách hủy & hoàn tiền</h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {policies.map(p => (
                  <div key={p.maChinhSach} className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-[#2a2a2a] rounded-2xl p-4 flex flex-col w-[calc((100%-24px)/3)] shrink-0">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          p.ma === 'LINH_HOAT' ? 'bg-emerald-500' : p.ma === 'TRUNG_BINH' ? 'bg-amber-500' : 'bg-red-500'
                        }`} />
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{p.ten}</h4>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        p.tyLeHoanTien >= 100
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                      }`}>
                        Hoàn {p.tyLeHoanTien}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed flex-1">{p.moTa}</p>
                    <p className="text-[11px] text-gray-400 mt-3 pt-3 border-t border-gray-100 dark:border-[#2a2a2a]">
                      Hủy miễn phí trước <span className="font-semibold text-gray-600 dark:text-gray-300">{p.soNgayTruoc} ngày</span> khi nhận phòng
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {quyDinhs.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Chưa có quy định nào.</p>
          ) : (
            <div className="space-y-5">
              {Object.entries(grouped).map(([nhom, items]) => (
                <div key={nhom}>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">{nhomLabels[nhom] || nhom}</h3>
                  <ul className="space-y-2.5">
                    {items.map(q => (
                      <li key={q.maQuyDinh} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                        <svg className="w-4 h-4 mt-0.5 shrink-0 text-[#FF385C]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="leading-relaxed">
                          <span className="font-semibold text-gray-900 dark:text-white">{q.tieuDe}:</span> {q.noiDung}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent />
    </Suspense>
  );
}
