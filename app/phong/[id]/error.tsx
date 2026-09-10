'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProductDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('[ProductDetailPage] Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
      <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h2 className="text-xl font-semibold text-gray-700">Đã xảy ra lỗi</h2>
      <p className="text-gray-500 text-center max-w-md">
        {error?.message || 'Không thể tải trang phòng. Vui lòng thử lại.'}
      </p>
      <div className="flex gap-3 mt-2">
        <button
          onClick={() => reset()}
          className="px-6 py-2.5 bg-[#FF385C] text-white rounded-lg font-semibold hover:bg-[#D90B3E] transition"
        >
          Thử lại
        </button>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-2.5 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
        >
          Về trang chủ
        </button>
      </div>
    </div>
  );
}
