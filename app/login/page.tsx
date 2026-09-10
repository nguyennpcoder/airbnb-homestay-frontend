'use client';

import { useMemo, useRef, useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';

import { authAPI } from '@/lib/api';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { firebaseApp } from '@/lib/firebaseClient';

type SocialProvider = 'google' | 'facebook' | 'github' | 'apple';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const [sessionCallback, setSessionCallback] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('authRedirect');
    if (stored) {
      sessionStorage.removeItem('authRedirect');
      setSessionCallback(stored);
    }
    const authMsg = sessionStorage.getItem('authMessage');
    if (authMsg) {
      sessionStorage.removeItem('authMessage');
      setError(authMsg);
    }
  }, []);

  const effectiveCallback = sessionCallback || callbackUrl;
  const [country, setCountry] = useState('VN');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const countries = [
    { code: 'VN', name: 'Việt Nam', dialCode: '+84' },
    { code: 'US', name: 'United States', dialCode: '+1' },
    { code: 'SG', name: 'Singapore', dialCode: '+65' },
    { code: 'TH', name: 'Thailand', dialCode: '+66' },
    { code: 'ID', name: 'Indonesia', dialCode: '+62' },
  ];

  const selectedCountry = countries.find(c => c.code === country) || countries[0];

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber.trim() || !email.trim()) {
      setError('Vui lòng nhập đầy đủ số điện thoại và email');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Email không hợp lệ');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const fullPhone = selectedCountry.dialCode + phoneNumber.replace(/^0+/, '');
      const res = await authAPI.sendOtp(email.trim(), fullPhone, selectedCountry.dialCode);
      let url = `/otp-verify?phone=${fullPhone}&email=${encodeURIComponent(email.trim())}&callbackUrl=${encodeURIComponent(effectiveCallback)}`;
      if (res?.otp) url += `&otp=${res.otp}`;
      router.push(url);
    } catch (err: any) {
      const locked = err?.response?.data?.locked === true;
      const data = err?.response?.data;
      const backendMsg =
        (typeof data === 'string' ? data : null) ||
        data?.message ||
        err?.message ||
        null;
      const status = err?.response?.status;
      let msg;
      if (locked) {
        msg = data?.message || 'Tài khoản đã bị khóa. Vui lòng liên hệ admin@airbnb.com.vn để được hỗ trợ mở lại.';
      } else if (err?.code === 'ERR_NETWORK' || !status) {
        msg = 'Không kết nối được tới máy chủ. Vui lòng thử lại sau vài phút (Render free tier có thể đang sleep).';
      } else if (status >= 500) {
        msg = `Máy chủ đang gặp sự cố (HTTP ${status}). Vui lòng thử lại sau.`;
      } else if (backendMsg) {
        msg = backendMsg;
      } else {
        msg = `[HTTP ${status}] Có lỗi xảy ra. Vui lòng thử lại.`;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const socialButtons = useMemo(
    () => [
      {
        key: 'google' as SocialProvider,
        label: 'Tiếp tục với Google',
        icon: (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        ),
      },
      {
        key: 'facebook' as SocialProvider,
        label: 'Tiếp tục với Facebook',
        icon: (
          <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        ),
      },
      {
        key: 'github' as SocialProvider,
        label: 'Tiếp tục với GitHub',
        icon: (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0a12 12 0 00-3.79 23.39c.6.11.82-.26.82-.58v-2.17c-3.34.73-4.04-1.61-4.04-1.61-.55-1.38-1.34-1.75-1.34-1.75-1.09-.74.08-.73.08-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.8 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.5.12-3.13 0 0 1.01-.32 3.3 1.23a11.4 11.4 0 016 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.63.24 2.83.12 3.13.77.84 1.23 1.91 1.23 3.22 0 4.62-2.81 5.64-5.49 5.94.43.37.82 1.1.82 2.22v3.29c0 .32.22.7.83.58A12 12 0 0012 0z" />
          </svg>
        ),
      },
      // {
      //   key: 'apple' as SocialProvider,
      //   label: 'Tiếp tục với Apple',
      //   icon: (
      //     <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      //       <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
      //     </svg>
      //   ),
      // },
    ],
    []
  );

  const handleSocialLogin = async (provider: SocialProvider) => {
    try {
      console.log(`🔐 Starting ${provider} login...`);
      setError('');
      setSocialLoading(provider);

      if (!firebaseApp) {
        throw new Error('Firebase app chưa được khởi tạo');
      }

      const auth = getAuth(firebaseApp);
      auth.useDeviceLanguage();
      console.log('✅ Firebase Auth initialized');

      const providerInstance = (() => {
        switch (provider) {
          case 'google':
            console.log('📱 Using Google provider');
            const google = new GoogleAuthProvider();
            google.addScope('email');
            google.addScope('profile');
            return google;
          case 'facebook':
            console.log('📱 Using Facebook provider');
            const fb = new FacebookAuthProvider();
            fb.addScope('email');
            fb.setCustomParameters({ display: 'popup' });
            return fb;
          case 'github':
            console.log('📱 Using GitHub provider');
            const gh = new GithubAuthProvider();
            gh.addScope('read:user');
            gh.addScope('user:email');
            return gh;
          case 'apple':
            console.log('📱 Using Apple provider');
            const apple = new OAuthProvider('apple.com');
            apple.addScope('email');
            apple.addScope('name');
            return apple;
        }
      })();

      console.log('🪟 Opening popup for authentication...');
      const result = await signInWithPopup(auth, providerInstance);
      console.log('✅ Popup authentication successful');

      // Log full user object for debugging
      console.log('👤 User object:', {
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        uid: result.user.uid,
        providerData: result.user.providerData
      });

      const firebaseToken = await result.user.getIdToken();

      // Try to get email from multiple sources
      let userEmail = result.user.email?.trim().toLowerCase();

      // Fallback 1: Try to get from providerData
      if (!userEmail && result.user.providerData && result.user.providerData.length > 0) {
        userEmail = result.user.providerData[0].email?.trim().toLowerCase();
        console.log('📧 Email from providerData:', userEmail);
      }

      // Fallback 2: For GitHub, try to get email from additional user info
      if (!userEmail && provider === 'github') {
        try {
          // Reload user to get fresh data
          await result.user.reload();
          userEmail = result.user.email?.trim().toLowerCase();
          console.log('📧 Email after reload:', userEmail);
        } catch (reloadError) {
          console.warn('Could not reload user:', reloadError);
        }
      }

      console.log('📧 Final email:', userEmail);

      if (!userEmail) {
        let errorMsg = 'Không tìm thấy email từ nhà cung cấp. ';
        if (provider === 'github') {
          errorMsg += 'Vui lòng đảm bảo email của bạn không bị "private" trong GitHub settings (Settings → Emails → bỏ chọn "Keep my email addresses private").';
        } else if (provider === 'facebook') {
          errorMsg += 'Vui lòng cấp quyền truy cập email khi đăng nhập Facebook.';
        } else {
          errorMsg += 'Vui lòng cấp quyền truy cập email.';
        }
        throw new Error(errorMsg);
      }

      const displayName =
        result.user.displayName ||
        userEmail?.split('@')[0] ||
        'Khách';
      const avatarUrl = result.user.photoURL || '';
      const providerUid = result.user.uid;

      localStorage.setItem('userEmail', userEmail);
      localStorage.setItem('userDisplayName', displayName);
      if (avatarUrl) {
        localStorage.setItem('userAvatar', avatarUrl);
      }

      let backendUserId: string | null = providerUid;
      let backendToken: string | null = firebaseToken;

      try {
        console.log('🔄 Syncing with backend...');
        const data = await authAPI.socialLogin({
          email: userEmail,
          displayName,
          avatarUrl,
          provider,
          providerUid,
          phoneNumber: result.user.phoneNumber || undefined,
        });

        console.log('✅ Backend sync successful:', data);
        const user = data?.user || data;
        if (user?.maNguoiDung) {
          backendUserId = String(user.maNguoiDung);
        }
        if (user?.hoTen) {
          localStorage.setItem('userDisplayName', user.hoTen);
        }
        if (user?.email) {
          localStorage.setItem('userEmail', user.email);
        }
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
      } catch (syncError: any) {
        console.error('❌ Backend sync error:', syncError);
        // Note: Token is already set as HttpOnly cookie by backend social-login endpoint
      }

      if (backendUserId) {
        localStorage.setItem('userId', backendUserId);
      }

      console.log('✅ Login successful, redirecting to homepage...');
      router.replace(effectiveCallback);
    } catch (err: any) {
      console.error('❌ Social login error:', err);
      // Check if account is locked (from backend 403 response)
      const locked = err?.response?.data?.locked === true;
      const message = locked
        ? (err?.response?.data?.message || 'Tài khoản đã bị khóa. Vui lòng liên hệ admin@airbnb.com.vn để được hỗ trợ mở lại.')
        : err instanceof FirebaseError
          ? mapFirebaseAuthError(err)
          : err instanceof Error
            ? err.message
            : 'Không thể đăng nhập bằng mạng xã hội. Vui lòng thử lại.';
      setError(message);
    } finally {
      setSocialLoading(null);
    }
  };

  const handleEmailShortcut = () => {
    const input = emailInputRef.current;
    if (input) {
      input.focus();
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const mapFirebaseAuthError = (firebaseError: FirebaseError) => {
    if (firebaseError.code === 'auth/popup-blocked') {
      return 'Trình duyệt đã chặn cửa sổ đăng nhập. Vui lòng mở popup.';
    }
    if (firebaseError.code === 'auth/popup-closed-by-user') {
      return 'Bạn đã đóng cửa sổ đăng nhập trước khi hoàn tất.';
    }
    if (firebaseError.code === 'auth/account-exists-with-different-credential') {
      return 'Email này đã được liên kết với nhà cung cấp khác. Vui lòng đăng nhập bằng phương thức trước đó.';
    }
    return firebaseError.message || 'Không thể đăng nhập bằng mạng xã hội.';
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="pt-20 pb-12">
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] px-0 md:px-4">
          {/* Login Card */}
          <div className="w-full max-w-[568px] bg-white md:rounded-2xl md:shadow-lg p-6 md:p-8 border-0 md:border border-gray-100">
            {/* Back button — only when redirected from a specific page */}
            {effectiveCallback && effectiveCallback !== '/' && (
              <button
                type="button"
                onClick={() => router.push(effectiveCallback)}
                className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Quay lại
              </button>
            )}

            {/* Title */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                Đăng nhập hoặc đăng ký
              </h1>
            </div>

            {/* Welcome Message */}
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Chào mừng bạn đến với Airbnb
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleContinue} className="space-y-6">
              {/* Country/Region Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quốc gia/Khu vực
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg flex items-center justify-between hover:border-gray-400 transition-colors bg-white"
                  >
                    <span>{selectedCountry.name} ({selectedCountry.dialCode})</span>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showCountryDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {countries.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            setCountry(c.code);
                            setShowCountryDropdown(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between"
                        >
                          <span>{c.name}</span>
                          <span className="text-gray-500">{c.dialCode}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Phone Number Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Nhập số điện thoại"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
                  required
                />
              </div>

              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập địa chỉ email"
                  ref={emailInputRef}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:border-transparent"
                  required
                />
              </div>

              {/* Privacy Policy */}
              <p className="text-xs text-gray-600 leading-relaxed">
                Chúng tôi sẽ gửi mã xác nhận 6 số đến email của bạn để xác thực tài khoản.{' '}
                <Link href="/privacy" className="underline hover:text-gray-900">
                  Chính sách về quyền riêng tư
                </Link>
              </p>

              {/* Continue Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#E61E4D] via-[#D70466] to-[#BD1E59] hover:from-[#D70466] hover:via-[#BD1E59] hover:to-[#A61E4D] text-white font-semibold py-3 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Đang gửi...' : 'Tiếp tục'}
              </button>
            </form>

            {/* Separator */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">hoặc</span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="space-y-3">
              {socialButtons.map((btn) => (
                <button
                  key={btn.key}
                  onClick={() => handleSocialLogin(btn.key)}
                  disabled={socialLoading === btn.key}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg flex items-center space-x-3 hover:border-gray-400 transition-colors bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {btn.icon}
                  <span className="font-medium text-gray-700">
                    {socialLoading === btn.key ? 'Đang xử lý...' : btn.label}
                  </span>
                </button>
              ))}

              {/* Apple - coming soon */}
              <button
                type="button"
                disabled
                className="w-full px-4 py-3 border border-gray-200 rounded-lg flex items-center space-x-3 bg-gray-50 text-gray-400 cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                <div className="flex flex-col text-left">
                  <span className="font-medium">Tiếp tục với Apple</span>
                  <span className="text-xs">Sắp ra mắt</span>
                </div>
              </button>

              {/* Email shortcut */}
              <button
                type="button"
                onClick={handleEmailShortcut}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg flex items-center space-x-3 hover:border-gray-400 transition-colors bg-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="font-medium text-gray-700">Tiếp tục bằng email</span>
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

