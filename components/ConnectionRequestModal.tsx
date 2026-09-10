'use client';

import React from 'react';
import BackendImage from '@/components/BackendImage';
import { getValidSrc } from '@/lib/image';
import { AdminModalShell } from '@/components/admin/AdminModal';

interface ConnectionRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    notification: {
        id: number;
        noiDung: string;
        trangThai: string;
        nguoiGui?: {
            maNguoiDung?: number;
            hoTen?: string;
            urlAnhDaiDien?: string;
        };
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
    };
    onAccept: (notificationId: number) => void;
    onReject: (notificationId: number) => void;
    isProcessing?: boolean;
}

export default function ConnectionRequestModal({
    isOpen,
    onClose,
    notification,
    onAccept,
    onReject,
    isProcessing = false,
}: ConnectionRequestModalProps) {
    if (!isOpen) return null;

    const fmt = (n?: number) => n ? new Intl.NumberFormat('vi-VN').format(n) : '';
    const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
    const nights = notification.datCho?.ngayNhanPhong && notification.datCho?.ngayTraPhong
        ? Math.max(1, Math.ceil((new Date(notification.datCho.ngayTraPhong).getTime() - new Date(notification.datCho.ngayNhanPhong).getTime()) / 86400000))
        : 0;

    return (
        <AdminModalShell onClose={onClose} maxWidth="max-w-md">
            <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl overflow-hidden">
                {/* Header with guest info */}
                <div className="relative px-6 py-4 border-b border-gray-100 dark:border-[#2a2a2a] bg-gray-50/60 dark:bg-white/[0.03]">
                    <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden border border-gray-200 dark:border-[#333]">
                                {notification.nguoiGui?.urlAnhDaiDien ? (
                                    <BackendImage src={getValidSrc(notification.nguoiGui.urlAnhDaiDien)} alt="" fill className="object-cover" sizes="48px" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-900 dark:bg-gray-800 text-white text-lg font-bold">
                                        {notification.nguoiGui?.hoTen?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                )}
                            </div>
                            {notification.trangThai === 'PENDING' && (
                                <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white dark:border-[#1e1e1e]" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                                {notification.nguoiGui?.hoTen || 'Khách'}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Yêu cầu kết nối trò chuyện</p>
                        </div>
                        {notification.trangThai !== 'PENDING' && (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${notification.trangThai === 'ACCEPTED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {notification.trangThai === 'ACCEPTED' ? 'Đã chấp nhận' : 'Đã từ chối'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {/* Message */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nội dung tin nhắn</label>
                        <div className="bg-gray-50 dark:bg-white/[0.03] rounded-xl p-4 border border-gray-100 dark:border-[#2a2a2a]">
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{notification.noiDung}</p>
                        </div>
                    </div>

                    {/* Booking info */}
                    {notification.datCho && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Thông tin đặt chỗ</label>
                            <div className="border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden">
                                <div className="flex gap-3 p-4">
                                    {notification.datCho.phong?.urlAnhChinh && (
                                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 relative flex-shrink-0">
                                            <BackendImage src={getValidSrc(notification.datCho.phong.urlAnhChinh)} alt="" fill className="object-cover" sizes="80px" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{notification.datCho.phong?.tieuDe}</h4>
                                        {notification.datCho.phong?.thanhPho && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{notification.datCho.phong.thanhPho}</p>
                                        )}
                                        <div className="mt-2 space-y-1.5">
                                            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                <span>{fmtDate(notification.datCho.ngayNhanPhong)} → {fmtDate(notification.datCho.ngayTraPhong)}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                <span>{notification.datCho.soLuongKhach || 1} khách · {nights} đêm</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {notification.datCho.tongTien && (
                                    <div className="px-4 py-3 border-t border-gray-100 dark:border-[#2a2a2a] bg-gray-50/60 dark:bg-white/[0.02] flex justify-between items-center">
                                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Tổng cộng</span>
                                        <span className="text-sm font-bold text-[#FF385C]">₫{fmt(Number(notification.datCho.tongTien))}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {notification.trangThai === 'PENDING' && (
                    <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-[#2a2a2a]">
                        <button onClick={() => onReject(notification.id)} disabled={isProcessing}
                            className="px-5 py-2 rounded-xl border border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 font-medium text-sm transition-colors disabled:opacity-50">
                            Từ chối
                        </button>
                        <button onClick={() => onAccept(notification.id)} disabled={isProcessing}
                            className="px-5 py-2 rounded-xl bg-[#FF385C] hover:bg-[#E31C5F] text-white font-medium text-sm transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center gap-2">
                            {isProcessing && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />}
                            {isProcessing ? 'Đang xử lý...' : 'Chấp nhận'}
                        </button>
                    </div>
                )}
            </div>
        </AdminModalShell>
    );
}
