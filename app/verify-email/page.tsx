'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { authAPI } from '@/lib/api';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    if (!token || hasRequestedRef.current) {
      return;
    }

    const verifyEmail = async () => {
      try {
        hasRequestedRef.current = true;
        const data = await authAPI.verifyEmailToken(token);

        if (data.verified) {
          // Clear any existing session first to avoid conflicts
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
          localStorage.removeItem('userEmail');

          // Save user session if provided
          if (data.userId) {
            localStorage.setItem('userId', data.userId.toString());
          }
          if (data.token) {
            localStorage.setItem('token', data.token);
          }

          setStatus('success');
          setMessage(data.message || 'Email đã được xác nhận thành công!');
        } else {
          setStatus('error');
          setMessage(data.message || 'Token không hợp lệ hoặc đã hết hạn');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Có lỗi xảy ra khi xác nhận email');
      }
    };

    verifyEmail();
  }, [token, router]);

  // Auto-redirect on success
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        router.push('/profile');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, router]);

  const hasToken = typeof window !== 'undefined' && localStorage.getItem('token');

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="pt-20 pb-12">
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] px-0 md:px-4">
          <div className="w-full max-w-[568px] bg-white md:rounded-2xl md:shadow-lg p-6 md:p-8 border-0 md:border border-gray-100 text-center">
            {status === 'loading' && (
              <>
                <div className="mb-6">
                  <div className="w-16 h-16 border-4 border-[#FF385C] border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                  Đang xác nhận email...
                </h1>
                <p className="text-gray-600">
                  Vui lòng đợi trong giây lát
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                  Xác nhận thành công!
                </h1>
                <p className="text-gray-600 mb-6">
                  {message}
                  <br />
                  <span className="text-sm text-gray-500 mt-2 block">
                    Đang chuyển hướng đến hồ sơ...
                  </span>
                </p>

                <Link
                  href="/profile"
                  className="inline-block bg-gradient-to-r from-[#E61E4D] via-[#D70466] to-[#BD1E59] hover:from-[#D70466] hover:via-[#BD1E59] hover:to-[#A61E4D] text-white font-semibold px-6 py-3 rounded-lg transition-all shadow-md hover:shadow-lg"
                >
                  Đi đến hồ sơ
                </Link>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                  Xác nhận thất bại
                </h1>
                <p className="text-gray-600 mb-6">
                  {message}
                </p>
                <Link
                  href="/login"
                  className="inline-block bg-gradient-to-r from-[#E61E4D] via-[#D70466] to-[#BD1E59] hover:from-[#D70466] hover:via-[#BD1E59] hover:to-[#A61E4D] text-white font-semibold px-6 py-3 rounded-lg transition-all shadow-md hover:shadow-lg"
                >
                  Quay lại đăng nhập
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C]"></div></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
