'use client';

import { useEffect, useState, useMemo } from 'react';
import { adminAPI } from '@/lib/api';
import Pagination from '@/components/Pagination';
import Image from 'next/image';
import { getValidSrc } from '@/lib/image';
import AdminUserAvatar from '@/components/admin/AdminUserAvatar';
import { VerifiedName } from '@/components/admin/VerifiedBadge';

interface Payment {
    id: number;
    bookingId: number;
    bookingStatus?: string;
    amount: number;
    currency: string;
    provider: string;
    transactionId?: string;
    status: string;
    refundReason?: string;
    paymentDate?: string;
    serviceFee?: number;
    listingTitle?: string;
    listingImageUrl?: string;
    hostId?: number;
    hostName?: string;
    hostAvatarUrl?: string;
    hostEmail?: string;
    hostPhone?: string;
    guestId?: number;
    guestName?: string;
    guestAvatarUrl?: string;
    guestEmail?: string;
    guestPhone?: string;
    guestXacMinhDanhTinh?: boolean;
    hostXacMinhDanhTinh?: boolean;
    soLuongKhach?: number;
    giaMoiKhach?: number;
    ngayNhanPhong?: string;
    ngayTraPhong?: string;
}

type StatusFilter = 'ALL' | 'CHO_XAC_NHAN' | 'DA_XAC_NHAN' | 'YEU_CAU_HOAN_TIEN' | 'HOAN_TIEN' | 'DA_HUY' | 'THAT_BAI' | 'CHUA_THANH_TOAN';
type ProviderFilter = 'ALL' | 'VNPAY' | 'WALLET' | 'ZALOPAY' | 'MOMO' | 'SEPAY';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: 'ALL', label: 'Tất cả trạng thái' },
    { value: 'CHO_XAC_NHAN', label: 'Chờ xác nhận' },
    { value: 'DA_XAC_NHAN', label: 'Đã xác nhận' },
    { value: 'YEU_CAU_HOAN_TIEN', label: 'Yêu cầu hoàn tiền' },
    { value: 'HOAN_TIEN', label: 'Đã hoàn tiền' },
    { value: 'DA_HUY', label: 'Đã hủy' },
    { value: 'THAT_BAI', label: 'Thất bại' },
    { value: 'CHUA_THANH_TOAN', label: 'Chưa thanh toán' },
];

const PROVIDER_OPTIONS: { value: ProviderFilter; label: string }[] = [
    { value: 'ALL', label: 'Tất cả cổng' },
    { value: 'VNPAY', label: 'VNPAY' },
    { value: 'WALLET', label: 'Ví thanh toán' },
    { value: 'ZALOPAY', label: 'ZaloPay' },
    { value: 'MOMO', label: 'MoMo' },
    { value: 'SEPAY', label: 'SePay' },
];  

const ITEMS_PER_PAGE = 5;

export default function PaymentManagementPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    // Filters
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [providerFilter, setProviderFilter] = useState<ProviderFilter>('ALL');

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const res = await adminAPI.getPayments();
            setPayments(Array.isArray(res) ? res : []);
        } catch (error) {
            console.error('Failed to fetch payments', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayments();
    }, []);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, providerFilter]);

    // Filtered payments
    const filteredPayments = useMemo(() => {
        return payments.filter(p => {
            if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
            if (providerFilter !== 'ALL' && p.provider !== providerFilter) return false;
            return true;
        });
    }, [payments, statusFilter, providerFilter]);

    // Stats calculations
    const stats = useMemo(() => {
        const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const confirmedAmount = payments
            .filter(p => p.status === 'DA_XAC_NHAN')
            .reduce((sum, p) => sum + (p.amount || 0), 0);
        const refundedAmount = payments
            .filter(p => p.status === 'HOAN_TIEN' || p.status === 'YEU_CAU_HOAN_TIEN')
            .reduce((sum, p) => sum + (p.amount || 0), 0);
        const cancelledAmount = payments
            .filter(p => p.status === 'DA_HUY' || p.status === 'THAT_BAI')
            .reduce((sum, p) => sum + (p.amount || 0), 0);
        const totalServiceFee = payments
            .filter(p => p.status === 'DA_XAC_NHAN')
            .reduce((sum, p) => sum + (p.serviceFee || 0), 0);
        return { totalAmount, confirmedAmount, refundedAmount, cancelledAmount, totalServiceFee };
    }, [payments]);

    const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);
    const paginatedPayments = filteredPayments.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const hasActiveFilters = statusFilter !== 'ALL' || providerFilter !== 'ALL';

    const clearFilters = () => {
        setStatusFilter('ALL');
        setProviderFilter('ALL');
    };

    // Status badge renderer
    const getStatusBadge = (status: string, bookingStatus?: string) => {
        const normalized = (status || '').toString().trim().toUpperCase();
        const bookingState = (bookingStatus || '').toString().trim().toUpperCase();

        switch (normalized) {
            case 'CHUA_THANH_TOAN':
            case 'UNPAID':
            case 'WAITING':
            case 'AWAITING_PAYMENT':
                return { label: 'Chưa thanh toán', className: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
            case 'CHO_XAC_NHAN':
            case 'PENDING':
            case 'PROCESSING':
            case 'IN_PROGRESS':
            case 'WAITING_FOR_CONFIRMATION':
                return { label: 'Chờ xác nhận', className: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-500 animate-pulse' };
            case 'DA_XAC_NHAN':
            case 'CONFIRMED':
            case 'PAID':
            case 'SUCCESS':
                return { label: 'Đã xác nhận', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' };
            case 'DA_HUY':
            case 'CANCELLED':
            case 'CANCELED':
            case 'CANCEL':
            case 'USER_CANCEL':
            case 'USER_CANCELLED':
                return { label: 'Đã hủy', className: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
            case 'THAT_BAI':
            case 'FAILED':
            case 'FAIL':
            case 'ERROR':
            case 'TIMEOUT':
            case 'EXPIRED':
                return { label: 'Thất bại', className: 'bg-red-50 text-red-700 border border-red-200', dot: 'bg-red-500' };
            case 'HOAN_TIEN':
            case 'REFUNDED':
                return { label: 'Đã hoàn tiền', className: 'bg-blue-50 text-blue-700 border border-blue-200', dot: 'bg-blue-500' };
            case 'YEU_CAU_HOAN_TIEN':
            case 'REFUND_REQUESTED':
                return { label: 'Yêu cầu hoàn tiền', className: 'bg-purple-50 text-purple-700 border border-purple-200', dot: 'bg-purple-500 animate-pulse' };
        }

        if (bookingState === 'DA_HUY') {
            return { label: 'Đã hủy', className: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
        }
        if (bookingState === 'DA_XAC_NHAN' && (normalized === 'CHUA_THANH_TOAN' || normalized === 'UNPAID' || !normalized)) {
            return { label: 'Đã xác nhận', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' };
        }

        return {
            label: normalized || bookingState || 'UNKNOWN',
            className: 'bg-gray-100 text-gray-800',
            dot: 'bg-gray-400',
        };
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
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
                    {/* <h1 className="text-2xl font-bold text-gray-900">Quản lý thanh toán</h1> */}
                    {/* <p className="text-sm text-gray-500 mt-1">
                        {payments.length} giao dịch trên hệ thống ·{' '}
                        <span className="font-medium text-gray-700">
                            {stats.confirmedAmount > 0 ? formatCurrency(stats.totalAmount) : 'Chưa có doanh thu'}
                        </span>
                    </p> */}
                </div>
            </div>

            {/* Revenue Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <div className="admin-stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/15 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium admin-muted uppercase tracking-wider">Tổng doanh thu</p>
                            <p className="text-lg font-bold admin-heading mt-0.5">{formatCurrency(stats.totalAmount)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t admin-inner-border-t text-xs text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        {payments.length} giao dịch
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
                            <p className="text-xs font-medium admin-muted uppercase tracking-wider">Đã nhận</p>
                            <p className="text-lg font-bold text-emerald-600 mt-0.5">{formatCurrency(stats.confirmedAmount)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t admin-inner-border-t text-xs text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Đã xác nhận thành công
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-500/15 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium admin-muted uppercase tracking-wider">Phí DV Admin</p>
                            <p className="text-lg font-bold text-amber-600 mt-0.5">{formatCurrency(stats.totalServiceFee)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t admin-inner-border-t text-xs text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Tổng phí dịch vụ đã xác nhận
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-500/15 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium admin-muted uppercase tracking-wider">Hoàn về ví</p>
                            <p className="text-lg font-bold text-purple-600 mt-0.5">{formatCurrency(stats.refundedAmount)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t admin-inner-border-t text-xs text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        Đã hoàn / yêu cầu hoàn
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-500/15 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium admin-muted uppercase tracking-wider">Bị hủy / Thất bại</p>
                            <p className="text-lg font-bold text-red-600 mt-0.5">{formatCurrency(stats.cancelledAmount)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t admin-inner-border-t text-xs text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        Giao dịch thất bại / đã hủy
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="admin-toolbar flex flex-wrap items-center gap-3 mb-6">
                <div className="relative">
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as StatusFilter)}
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

                <div className="relative">
                    <select
                        value={providerFilter}
                        onChange={e => setProviderFilter(e.target.value as ProviderFilter)}
                        className="admin-select pr-9 cursor-pointer hover:border-gray-300 dark:hover:border-[#444] focus:outline-none focus:ring-2 focus:ring-[#FF385C]/20 focus:border-[#FF385C] transition-all"
                    >
                        {PROVIDER_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>

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
                    <span className="text-gray-700">{filteredPayments.length}</span> / {payments.length} giao dịch
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block">
                <div className="admin-table-wrap justify-between overflow-hidden">
                    <div className="overflow-x-auto flex-1">
                        <table className="min-w-full text-sm text-left table-auto">
                            <thead className="admin-thead text-gray-600 font-semibold text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Mã GD</th>
                                    <th className="px-6 py-4">Phòng & Chủ nhà</th>
                                    <th className="px-6 py-4">Khách hàng</th>
                                    <th className="px-6 py-4">Giao dịch</th>
                                    <th className="px-6 py-4">Số tiền</th>
                                    <th className="px-6 py-4">Phí DV</th>
                                    <th className="px-6 py-4">Trạng thái</th>
                                    <th className="px-6 py-4 text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="admin-tbody">
                                {paginatedPayments.length > 0 ? (
                                    paginatedPayments.map((payment, index) => {
                                        const statusMeta = getStatusBadge(payment.status, payment.bookingStatus);
                                        return (
                                            <tr
                                                key={payment.id}
                                                className="hover:bg-gray-50/50 dark:hover:bg-white/[0.03] transition-colors admin-table-row-stagger"
                                                style={{ '--row-delay': `${index * 0.04}s` } as React.CSSProperties}
                                            >
                                                {/* Mã GD */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="admin-id-badge">
                                                        TX:{payment.transactionId || payment.id}
                                                    </span>
                                                </td>

                                                {/* Listing + Host */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                                                            {payment.listingImageUrl ? (
                                                                <Image src={getValidSrc(payment.listingImageUrl)} alt={payment.listingTitle || ''} fill className="object-cover" />
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
                                                                {payment.listingTitle || `Phòng #${payment.bookingId}`}
                                                            </p>
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                <AdminUserAvatar
                                                                    person={{ hoTen: payment.hostName, urlAnhDaiDien: payment.hostAvatarUrl }}
                                                                    size={18}
                                                                />
                                                                <VerifiedName
                                                                    name={payment.hostName || 'Chủ nhà'}
                                                                    verified={payment.hostXacMinhDanhTinh}
                                                                    className="text-xs text-gray-600 font-medium"
                                                                    badgeClassName="w-3 h-3"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Khách hàng */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <AdminUserAvatar
                                                            person={{ hoTen: payment.guestName, urlAnhDaiDien: payment.guestAvatarUrl }}
                                                            size={32}
                                                        />
                                                        <div className="min-w-0">
                                                            <VerifiedName
                                                                name={payment.guestName || 'Khách'}
                                                                verified={payment.guestXacMinhDanhTinh}
                                                                className="text-sm font-medium text-gray-900 max-w-[140px]"
                                                            />
                                                            {payment.guestEmail && (
                                                                <p className="text-xs text-gray-500 truncate max-w-[160px]">{payment.guestEmail}</p>
                                                            )}
                                                            {payment.guestPhone && (
                                                                <p className="text-[11px] text-gray-400 truncate">{payment.guestPhone}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Giao dịch */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <span className="admin-id-badge !font-semibold !px-2 !py-0.5">#{payment.bookingId}</span>
                                                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium text-[10px] tracking-wider uppercase">{payment.provider}</span>
                                                        {payment.paymentDate && (
                                                            <span className="text-gray-400 font-medium">{formatDate(payment.paymentDate)}</span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Số tiền */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="font-bold text-[#FF385C]">{formatCurrency(payment.amount)}</span>
                                                </td>

                                                {/* Phí DV */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                                        {payment.serviceFee != null && payment.serviceFee > 0
                                                            ? formatCurrency(payment.serviceFee)
                                                            : '—'}
                                                    </span>
                                                </td>

                                                {/* Trạng thái */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap ${statusMeta.className}`}>
                                                        <span className={`w-2 h-2 rounded-full ${statusMeta.dot}`} />
                                                        {statusMeta.label}
                                                    </span>
                                                </td>

                                                {/* Hành động - tự động xử lý, không cần admin */}
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    {payment.status === 'CHO_XAC_NHAN' && (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                            </svg>
                                                            Đang tự động xử lý...
                                                        </span>
                                                    )}
                                                    {payment.status === 'YEU_CAU_HOAN_TIEN' && (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                            </svg>
                                                            Đang tự động hoàn...
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    </svg>
                                                </div>
                                                <p className="text-gray-500 font-medium">
                                                    {hasActiveFilters ? 'Không tìm thấy giao dịch nào' : 'Chưa có giao dịch nào'}
                                                </p>
                                                <p className="text-gray-400 text-sm mt-1">
                                                    {hasActiveFilters ? 'Thử thay đổi bộ lọc' : 'Các giao dịch thanh toán sẽ xuất hiện tại đây.'}
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
                        {filteredPayments.length > ITEMS_PER_PAGE && (
                            <Pagination
                                inline
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-3">
                {paginatedPayments.length > 0 ? (
                    paginatedPayments.map((payment, index) => {
                        const statusMeta = getStatusBadge(payment.status, payment.bookingStatus);
                        return (
                            <div
                                key={payment.id}
                                className="admin-panel shadow-sm admin-mobile-card-enter"
                                style={{ animationDelay: `${index * 0.05}s` }}
                            >
                                {/* Header: TX code + Status + Amount */}
                                <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="admin-id-badge !px-2 !py-0.5">
                                            TX:{payment.transactionId || payment.id}
                                        </span>
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold ${statusMeta.className}`}>
                                            <span className={`w-2 h-2 rounded-full ${statusMeta.dot}`} />
                                            {statusMeta.label}
                                        </span>
                                    </div>
                                    <span className="font-bold text-[#FF385C] text-sm shrink-0">{formatCurrency(payment.amount)}</span>
                                </div>

                                {/* Body */}
                                <div className="px-4 py-3 space-y-3">
                                    {/* Listing + Guest row */}
                                    <div className="flex items-center gap-3">
                                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                                            {payment.listingImageUrl ? (
                                                <Image src={getValidSrc(payment.listingImageUrl)} alt={payment.listingTitle || ''} fill className="object-cover" />
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
                                                {payment.listingTitle || `Phòng #${payment.bookingId}`}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                                <div className="flex items-center gap-1.5">
                                                    <AdminUserAvatar
                                                        person={{ hoTen: payment.hostName, urlAnhDaiDien: payment.hostAvatarUrl }}
                                                        size={18}
                                                    />
                                                    <VerifiedName
                                                        name={payment.hostName || 'Chủ nhà'}
                                                        verified={payment.hostXacMinhDanhTinh}
                                                        className="text-xs text-gray-600 font-medium"
                                                        badgeClassName="w-3 h-3"
                                                    />
                                                </div>
                                                <span className="text-gray-300 hidden sm:inline">|</span>
                                                <div className="flex items-center gap-1.5">
                                                    <AdminUserAvatar
                                                        person={{ hoTen: payment.guestName, urlAnhDaiDien: payment.guestAvatarUrl }}
                                                        size={18}
                                                    />
                                                    <div className="min-w-0">
                                                        <VerifiedName
                                                            name={payment.guestName || 'Khách'}
                                                            verified={payment.guestXacMinhDanhTinh}
                                                            className="text-xs text-gray-600 font-medium"
                                                            badgeClassName="w-3 h-3"
                                                        />
                                                        {payment.guestEmail && (
                                                            <p className="text-[10px] text-gray-500 truncate">{payment.guestEmail}</p>
                                                        )}
                                                    </div>
                                                    {payment.guestPhone && (
                                                        <span className="text-[10px] text-gray-400">{payment.guestPhone}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detail row */}
                                    <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                                        <span className="text-gray-400">#{payment.bookingId}</span>
                                        <span className="text-gray-300">·</span>
                                        <span>{payment.provider}</span>
                                        {payment.paymentDate && (
                                            <>
                                                <span className="text-gray-300">·</span>
                                                <span className="text-gray-400">{formatDate(payment.paymentDate)}</span>
                                            </>
                                        )}
                                    </div>

                                    {payment.refundReason && (
                                        <p className="text-xs text-gray-400 italic">Lý do: {payment.refundReason}</p>
                                    )}

                                    {/* Actions - tự động xử lý, không cần admin */}
                                    {payment.status === 'CHO_XAC_NHAN' && (
                                        <div className="pt-1">
                                            <div className="w-full py-2.5 rounded-lg text-sm font-semibold bg-amber-50 text-amber-700 border border-amber-200 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                    </svg>
                                                    Đang tự động xác nhận...
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {payment.status === 'YEU_CAU_HOAN_TIEN' && (
                                        <div className="pt-1">
                                            <div className="w-full py-2.5 rounded-lg text-sm font-semibold bg-purple-50 text-purple-700 border border-purple-200 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                    </svg>
                                                    Đang tự động hoàn tiền...
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="admin-panel shadow-sm py-12 text-center">
                        <p className="text-sm text-gray-500">
                            {hasActiveFilters ? 'Không tìm thấy giao dịch nào' : 'Chưa có giao dịch nào'}
                        </p>
                    </div>
                )}

                {/* Mobile Pagination */}
                    {filteredPayments.length > ITEMS_PER_PAGE && (
                        <div className="pt-3 flex justify-center">
                            <Pagination
                                inline
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
            </div>


        </div>
    );
}
