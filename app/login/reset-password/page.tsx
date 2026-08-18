'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { authAPI } from '@/lib/api';

function ResetPasswordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') || '';
  const tempPassword = params.get('tempPassword') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!email || !tempPassword) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="pt-20 pb-12">
          <div className="flex items-center justify-center min-h-[calc(100vh-200px)] px-0 md:px-4">
            <div className="w-full max-w-[568px] bg-white md:rounded-2xl md:shadow-lg p-6 md:p-8 border-0 md:border border-gray-100 text-center">
              <h1 className="text-2xl font-semibold text-gray-900 mb-4">Liên kết không hợp lệ</h1>
              <p className="text-gray-500 mb-6">Vui lòng quay lại trang quên mật khẩu để bắt đầu lại.</p>
              <Link href="/login" className="inline-block bg-gradient-to-r from-[#E61E4D] via-[#D70466] to-[#BD1E59] text-white font-semibold py-3 px-8 rounded-lg">
                Về trang đăng nhập
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) { setError('Vui lòng nhập mật khẩu mới'); return; }
    if (newPassword.length < 8) { setError('Mật khẩu mới phải có ít nhất 8 ký tự'); return; }
    if (newPassword !== confirmPassword) { setError('Mật khẩu xác nhận không khớp'); return; }
    setLoading(true);
    setError('');
    try {
      await authAPI.resetPassword(email, tempPassword, newPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="pt-20 pb-12">
          <div className="flex items-center justify-center min-h-[calc(100vh-200px)] px-0 md:px-4">
            <div className="w-full max-w-[568px] bg-white md:rounded-2xl md:shadow-lg p-6 md:p-8 border-0 md:border border-gray-100 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Đặt lại mật khẩu thành công!</h1>
              <p className="text-gray-500 mb-6">Mật khẩu của bạn đã được cập nhật. Vui lòng đăng nhập lại.</p>
              <Link
                href={`/login/password?email=${encodeURIComponent(email)}`}
                className="inline-block bg-gradient-to-r from-[#E61E4D] via-[#D70466] to-[#BD1E59] text-white font-semibold py-3 px-8 rounded-lg"
              >
                Đăng nhập ngay
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="pt-20 pb-12">
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] px-0 md:px-4">
          <div className="w-full max-w-[568px] bg-white md:rounded-2xl md:shadow-lg p-6 md:p-8 border-0 md:border border-gray-100">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Đặt mật khẩu mới</h1>
            <p className="text-gray-500 text-sm mb-6">
              Nhập mật khẩu tạm thời và mật khẩu mới (ít nhất 8 ký tự).
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Email</label>
                <input value={email} readOnly className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Mật khẩu tạm thời</label>
                <input value={tempPassword} readOnly className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 font-mono" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Mật khẩu mới</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ít nhất 8 ký tự"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#E61E4D] via-[#D70466] to-[#BD1E59] text-white font-semibold py-3 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Đang xử lý...' : 'Đặt mật khẩu mới'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 hover:underline">
                Quay lại đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
