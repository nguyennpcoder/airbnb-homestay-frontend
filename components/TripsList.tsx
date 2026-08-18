'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Modal } from 'antd';
import { bookingAPI, paymentAPI, reviewsAPI } from '@/lib/api';
import { getPricingRules } from '@/lib/priceCalc';
import { getValidSrc } from '@/lib/image';
import toast from 'react-hot-toast';
import ReviewModal from './modals/ReviewModal';

interface TripsListProps {
    userId: number;
}

export default function TripsList({ userId }: TripsListProps) {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'canceled'>('upcoming');
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [refundReason, setRefundReason] = useState('');
    const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
    const [previewAmount, setPreviewAmount] = useState<number | null>(null);
    const [cancellingId, setCancellingId] = useState<number | null>(null);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewingBooking, setReviewingBooking] = useState<{ id: number; phongId: number } | null>(null);
    const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<number>>(new Set());
    const [reviewIdsByBooking, setReviewIdsByBooking] = useState<Record<number, number>>({});
    const router = useRouter();

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const res = await bookingAPI.byUser(userId);
            setBookings(Array.isArray(res) ? res : []);
        } catch {
            toast.error('Không thể tải chuyến đi');
        } finally {
            setLoading(false);
        }
    };

    const fetchReviews = async () => {
        if (!userId) return;
        try {
            const reviews: any[] = await reviewsAPI.listByUser(userId);
            const ids = new Set<number>();
            const map: Record<number, number> = {};
            reviews.forEach(r => {
                if (r.maDatCho) {
                    ids.add(Number(r.maDatCho));
                    map[Number(r.maDatCho)] = Number(r.maDanhGia);
                }
            });
            setReviewedBookingIds(ids);
            setReviewIdsByBooking(map);
        } catch {}
    };

    useEffect(() => { if (userId) fetchBookings(); }, [userId]);

    useEffect(() => {
        if (!userId) return;
        fetchReviews();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    // Re-fetch on tab switch
    useEffect(() => { if (userId) fetchBookings(); }, [activeTab]);

    // Auto-refresh every 8 seconds to catch scheduler changes
    useEffect(() => {
        if (!userId) return;
        const interval = setInterval(() => {
            bookingAPI.byUser(userId).then(data => {
                if (Array.isArray(data)) setBookings(data);
            }).catch(() => {});
        }, 8000);
        return () => clearInterval(interval);
    }, [userId]);

    const now = new Date();

    const filteredBookings = bookings.filter(b => {
        const checkOut = b.ngayTraPhong ? new Date(b.ngayTraPhong) : null;
        const isCanceled = b.trangThaiDatCho === 'da_huy';
        const isPast = checkOut ? new Date(checkOut).setHours(0,0,0,0) < new Date(now).setHours(0,0,0,0) : false;

        if (activeTab === 'canceled') return isCanceled;
        if (activeTab === 'past') {
            return !isCanceled && (
                b.trangThaiDatCho === 'hoan_thanh' || 
                b.trangThaiDatCho === 'da_hoan_thanh' || 
                (b.trangThaiDatCho === 'da_xac_nhan' && isPast)
            );
        }
        if (activeTab === 'upcoming') {
            return !isCanceled && 
                !isPast && 
                b.trangThaiDatCho !== 'hoan_thanh' && 
                b.trangThaiDatCho !== 'da_hoan_thanh' && 
                (b.trangThaiDatCho === 'cho_xac_nhan' || b.trangThaiDatCho === 'da_xac_nhan');
        }
        return false;
    });

    const getDisplayStatus = (b: any): { text: string; cls: string } => {
        const s = b.trangThaiDatCho;
        if (s === 'da_huy') return { text: 'Đã hủy', cls: 'bg-red-100 text-red-700' };
        if (s === 'hoan_thanh' || s === 'da_hoan_thanh') return { text: 'Hoàn thành', cls: 'bg-green-100 text-green-700' };
        if (s === 'da_xac_nhan') return { text: 'Đã xác nhận', cls: 'bg-blue-100 text-blue-700' };
        if (s === 'cho_xac_nhan') return { text: 'Chờ xác nhận', cls: 'bg-amber-100 text-amber-700' };
        return { text: s || 'Không rõ', cls: 'bg-gray-100 text-gray-600' };
    };

    const getRefundInfo = (b: any) => {
        if (b.trangThaiDatCho !== 'da_huy') return null;
        const payments = b.payments || [];
        const hasRefunded = payments.some((p: any) => p.status === 'HOAN_TIEN');
        const hasPending = payments.some((p: any) => p.status === 'YEU_CAU_HOAN_TIEN');

        // Refund = total - service fee (service fee is non-refundable)
        const total = getActualTotal(b);
        const svcFee = Number(b.phiDichVu) || calcServiceFee(b);
        const refundAmount = Math.max(0, Math.round(total - svcFee));

        if (hasRefunded) return { label: 'Đã hoàn tiền', cls: 'bg-green-100 text-green-700', amount: refundAmount };
        if (hasPending) return { label: 'Chờ hoàn tiền', cls: 'bg-amber-100 text-amber-700', amount: refundAmount };
        return { label: 'Đã hủy', cls: 'bg-red-100 text-red-700', amount: refundAmount };
    };

    const fmt = (n?: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0));
    const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

    const calcNights = (b: any) => {
        if (b.ngayNhanPhong && b.ngayTraPhong) {
            return Math.max(1, Math.ceil((new Date(b.ngayTraPhong).getTime() - new Date(b.ngayNhanPhong).getTime()) / 86400000));
        }
        return 0;
    };
    const getActualTotal = (b: any) => {
        // For cancelled bookings, use tongTien directly to avoid double-counting
        // (backend creates both original payment + refund record under HOAN_TIEN status)
        if (b.trangThaiDatCho === 'da_huy') {
            return Number(b.tongTien) || 0;
        }
        const payments = b.payments || [];
        const confirmed = payments.filter((p: any) => p.status === 'DA_XAC_NHAN');
        if (confirmed.length > 0) return confirmed.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        const pending = payments.filter((p: any) => p.status === 'CHO_XAC_NHAN');
        if (pending.length > 0) return pending.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        return Number(b.tongTien) || 0;
    };
    const calcServiceFee = (b: any) => {
        const phiDichVu = Number(b.phiDichVu) || 0;
        if (phiDichVu > 0) return phiDichVu;
        // Fallback: service fee theo ty_le_phi_dich_vu (admin cấu hình, mặc định 10%)
        const total = getActualTotal(b);
        const phiVeSinh = Number(b.phiVeSinh) || 0;
        const roomCost = Math.max(0, total - phiVeSinh);
        const svc = Math.round((roomCost + phiVeSinh) * getPricingRules().tyLePhiDichVu);
        return svc > 0 ? svc : 0;
    };
    const calcCleaningFee = (b: any) => Number(b.phiVeSinh) || 0;
    const calcNightCost = (b: any) => {
        const giaMoiKhach = Number(b.giaMoiKhach) || 0;
        const nts = calcNights(b);
        return giaMoiKhach * nts;
    };

    const calcRefundAmount = (b: any) => {
        const total = getActualTotal(b);
        const svcFee = Number(b.phiDichVu) || calcServiceFee(b);
        // Refund = total - service fee (service fee is non-refundable)
        return Math.max(0, Math.round(total - svcFee));
    };

    const handleRefund = async (id: number) => {
        const bk = bookings.find(b => b.maDatCho === id);
        setSelectedBookingId(id);
        setRefundReason('');
        setPreviewAmount(bk ? calcRefundAmount(bk) : 0);
        setShowRefundModal(true);
    };

    const submitRefund = async () => {
        if (!selectedBookingId) return;
        try {
            setCancellingId(selectedBookingId);
            const res = await paymentAPI.requestRefundToBalance(selectedBookingId, refundReason);
            const refunded = Number(res?.refundAmount) || 0;
            toast.success(refunded > 0 ? `Đã hoàn ${fmt(refunded)} ₫ vào ví` : 'Đã hủy đặt phòng');
            setActiveTab('canceled');
            fetchBookings();
            setShowRefundModal(false);
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Gửi yêu cầu thất bại');
        } finally {
            setCancellingId(null);
        }
    };

    const tabs = [
        { key: 'upcoming' as const, label: 'Sắp tới' },
        { key: 'past' as const, label: 'Đã hoàn thành' },
        { key: 'canceled' as const, label: 'Đã hủy' },
    ];

    if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF385C]" /></div>;

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key)}
                        className={`pb-3 px-4 text-sm font-medium transition-colors relative ${activeTab === t.key ? 'text-black' : 'text-gray-500 hover:text-gray-700'}`}>
                        {t.label}
                        {activeTab === t.key && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-black" />}
                    </button>
                ))}
            </div>

            {/* Empty */}
            {filteredBookings.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                    <p className="text-gray-500 mb-3">Chưa có chuyến đi nào trong mục này</p>
                    <button onClick={() => router.push('/')} className="px-5 py-2 bg-[#FF385C] text-white rounded-full text-sm font-semibold hover:bg-[#E31C5F] transition">
                        Khám phá ngay
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredBookings.map(b => {
                        const st = getDisplayStatus(b);
                        const refund = getRefundInfo(b);
                        const checkOut = b.ngayTraPhong ? new Date(b.ngayTraPhong) : null;
                        return (
                            <div key={b.maDatCho}
                                className="flex flex-col md:flex-row border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition bg-white">
                                <div className="relative h-40 md:h-auto md:w-56 flex-shrink-0 bg-gray-100">
                                    {b.phong?.urlAnhChinh ? (
                                        <Image src={getValidSrc(b.phong.urlAnhChinh)} alt="" fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">🏠</div>
                                    )}
                                </div>
                                <div className="p-4 flex flex-col flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <div>
                                            <p className="text-[11px] text-gray-400 font-medium">#{b.maDatCho}</p>
                                            <h3 className="font-semibold text-sm text-gray-900 line-clamp-1">{b.phong?.tieuDe}</h3>
                                            <p className="text-xs text-gray-500 mt-0.5">{b.phong?.thanhPho}{b.phong?.quocGia ? `, ${b.phong.quocGia}` : ''}</p>
                                        </div>
                                        <span className={`shrink-0 ml-3 px-2 py-0.5 rounded-full text-[11px] font-bold ${st.cls}`}>{st.text}</span>
                                    </div>

                                    <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-[11px] text-gray-400 mb-0.5">Ngày đi</p>
                                            <p className="font-medium text-gray-900">{fmtDate(b.ngayNhanPhong)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-gray-400 mb-0.5">Ngày về</p>
                                            <p className="font-medium text-gray-900">{fmtDate(b.ngayTraPhong)}</p>
                                        </div>
                                    </div>

                                    {/* Cancelled → show refund info */}
                                    {b.trangThaiDatCho === 'da_huy' && refund && (() => {
                                        const nts = calcNights(b);
                                        const svcFee = Number(b.phiDichVu) || calcServiceFee(b);
                                        const total = getActualTotal(b);
                                        // Refund = total - service fee
                                        const refundable = Math.max(0, Math.round(total - svcFee));
                                        return (
                                        <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${refund.cls}`}>{refund.label}</span>
                                                {refund.amount > 0 && (
                                                    <span className="text-sm font-bold text-green-600">{fmt(refund.amount)} ₫</span>
                                                )}
                                            </div>
                                            {b.lyDoHuy && <p className="text-[11px] text-gray-500">Lý do: {b.lyDoHuy}</p>}
                                            <div className="pt-2 border-t border-gray-200 space-y-1 text-[11px] text-gray-500">
                                                <div className="flex justify-between">
                                                    <span>Tổng thanh toán</span>
                                                    <span className="font-medium text-gray-700">{fmt(total)} ₫</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Phí dịch vụ (không hoàn)</span>
                                                    <span className="font-medium text-gray-700">-{fmt(svcFee)} ₫</span>
                                                </div>
                                                <div className="flex justify-between pt-1 border-t border-gray-200 font-semibold text-gray-700">
                                                    <span>Tổng đã thanh toán</span>
                                                    <span>{fmt(total)} ₫</span>
                                                </div>
                                                <div className="flex justify-between font-semibold text-green-600">
                                                    <span>Số tiền hoàn lại</span>
                                                    <span>{fmt(refund.amount)} ₫</span>
                                                </div>
                                                <p className="text-[10px] text-gray-400 italic">
                                                    Phí dịch vụ không được hoàn tiền theo chính sách nền tảng.
                                                </p>
                                            </div>
                                        </div>
                                        );
                                    })()}

                                    {/* Non-cancelled → show payment info */}
                                    {b.trangThaiDatCho !== 'da_huy' && (
                                        <div className="mt-2 flex justify-between items-center">
                                            <span className="text-xs text-gray-500">Tổng cộng</span>
                                            <span className="text-sm font-bold text-gray-900">{fmt(getActualTotal(b))} ₫</span>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="mt-3 flex justify-end gap-2">
                                        {b.trangThaiDatCho === 'cho_xac_nhan' && (
                                            <button onClick={() => router.push(`/payment?bookingId=${b.maDatCho}`)}
                                                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#FF385C] rounded-lg hover:bg-[#E31C5F] transition">
                                                Tiếp tục thanh toán
                                            </button>
                                        )}
                                        {b.trangThaiDatCho === 'da_xac_nhan' && checkOut && checkOut >= now && (
                                            <button onClick={() => handleRefund(b.maDatCho)}
                                                className="px-3 py-1.5 text-xs font-semibold text-[#FF385C] border border-[#FF385C] rounded-lg hover:bg-red-50 transition">
                                                Hủy & hoàn tiền
                                            </button>
                                        )}
                                        {(b.trangThaiDatCho === 'hoan_thanh' || (b.trangThaiDatCho === 'da_xac_nhan' && checkOut && checkOut < now)) && (
                                            reviewedBookingIds.has(b.maDatCho) ? (
                                                (b.phong?.maPhong ?? b.phong?.maSanPham) && (
                                                    <Link href={`/phong/${b.phong.maPhong ?? b.phong.maSanPham}?scrollToReview=${reviewIdsByBooking[b.maDatCho] ?? ''}`}
                                                        className="px-3 py-1.5 text-xs font-semibold text-[#FF385C] border border-[#FF385C] rounded-lg hover:bg-red-50 transition inline-block">
                                                        Xem đánh giá
                                                    </Link>
                                                )
                                            ) : (
                                                <button onClick={() => { setReviewingBooking({ id: b.maDatCho, phongId: b.phong?.maPhong }); setShowReviewModal(true); }}
                                                    className="px-3 py-1.5 text-xs font-semibold text-black border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                                                    Viết đánh giá
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Refund Modal */}
            {showRefundModal && selectedBookingId && (() => {
                const bk = bookings.find(b => b.maDatCho === selectedBookingId);
                if (!bk) return null;
                const total = getActualTotal(bk);
                const svcFee = Number(bk.phiDichVu) || calcServiceFee(bk);
                const clFee = calcCleaningFee(bk);
                const nts = calcNights(bk);
                const roomCost = Math.max(0, total - svcFee - clFee);
                const pricePerGuest = Number(bk.giaMoiKhach) || 0;
                const adults = bk.soNguoiLon || bk.soLuongKhach || 1;
                const children = bk.soTreEm || 0;
                const infants = bk.soEmBe || 0;
                const { tyLeNguoiLon, tyLeTreEm } = getPricingRules();
                const adultsCost = Math.round(pricePerGuest * tyLeNguoiLon) * adults * nts;
                const childrenCost = Math.round(pricePerGuest * tyLeTreEm) * children * nts;
                const infantsCost = 0;
                // Refund = total - service fee (service fee is non-refundable)
                const refundAmt = Math.max(0, Math.round(total - svcFee));
                return (
                <Modal
                    open={showRefundModal}
                    onCancel={() => setShowRefundModal(false)}
                    footer={null}
                    width={480}
                    centered
                    closeIcon={<div className="p-2 rounded-full hover:bg-gray-100 transition"><svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', fill: 'none', height: '16px', width: '16px', stroke: 'currentColor', strokeWidth: 3, overflow: 'visible' }}><path d="m6 6 20 20m0-20-20 20"></path></svg></div>}
                    className="refund-modal"
                    styles={{ content: { borderRadius: 32, overflow: 'hidden' }, body: { padding: 24, maxHeight: '85vh', overflowY: 'auto' } }}
                >
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Yêu cầu hoàn tiền</h3>
                            <p className="text-xs text-gray-500 mt-1">Chi tiết về số tiền bạn sẽ nhận lại</p>
                        </div>

                            {/* Breakdown */}
                            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                                {adults > 0 && (() => {
                                    const { tyLeNguoiLon } = getPricingRules();
                                    return (
                                        <div className="flex justify-between text-gray-600">
                                            <span>₫{fmt(Math.round(pricePerGuest * tyLeNguoiLon))} × {adults} người lớn × {nts} đêm</span>
                                            <span className="font-medium text-gray-700">{fmt(adultsCost)} ₫</span>
                                        </div>
                                    );
                                })()}
                                {children > 0 && (() => {
                                    const { tyLeTreEm } = getPricingRules();
                                    const discountPercent = Math.round((1 - tyLeTreEm) * 100);
                                    return (
                                        <div className="flex justify-between text-gray-600">
                                            <span>₫{fmt(Math.round(pricePerGuest * tyLeTreEm))} × {children} trẻ em (giảm {discountPercent}%) × {nts} đêm</span>
                                            <span className="font-medium text-gray-700">{fmt(childrenCost)} ₫</span>
                                        </div>
                                    );
                                })()}
                                {infants > 0 && (
                                    <div className="flex justify-between text-gray-600">
                                        <span>₫0 × {infants} em bé × {nts} đêm</span>
                                        <span className="text-gray-400">Miễn phí</span>
                                    </div>
                                )}
                                {clFee > 0 && (
                                    <div className="flex justify-between text-gray-600">
                                        <span>Phí vệ sinh</span>
                                        <span className="font-medium text-gray-700">{fmt(clFee)} ₫</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-gray-600">
                                    <span>Phí dịch vụ</span>
                                    <span className="font-medium text-gray-700">{fmt(svcFee)} ₫</span>
                                </div>
                                <hr className="border-gray-200" />
                                <div className="flex justify-between font-semibold text-gray-900">
                                    <span>Tổng thanh toán</span>
                                    <span>{fmt(total)} ₫</span>
                                </div>
                                <hr className="border-gray-200" />
                                <div className="flex justify-between text-red-600">
                                    <span>Phí dịch vụ (không hoàn)</span>
                                    <span>-{fmt(svcFee)} ₫</span>
                                </div>
                                <div className="flex justify-between font-bold text-green-600 text-lg pt-1">
                                    <span>Số tiền hoàn lại</span>
                                    <span>{fmt(refundAmt)} ₫</span>
                                </div>
                            </div>

                            <p className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
                                Số tiền hoàn được tính theo chính sách hủy của chỗ ở. Phí dịch vụ nền tảng không được hoàn tiền. Số tiền thực tế có thể thay đổi tùy thời điểm.
                            </p>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Lý do hủy <span className="text-red-500">*</span></label>
                                <textarea value={refundReason} onChange={e => setRefundReason(e.target.value)}
                                    placeholder="Vui lòng nhập lý do cụ thể..." rows={3}
                                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF385C]/20 resize-none" />
                            </div>

                            <div className="flex gap-3 pb-1">
                                <button onClick={() => setShowRefundModal(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-50">Hủy</button>
                                <button onClick={submitRefund} disabled={!refundReason.trim() || cancellingId !== null}
                                    className="flex-1 py-2.5 bg-[#FF385C] text-white rounded-xl text-sm font-bold hover:bg-[#E31C5F] disabled:opacity-50">
                                    {cancellingId ? 'Đang xử lý...' : 'Xác nhận hủy'}
                                </button>
                            </div>
                        </div>
                </Modal>
                );
            })()}

            {reviewingBooking && (
                <ReviewModal isOpen={showReviewModal}
                    onClose={() => { setShowReviewModal(false); setReviewingBooking(null); }}
                    phongId={reviewingBooking.phongId} maKhach={userId} maDatCho={reviewingBooking.id}
                    onSuccess={() => { toast.success('Đã đánh giá!'); setShowReviewModal(false); if (reviewingBooking) setReviewedBookingIds(prev => new Set([...prev, reviewingBooking.id])); setReviewingBooking(null); fetchBookings(); fetchReviews(); }} />
            )}
        </div>
    );
}
