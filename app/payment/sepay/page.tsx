'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { paymentAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const SEPAY_LOGO = 'https://sepay.vn/assets/img/logo/sepay-820x820-blue-icon.png';

function SePayContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const bookingId = searchParams.get('bookingId');
    const paymentId = searchParams.get('paymentId');
    const code = searchParams.get('code');
    const amount = searchParams.get('amount');
    const qrUrl = searchParams.get('qrUrl');
    const accountNumber = searchParams.get('accountNumber');
    const bankCode = searchParams.get('bankCode');
    const accountHolder = searchParams.get('accountHolder');

    const [status, setStatus] = useState<'waiting' | 'confirmed' | 'failed'>('waiting');
    const [countdown, setCountdown] = useState(600);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!paymentId) return;
        let redirected = false;
        const interval = setInterval(async () => {
            try {
                const res = await paymentAPI.checkSePayStatus(Number(paymentId));
                if (res.status === 'DA_XAC_NHAN' && !redirected) {
                    redirected = true;
                    clearInterval(interval);
                    toast.success('Thanh toán thành công!');
                    window.location.href = '/profile?tab=chuyen-di';
                }
            } catch {}
        }, 2000);
        return () => clearInterval(interval);
    }, [paymentId]);

    useEffect(() => {
        if (status !== 'waiting') return;
        const timer = setInterval(() => {
            setCountdown(prev => (prev <= 1 ? (clearInterval(timer), 0) : prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [status]);

    const fmt = (n: string | null) => n ? new Intl.NumberFormat('vi-VN').format(Number(n)) : '';

    const copyCode = () => {
        if (code) {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (status === 'confirmed') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50 pt-16 pb-4">
                <div className="bg-white rounded-2xl p-10 shadow-lg text-center max-w-md">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                        <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Thanh toán thành công!</h2>
                    <p className="text-gray-500 mb-6">Đơn đặt phòng của bạn đã được xác nhận.</p>
                    <button onClick={() => router.push('/profile?tab=chuyen-di')}
                        className="px-8 py-3 bg-[#FF385C] text-white rounded-xl font-semibold hover:bg-[#E31C5F] transition">
                        Xem chuyến đi
                    </button>
                </div>
            </div>
        );
    }

    const mins = Math.floor(countdown / 60);
    const secs = countdown % 60;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-blue-50 to-white pt-16 pb-4 px-4 overflow-y-auto">
            <div className="w-full max-w-md">
                {/* SePay logo */}
                <div className="text-center mb-4">
                    <img src={SEPAY_LOGO} alt="SePay" className="w-14 h-14 mx-auto rounded-xl shadow-sm" />
                </div>

                {/* Main card */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                    {/* Amount */}
                    <div className="bg-gradient-to-r from-[#0066FF] to-[#0052CC] text-white p-5 text-center">
                        <p className="text-sm opacity-80 mb-1">Số tiền thanh toán</p>
                        <p className="text-3xl font-bold tracking-tight">{fmt(amount)} ₫</p>
                        <p className="text-xs opacity-60 mt-2">Đơn hàng #{bookingId}</p>
                    </div>

                    <div className="p-5 space-y-4">
                        {/* QR Code */}
                        {qrUrl && (
                            <div className="flex flex-col items-center">
                                <div className="bg-white p-3 rounded-2xl shadow-md border border-gray-100 w-full">
                                    <img src={qrUrl} alt="QR thanh toán" className="w-full h-auto" />
                                </div>
                                <p className="text-xs text-gray-400 mt-2">Mở app ngân hàng → Quét mã QR</p>
                            </div>
                        )}

                        {/* Bank info */}
                        <div className="bg-gray-50 rounded-xl p-3.5 space-y-1.5">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">Ngân hàng</span>
                                <span className="text-sm font-semibold text-gray-800">{bankCode}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">Số tài khoản</span>
                                <span className="text-sm font-semibold text-gray-800">{accountNumber}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">Chủ tài khoản</span>
                                <span className="text-sm font-semibold text-gray-800">{accountHolder}</span>
                            </div>
                        </div>

                        {/* Transfer content */}
                        <div>
                            <p className="text-xs text-gray-400 mb-1.5">Nội dung chuyển khoản (bắt buộc)</p>
                            <button onClick={copyCode}
                                className="w-full flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 hover:bg-blue-100 transition group">
                                <span className="font-mono text-sm font-bold text-blue-700">{code}</span>
                                <span className="text-xs text-blue-500 group-hover:text-blue-700">
                                    {copied ? '✓ Đã copy' : '📋 Copy'}
                                </span>
                            </button>
                            <p className="text-xs text-red-400 mt-1">⚠️ Nhập đúng nội dung CK để hệ thống tự xác nhận</p>
                        </div>

                        {/* Countdown */}
                        <div className="text-center bg-orange-50 rounded-xl py-2.5 px-4">
                            <div className="flex items-center justify-center gap-2">
                                <svg className="w-4 h-4 text-orange-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm text-orange-700 font-medium">
                                    Còn lại <span className="font-mono font-bold">{mins}:{secs.toString().padStart(2, '0')}</span>
                                </span>
                            </div>
                            <p className="text-xs text-orange-400 mt-0.5">Hệ thống tự xác nhận sau khi nhận tiền</p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-3 space-y-2">
                    <button onClick={() => router.back()}
                        className="w-full py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-white transition">
                        Quay lại trang thanh toán
                    </button>
                    {process.env.NODE_ENV === 'development' && (
                        <button onClick={() => router.push('/payment/sepay/test-webhook')}
                            className="w-full py-2.5 bg-orange-50 text-orange-600 rounded-xl text-sm font-semibold hover:bg-orange-100 transition border border-orange-200">
                            🧪 Test Webhook
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function SePayPage() {
    return (
        <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50 pt-16 pb-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066FF]" /></div>}>
            <SePayContent />
        </Suspense>
    );
}
