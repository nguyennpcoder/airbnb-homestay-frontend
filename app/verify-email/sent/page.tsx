'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function VerifyEmailSentPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="pt-20 pb-12">
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] px-4">
          <div className="w-full max-w-[568px] bg-white rounded-2xl shadow-lg p-8 border border-gray-100 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Hãy kiểm tra email của bạn
            </h1>
            <p className="text-gray-600 mb-6">
              Chúng tôi đã gửi cho bạn một email để xác nhận địa chỉ email. Vui lòng mở email và nhấn vào nút xác nhận để hoàn tất.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Sau khi xác nhận, trang sẽ hiển thị thành công và tự chuyển đến hồ sơ.
            </p>
            <div className="flex justify-center gap-3">
              <Link href="/" className="px-5 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Về trang chủ</Link>
              <a href="https://mail.google.com" target="_blank" className="px-5 py-3 rounded-lg bg-[#FF385C] text-white font-semibold hover:opacity-90">Mở Gmail</a>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}


