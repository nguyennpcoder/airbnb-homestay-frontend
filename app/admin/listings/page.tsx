'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminAPI } from '@/lib/api';
import Link from 'next/link';
import BackendImage from '@/components/BackendImage';
import Pagination from '@/components/Pagination';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/ConfirmModal';
import { getValidSrc } from '@/lib/image';
import VerifiedBadge from '@/components/admin/VerifiedBadge';

const ITEMS_PER_PAGE = 6;

type StatusFilter = 'all' | 'hoat_dong' | 'cho_duyet' | 'locked' | 'khong_hoat_dong';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'hoat_dong', label: 'Hoạt động' },
    { value: 'cho_duyet', label: 'Chờ duyệt' },
    { value: 'locked', label: 'Bị khóa' },
    { value: 'khong_hoat_dong', label: 'Ngừng hoạt động' },
];

const TYPE_LABELS: Record<string, string> = {
    noi_luu_tru: 'Lưu trú',
    trai_nghiem: 'Trải nghiệm',
    dich_vu: 'Dịch vụ',
};

function formatCurrency(amount?: number | null) {
    if (amount == null) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}

function getListingImage(item: any) {
    if (item.urlAnhChinh && item.urlAnhChinh !== 'FILE_SELECTED') return item.urlAnhChinh;
    if (item.hinhAnhs?.length > 0) return item.hinhAnhs[0].urlHinhAnh;
    return null;
}

function HostCell({ hostInfo }: { hostInfo?: any }) {
    const name = hostInfo?.hoTen || 'Chủ nhà';
    const avatar = hostInfo?.avatarUrl;

    return (
        <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-200 shrink-0 border border-gray-100">
                {avatar ? (
                    <BackendImage src={getValidSrc(avatar)} alt={name} fill className="object-cover" sizes="32px" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                        {name.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>
            <div className="min-w-0">
                <div className="flex items-center gap-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[120px]">{name}</span>
                    {hostInfo?.xacMinhDanhTinh && <VerifiedBadge />}
                </div>
            </div>
        </div>
    );
}

function getStatusBadge(item: any) {
    if (item.biKhoa) {
        return { label: 'Bị khóa', className: 'bg-red-50 text-red-700 border border-red-200', dot: 'bg-red-500' };
    }
    switch (item.trangThai) {
        case 'hoat_dong':
            return { label: 'Hoạt động', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' };
        case 'cho_duyet':
            return { label: 'Chờ duyệt', className: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-500 animate-pulse' };
        default:
            return { label: 'Ngừng hoạt động', className: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
    }
}

type ModalState = {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    confirmColor: 'green' | 'red' | 'gray';
    onConfirm: () => Promise<void>;
};

export default function ListingManagementPage() {
    const [listings, setListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [locationFilter, setLocationFilter] = useState('all');

    const [confirmModal, setConfirmModal] = useState<ModalState>({
        isOpen: false, title: '', message: '', confirmText: '', confirmColor: 'gray', onConfirm: async () => {},
    });

    const fetchListings = async () => {
        try {
            setLoading(true);
            const res = await adminAPI.getListings();
            setListings(Array.isArray(res) ? res : []);
        } catch {
            toast.error('Không thể tải danh sách phòng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchListings(); }, []);
    useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, locationFilter]);

    useEffect(() => {
        if (confirmModal.isOpen) {
            document.body.style.overflow = 'hidden';    
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [confirmModal.isOpen]);

    const stats = useMemo(() => ({
        total: listings.length,
        active: listings.filter(l => !l.biKhoa && l.trangThai === 'hoat_dong').length,
        pending: listings.filter(l => !l.biKhoa && l.trangThai === 'cho_duyet').length,
        locked: listings.filter(l => l.biKhoa).length,
        inactive: listings.filter(l => !l.biKhoa && l.trangThai === 'khong_hoat_dong').length,
    }), [listings]);

    const locations = useMemo(
        () => Array.from(new Set(listings.map(l => l.thanhPho).filter(Boolean))).sort(),
        [listings]
    );

    const filteredListings = useMemo(() => listings.filter(item => {
        const q = searchQuery.toLowerCase();
        const matchSearch = !q ||
            (item.tieuDe?.toLowerCase() || '').includes(q) ||
            String(item.maPhong).includes(q) ||
            (item.hostInfo?.hoTen?.toLowerCase() || '').includes(q) ||
            (item.thanhPho?.toLowerCase() || '').includes(q);
        const matchStatus =
            statusFilter === 'all' ||
            (statusFilter === 'locked' && item.biKhoa) ||
            (statusFilter === 'khong_hoat_dong' && !item.biKhoa && item.trangThai === 'khong_hoat_dong') ||
            (statusFilter !== 'locked' && statusFilter !== 'khong_hoat_dong' && !item.biKhoa && item.trangThai === statusFilter);
        const matchLocation = locationFilter === 'all' || item.thanhPho === locationFilter;
        return matchSearch && matchStatus && matchLocation;
    }), [listings, searchQuery, statusFilter, locationFilter]);

    const totalPages = Math.ceil(filteredListings.length / ITEMS_PER_PAGE);
    const paginatedListings = filteredListings.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || locationFilter !== 'all';

    const clearFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setLocationFilter('all');
    };

    const handleLockAction = (listingId: number, isLocked: boolean) => {
        setConfirmModal({
            isOpen: true,
            title: isLocked ? 'Mở khóa listing' : 'Khóa listing',
            message: isLocked
                ? 'Listing sẽ hiển thị lại trên kết quả tìm kiếm.'
                : 'Listing sẽ bị ẩn khỏi tìm kiếm. Khách không thể đặt phòng này.',
            confirmText: isLocked ? 'Mở khóa' : 'Khóa listing',
            confirmColor: isLocked ? 'green' : 'red',
            onConfirm: async () => {
                try {
                    if (isLocked) {
                        await adminAPI.unlockListing(listingId);
                        toast.success('Đã mở khóa listing');
                    } else {
                        await adminAPI.lockListing(listingId);
                        toast.success('Đã khóa listing');
                    }
                    setListings(prev => prev.map(item =>
                        item.maPhong === listingId ? { ...item, biKhoa: !isLocked } : item
                    ));
                } catch {
                    toast.error('Có lỗi xảy ra, vui lòng thử lại');
                }
            },
        });
    };

    const handleApproveListing = (listingId: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Duyệt listing',
            message: 'Listing sẽ được công khai và khách có thể đặt ngay.',
            confirmText: 'Duyệt ngay',
            confirmColor: 'green',
            onConfirm: async () => {
                try {
                    await adminAPI.setStatus(listingId, 'hoat_dong');
                    toast.success('Đã duyệt listing');
                    fetchListings();
                } catch {
                    toast.error('Lỗi khi duyệt listing');
                }
            },
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C]" />
            </div>
        );
    }

    return (
        <div className="admin-container admin-page-content relative admin-page-enter">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>
                    {/* <h1 className="text-2xl font-bold text-gray-900">Quản lý Phòng</h1> */}
                    {/* <p className="text-sm text-gray-500 mt-1">
                        {stats.total} listing trên hệ thống ·{' '}
                        <span className="font-medium text-gray-700">{stats.active} đang hoạt động</span>
                    </p> */}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                <div className="admin-stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/15 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium admin-muted uppercase tracking-wider">Tổng Phòng</p>
                            <p className="text-lg font-bold admin-heading mt-0.5">{stats.total}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t admin-inner-border-t text-xs text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        Toàn bộ hệ thống
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium admin-muted uppercase tracking-wider">Hoạt động</p>
                            <p className="text-lg font-bold text-emerald-600 mt-0.5">{stats.active}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t admin-inner-border-t text-xs text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Đang công khai
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-500/15 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium admin-muted uppercase tracking-wider">Chờ duyệt</p>
                            <p className="text-lg font-bold text-amber-600 mt-0.5">{stats.pending}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t admin-inner-border-t text-xs text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        Cần xử lý
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-500/15 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium admin-muted uppercase tracking-wider">Bị khóa</p>
                            <p className="text-lg font-bold text-red-600 mt-0.5">{stats.locked}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t admin-inner-border-t text-xs text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        Ẩn khỏi tìm kiếm
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-500/15 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium admin-muted uppercase tracking-wider">Ngừng hoạt động</p>
                            <p className="text-lg font-bold text-gray-500 mt-0.5">{stats.inactive}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t admin-inner-border-t text-xs text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-gray-400" />
                        Tạm dừng bởi Host
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="admin-toolbar flex flex-wrap items-center gap-3 mb-6">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <input
                        type="text"
                        placeholder="Tìm tiêu đề, ID, host, thành phố..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF385C]/20 focus:border-[#FF385C] transition-all"
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                <div className="relative">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                        className="admin-select pr-9 cursor-pointer hover:border-gray-300 dark:hover:border-[#444] focus:outline-none focus:ring-2 focus:ring-[#FF385C]/20 focus:border-[#FF385C] transition-all"
                    >
                        {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>

                {locations.length > 0 && (
                    <div className="relative">
                        <select
                            value={locationFilter}
                            onChange={(e) => setLocationFilter(e.target.value)}
                            className="admin-select pr-9 cursor-pointer hover:border-gray-300 dark:hover:border-[#444] focus:outline-none focus:ring-2 focus:ring-[#FF385C]/20 focus:border-[#FF385C] transition-all"
                        >
                            <option value="all">Tất cả thành phố</option>
                            {locations.map(loc => (
                                <option key={loc} value={loc}>{loc}</option>
                            ))}
                        </select>
                        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                )}

                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Xóa bộ lọc
                    </button>
                )}

                <div className="ml-auto text-sm text-gray-400 font-medium">
                    <span className="text-gray-700">{filteredListings.length}</span> / {listings.length} phòng
                </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block">
                <div className="admin-table-wrap justify-between overflow-hidden">
                    <div className="overflow-x-auto flex-1">
                        <table className="min-w-full text-sm text-left table-auto">
                            <thead className="admin-thead text-gray-600 font-semibold text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Listing</th>
                                    <th className="px-6 py-4">Chủ nhà</th>
                                    <th className="px-6 py-4">Địa điểm</th>
                                    <th className="px-6 py-4">Giá/đêm</th>
                                    <th className="px-6 py-4">Loại</th>
                                    <th className="px-6 py-4">Đánh giá</th>
                                    <th className="px-6 py-4">Trạng thái</th>
                                    <th className="px-6 py-4 text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="admin-tbody">
                                {paginatedListings.length > 0 ? (
                                    paginatedListings.map((item, index) => {
                                        const statusMeta = getStatusBadge(item);
                                        const imageSrc = getListingImage(item);
                                        const isLocked = item.biKhoa === true;
                                        const isPending = !isLocked && item.trangThai === 'cho_duyet';

                                        return (
                                            <tr
                                                key={item.maPhong}
                                                className="hover:bg-gray-50/50 dark:hover:bg-white/[0.03] transition-colors admin-table-row-stagger"
                                                style={{ '--row-delay': `${index * 0.04}s` } as React.CSSProperties}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-200 ${isLocked ? 'opacity-60 grayscale' : ''}`}>
                                                            {imageSrc ? (
                                                                <BackendImage src={getValidSrc(imageSrc)} alt={item.tieuDe || ''} fill className="object-cover" sizes="40px" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                    </svg>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 max-w-[200px]">
                                                            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                                                                {item.tieuDe || 'Chưa có tiêu đề'}
                                                            </p>
                                                            <span className="admin-id-badge mt-1 inline-flex">#{item.maPhong}</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <HostCell hostInfo={item.hostInfo} />
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <p className="text-sm font-medium text-gray-900">{item.thanhPho || '—'}</p>
                                                    {item.quocGia && <p className="text-xs text-gray-500">{item.quocGia}</p>}
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="font-bold text-[#FF385C]">{formatCurrency(item.giaMoiKhach)}</span>
                                                    {item.soKhachToiDa && (
                                                        <p className="text-xs text-gray-400 mt-0.5">{item.soKhachToiDa} khách</p>
                                                    )}
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium text-[10px] tracking-wider uppercase">
                                                        {TYPE_LABELS[item.loaiPhong] || item.loaiPhong?.replace(/_/g, ' ') || '—'}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {item.diemTrungBinh ? (
                                                        <span className="text-sm text-gray-900">
                                                            ★ {Number(item.diemTrungBinh).toFixed(1)}
                                                            <span className="text-gray-400 text-xs ml-1">({item.soLuongDanhGia ?? 0})</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-gray-400">—</span>
                                                    )}
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap ${statusMeta.className}`}>
                                                        <span className={`w-2 h-2 rounded-full ${statusMeta.dot}`} />
                                                        {statusMeta.label}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Link
                                                            href={`/admin/listings/${item.maPhong}`}
                                                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
                                                        >
                                                            Chi tiết
                                                        </Link>
                                                        {isPending && (
                                                            <button
                                                                onClick={() => handleApproveListing(item.maPhong)}
                                                                className="px-4 py-2 bg-[#008489] hover:bg-[#006f73] text-white text-xs font-bold rounded-lg transition-colors shadow-sm whitespace-nowrap"
                                                            >
                                                                Duyệt
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleLockAction(item.maPhong, isLocked)}
                                                            className={`px-4 py-2 text-white text-xs font-bold rounded-lg transition-colors shadow-sm whitespace-nowrap ${
                                                                isLocked ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#FF385C] hover:bg-[#E31C5F]'
                                                            }`}
                                                        >
                                                            {isLocked ? 'Mở khóa' : 'Khóa'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                    </svg>
                                                </div>
                                                <p className="text-gray-500 font-medium">
                                                    {hasActiveFilters ? 'Không tìm thấy listing nào' : 'Chưa có listing nào'}
                                                </p>
                                                <p className="text-gray-400 text-sm mt-1">
                                                    {hasActiveFilters ? 'Thử thay đổi bộ lọc' : 'Các listing sẽ xuất hiện tại đây.'}
                                                </p>
                                                {hasActiveFilters && (
                                                    <button onClick={clearFilters} className="mt-3 text-sm text-[#FF385C] font-medium hover:underline">
                                                        Xóa bộ lọc
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
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
                {paginatedListings.length > 0 ? (
                    paginatedListings.map((item, index) => {
                        const statusMeta = getStatusBadge(item);
                        const imageSrc = getListingImage(item);
                        const isLocked = item.biKhoa === true;
                        const isPending = !isLocked && item.trangThai === 'cho_duyet';

                        return (
                            <div
                                key={item.maPhong}
                                className="admin-panel shadow-sm admin-mobile-card-enter"
                                style={{ animationDelay: `${index * 0.05}s` }}
                            >
                                <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="admin-id-badge !px-2 !py-0.5">
                                            #{item.maPhong}
                                        </span>
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold ${statusMeta.className}`}>
                                            <span className={`w-2 h-2 rounded-full ${statusMeta.dot}`} />
                                            {statusMeta.label}
                                        </span>
                                    </div>
                                    <span className="font-bold text-[#FF385C] text-sm shrink-0">{formatCurrency(item.giaMoiKhach)}</span>
                                </div>

                                <div className="px-4 py-3 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-200 ${isLocked ? 'opacity-60 grayscale' : ''}`}>
                                            {imageSrc ? (
                                                <BackendImage src={getValidSrc(imageSrc)} alt={item.tieuDe || ''} fill className="object-cover" sizes="48px" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                {item.tieuDe || 'Chưa có tiêu đề'}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                                <span>{item.thanhPho || '—'}</span>
                                                {item.diemTrungBinh && (
                                                    <>
                                                        <span className="text-gray-300">·</span>
                                                        <span>★ {Number(item.diemTrungBinh).toFixed(1)}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <HostCell hostInfo={item.hostInfo} />

                                    <div className="flex flex-wrap gap-2 pt-1">
                                        <Link
                                            href={`/admin/listings/${item.maPhong}`}
                                            className="flex-1 min-w-[100px] text-center px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold transition-colors"
                                        >
                                            Chi tiết
                                        </Link>
                                        {isPending && (
                                            <button
                                                onClick={() => handleApproveListing(item.maPhong)}
                                                className="flex-1 min-w-[100px] px-3 py-2.5 bg-[#008489] hover:bg-[#006f73] text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
                                            >
                                                Duyệt
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleLockAction(item.maPhong, isLocked)}
                                            className={`flex-1 min-w-[100px] px-3 py-2.5 text-white rounded-lg text-sm font-bold transition-colors shadow-sm ${
                                                isLocked ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#FF385C] hover:bg-[#E31C5F]'
                                            }`}
                                        >
                                            {isLocked ? 'Mở khóa' : 'Khóa'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="admin-panel shadow-sm py-12 text-center">
                        <p className="text-sm text-gray-500">
                            {hasActiveFilters ? 'Không tìm thấy listing nào' : 'Chưa có listing nào'}
                        </p>
                    </div>
                )}

                {filteredListings.length > ITEMS_PER_PAGE && (
                    <div className="pt-3 flex justify-center">
                        <Pagination inline currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                isDangerous={confirmModal.confirmColor === 'red'}
            />
        </div>
    );
}
