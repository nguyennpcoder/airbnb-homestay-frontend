'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { authAPI } from '@/lib/api';

function OtpVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneNumber = searchParams.get('phone') || '';
  const email = searchParams.get('email') || '';
  const callbackUrl = searchParams.get('callbackUrl') || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugOtp, setDebugOtp] = useState('');
  const [copied, setCopied] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!phoneNumber || !email) {
      router.push('/login');
      return;
    }
    inputRefs.current[0]?.focus();
    // Fetch OTP from DB
    authAPI.getLatestOtp(email).then(res => {
      if (res?.otp) setDebugOtp(res.otp);
    }).catch(() => {});
  }, [phoneNumber, email, router]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    setError('');

    // Auto-submit if all 6 digits are filled
    const code = newOtp.join('');
    if (code.length === 6) {
      handleVerify(code);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
    setOtp(newOtp);

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();

    if (newOtp.join('').length === 6) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleVerify = async (codeOverride?: string) => {
    const otpCode = typeof codeOverride === 'string' ? codeOverride : otp.join('');
    if (otpCode.length !== 6) {
      setError('Vui lòng nhập đủ 6 số');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await authAPI.verifyOtp(email, phoneNumber, otpCode);

      if (data.verified) {
        if (data.existingUser) {
          let redirectUrl = `/login/password?email=${encodeURIComponent(email)}`;
          if (callbackUrl) redirectUrl += `&callbackUrl=${encodeURIComponent(callbackUrl)}`;
          router.push(redirectUrl);
        } else {
          let redirectUrl = `/complete-registration?phone=${phoneNumber}&email=${encodeURIComponent(email)}`;
          if (callbackUrl) redirectUrl += `&callbackUrl=${encodeURIComponent(callbackUrl)}`;
          router.push(redirectUrl);
        }
      } else {
        setError(data.message || 'Mã OTP không hợp lệ hoặc đã hết hạn');
      }
    } catch (err: any) {
      console.error('OTP verification error:', err);
      setError(err.response?.data?.message || 'Không thể xác thực mã OTP. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      await authAPI.sendOtp(email, phoneNumber);
      setOtp(['', '', '', '', '', '']);
      setError('');
      inputRefs.current[0]?.focus();
      // Fetch fresh OTP from DB
      authAPI.getLatestOtp(email).then(res => {
        if (res?.otp) setDebugOtp(res.otp);
      }).catch(() => {});
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể gửi lại mã. Vui lòng thử lại.');
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
            <button
              onClick={() => router.back()}
              className="mb-6 text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Nhập mã xác nhận
            </h1>

            <p className="text-gray-600 mb-6">
              Chúng tôi đã gửi mã xác nhận 6 số đến email <span className="font-semibold">{email}</span>
            </p>

            {/* OTP Input */}
            <div className="flex justify-center space-x-2 mb-6">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="w-14 h-14 text-center text-2xl font-semibold border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#FF385C] focus:ring-2 focus:ring-[#FF385C]/20"
                />
              ))}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={() => handleVerify()}
              disabled={loading || otp.join('').length !== 6}
              className="w-full bg-gradient-to-r from-[#E61E4D] via-[#D70466] to-[#BD1E59] hover:from-[#D70466] hover:via-[#BD1E59] hover:to-[#A61E4D] text-white font-semibold py-3 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              {loading ? 'Đang xác thực...' : 'Xác thực'}
            </button>

            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Không nhận được mã?</p>
              <button
                onClick={handleResend}
                disabled={loading}
                className="text-sm font-semibold text-[#FF385C] hover:underline disabled:opacity-50"
              >
                Gửi lại mã
              </button>

              {debugOtp && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-600 mb-1.5 font-medium">Mã OTP (debug)</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl font-mono font-bold tracking-[0.3em] text-blue-700">{debugOtp}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(debugOtp);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="p-1.5 rounded-md hover:bg-blue-100 transition-colors"
                      title="Copy mã OTP"
                    >
                      {copied ? (
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
   
  
    </div>
  );
}

export default function OtpVerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <OtpVerifyContent />
    </Suspense>
  );
}
