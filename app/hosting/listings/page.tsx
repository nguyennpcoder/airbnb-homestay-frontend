'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { hostAPI, Phong, getPhongId } from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import ConfirmModal from '@/components/ConfirmModal';
import { webSocketService } from '@/lib/websocket';

type Listing = Phong & { biKhoa?: boolean; loaiHinh?: string; soLuotXem?: number };

const ITEMS_PER_PAGE = 5;

export default function HostingListings() {
    const router = useRouter();
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        confirmText: string;
        isDangerous?: boolean;
        onConfirm: () => Promise<void>;
    }>({ isOpen: false, title: '', message: '', confirmText: 'Xác nhận', onConfirm: async () => {} });

    useEffect(() => {
        const fetchListings = async () => {
            try {
                const userId = Number(localStorage.getItem('userId'));
                if (!userId) { setLoading(false); return; }
                const data = await hostAPI.allListings(userId);
                setListings(data);
            } catch (error) {
                console.error('Error fetching listings:', error);
                toast.error('Không thể tải danh sách');
            } finally { setLoading(false); }
        };
        fetchListings();
    }, []);

    useEffect(() => {
        const userId = Number(localStorage.getItem('userId'));
        if (!userId) return;
        const onNotification = (notification: any) => {
            if (notification?.loaiThongBao === 'LISTING_APPROVED') {
                hostAPI.allListings(userId).then(setListings).catch(() => {});
            }
        };
        webSocketService.connect(userId, undefined, onNotification);
        return () => webSocketService.removeNotificationHandler(userId, onNotification);
    }, []);

    const filteredListings = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        return listings.filter(l => {
            const matchesStatus = statusFilter === 'all' || (
                statusFilter === 'active' ? l.trangThai === 'hoat_dong' && !l.biKhoa :
                statusFilter === 'pending' ? l.trangThai === 'cho_duyet' :
                statusFilter === 'locked' ? l.biKhoa :
                statusFilter === 'inactive' ? l.trangThai === 'khong_hoat_dong' : true
            );
            if (!matchesStatus) return false;
            if (!q) return true;
            return (
                l.tieuDe?.toLowerCase().includes(q) ||
                l.thanhPho?.toLowerCase().includes(q) ||
                String(getPhongId(l)).includes(q)
            );
        });
    }, [listings, searchQuery, statusFilter]);

    const stats = useMemo(() => ({
        total: listings.length,
        active: listings.filter(l => l.trangThai === 'hoat_dong' && !l.biKhoa).length,
        pending: listings.filter(l => l.trangThai === 'cho_duyet').length,
        locked: listings.filter(l => l.biKhoa).length,
        hidden: listings.filter(l => l.trangThai === 'khong_hoat_dong' && !l.biKhoa).length,
    }), [listings]);

    const totalPages = Math.ceil(filteredListings.length / ITEMS_PER_PAGE);
    const currentItems = filteredListings.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const getStatusMeta = (listing: Listing) => {
        if (listing.biKhoa) return { label: 'Bị khóa bởi admin', className: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' };
        switch (listing.trangThai) {
            case 'hoat_dong': return { label: 'Đang hoạt động', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
            case 'cho_duyet': return { label: 'Đang chờ duyệt', className: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500 animate-pulse' };
            case 'khong_hoat_dong': return { label: 'Đã ẩn', className: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' };
            default: return { label: listing.trangThai || '—', className: 'bg-gray-50 text-gray-600 border-gray-200', dot: 'bg-gray-300' };
        }
    };

    const handleHideListing = (listing: Listing) => {
        setConfirmModal({
            isOpen: true,
            title: 'Ẩn phòng này?',
            message: 'Phòng sẽ tạm ngừng hoạt động, khách không thể tìm thấy hoặc đặt phòng này. Bạn có thể mở lại bất cứ lúc nào.',
            confirmText: 'Ẩn phòng',
            isDangerous: true,
            onConfirm: async () => {
                try {
                    await hostAPI.hideListing(getPhongId(listing));
                    toast.success('Đã ẩn phòng');
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    setListings(prev => prev.map(l =>
                        getPhongId(l) === getPhongId(listing) ? { ...l, trangThai: 'khong_hoat_dong' } : l
                    ));
                } catch {
                    toast.error('Có lỗi xảy ra, vui lòng thử lại');
                }
            },
        });
    };

    const handleUnhideListing = (listing: Listing) => {
        setConfirmModal({
            isOpen: true,
            title: 'Mở lại phòng này?',
            message: 'Phòng sẽ hoạt động trở lại và khách có thể tìm thấy, đặt phòng như trước.',
            confirmText: 'Mở lại phòng',
            onConfirm: async () => {
                try {
                    const res = await hostAPI.unhideListing(getPhongId(listing));
                    toast.success(res.trangThai === 'cho_duyet' ? 'Phòng sẽ được tự động duyệt trong vài giây' : 'Đã mở lại phòng');
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    setListings(prev => prev.map(l =>
                        getPhongId(l) === getPhongId(listing) ? { ...l, trangThai: res.trangThai || 'cho_duyet' } : l
                    ));
                    setTimeout(async () => {
                        const userId = Number(localStorage.getItem('userId'));
                        if (userId) {
                            const data = await hostAPI.allListings(userId).catch(() => null);
                            if (data) setListings(data);
                        }
                    }, 5000);
                } catch (error: any) {
                    const msg = error?.response?.data?.message;
                    if (msg) toast.error(msg); else toast.error('Có lỗi xảy ra, vui lòng thử lại');
                }
            },
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C]" />
            </div>
        );
    }

    return (
        <div className="admin-container admin-page-content relative admin-page-enter">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
                {/* <div>
                    <h1 className="text-2xl font-bold text-gray-900">Nhà/phòng cho thuê</h1>
                    <p className="text-sm text-gray-500 mt-1">Quản lý {listings.length} mục cho thuê của bạn</p>
                </div> */}
                <Link
                    href="/hosting/listings/create"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors shadow-sm"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Tạo mục cho thuê mới
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                {[
                    { label: 'Tổng số', value: stats.total, color: 'text-gray-900' },
                    { label: 'Đang hoạt động', value: stats.active, color: 'text-emerald-600' },
                    { label: 'Chờ duyệt', value: stats.pending, color: 'text-amber-600' },
                    { label: 'Đã ẩn', value: stats.hidden, color: 'text-gray-500' },
                    { label: 'Bị khóa', value: stats.locked, color: 'text-red-600' },
                ].map(item => (
                    <div key={item.label} className="admin-stat-card !p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{item.label}</p>
                        <p className={`text-xl font-bold mt-1 ${item.color}`}>{item.value}</p>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="admin-toolbar flex flex-wrap items-center gap-3 mb-6">
                <div className="relative">
                    <select
                        value={statusFilter}
                        onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                        className="admin-select pr-9 cursor-pointer hover:border-gray-300 dark:hover:border-[#444] focus:outline-none focus:ring-2 focus:ring-[#FF385C]/20 focus:border-[#FF385C] transition-all"
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="active">Đang hoạt động</option>
                        <option value="pending">Đang chờ duyệt</option>
                        <option value="locked">Bị khóa</option>
                        <option value="inactive">Đã ẩn</option>
                    </select>
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên, thành phố, mã số..."
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className="admin-field pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#FF385C]/30"
                    />
                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <div className="text-sm text-gray-400 font-medium">
                    <span className="text-gray-700">{filteredListings.length}</span> / {listings.length}
                </div>
            </div>

            {listings.length === 0 ? (
                <div className="admin-panel shadow-sm p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có mục cho thuê nào</h3>
                    <p className="text-gray-500 mb-6">Bắt đầu bằng cách tạo mục cho thuê đầu tiên của bạn</p>
                    <Link href="/hosting/listings/create" className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Tạo mục cho thuê mới
                    </Link>
                </div>
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                        <div className="admin-table-wrap justify-between">
                            <div className="overflow-x-auto flex-1">
                                <table className="min-w-full text-sm text-left table-auto">
                                    <thead className="admin-thead text-gray-600 font-semibold text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">Mục cho thuê</th>
                                            <th className="px-6 py-4">Trạng thái</th>
                                            <th className="px-6 py-4">Giá/đêm</th>
                                            <th className="px-6 py-4">Thông tin</th>
                                            <th className="px-6 py-4 text-right">Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody className="admin-tbody">
                                        {currentItems.map((listing, index) => {
                                            const meta = getStatusMeta(listing);
                                            return (
                                                <tr
                                                    key={getPhongId(listing)}
                                                    className="hover:bg-gray-50/50 dark:hover:bg-white/[0.03] transition-colors admin-table-row-stagger"
                                                    style={{ '--row-delay': `${index * 0.04}s` } as React.CSSProperties}
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100 relative">
                                                                {listing.urlAnhChinh && listing.urlAnhChinh !== 'FILE_SELECTED' ? (
                                                                    <Image src={listing.urlAnhChinh} fill className="object-cover" alt={listing.tieuDe || ''} sizes="56px" />
                                                                ) : listing.hinhAnhs && listing.hinhAnhs.length > 0 ? (
                                                                    <Image src={listing.hinhAnhs[0].urlHinhAnh} fill className="object-cover" alt={listing.tieuDe || ''} sizes="56px" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-100">
                                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="max-w-[250px]">
                                                                <p className="font-semibold text-gray-900 line-clamp-1 mb-0.5">{listing.tieuDe || 'Chưa có tiêu đề'}</p>
                                                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                                    {listing.thanhPho || '—'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${meta.className}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                                                            {meta.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="font-bold text-gray-900">
                                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(listing.giaMoiKhach || 0)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="space-y-1">
                                                            <p className="text-xs text-gray-600 font-medium">{listing.loaiBatDongSan || 'Nhà riêng'}</p>
                                                            <p className="text-[11px] text-gray-400">
                                                                {listing.soKhachToiDa || 0} khách · {listing.soPhongNgu || 0} phòng
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center gap-1 justify-end">
                                                            <button
                                                                onClick={() => router.push(`/hosting/listings/${getPhongId(listing)}`)}
                                                                className="p-2 text-gray-400 hover:text-[#FF385C] hover:bg-red-50 rounded-lg transition-all"
                                                                title="Xem chi tiết"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={() => router.push(`/hosting/listings/edit/${getPhongId(listing)}`)}
                                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                                title="Chỉnh sửa"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                            </button>
                                                            {!listing.biKhoa && listing.trangThai === 'hoat_dong' && (
                                                                <button
                                                                    onClick={() => handleHideListing(listing)}
                                                                    className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                                    title="Ẩn phòng"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                            {!listing.biKhoa && listing.trangThai === 'khong_hoat_dong' && (
                                                                <button
                                                                    onClick={() => handleUnhideListing(listing)}
                                                                    className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                                    title="Mở lại phòng"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="border-t border-gray-100 px-6 py-3 flex items-center justify-center h-16 shrink-0">
                                {filteredListings.length > ITEMS_PER_PAGE && (
                                    <Pagination inline currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden space-y-3">
                        {currentItems.map((listing) => {
                            const meta = getStatusMeta(listing);
                            return (
                                <div key={getPhongId(listing)} className="admin-panel shadow-sm">
                                    <div className="p-4 space-y-4">
                                        <div className="flex gap-4">
                                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 relative">
                                                {listing.urlAnhChinh && listing.urlAnhChinh !== 'FILE_SELECTED' ? (
                                                    <Image src={listing.urlAnhChinh} fill className="object-cover" alt={listing.tieuDe || ''} sizes="80px" />
                                                ) : listing.hinhAnhs && listing.hinhAnhs.length > 0 ? (
                                                    <Image src={listing.hinhAnhs[0].urlHinhAnh} fill className="object-cover" alt={listing.tieuDe || ''} sizes="80px" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-100">
                                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.className}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                                                        {meta.label}
                                                    </span>
                                                    <span className="text-xs font-bold text-gray-900">
                                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(listing.giaMoiKhach || 0)}
                                                    </span>
                                                </div>
                                                <p className="font-bold text-gray-900 truncate mb-1">{listing.tieuDe}</p>
                                                <p className="text-xs text-gray-500 mb-2">{listing.thanhPho || '—'}</p>
                                                <p className="text-[11px] text-gray-400">{listing.soKhachToiDa || 0} khách · {listing.soPhongNgu || 0} phòng</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <button onClick={() => router.push(`/hosting/listings/${getPhongId(listing)}`)} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors">
                                                Chi tiết
                                            </button>
                                            <button onClick={() => router.push(`/hosting/listings/edit/${getPhongId(listing)}`)} className="flex-1 bg-gray-900 text-white py-2 rounded-xl text-xs font-bold hover:bg-black transition-colors">
                                                Chỉnh sửa
                                            </button>
                                            {!listing.biKhoa && listing.trangThai === 'hoat_dong' && (
                                                <button onClick={() => handleHideListing(listing)} className="flex-1 border border-amber-200 text-amber-700 bg-amber-50 py-2 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors">
                                                    Ẩn phòng
                                                </button>
                                            )}
                                            {!listing.biKhoa && listing.trangThai === 'khong_hoat_dong' && (
                                                <button onClick={() => handleUnhideListing(listing)} className="flex-1 border border-emerald-200 text-emerald-700 bg-emerald-50 py-2 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors">
                                                    Mở lại
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div className="pt-3 flex justify-center">
                            {filteredListings.length > ITEMS_PER_PAGE && (
                                <Pagination inline currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                            )}
                        </div>
                    </div>
                </>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                isDangerous={confirmModal.isDangerous}
            />
        </div>
    );
}
