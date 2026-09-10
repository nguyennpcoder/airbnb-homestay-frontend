'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';

function CommunityCommitmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) {
      router.push('/login');
    }
  }, [userId, router]);

  const handleAccept = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/auth/accept-community-commitment?userId=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        // After accepting, direct user to a page telling them to check email
        router.push(`/verify-email/sent?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      } else {
        setError(data.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
      }
    } catch (err) {
      setError('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = () => {
    // Handle decline - could redirect back or show message
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-white pt-20">
      <Header />
      
      <div className="pt-20 pb-12">
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] px-4">
          <div className="w-full max-w-[568px] bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            {/* Logo */}
            <div className="mb-8">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-[#FF385C] rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">A</span>
                </div>
                <span className="text-xl font-bold text-[#FF385C]">airbnb</span>
              </Link>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-semibold text-gray-900 mb-6">
              Cam kết cộng đồng của chúng tôi
            </h1>

            {/* Main Statement */}
            <p className="text-xl font-semibold text-gray-900 mb-6">
              Airbnb là nơi mà tất cả mọi người đều có thể cảm thấy là một cộng đồng dành cho họ.
            </p>

            {/* Commitment Details */}
            <div className="mb-6 space-y-4 text-gray-700">
              <p>
                Để đảm bảo điều này, chúng tôi đề nghị bạn cam kết như sau:
              </p>
              <p>
                Tôi đồng ý sẽ đối xử với tất cả mọi người trong cộng đồng Airbnb một cách tôn trọng và không phán xét hay thành kiến, bất kể chủng tộc, tôn giáo, nguồn gốc quốc gia, dân tộc, màu da, tình trạng khuyết tật, giới tính, bản dạng giới, khuynh hướng tình dục hoặc tuổi tác.
              </p>
            </div>

            {/* Learn More Link */}
            <div className="mb-8">
              <button className="text-[#FF385C] font-semibold hover:underline flex items-center space-x-1">
                <span>Tìm hiểu thêm</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleAccept}
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#E61E4D] via-[#D70466] to-[#BD1E59] hover:from-[#D70466] hover:via-[#BD1E59] hover:to-[#A61E4D] text-white font-semibold py-3 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Đang xử lý...' : 'Đồng ý và tiếp tục'}
              </button>

              <button
                onClick={handleDecline}
                disabled={loading}
                className="w-full bg-white border-2 border-gray-900 text-gray-900 font-semibold py-3 rounded-lg transition-all hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Từ chối
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default function CommunityCommitmentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <CommunityCommitmentContent />
    </Suspense>
  );
}

