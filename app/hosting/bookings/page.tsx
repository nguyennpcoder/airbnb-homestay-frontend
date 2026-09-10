'use client';
export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { startOfMonth } from 'date-fns';
import { hostAPI, Phong, getPhongId } from '@/lib/api';
import { useSearchParams, useRouter } from 'next/navigation';
import Pagination from '@/components/Pagination';
import toast from 'react-hot-toast';
import HostAvailabilityCalendar from '@/components/admin/bookings/HostAvailabilityCalendar';
import AdminBookingDetailModal from '@/components/admin/bookings/AdminBookingDetailModal';
import Image from 'next/image';
import AdminUserAvatar, { resolvePersonName } from '@/components/admin/AdminUserAvatar';
import { VerifiedName } from '@/components/admin/VerifiedBadge';
import { getValidSrc } from '@/lib/image';
import {
    AdminBookingRecord,
    STATUS_OPTIONS,
    formatDate,
    formatGuestBreakdownShort,
    formatVND,
    getNightCount,
    getStatusMeta,
    normalizeAdminBooking,
} from '@/components/admin/bookings/booking-utils';

type ViewMode = 'calendar' | 'list';

const ITEMS_PER_PAGE = 6;

export default function HostBookingSchedulePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [bookings, setBookings] = useState<AdminBookingRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('calendar');
    const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedBooking, setSelectedBooking] = useState<AdminBookingRecord | null>(null);
    const [listings, setListings] = useState<Phong[]>([]);
    const [selectedListingId, setSelectedListingId] = useState<number | null>(null);

    useEffect(() => {
        const fetchListings = async () => {
            try {
                const userId = Number(localStorage.getItem('userId'));
                if (!userId) return;
                const data = await hostAPI.allListings(userId);
                setListings(data);
                if (data.length > 0) {
                    setSelectedListingId(getPhongId(data[0]));
                }
            } catch (error) {
                console.error('Error fetching listings:', error);
            }
        };
        fetchListings();
    }, []);

    const fetchBookings = useCallback(async () => {
        try {
            setLoading(true);
            const userId = localStorage.getItem('userId');
            if (!userId) {
                toast.error('Vui lòng đăng nhập');
                return;
            }
            const res = await hostAPI.getBookings(Number(userId));
            const list = (Array.isArray(res) ? res : []).filter((b: any) =>
                b?.yeuCauDacBiet !== 'LIEN_HE_PHONG' && !(Number(b?.tongTien || 0) === 0 && !b?.ngayNhanPhong)
            );
            setBookings(list.map(b => normalizeAdminBooking(b as unknown as Record<string, unknown>)));
        } catch (error: any) {
            console.error('Failed to fetch bookings', error);
            if (error?.response?.status === 403) {
                toast.error('Bạn không có quyền truy cập danh sách đặt chỗ. Vui lòng đăng nhập lại.');
            } else {
                toast.error('Không thể tải lịch đặt chỗ');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    useEffect(() => {
        const selectedId = searchParams.get('selected');
        if (selectedId && bookings.length > 0) {
            const found = bookings.find(b => b.maDatCho === Number(selectedId));
            if (found) setSelectedBooking(found);
        }
    }, [searchParams, bookings]);

    const filteredBookings = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        return bookings.filter(b => {
            const matchesStatus = statusFilter === 'all' || b.trangThaiDatCho === statusFilter;
            if (!matchesStatus) return false;
            if (!q) return true;
            return (
                b.maDatCho?.toString().includes(q) ||
                b.nguoiDat?.hoTen?.toLowerCase().includes(q) ||
                b.nguoiDat?.email?.toLowerCase().includes(q) ||
                b.nguoiDat?.soDienThoai?.includes(q) ||
                b.phong?.tieuDe?.toLowerCase().includes(q) ||
                b.phong?.thanhPho?.toLowerCase().includes(q)
            );
        });
    }, [bookings, searchQuery, statusFilter]);

    const stats = useMemo(() => ({
        total: bookings.length,
        pending: bookings.filter(b => b.trangThaiDatCho === 'cho_xac_nhan').length,
        confirmed: bookings.filter(b => b.trangThaiDatCho === 'da_xac_nhan').length,
        completed: bookings.filter(b => b.trangThaiDatCho === 'hoan_thanh').length,
        cancelled: bookings.filter(b => b.trangThaiDatCho === 'da_huy').length,
    }), [bookings]);

    const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);
    const listItems = filteredBookings.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

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
            {/* <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Đặt chỗ</h1>
                    <p className="text-sm text-gray-500 mt-1">Xem lịch trình đặt phòng của bạn và khách để gặp nhau check-in.</p>
                </div>
            </div> */}

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                {[
                    { label: 'Tổng đơn', value: stats.total, color: 'text-gray-900' },
                    { label: 'Chờ xác nhận', value: stats.pending, color: 'text-amber-600' },
                    { label: 'Đã xác nhận', value: stats.confirmed, color: 'text-emerald-600' },
                    { label: 'Hoàn thành', value: stats.completed, color: 'text-blue-600' },
                    { label: 'Đã hủy', value: stats.cancelled, color: 'text-gray-500' },
                ].map(item => (
                    <div key={item.label} className="admin-stat-card !p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{item.label}</p>
                        <p className={`text-xl font-bold mt-1 ${item.color}`}>{item.value}</p>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 admin-toolbar mb-6">
                <div className="flex rounded-lg border border-gray-200 dark:border-[#333] p-0.5 bg-gray-50 dark:bg-[#222]">
                    <button
                        type="button"
                        onClick={() => setViewMode('calendar')}
                        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                            viewMode === 'calendar' ? 'bg-white dark:bg-[#2a2a2a] admin-heading shadow-sm' : 'admin-muted hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                    >
                        Lịch
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                            viewMode === 'list' ? 'bg-white dark:bg-[#2a2a2a] admin-heading shadow-sm' : 'admin-muted hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                    >
                        Danh sách
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={statusFilter}
                        onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-2 admin-field rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF385C]/30"
                    >
                        {STATUS_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Mã đơn, khách, phòng, thành phố..."
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-64 md:w-72 focus:outline-none focus:ring-2 focus:ring-[#FF385C]/30"
                        />
                        <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            {viewMode === 'calendar' ? (
                <HostAvailabilityCalendar
                    listings={listings}
                    selectedListingId={selectedListingId}
                    onSelectListing={setSelectedListingId}
                    viewMonth={viewMonth}
                    onViewMonthChange={setViewMonth}
                />
            ) : (
                <div className="admin-panel shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left">
                            <thead className="admin-thead text-xs uppercase tracking-wider text-gray-600">
                                <tr>
                                    <th className="px-4 py-3">Mã đơn</th>
                                    <th className="px-4 py-3">Phòng</th>
                                    <th className="px-4 py-3">Khách</th>
                                    <th className="px-4 py-3">Lịch trình</th>
                                    <th className="px-4 py-3">Khách / Đêm</th>
                                    <th className="px-4 py-3">Tổng tiền</th>
                                    <th className="px-4 py-3">Trạng thái</th>
                                    <th className="px-4 py-3 text-right">Chi tiết</th>
                                </tr>
                            </thead>
                            <tbody className="admin-tbody">
                                {listItems.length > 0 ? listItems.map((b, index) => {
                                    const meta = getStatusMeta(b.trangThaiDatCho);
                                    const nights = getNightCount(b.ngayNhanPhong, b.ngayTraPhong);
                                    return (
                                        <tr
                                            key={b.maDatCho}
                                            className="hover:bg-gray-50/50 dark:hover:bg-white/[0.03] transition-colors admin-table-row-stagger"
                                            style={{ '--row-delay': `${index * 0.04}s` } as React.CSSProperties}
                                        >
                                            <td className="px-4 py-3 font-mono text-xs font-semibold admin-muted">#{b.maDatCho}</td>
                                            <td className="px-4 py-3 max-w-[240px]">
                                                <div className="flex gap-2.5 min-w-0">
                                                    {b.phong?.urlAnhChinh && (
                                                        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                                                            <Image
                                                                src={getValidSrc(b.phong.urlAnhChinh)}
                                                                alt=""
                                                                fill
                                                                className="object-cover"
                                                                sizes="40px"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-gray-900 truncate">{b.phong?.tieuDe || '—'}</p>
                                                        <p className="text-xs text-gray-500 truncate">{b.phong?.thanhPho}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <AdminUserAvatar person={b.nguoiDat} size={32} />
                                                    <div className="min-w-0">
                                                        <VerifiedName
                                                            name={resolvePersonName(b.nguoiDat, `Khách #${b.maKhach}`)}
                                                            verified={b.nguoiDat?.xacMinhDanhTinh}
                                                            className="text-sm font-medium text-gray-900"
                                                        />
                                                        <p className="text-xs text-gray-500 truncate">{b.nguoiDat?.email || '—'}</p>
                                                        {b.nguoiDat?.soDienThoai && (
                                                            <p className="text-[11px] text-gray-400 truncate">{b.nguoiDat.soDienThoai}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs whitespace-nowrap">
                                                <span className="font-medium">{formatDate(b.ngayNhanPhong)}</span>
                                                <span className="text-gray-400 mx-1">→</span>
                                                <span className="font-medium">{formatDate(b.ngayTraPhong)}</span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap max-w-[140px]">
                                                <p className="font-medium text-gray-800 leading-snug">
                                                    {formatGuestBreakdownShort(b)}
                                                </p>
                                                <p className="text-gray-500 mt-0.5">
                                                    {nights != null ? `${nights} đêm` : '—'}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-[#FF385C] whitespace-nowrap">{formatVND(b.tongTien)}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.className}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                                                    {meta.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedBooking(b)}
                                                    className="text-xs font-semibold text-[#FF385C] hover:underline"
                                                >
                                                    Xem lịch trình
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-gray-400 italic">
                                            Không có đặt chỗ phù hợp
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-gray-100 flex justify-center">
                            <Pagination inline currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                        </div>
                    )}
                </div>
            )}

            <AdminBookingDetailModal booking={selectedBooking} onClose={() => {
                setSelectedBooking(null);
                window.history.replaceState(null, '', '/hosting/bookings');
            }} />
        </div>
    );
}
