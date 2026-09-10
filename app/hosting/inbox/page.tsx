'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import ConnectionRequestModal from '@/components/ConnectionRequestModal';
import HostMessagesPanel from '@/components/HostMessagesPanel';
import toast from 'react-hot-toast';
import { webSocketService } from '@/lib/websocket';
import { thongBaoAPI, messageAPI, ThongBao, Message } from '@/lib/api';
import BackendImage from '@/components/BackendImage';
import { getValidSrc } from '@/lib/image';

interface ThongBaoWithDatCho extends ThongBao {
    datCho?: {
        maDatCho: number;
        phong?: {
            tieuDe: string;
            urlAnhChinh?: string;
            giaMoiKhach?: number;
            thanhPho?: string;
        };
        ngayNhanPhong?: string;
        ngayTraPhong?: string;
        soLuongKhach?: number;
        tongTien?: number;
    };
}

export default function InboxPage() {
    const [notifications, setNotifications] = useState<ThongBaoWithDatCho[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
    const [selectedNotification, setSelectedNotification] = useState<ThongBaoWithDatCho | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState<'requests' | 'messages'>('requests');
    const [refreshing, setRefreshing] = useState(false);
    const [counts, setCounts] = useState<{ pendingRequests: number; unreadMessages: number }>({ pendingRequests: 0, unreadMessages: 0 });
    const userIdRef = useRef<number>(0);

    // Fetch unread message count from tin_nhan table (actual messages, not notifications)
    const fetchUnreadMessageCount = useCallback(async () => {
        try {
            const uid = typeof window !== 'undefined' ? Number(localStorage.getItem('userId')) : 0;
            if (!uid) return;
            const data = await messageAPI.unreadCount(uid, 'host');
            setCounts(prev => ({ ...prev, unreadMessages: data.unreadMessages || 0 }));
        } catch (e) {
            console.error(e);
        }
    }, []);

    // Fetch pending request count from thong_bao table
    const fetchPendingRequestCount = useCallback(async () => {
        try {
            const uid = typeof window !== 'undefined' ? Number(localStorage.getItem('userId')) : 0;
            if (!uid) return;
            const data = await thongBaoAPI.getCounts(uid);
            setCounts(prev => ({ ...prev, pendingRequests: data.pendingRequests || 0 }));
        } catch (e) {
            console.error(e);
        }
    }, []);

    const fetchCounts = useCallback(async () => {
        await Promise.all([fetchUnreadMessageCount(), fetchPendingRequestCount()]);
    }, [fetchUnreadMessageCount, fetchPendingRequestCount]);

    // Handle incoming WebSocket messages from guests
    const handleIncomingMessage = useCallback((message: Message & {
        isInquiry?: boolean;
        yeuCauDacBiet?: string;
        maPhong?: number;
    }) => {
        // Hội thoại liên hệ trước đặt chỗ dùng maPhong (không có maDatCho)
        const isInquiry = !!message?.isInquiry || message?.yeuCauDacBiet === 'LIEN_HE_PHONG';
        const bookingId = message?.maDatCho;
        if (!bookingId && !(isInquiry && message?.maPhong)) return;

        // Increment unread count immediately (optimistic update)
        setCounts(prev => ({ ...prev, unreadMessages: (prev.unreadMessages || 0) + 1 }));

        // Dispatch event so HostMessagesPanel can update its conversation list
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('host-incoming-message', { detail: message }));
            window.dispatchEvent(new Event('chat-messages-updated'));
            window.dispatchEvent(new Event('notifications-updated'));
        }
    }, []);

    // Connect WebSocket at page level — stays connected regardless of active tab
    useEffect(() => {
        const userId = typeof window !== 'undefined' ? Number(localStorage.getItem('userId')) : 0;
        if (!userId) return;
        userIdRef.current = userId;

        const onNotification = (newNotification: ThongBao) => {
            if (newNotification && newNotification.loaiThongBao === 'CHAT_REQUEST') {
                setNotifications(prev => [newNotification, ...prev]);
                fetchPendingRequestCount();
                toast.success('Bạn có yêu cầu kết nối mới!');
            }
        };

        webSocketService.connect(userId, handleIncomingMessage, onNotification);

        return () => {
            webSocketService.removeMessageHandler(userId, handleIncomingMessage);
            webSocketService.removeNotificationHandler(userId, onNotification);
        };
    }, [handleIncomingMessage, fetchPendingRequestCount]);

    useEffect(() => {
        fetchNotifications();
        fetchCounts();

        const handleUpdate = () => fetchCounts();
        window.addEventListener('notifications-updated', handleUpdate);
        window.addEventListener('chat-messages-updated', handleUpdate);

        // Polling fallback: re-fetch counts every 10s to stay in sync
        const pollInterval = setInterval(fetchCounts, 10000);

        return () => {
            window.removeEventListener('notifications-updated', handleUpdate);
            window.removeEventListener('chat-messages-updated', handleUpdate);
            clearInterval(pollInterval);
        };
    }, [fetchCounts]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const userIdNum = typeof window !== 'undefined' ? Number(localStorage.getItem('userId')) : 0;
            if (!userIdNum) {
                toast.error('Vui lòng đăng nhập');
                return;
            }
            const data = await thongBaoAPI.getNotifications(userIdNum);
            const chatRequests = data.filter((n: ThongBao) => n.loaiThongBao === 'CHAT_REQUEST');
            setNotifications(chatRequests);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            toast.error('Không thể tải thông báo');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchNotifications(), fetchCounts()]);
        setRefreshing(false);
    };

    const handleAccept = async (notificationId: number) => {
        setIsProcessing(true);
        try {
            await thongBaoAPI.accept(notificationId);
            toast.success('Đã chấp nhận yêu cầu kết nối. Bạn có thể bắt đầu trò chuyện với khách.');
            setIsModalOpen(false);
            fetchNotifications();
            fetchCounts();
            setActiveTab('messages');
        } catch (error) {
            console.error('Error accepting request:', error);
            toast.error('Có lỗi xảy ra');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async (notificationId: number) => {
        setIsProcessing(true);
        try {
            await thongBaoAPI.reject(notificationId);
            toast.success('Đã từ chối yêu cầu kết nối');
            setIsModalOpen(false);
            fetchNotifications();
            fetchCounts();
        } catch (error) {
            console.error('Error rejecting request:', error);
            toast.error('Có lỗi xảy ra');
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredNotifications = notifications.filter((notification) => {
        if (filterStatus === 'all') return true;
        return notification.trangThai.toLowerCase() === filterStatus;
    });

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">Chờ xử lý</span>;
            case 'ACCEPTED':
                return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Đã chấp nhận</span>;
            case 'REJECTED':
                return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Đã từ chối</span>;
            default:
                return null;
        }
    };

    const userId = typeof window !== 'undefined' ? Number(localStorage.getItem('userId')) : undefined;

    return (
        <div className="admin-container admin-page-content relative admin-page-enter">
            {/* Tabs + Refresh */}
            <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex p-1 bg-gray-100/80 dark:bg-white/5 rounded-xl w-full sm:w-fit">
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'requests'
                            ? 'bg-white dark:bg-[#333] text-gray-900 dark:text-gray-100 shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        Yêu cầu kết nối
                        {counts.pendingRequests > 0 && (
                            <span className="flex items-center justify-center w-5 h-5 bg-[#FF385C] dark:bg-[#FF385C] text-white text-[10px] font-bold rounded-full">
                                {counts.pendingRequests}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('messages')}
                        className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'messages'
                            ? 'bg-white dark:bg-[#333] text-gray-900 dark:text-gray-100 shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        Tin nhắn
                        {counts.unreadMessages > 0 && (
                            <span className="flex items-center justify-center min-w-[20px] h-5 px-1 bg-[#FF385C] dark:bg-[#FF385C] text-white text-[10px] font-bold rounded-full animate-pulse">
                                {counts.unreadMessages}
                            </span>
                        )}
                    </button>
                </div>

                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#333] rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50 shrink-0"
                >
                    <svg className={`w-4 h-4 transition-transform ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Làm mới
                </button>
            </div>

            {activeTab === 'messages' ? (
                <HostMessagesPanel userId={userId} onMessageRead={fetchUnreadMessageCount} />
            ) : (
                <>
                    {/* Filter Chips */}
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-thin">
                        {[
                            { key: 'all', label: 'Tất cả' },
                            { key: 'pending', label: 'Chờ xử lý' },
                            { key: 'accepted', label: 'Đã chấp nhận' },
                            { key: 'rejected', label: 'Đã từ chối' }
                        ].map((filter) => (
                            <button
                                key={filter.key}
                                onClick={() => setFilterStatus(filter.key as any)}
                                className={`whitespace-nowrap flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${filterStatus === filter.key
                                    ? 'bg-[#FF385C] text-white shadow-sm'
                                    : 'bg-white dark:bg-[#1e1e1e] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#333] hover:border-gray-300'
                                    }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>

                    {/* Notifications List */}
                    <div className="bg-white dark:bg-[#161616] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="p-12 text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF385C] mx-auto" />
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">Đang tải...</p>
                            </div>
                        ) : filteredNotifications.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                                    <svg className="w-10 h-10 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                </div>
                                <p className="text-gray-500 dark:text-gray-400 font-medium">Không có yêu cầu nào</p>
                            </div>
                        ) : (
                            filteredNotifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`px-5 py-4 border-b border-gray-100 dark:border-[#2a2a2a] last:border-b-0 hover:bg-gray-50/50 dark:hover:bg-white/[0.03] transition-all cursor-pointer group ${!notification.daDoc ? 'bg-blue-50/30 dark:bg-blue-500/[0.04]' : ''}`}
                                    onClick={() => {
                                        setSelectedNotification(notification);
                                        setIsModalOpen(true);
                                    }}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="relative flex-shrink-0">
                                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden border border-gray-200 dark:border-[#333] group-hover:border-gray-300 dark:group-hover:border-[#444] transition-colors">
                                                {notification.nguoiGui?.urlAnhDaiDien ? (
                                                    <Image
                                                        src={getValidSrc(notification.nguoiGui.urlAnhDaiDien)}
                                                        alt={notification.nguoiGui.hoTen || "Guest"}
                                                        width={48}
                                                        height={48}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-900 dark:bg-gray-800 text-white flex items-center justify-center text-lg font-bold">
                                                        {notification.nguoiGui?.hoTen?.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            {!notification.daDoc && (
                                                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-[#161616]" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-3 mb-1">
                                                <h3 className={`font-semibold text-sm transition-colors ${!notification.daDoc ? 'text-blue-900 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                                    {notification.nguoiGui?.hoTen}
                                                </h3>
                                                {getStatusBadge(notification.trangThai)}
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1.5 leading-relaxed line-clamp-2">
                                                {notification.noiDung}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                                    {formatDate(notification.ngayTao)}
                                                </span>
                                                <span className="text-xs font-semibold text-[#FF385C] opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Xem chi tiết →
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Connection Request Modal */}
                    {selectedNotification && (
                        <ConnectionRequestModal
                            isOpen={isModalOpen}
                            onClose={() => {
                                setIsModalOpen(false);
                                setSelectedNotification(null);
                            }}
                            notification={selectedNotification}
                            onAccept={handleAccept}
                            onReject={handleReject}
                            isProcessing={isProcessing}
                        />
                    )}
                </>
            )}
        </div>
    );
}
