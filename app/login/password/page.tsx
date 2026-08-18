'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { authAPI } from '@/lib/api';

function PasswordLoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') || '';
  const callbackUrl = params.get('callbackUrl') || '/';
  const isAdmin = (params.get('admin') === '1') || email.toLowerCase() === 'admin@airbnb.com.vn';
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!email) router.replace('/login');
  }, [email, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) { setError('Vui lòng nhập mật khẩu'); return; }
    setLoading(true);
    setError('');
    try {
      const data = await authAPI.login(email, password);
      // Data might have user object or direct fields
      const user = data?.user || data;
      const userId = user?.maNguoiDung || data?.userId;

      if (userId) {
        // Use laAdmin from user object or direct field, fall back to email check
        const isUserAdmin = user?.laAdmin === true || data?.laAdmin === true || email.toLowerCase() === 'admin@airbnb.com.vn';

        if (isUserAdmin) {
          // Admin login - store non-sensitive info in localStorage
          const adminEmail = user?.email || data?.email || email;
          localStorage.setItem('adminEmail', adminEmail);
          localStorage.setItem('adminId', String(userId));
          localStorage.setItem('isAdmin', 'true');

          // Also set adminToken for AdminGuard check
          localStorage.setItem('adminToken', data.token || 'true');

          // Clear user info
          localStorage.removeItem('userEmail');
          localStorage.removeItem('userId');
        } else {
          // Regular user login - store non-sensitive info in localStorage
          const userEmail = user?.email || data?.email || email;
          localStorage.setItem('userEmail', userEmail);
          localStorage.setItem('userId', String(userId));

          // Clear admin info
          localStorage.removeItem('adminEmail');
          localStorage.removeItem('adminId');
          localStorage.removeItem('isAdmin');
        }

        if (data.token) {
          localStorage.setItem('token', data.token);
        }

        // Redirect based on role
        router.replace(isUserAdmin ? '/admin' : callbackUrl);
      } else {
        setError(data.message || 'Sai mật khẩu.');
      }
    } catch (e: any) {
      const locked = e?.response?.data?.locked === true;
      const message = locked
        ? (e?.response?.data?.message || 'Tài khoản đã bị khóa. Vui lòng liên hệ admin@airbnb.com.vn để được hỗ trợ mở lại.')
        : (e.response?.data?.message || 'Sai mật khẩu hoặc tài khoản chưa sẵn sàng.');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="pt-20 pb-12">
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] px-0 md:px-4">
          <div className="w-full max-w-[568px] bg-white md:rounded-2xl md:shadow-lg p-6 md:p-8 border-0 md:border border-gray-100">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6">Nhập mật khẩu</h1>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Email</label>
                <input value={email} readOnly className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Mật khẩu</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:border-transparent" />
                <div className="mt-2 text-right">
                  <Link href={`/login/forgot-password?email=${encodeURIComponent(email)}`} className="text-sm text-[#FF385C] hover:underline font-medium">
                    Quên mật khẩu?
                  </Link>
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-[#E61E4D] via-[#D70466] to-[#BD1E59] text-white font-semibold py-3 rounded-lg disabled:opacity-50">
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function PasswordLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <PasswordLoginContent />
    </Suspense>
  );
}


