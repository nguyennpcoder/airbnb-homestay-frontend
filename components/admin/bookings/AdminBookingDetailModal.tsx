'use client';

import BackendImage from '@/components/BackendImage';
import Link from 'next/link';
import { AdminModalShell } from '@/components/admin/AdminModal';
import { getValidSrc } from '@/lib/image';
import AdminPersonCard from '@/components/admin/AdminPersonCard';
import {
    AdminBookingRecord,
    formatDate,
    formatTime,
    formatVND,
    getLoaiPhongLabel,
    getNightCount,
    getPaymentStatusLabel,
    getStatusMeta,
    parseGuestBreakdown,
} from './booking-utils';

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="py-2.5 border-b admin-subtle-border last:border-0">
            <p className="text-[11px] font-medium admin-muted uppercase tracking-wide">{label}</p>
            <div className="text-sm admin-heading mt-1 break-words">{value}</div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border admin-subtle-border overflow-hidden mb-3">
            <div className="px-4 py-2 bg-gray-50/80 dark:bg-white/[0.03] border-b admin-subtle-border">
                <h3 className="text-xs font-semibold admin-muted uppercase tracking-wider">{title}</h3>
            </div>
            <div className="px-4 py-1">{children}</div>
        </div>
    );
}

interface Props {
    booking: AdminBookingRecord | null;
    onClose: () => void;
}

export default function AdminBookingDetailModal({ booking, onClose }: Props) {
    if (!booking) return null;

    const statusMeta = getStatusMeta(booking.trangThaiDatCho);
    const nights = getNightCount(booking.ngayNhanPhong, booking.ngayTraPhong);
    const host = booking.phong?.chuNha;
    const guest = booking.nguoiDat;
    const guestBreakdown = parseGuestBreakdown(booking);

    const getActualTotal = () => {
        const payments = booking.payments || [];
        const confirmed = payments.filter((p: any) => p.status === 'DA_XAC_NHAN');
        if (confirmed.length > 0) return confirmed.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        const pending = payments.filter((p: any) => p.status === 'CHO_XAC_NHAN');
        if (pending.length > 0) return pending.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        const refunded = payments.filter((p: any) => ['HOAN_TIEN', 'YEU_CAU_HOAN_TIEN'].includes(p.status));
        if (refunded.length > 0) return refunded.reduce((sum: number, p: any) => sum + Math.abs(Number(p.amount || 0)), 0);
        return Number(booking.tongTien) || 0;
    };

    const actualTotal = getActualTotal();
    const nightCost = (booking.giaMoiKhach || 0) * (nights || 0);
    const cleaningFee = Number(booking.phiVeSinh) || 0;
    const serviceFee = Number(booking.phiDichVu) || Math.max(0, actualTotal - nightCost - cleaningFee);

    return (
        <AdminModalShell onClose={onClose} maxWidth="max-w-2xl">
            <div className="border-b admin-subtle-border pl-4 pr-12 py-3">
                <span className="admin-id-badge mb-1">Đặt chỗ #{booking.maDatCho}</span>
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold admin-heading">Chi tiết lịch trình</h2>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusMeta.className}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                        {statusMeta.label}
                    </span>
                    
                </div>
            </div>

            <div className="overflow-y-auto max-h-[calc(100vh-10rem)] px-4 py-3">
                <Section title="Lịch trình lưu trú">
                    <DetailRow
                        label="Check-in"
                        value={
                            <span className="font-semibold">
                                {formatDate(booking.ngayNhanPhong)}
                                {booking.gioBatDau ? ` · ${formatTime(booking.gioBatDau)}` : ''}
                            </span>
                        }
                    />
                    <DetailRow
                        label="Check-out"
                        value={
                            <span className="font-semibold">
                                {formatDate(booking.ngayTraPhong)}
                                {booking.gioKetThuc ? ` · ${formatTime(booking.gioKetThuc)}` : ''}
                            </span>
                        }
                    />
                    <DetailRow label="Số đêm" value={nights != null ? `${nights} đêm` : '—'} />
                    <DetailRow
                        label="Số khách"
                        value={
                            <div className="space-y-1.5">
                                {guestBreakdown.map(item => (
                                    <div key={item.label} className="flex justify-between gap-4 text-sm">
                                        <span className="text-gray-600">{item.label}</span>
                                        <span className="font-semibold tabular-nums">{item.count}</span>
                                    </div>
                                ))}
                                {guestBreakdown.length === 0 && <span>—</span>}
                                {booking.phong?.soKhachToiDa != null && (
                                    <p className="text-[11px] text-gray-400 pt-1">
                                        Sức chứa phòng: tối đa {booking.phong.soKhachToiDa} khách
                                    </p>
                                )}
                            </div>
                        }
                    />
                    <DetailRow label="Loại đặt chỗ" value={getLoaiPhongLabel(booking.loaiPhong)} />
                    <DetailRow label="Ngày tạo đơn" value={formatDate(booking.ngayTao, true)} />
                    <DetailRow label="Cập nhật" value={formatDate(booking.ngayCapNhat, true)} />
                </Section>

                <Section title="Phòng & Chủ nhà">
                    <div className="flex gap-3 py-3 border-b border-gray-100">
                        {booking.phong?.urlAnhChinh && (
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                <BackendImage src={getValidSrc(booking.phong.urlAnhChinh)} alt="" fill className="object-cover" sizes="64px" />
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900">{booking.phong?.tieuDe || '—'}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {[booking.phong?.thanhPho, booking.phong?.quocGia].filter(Boolean).join(', ') || '—'}
                            </p>
                            {booking.phong?.maPhong && (
                                <Link href={`/hosting/listings/${booking.phong.maPhong}`} className="text-xs font-semibold text-[#FF385C] hover:underline mt-1 inline-block">
                                    Xem listing →
                                </Link>
                            )}
                        </div>
                    </div>
                    {host && (
                        <AdminPersonCard
                            title="Chủ nhà"
                            person={host}
                            fallbackName="Chủ nhà"
                            phone={host.soDienThoai}
                            email={host.email}
                        />
                    )}
                    {booking.chinhSachHuy && <DetailRow label="Chính sách hủy" value={booking.chinhSachHuy.replace(/_/g, ' ')} />}
                </Section>

                <Section title="Khách đặt">
                    <AdminPersonCard
                        title="Khách"
                        person={guest}
                        fallbackName={`Khách #${booking.maKhach}`}
                        phone={guest?.soDienThoai}
                        email={guest?.email}
                    />
                    {booking.yeuCauDacBiet && !booking.yeuCauDacBiet.trim().startsWith('{') && (
                        <DetailRow label="Yêu cầu đặc biệt" value={<span className="italic text-gray-600">{booking.yeuCauDacBiet}</span>} />
                    )}
                </Section>

                <Section title="Thanh toán & Phí">
                    <DetailRow
                        label="Giá mỗi khách/đêm"
                        value={booking.giaMoiKhach != null ? formatVND(booking.giaMoiKhach) : '—'}
                    />
                    <DetailRow label="Tổng tiền" value={<span className="font-bold text-[#FF385C]">{formatVND(actualTotal)}</span>} />
                    <DetailRow label="Phí vệ sinh" value={cleaningFee > 0 ? formatVND(cleaningFee) : '—'} />
                    <DetailRow label="Phí dịch vụ" value={serviceFee > 0 ? formatVND(serviceFee) : '—'} />
                    <DetailRow label="Tiền tệ" value={booking.tienTe || 'VND'} />
                    {booking.payments && booking.payments.length > 0 ? (
                        <div className="py-2 space-y-2">
                            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Giao dịch thanh toán</p>
                            {booking.payments.map(p => (
                                <div key={p.id} className="text-xs bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                                    <div className="flex justify-between gap-2">
                                        <span className="font-mono text-gray-600">#{p.id}</span>
                                        <span className="font-semibold text-gray-900">{formatVND(p.amount)}</span>
                                    </div>
                                    <p className="text-gray-500 mt-1">
                                        {p.provider} · {getPaymentStatusLabel(p.status)}
                                        {p.transactionId ? ` · ${p.transactionId}` : ''}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <DetailRow label="Giao dịch" value={<span className="text-gray-400 italic">Chưa có bản ghi payment</span>} />
                    )}
                </Section>

                {booking.trangThaiDatCho === 'da_huy' && (
                    <Section title="Thông tin hủy">
                        <DetailRow label="Tiền hoàn lại" value={booking.tienHoanLai != null ? formatVND(booking.tienHoanLai) : '—'} />
                        <DetailRow label="Lý do hủy" value={booking.lyDoHuy || '—'} />
                    </Section>
                )}
            </div>

            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] hover:bg-gray-50 dark:hover:bg-white/5 admin-heading"
                >
                    Đóng
                </button>
            </div>
        </AdminModalShell>
    );
}
