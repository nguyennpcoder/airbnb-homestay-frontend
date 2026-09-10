'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Icon
const FiGlobe = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

export default function Footer() {
  const pathname = usePathname();

  // Hide footer on admin, hosting, and search pages
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/hosting') || pathname === '/search' || pathname?.startsWith('/profile')) return null;

  return (
    <footer className="bg-white border-t border-gray-200 mt-20 mb-16 md:mb-0">
      <div className="container-custom py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Hỗ trợ */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Hỗ trợ</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li>
                <Link href="/help" prefetch={false} className="hover:underline">
                  Trung tâm trợ giúp
                </Link>
              </li>
              <li>
                <Link href="/safety" prefetch={false} className="hover:underline">
                  Yêu cầu trợ giúp về vấn đề an toàn
                </Link>
              </li>
              <li>
                <Link href="/aircover" prefetch={false} className="hover:underline">
                  AirCover
                </Link>
              </li>
              <li>
                <Link href="/discrimination" prefetch={false} className="hover:underline">
                  Chống phân biệt đối xử
                </Link>
              </li>
            </ul>
          </div>

          {/* Đón tiếp khách */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Đón tiếp khách</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li>
                <Link href="/host" prefetch={false} className="hover:underline">
                  Cho thuê nhà trên Airbnb
                </Link>
              </li>
              <li>
                <Link href="/experiences/host" prefetch={false} className="hover:underline">
                  Đưa trải nghiệm của bạn lên Airbnb
                </Link>
              </li>
              <li>
                <Link href="/services/host" prefetch={false} className="hover:underline">
                  Đưa dịch vụ của bạn lên Airbnb
                </Link>
              </li>
              <li>
                <Link href="/host/resources" prefetch={false} className="hover:underline">
                  Tài nguyên về đón tiếp khách
                </Link>
              </li>
            </ul>
          </div>

          {/* Airbnb */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Airbnb</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li>
                <Link href="/newsroom" prefetch={false} className="hover:underline">
                  Trang tin tức
                </Link>
              </li>
              <li>
                <Link href="/careers" prefetch={false} className="hover:underline">
                  Cơ hội nghề nghiệp
                </Link>
              </li>
              <li>
                <Link href="/investors" prefetch={false} className="hover:underline">
                  Nhà đầu tư
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>© 2025 Airbnb, Inc.</span>
              <Link href="/privacy" prefetch={false} className="hover:underline">
                Quyền riêng tư
              </Link>
              <Link href="/terms" prefetch={false} className="hover:underline">
                Điều khoản
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:shadow-md transition-shadow">
                <FiGlobe />
                <span className="text-sm font-semibold">Tiếng Việt (VN)</span>
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:shadow-md transition-shadow">
                <span className="text-sm font-semibold">₫ VND</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
