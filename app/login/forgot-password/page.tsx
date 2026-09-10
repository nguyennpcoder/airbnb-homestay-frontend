'use client';
export const dynamic = 'force-dynamic';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { authAPI } from '@/lib/api';

function ForgotPasswordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const initialEmail = params.get('email') || '';
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const handleRequestTempPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Vui lòng nhập email'); return; }
    setLoading(true);
    setError('');
    setTempPassword('');
    try {
      const data = await authAPI.forgotPassword(email.trim());
      if (data?.tempPassword) {
        setTempPassword(data.tempPassword);
      } else {
        setError(data?.message || 'Không thể tạo mật khẩu tạm thời');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không tìm thấy tài khoản với email này');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetPassword = () => {
    router.push(`/login/reset-password?email=${encodeURIComponent(email)}&tempPassword=${encodeURIComponent(tempPassword)}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="pt-20 pb-12">
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] px-0 md:px-4">
          <div className="w-full max-w-[568px] bg-white md:rounded-2xl md:shadow-lg p-6 md:p-8 border-0 md:border border-gray-100">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Quên mật khẩu</h1>
            <p className="text-gray-500 text-sm mb-6">
              Nhập email đã đăng ký để nhận mật khẩu tạm thời. Mật khẩu tạm thời sẽ hiển thị ngay trên trang này.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
            )}

            {!tempPassword ? (
              <form onSubmit={handleRequestTempPassword} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Nhập email đã đăng ký"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#E61E4D] via-[#D70466] to-[#BD1E59] text-white font-semibold py-3 rounded-lg disabled:opacity-50"
                >
                  {loading ? 'Đang gửi...' : 'Gửi mật khẩu tạm thời'}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 text-sm font-semibold mb-2">Mật khẩu tạm thời của bạn:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-lg font-mono font-bold text-green-800 bg-white px-3 py-2 rounded border border-green-300 select-all">
                      {tempPassword}
                    </code>
                    <button
                      onClick={handleCopy}
                      className="px-3 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors"
                    >
                      {copied ? 'Đã copy' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-green-600 text-xs mt-2">Sao chép mật khẩu tạm thời và nhấn bên dưới để đặt mật khẩu mới.</p>
                </div>
                <button
                  onClick={handleResetPassword}
                  className="w-full bg-gradient-to-r from-[#E61E4D] via-[#D70466] to-[#BD1E59] text-white font-semibold py-3 rounded-lg"
                >
                  Đặt mật khẩu mới
                </button>
                <button
                  onClick={() => { setTempPassword(''); setError(''); }}
                  className="w-full border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50"
                >
                  Gửi lại mật khẩu tạm thời
                </button>
              </div>
            )}

            <div className="mt-6 text-center">
              <Link href={`/login/password?email=${encodeURIComponent(email)}`} className="text-sm text-gray-500 hover:text-gray-900 hover:underline">
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

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
