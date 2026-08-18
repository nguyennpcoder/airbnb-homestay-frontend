'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

function CompleteRegistrationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneNumber = searchParams.get('phone') || '';
  const emailFromUrl = searchParams.get('email') || '';
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  
  const [ho, setHo] = useState('');
  const [ten, setTen] = useState('');
  const [ngaySinh, setNgaySinh] = useState('');
  const [email, setEmail] = useState(emailFromUrl || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nhanTinNhanTiepThi, setNhanTinNhanTiepThi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!phoneNumber) {
      router.push('/login');
    }
    if (emailFromUrl) {
      setEmail(emailFromUrl);
    }
  }, [phoneNumber, emailFromUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!phoneNumber) {
        setError('Số điện thoại không hợp lệ');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`/api/auth/complete-registration?soDienThoai=${encodeURIComponent(phoneNumber)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ho,
          ten,
          ngaySinh: ngaySinh || null,
          email,
          matKhau: password,
          nhanTinNhanTiepThi,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Navigate to community commitment page
        router.push(`/community-commitment?userId=${data.maNguoiDung}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
      } else {
        // Handle validation errors
        if (data.errors && Array.isArray(data.errors)) {
          setError(data.errors.map((e: any) => e.defaultMessage || e.message).join(', '));
        } else if (data.message) {
          setError(data.message);
        } else {
          setError('Có lỗi xảy ra. Vui lòng kiểm tra lại thông tin.');
        }
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="pt-20 pb-12">
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] px-4">
          <div className="w-full max-w-[568px] bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <button
              onClick={() => router.back()}
              className="mb-6 text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <h1 className="text-2xl font-semibold text-gray-900 mb-8 text-center">
              Hoàn tất đăng ký
            </h1>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Tên pháp nhân */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Tên pháp nhân</h2>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tên trên giấy tờ tùy thân
                    </label>
                    <input
                      type="text"
                      value={ho}
                      onChange={(e) => setHo(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Họ trên giấy tờ tùy thân
                    </label>
                    <input
                      type="text"
                      value={ten}
                      onChange={(e) => setTen(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
                      required
                    />
                  </div>
                </div>
                
                <p className="text-sm text-gray-600">
                  Đảm bảo rằng tên bạn nhập khớp với tên trên giấy tờ tùy thân do chính phủ cấp. Nếu sử dụng tên khác, bạn có thể{' '}
                  <button type="button" className="underline hover:text-gray-900">
                    thêm tên ưa dùng
                  </button>.
                </p>
              </div>

              {/* Ngày sinh */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ngày sinh
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={ngaySinh}
                    onChange={(e) => setNgaySinh(e.target.value)}
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:border-transparent pr-12"
                    required
                  />
                  <svg 
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Để đăng ký, bạn phải đủ 18 tuổi trở lên. Ngày sinh của bạn sẽ không được chia sẻ với người dùng Airbnb khác.
                </p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
                  required
                />
                <p className="text-sm text-gray-600 mt-2">
                  Chúng tôi sẽ gửi phiếu thu và xác nhận chuyến đi qua email cho bạn.
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu (ít nhất 8 ký tự)"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m13.42 13.42l-3.29-3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Mật khẩu phải có ít nhất 8 ký tự.
                </p>
              </div>

              {/* Terms and Privacy */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700 leading-relaxed">
                  Bằng việc chọn Đồng ý và tiếp tục, tôi đồng ý với{' '}
                  <button type="button" className="underline hover:text-gray-900">Điều khoản dịch vụ</button>,{' '}
                  <button type="button" className="underline hover:text-gray-900">Điều khoản dịch vụ thanh toán</button>{' '}
                  và <button type="button" className="underline hover:text-gray-900">Chính sách không phân biệt</button>{' '}
                  của Airbnb, đồng thời chấp thuận{' '}
                  <button type="button" className="underline hover:text-gray-900">Chính sách về quyền riêng tư</button>.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#E61E4D] via-[#D70466] to-[#BD1E59] hover:from-[#D70466] hover:via-[#BD1E59] hover:to-[#A61E4D] text-white font-semibold py-3 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Đang xử lý...' : 'Đồng ý và tiếp tục'}
              </button>

              {/* Marketing Preferences */}
              <div className="border-t border-gray-200 pt-6">
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  Airbnb sẽ gửi cho bạn các ưu đãi chỉ dành cho thành viên, bài viết truyền cảm hứng, email tiếp thị và thông báo đẩy. Bạn có thể chọn không nhận các thông tin này bất kỳ lúc nào trong cài đặt tài khoản của mình hoặc trực tiếp từ thông báo tiếp thị.
                </p>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!nhanTinNhanTiepThi}
                    onChange={(e) => setNhanTinNhanTiepThi(!e.target.checked)}
                    className="mt-1 w-5 h-5 text-[#FF385C] border-gray-300 rounded focus:ring-[#FF385C]"
                  />
                  <span className="text-sm text-gray-700">
                    Tôi không muốn nhận tin nhắn tiếp thị từ Airbnb.
                  </span>
                </label>
              </div>
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function CompleteRegistrationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <CompleteRegistrationContent />
    </Suspense>
  );
}

