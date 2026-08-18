'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function VNPayReturnContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
    const [responseCode, setResponseCode] = useState<string>('');

    useEffect(() => {
        const syncStatus = async () => {
            try {
                const query = searchParams.toString();
                if (!query) { setStatus('failed'); return; }

                const vnp_ResponseCode = searchParams.get('vnp_ResponseCode');
                setResponseCode(vnp_ResponseCode || '');

                const backendUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
                const response = await fetch(`${backendUrl}/payment/vnpay/return?${query}`, { cache: 'no-store', method: 'GET' });

                if (!response.ok) { setStatus('failed'); return; }

                const result = await response.json();

                if (vnp_ResponseCode === '00' || result.status === 'success') {
                    setStatus('success');
                } else {
                    setStatus('failed');
                }
            } catch {
                setStatus('failed');
            }
        };
        syncStatus();
    }, [searchParams]);

    if (status === 'loading') {
        return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C]" /></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
                <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${status === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {status === 'success' ? (
                        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                </div>
                <h1 className={`text-2xl font-bold mb-2 ${status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {status === 'success' ? 'Thanh toán thành công!' : 'Thanh toán thất bại'}
                </h1>
                <p className="text-gray-600 mb-6">
                    {status === 'success'
                        ? 'Thanh toán của bạn đã được xử lý. Đơn đặt phòng đang chờ xác nhận.'
                        : responseCode === '24' ? 'Bạn đã hủy giao dịch.' : `Giao dịch không thành công. Mã lỗi: ${responseCode}`}
                </p>
                <div className="flex gap-3 justify-center">
                    <button onClick={() => router.push('/profile?tab=chuyen-di')} className="px-6 py-3 bg-[#FF385C] text-white rounded-lg font-semibold hover:bg-[#E31C5F]">Xem chuyến đi</button>
                </div>
            </div>
        </div>
    );
}

export default function VNPayReturnPage() {
    return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C]" /></div>}><VNPayReturnContent /></Suspense>;
}
