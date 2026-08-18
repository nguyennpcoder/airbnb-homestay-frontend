'use client';

import { useMemo } from 'react';
import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    format,
    isToday,
    startOfMonth,
    subMonths,
} from 'date-fns';
import { vi } from 'date-fns/locale';
import AdminUserAvatar, { resolvePersonName } from '@/components/admin/AdminUserAvatar';
import { VerifiedName } from '@/components/admin/VerifiedBadge';
import {
    AdminBookingRecord,
    formatGuestBreakdownShort,
    getNightCount,
    getStatusMeta,
    isDayInStay,
    bookingOverlapsMonth,
} from './booking-utils';

interface Props {
    viewMonth: Date;
    onViewMonthChange: (d: Date) => void;
    bookings: AdminBookingRecord[];
    selectedBookingId: number | null;
    onSelectBooking: (b: AdminBookingRecord) => void;
}

export default function AdminBookingCalendar({
    viewMonth,
    onViewMonthChange,
    bookings,
    selectedBookingId,
    onSelectBooking,
}: Props) {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const monthBookings = useMemo(
        () => bookings.filter(b => bookingOverlapsMonth(b, monthStart, monthEnd)),
        [bookings, monthStart, monthEnd]
    );

    const listingRows = useMemo(() => {
        const map = new Map<number, { id: number; title: string; items: AdminBookingRecord[] }>();
        for (const b of monthBookings) {
            const id = b.phong?.maPhong ?? 0;
            const title = b.phong?.tieuDe || `Listing #${id || '?'}`;
            if (!map.has(id)) map.set(id, { id, title, items: [] });
            map.get(id)!.items.push(b);
        }
        return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title, 'vi'));
    }, [monthBookings]);

    const weekdayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

    return (
        <div className="admin-panel shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b admin-subtle-border bg-gray-50/60 dark:bg-white/[0.03]">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => onViewMonthChange(subMonths(viewMonth, 1))}
                        className="p-2 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300"
                        aria-label="Tháng trước"
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
                        aria-label="Tháng sau"
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
                <p className="text-xs text-gray-500">
                    {monthBookings.length} đặt chỗ · {listingRows.length} listing trong tháng
                </p>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 px-4 py-2 border-b border-gray-100 text-xs">
                {(['cho_xac_nhan', 'da_xac_nhan', 'hoan_thanh', 'da_huy'] as const).map(key => {
                    const meta = getStatusMeta(key);
                    return (
                        <span key={key} className="inline-flex items-center gap-1.5 text-gray-600">
                            <span className={`w-3 h-3 rounded-sm border ${meta.cal}`} />
                            {meta.label}
                        </span>
                    );
                })}
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-max w-full border-collapse text-xs">
                    <thead>
                        <tr className="bg-gray-50/80">
                            <th className="sticky left-0 z-20 bg-gray-50/95 border-b border-r border-gray-100 px-3 py-2 text-left font-semibold text-gray-600 min-w-[200px] max-w-[240px]">
                                Listing
                            </th>
                            {days.map(day => (
                                <th
                                    key={day.toISOString()}
                                    className={`border-b border-gray-100 px-0 py-2 text-center font-medium min-w-[36px] w-9 ${
                                        isToday(day) ? 'bg-[#FF385C]/5 text-[#FF385C]' : 'text-gray-500'
                                    }`}
                                >
                                    <div>{format(day, 'd')}</div>
                                    <div className="text-[10px] font-normal opacity-70">
                                        {weekdayLabels[(day.getDay() + 6) % 7]}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {listingRows.length === 0 ? (
                            <tr>
                                <td colSpan={days.length + 1} className="px-6 py-16 text-center text-gray-400 italic">
                                    Không có đặt chỗ trong tháng này
                                </td>
                            </tr>
                        ) : (
                            listingRows.map(row => (
                                <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/40">
                                    <td className="sticky left-0 z-10 bg-white dark:bg-[#161616] border-r admin-subtle-border px-3 py-2 align-top">
                                        <p className="font-medium text-gray-900 truncate max-w-[220px]" title={row.title}>
                                            {row.title}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">#{row.id}</p>
                                    </td>
                                    {days.map(day => {
                                        const dayBookings = row.items.filter(b => isDayInStay(day, b));
                                        const primary = dayBookings[0];
                                        const meta = primary ? getStatusMeta(primary.trangThaiDatCho) : null;
                                        const isSelected = primary && selectedBookingId === primary.maDatCho;
                                        return (
                                            <td
                                                key={day.toISOString()}
                                                className={`border-r border-gray-50 p-0.5 align-middle h-10 ${
                                                    isToday(day) ? 'bg-[#FF385C]/[0.03]' : ''
                                                }`}
                                            >
                                                {primary ? (
                                                    <button
                                                        type="button"
                                                        title={`#${primary.maDatCho} · ${meta?.label}`}
                                                        onClick={() => onSelectBooking(primary)}
                                                        className={`w-full h-8 rounded-md border text-[10px] font-semibold truncate px-0.5 transition-all ${meta?.cal} ${
                                                            isSelected ? 'ring-2 ring-[#FF385C] ring-offset-1' : 'hover:opacity-90'
                                                        }`}
                                                    >
                                                        {dayBookings.length > 1 ? `+${dayBookings.length}` : ''}
                                                    </button>
                                                ) : null}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Agenda strip — bookings in month */}
            <div className="border-t admin-subtle-border px-4 py-3 bg-gray-50/40 dark:bg-white/[0.02]">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Lịch trình trong tháng</p>
                <div className="space-y-2 max-h-[220px] overflow-y-auto">
                    {monthBookings.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">Không có đơn nào</p>
                    ) : (
                        [...monthBookings]
                            .sort((a, b) => (a.ngayNhanPhong ?? '').localeCompare(b.ngayNhanPhong ?? ''))
                            .map(b => {
                                const meta = getStatusMeta(b.trangThaiDatCho);
                                const selected = selectedBookingId === b.maDatCho;
                                const nights = getNightCount(b.ngayNhanPhong, b.ngayTraPhong);
                                const guestNight =
                                    ` · ${formatGuestBreakdownShort(b)}` +
                                    (nights != null ? ` · ${nights} đêm` : '');
                                return (
                                    <button
                                        key={b.maDatCho}
                                        type="button"
                                        onClick={() => onSelectBooking(b)}
                                        className={`w-full text-left flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                                            selected
                                                ? 'border-[#FF385C] bg-white dark:bg-[#1f1f1f] shadow-sm'
                                                : 'border-gray-100 dark:border-[#2a2a2a] bg-white dark:bg-[#161616] hover:border-gray-200 dark:hover:border-[#333]'
                                        }`}
                                    >
                                        <AdminUserAvatar person={b.nguoiDat} size={36} />
                                        <span className={`w-1.5 self-stretch rounded-full shrink-0 ${meta.dot}`} />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                #{b.maDatCho} · {b.phong?.tieuDe || 'Listing'}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0.5">
                                                <VerifiedName
                                                    name={resolvePersonName(b.nguoiDat, `Khách #${b.maKhach}`)}
                                                    verified={b.nguoiDat?.xacMinhDanhTinh}
                                                    className="text-xs text-gray-500"
                                                    badgeClassName="w-3 h-3"
                                                />
                                                {b.phong?.chuNha && (
                                                    <>
                                                        <span className="text-gray-300">·</span>
                                                        <span className="text-gray-400">Host:</span>
                                                        <VerifiedName
                                                            name={resolvePersonName(b.phong.chuNha, '—')}
                                                            verified={b.phong.chuNha.xacMinhDanhTinh}
                                                            className="text-xs text-gray-500"
                                                            badgeClassName="w-3 h-3"
                                                        />
                                                    </>
                                                )}
                                            </p>
                                            <p className="text-[11px] text-gray-400 mt-0.5">
                                                {b.ngayNhanPhong ? format(new Date(b.ngayNhanPhong), 'dd/MM/yyyy') : '—'}
                                                {' → '}
                                                {b.ngayTraPhong ? format(new Date(b.ngayTraPhong), 'dd/MM/yyyy') : '—'}
                                                {guestNight}
                                            </p>
                                        </div>
                                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.className}`}>
                                            {meta.label}
                                        </span>
                                    </button>
                                );
                            })
                    )}
                </div>
            </div>
        </div>
    );
}
