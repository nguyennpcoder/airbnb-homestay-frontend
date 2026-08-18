'use client';

import { useMemo, useEffect, useState } from 'react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isToday,
    isSameDay,
    isBefore,
    isAfter,
    parseISO,
} from 'date-fns';
import { vi } from 'date-fns/locale';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { hostAPI, availabilityAPI, Phong, Booking, getPhongId } from '@/lib/api';
import AdminBookingDetailModal from './AdminBookingDetailModal';
import { getStatusMeta } from './booking-utils';

interface DayInfo {
    ngay: string;
    conKhaDung: boolean;
    giaGhiDe?: number;
}

interface HostAvailabilityCalendarProps {
    listings: Phong[];
    selectedListingId: number | null;
    onSelectListing: (id: number) => void;
    viewMonth: Date;
    onViewMonthChange: (d: Date) => void;
}

export default function HostAvailabilityCalendar({
    listings,
    selectedListingId,
    onSelectListing,
    viewMonth,
    onViewMonthChange,
}: HostAvailabilityCalendarProps) {
    const [dayMap, setDayMap] = useState<Map<string, DayInfo>>(new Map());
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [calendarLoading, setCalendarLoading] = useState(false);
    const [selectionStart, setSelectionStart] = useState<Date | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<Date | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

    const getGuestName = (b: Booking) => {
        return b.nguoiDat?.hoTen || b.khach?.hoTen || b.nguoiDung?.hoTen || `Khách #${b.maKhach}`;
    };

    const pad = (n: number) => String(n).padStart(2, '0');
    const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const fetchCalendarData = async () => {
        if (!selectedListingId) return;
        setCalendarLoading(true);
        try {
            const monthStart = startOfMonth(viewMonth);
            const monthEnd = endOfMonth(viewMonth);
            const fromStr = toISO(monthStart);
            const toStr = toISO(monthEnd);

            const days = await availabilityAPI.listingDays(selectedListingId, fromStr, toStr);
            const map = new Map<string, DayInfo>();
            for (const d of days) {
                map.set(d.ngay, d);
            }
            setDayMap(map);

            const allBookings = await hostAPI.getBookings(Number(localStorage.getItem('userId')));
            const listingBookings = allBookings.filter(
                (b: Booking) =>
                    (b.phong?.maPhong === selectedListingId || b.maPhong === selectedListingId)
                    && (b as any).yeuCauDacBiet !== 'LIEN_HE_PHONG'
                    && !(Number((b as any).tongTien || 0) === 0 && !(b as any).ngayNhanPhong)
            );
            setBookings(listingBookings);
        } catch (error) {
            console.error('Error fetching calendar data:', error);
            toast.error('Không thể tải dữ liệu lịch');
        } finally {
            setCalendarLoading(false);
        }
    };

    useEffect(() => {
        fetchCalendarData();
    }, [selectedListingId, viewMonth]);

    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const today = new Date();
    const pastCutoff = isBefore(today, monthStart) ? monthStart : today;

    const getDayStatus = (day: Date): { available: boolean; booked: boolean; blocked: boolean; price?: number } => {
        const key = format(day, 'yyyy-MM-dd');
        const info = dayMap.get(key);
        const isPast = isBefore(day, pastCutoff) && !isSameDay(day, pastCutoff);
        const isBooked = bookings.some((b) => {
            if (b.trangThaiDatCho === 'da_huy' || b.trangThaiDatCho === 'hoan_thanh') return false;
            try {
                const checkIn = b.ngayNhanPhong ? parseISO(b.ngayNhanPhong) : null;
                const checkOut = b.ngayTraPhong ? parseISO(b.ngayTraPhong) : null;
                if (!checkIn || !checkOut) return false;
                return !isBefore(day, checkIn) && isBefore(day, checkOut);
            } catch {
                return false;
            }
        });
        return {
            available: info ? info.conKhaDung : !isPast,
            booked: isBooked,
            blocked: info ? !info.conKhaDung && !isBooked : false,
            price: info?.giaGhiDe,
        };
    };

    const handleDayMouseDown = (day: Date) => {
        if (isBefore(day, pastCutoff)) return;
        const status = getDayStatus(day);
        if (status.booked) return;
        setSelectionStart(day);
        setSelectionEnd(day);
        setIsSelecting(true);
    };

    const handleDayMouseEnter = (day: Date) => {
        if (!isSelecting || !selectionStart) return;
        if (isBefore(day, pastCutoff)) return;
        setSelectionEnd(day);
    };

    const handleMouseUp = () => {
        setIsSelecting(false);
    };

    useEffect(() => {
        document.addEventListener('mouseup', handleMouseUp);
        return () => document.removeEventListener('mouseup', handleMouseUp);
    }, []);

    const selectionRange = useMemo(() => {
        if (!selectionStart || !selectionEnd) return null;
        const start = isBefore(selectionStart, selectionEnd) ? selectionStart : selectionEnd;
        const end = isAfter(selectionStart, selectionEnd) ? selectionStart : selectionEnd;
        return { start, end };
    }, [selectionStart, selectionEnd]);

    const selectedDaysInRange = useMemo(() => {
        if (!selectionRange) return [];
        return eachDayOfInterval({ start: selectionRange.start, end: selectionRange.end }).filter((d) => {
            const status = getDayStatus(d);
            return !status.booked && !isBefore(d, pastCutoff);
        });
    }, [selectionRange, dayMap, bookings]);

    const allSelectedAvailable = selectedDaysInRange.length > 0 && selectedDaysInRange.every((d) => getDayStatus(d).available);
    const allSelectedBlocked = selectedDaysInRange.length > 0 && selectedDaysInRange.every((d) => getDayStatus(d).blocked);

    const handleBlockDates = async () => {
        if (!selectionRange || !selectedListingId) return;
        setActionLoading(true);
        try {
            await hostAPI.blockDates(selectedListingId, toISO(selectionRange.start), toISO(selectionRange.end));
            toast.success(`Đã khóa ${selectedDaysInRange.length} ngày`);
            setSelectionStart(null);
            setSelectionEnd(null);
            fetchCalendarData();
        } catch (error) {
            toast.error('Không thể khóa ngày');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnblockDates = async () => {
        if (!selectionRange || !selectedListingId) return;
        setActionLoading(true);
        try {
            await hostAPI.unblockDates(selectedListingId, toISO(selectionRange.start), toISO(selectionRange.end));
            toast.success(`Đã mở khóa ${selectedDaysInRange.length} ngày`);
            setSelectionStart(null);
            setSelectionEnd(null);
            fetchCalendarData();
        } catch (error) {
            toast.error('Không thể mở khóa ngày');
        } finally {
            setActionLoading(false);
        }
    };

    const handleBlockAllMonth = async () => {
        if (!selectedListingId) return;
        setActionLoading(true);
        try {
            const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd }).filter(
                (d) => !isBefore(d, pastCutoff)
            );
            if (monthDays.length === 0) {
                toast.error('Không có ngày nào trong tương lai để khóa');
                return;
            }
            await hostAPI.blockDates(selectedListingId, toISO(monthDays[0]), toISO(monthDays[monthDays.length - 1]));
            toast.success(`Đã khóa tất cả ngày trong tháng`);
            setSelectionStart(null);
            setSelectionEnd(null);
            fetchCalendarData();
        } catch (error) {
            toast.error('Không thể khóa ngày');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnblockAllMonth = async () => {
        if (!selectedListingId) return;
        setActionLoading(true);
        try {
            const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd }).filter(
                (d) => !isBefore(d, pastCutoff)
            );
            if (monthDays.length === 0) {
                toast.error('Không có ngày nào trong tương lai');
                return;
            }
            await hostAPI.unblockDates(selectedListingId, toISO(monthDays[0]), toISO(monthDays[monthDays.length - 1]));
            toast.success(`Đã mở khóa tất cả ngày trong tháng`);
            setSelectionStart(null);
            setSelectionEnd(null);
            fetchCalendarData();
        } catch (error) {
            toast.error('Không thể mở khóa ngày');
        } finally {
            setActionLoading(false);
        }
    };

    const formatVND = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

    const weekdayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const padStartDays = (monthStart.getDay() + 6) % 7;
    const selectedListing = listings.find((l) => getPhongId(l) === selectedListingId);

    // Only show active, non-locked listings in the selector
    const activeListings = useMemo(
        () => listings.filter(l => l.trangThai === 'hoat_dong' && !l.biKhoa),
        [listings]
    );

    return (
        <div className="space-y-6">
            {/* Listing Selector */}
            <div className="admin-panel shadow-sm">
                <div className="px-4 py-3 border-b admin-subtle-border">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Chọn mục cho thuê</h3>
                </div>
                <div className="p-4">
                    {activeListings.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">Chưa có mục cho thuê nào đang hoạt động</p>
                    ) : (
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {activeListings.map((l) => {
                                const id = getPhongId(l);
                                const isSelected = id === selectedListingId;
                                return (
                                    <button
                                        key={id}
                                        onClick={() => {
                                            onSelectListing(id);
                                            setSelectionStart(null);
                                            setSelectionEnd(null);
                                        }}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all whitespace-nowrap ${
                                            isSelected
                                                ? 'border-[#FF385C] bg-[#FF385C]/5 shadow-sm'
                                                : 'border-gray-200 dark:border-[#333] hover:border-gray-300 dark:hover:border-[#444]'
                                        }`}
                                    >
                                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 relative">
                                            {l.urlAnhChinh && l.urlAnhChinh !== 'FILE_SELECTED' ? (
                                                <Image src={l.urlAnhChinh} fill className="object-cover" alt="" sizes="36px" />
                                            ) : l.hinhAnhs && l.hinhAnhs.length > 0 ? (
                                                <Image src={l.hinhAnhs[0].urlHinhAnh} fill className="object-cover" alt="" sizes="36px" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-left max-w-[180px]">
                                            <p className={`text-sm font-semibold truncate ${isSelected ? 'text-[#FF385C]' : 'text-gray-900 dark:text-white'}`}>
                                                {l.tieuDe || 'Chưa có tiêu đề'}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">{l.thanhPho || '—'}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {selectedListingId && (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
                    {/* Calendar */}
                    <div className="admin-panel shadow-sm">
                        {/* Month Navigation */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b admin-subtle-border bg-gray-50/60 dark:bg-white/[0.03]">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => onViewMonthChange(subMonths(viewMonth, 1))}
                                    className="p-2 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <h2 className="text-base font-semibold admin-heading min-w-[140px] text-center capitalize">
                                    {format(viewMonth, 'MMMM yyyy', { locale: vi })}
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => onViewMonthChange(addMonths(viewMonth, 1))}
                                    className="p-2 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onViewMonthChange(startOfMonth(new Date()))}
                                    className="ml-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200"
                                >
                                    Hôm nay
                                </button>
                            </div>
                            {calendarLoading && (
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <div className="animate-spin rounded-full h-3 w-3 border border-gray-300 border-t-[#FF385C]" />
                                    Đang tải...
                                </div>
                            )}
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-4 px-4 py-2 border-b border-gray-100 dark:border-[#2a2a2a] text-xs">
                            <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                <span className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-200" />
                                Khả dụng
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                <span className="w-3 h-3 rounded-sm bg-[#FF385C]/10 border border-[#FF385C]/30" />
                                Đã đặt
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                <span className="w-3 h-3 rounded-sm bg-gray-200 border border-gray-300" />
                                Đã khóa
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                <span className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-300" />
                                Đang chọn
                            </span>
                        </div>

                        {/* Calendar Grid */}
                        <div className="p-4">
                            <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-[#333] rounded-xl overflow-hidden">
                                {weekdayLabels.map((label) => (
                                    <div key={label} className="bg-gray-50 dark:bg-[#1a1a1a] px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">
                                        {label}
                                    </div>
                                ))}
                                {Array.from({ length: padStartDays }).map((_, i) => (
                                    <div key={`empty-${i}`} className="bg-white dark:bg-[#161616] min-h-[80px]" />
                                ))}
                                {days.map((day) => {
                                    const status = getDayStatus(day);
                                    const isPast = isBefore(day, pastCutoff) && !isSameDay(day, pastCutoff);
                                    const isCurrentDay = isToday(day);
                                    const isSelected = selectionRange && !isBefore(day, selectionRange.start) && !isAfter(day, selectionRange.end);
                                    const dayBookings = bookings.filter((b) => {
                                        if (b.trangThaiDatCho === 'da_huy' || b.trangThaiDatCho === 'hoan_thanh') return false;
                                        try {
                                            const checkIn = b.ngayNhanPhong ? parseISO(b.ngayNhanPhong) : null;
                                            const checkOut = b.ngayTraPhong ? parseISO(b.ngayTraPhong) : null;
                                            if (!checkIn || !checkOut) return false;
                                            return !isBefore(day, checkIn) && isBefore(day, checkOut);
                                        } catch {
                                            return false;
                                        }
                                    });

                                    let cellBg = 'bg-white dark:bg-[#161616]';
                                    if (isPast) {
                                        cellBg = 'bg-gray-50 dark:bg-[#111]';
                                    } else if (isSelected) {
                                        cellBg = 'bg-blue-50 dark:bg-blue-900/20';
                                    } else if (status.booked) {
                                        cellBg = 'bg-[#FF385C]/[0.06]';
                                    } else if (status.blocked) {
                                        cellBg = 'bg-gray-100 dark:bg-[#1a1a1a]';
                                    }

                                    return (
                                        <div
                                            key={day.toISOString()}
                                            className={`${cellBg} min-h-[80px] p-1.5 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03] relative ${
                                                isPast ? 'opacity-50 cursor-not-allowed' : ''
                                            }`}
                                            onMouseDown={() => handleDayMouseDown(day)}
                                            onMouseEnter={() => handleDayMouseEnter(day)}
                                        >
                                            <div className={`text-xs font-medium mb-1 ${
                                                isCurrentDay
                                                    ? 'w-6 h-6 rounded-full bg-[#FF385C] text-white flex items-center justify-center'
                                                    : isPast
                                                    ? 'text-gray-400 dark:text-gray-600'
                                                    : 'text-gray-700 dark:text-gray-300'
                                            }`}>
                                                {format(day, 'd')}
                                            </div>
                                            {status.booked && dayBookings.length > 0 && (
                                                <div className="space-y-0.5">
                                                    {dayBookings.slice(0, 2).map((b, i) => {
                                                        const meta = getStatusMeta(b.trangThaiDatCho);
                                                        const guestName = getGuestName(b);
                                                        return (
                                                            <button
                                                                key={i}
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedBooking(b);
                                                                }}
                                                                className={`w-full text-left text-[9px] font-semibold px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity ${meta.cal}`}
                                                                title={`${guestName} · ${meta.label}`}
                                                            >
                                                                {guestName}
                                                            </button>
                                                        );
                                                    })}
                                                    {dayBookings.length > 2 && (
                                                        <div className="text-[9px] text-gray-400 px-1">+{dayBookings.length - 2}</div>
                                                    )}
                                                </div>
                                            )}
                                            {status.blocked && !status.booked && !isPast && (
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                    <svg className="w-5 h-5 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        {/* Selection Info */}
                        <div className="admin-panel shadow-sm">
                            <div className="px-4 py-3 border-b admin-subtle-border">
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Chọn ngày</h3>
                            </div>
                            <div className="p-4">
                                <p className="text-xs text-gray-500 mb-3">
                                    Click và kéo để chọn nhiều ngày. Sau đó khóa hoặc mở khóa chúng.
                                </p>
                                {selectionRange ? (
                                    <div className="space-y-3">
                                        <div className="bg-gray-50 dark:bg-[#1a1a1a] rounded-lg p-3">
                                            <p className="text-xs text-gray-500 mb-1">Từ</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {format(selectionRange.start, 'dd/MM/yyyy')}
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-[#1a1a1a] rounded-lg p-3">
                                            <p className="text-xs text-gray-500 mb-1">Đến</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {format(selectionRange.end, 'dd/MM/yyyy')}
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-[#1a1a1a] rounded-lg p-3">
                                            <p className="text-xs text-gray-500 mb-1">Số ngày</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {selectedDaysInRange.length} ngày
                                            </p>
                                        </div>
                                        {allSelectedAvailable && (
                                            <button
                                                onClick={handleBlockDates}
                                                disabled={actionLoading}
                                                className="w-full py-2.5 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
                                            >
                                                {actionLoading ? 'Đang xử lý...' : `Khóa ${selectedDaysInRange.length} ngày`}
                                            </button>
                                        )}
                                        {allSelectedBlocked && (
                                            <button
                                                onClick={handleUnblockDates}
                                                disabled={actionLoading}
                                                className="w-full py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50"
                                            >
                                                {actionLoading ? 'Đang xử lý...' : `Mở khóa ${selectedDaysInRange.length} ngày`}
                                            </button>
                                        )}
                                        {!allSelectedAvailable && !allSelectedBlocked && selectedDaysInRange.length > 0 && (
                                            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg">
                                                Selection bao gồm ngày đã đặt. Chỉ chọn ngày khả dụng hoặc đã khóa.
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 italic">Chưa chọn ngày nào</p>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="admin-panel shadow-sm">
                            <div className="px-4 py-3 border-b admin-subtle-border">
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Hành động nhanh</h3>
                            </div>
                            <div className="p-4 space-y-2">
                                <button
                                    onClick={handleBlockAllMonth}
                                    disabled={actionLoading}
                                    className="w-full py-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors disabled:opacity-50"
                                >
                                    Khóa cả tháng
                                </button>
                                <button
                                    onClick={handleUnblockAllMonth}
                                    disabled={actionLoading}
                                    className="w-full py-2 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors disabled:opacity-50"
                                >
                                    Mở khóa cả tháng
                                </button>
                            </div>
                        </div>

                        {/* Listing Summary */}
                        {selectedListing && (
                            <div className="admin-panel shadow-sm">
                                <div className="px-4 py-3 border-b admin-subtle-border">
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Thông tin</h3>
                                </div>
                                <div className="p-4 space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">Giá/đêm</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">
                                            {formatVND(selectedListing.giaMoiKhach || 0)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">Khách tối đa</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">
                                            {selectedListing.soKhachToiDa || 0}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">Đánh giá</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">
                                            {selectedListing.diemTrungBinh || '—'} ★
                                        </span>
                                    </div>
                                    <a
                                        href={`/hosting/listings/${selectedListingId}`}
                                        className="block w-full py-2 text-center border border-gray-200 dark:border-[#333] rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors mt-2"
                                    >
                                        Xem chi tiết
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <AdminBookingDetailModal
                booking={selectedBooking as any}
                onClose={() => setSelectedBooking(null)}
            />
        </div>
    );
}
