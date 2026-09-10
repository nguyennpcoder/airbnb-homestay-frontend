'use client';
export const dynamic = 'force-dynamic';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo, Suspense } from 'react';
import ListingCard from '@/components/ListingCard';
import Footer from '@/components/Footer';
import Link from 'next/link';
import nextDynamic from 'next/dynamic';
import { phongAPI, getPhongId } from '@/lib/api';

// Dynamically import Map to avoid SSR issues with Leaflet
const Map = nextDynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  ),
});

interface Product {
  maPhong: number;
  maSanPham?: number;
  tieuDe: string;
  urlAnhChinh: string;
  giaMoiKhach: number;
  diemTrungBinh: number;
  soLuongDanhGia: number;
  duocKhachYeuThich?: boolean;
  laOriginal?: boolean;
  laPhoBien?: boolean;
  thanhPho?: string;
  quocGia?: string;
  viDo?: number;
  kinhDo?: number;
  hinhAnhs?: Array<{ urlHinhAnh: string }>;
  hostInfo?: {
    maNguoiDung?: number;
    hoTen: string;
    avatarUrl: string;
    congViec?: string;
    thanhPho?: string;
    soLuongDanhGia?: number;
    diemDanhGia?: number;
    soNamKinhNghiem?: number;
  };
}

function ListingsContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightedItemId, setHighlightedItemId] = useState<number | null>(null);

  const thanhPho = searchParams.get('thanhPho') ?? undefined;
  const loaiPhong = searchParams.get('loaiSanPham') || searchParams.get('loaiPhong') || searchParams.get('itemType') || undefined;
  const laOriginal = searchParams.get('laOriginal') === 'true';

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const data = await phongAPI.getAll({
          loaiPhong: loaiPhong,
          thanhPho: thanhPho,
        });
        let list = Array.isArray(data) ? data : [];
        if (laOriginal) {
          list = list.filter((item: any) => item?.laOriginal === true);
        }
        setProducts(list as any);
      } catch (error: any) {
        console.error('Không thể tải danh sách:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [thanhPho, loaiPhong, laOriginal]);

  const filterChips = useMemo(() => {
    const chips: string[] = [];
    if (loaiPhong) {
      chips.push(
        loaiPhong === 'noi_luu_tru'
          ? 'Nơi lưu trú'
          : loaiPhong === 'trai_nghiem'
            ? 'Trải nghiệm'
            : 'Dịch vụ'
      );
    }
    if (thanhPho) {
      chips.push(`Thành phố: ${thanhPho}`);
    }
    if (laOriginal) {
      chips.push('Airbnb Original');
    }
    return chips;
  }, [loaiPhong, thanhPho, laOriginal]);

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Header Spacer - Adjust based on your actual header height */}
      <div className="h-20"></div>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Panel: Listings */}
        <div className="w-full lg:w-[60%] xl:w-[55%] overflow-y-auto px-6 py-6 scrollbar-hide">
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-2">
              {products.length > 0 ? `Hơn ${products.length} chỗ ở` : '0 chỗ ở'} {thanhPho ? `tại ${thanhPho}` : ''}
            </p>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {thanhPho ? `Chỗ ở tại ${thanhPho}` : 'Kết quả tìm kiếm'}
            </h1>

            <div className="flex flex-wrap gap-2 text-sm text-gray-500">
              {filterChips.map((chip) => (
                <span
                  key={chip}
                  className="px-3 py-1 border border-gray-300 rounded-full cursor-pointer hover:border-black transition-colors"
                >
                  {chip}
                </span>
              ))}
              <span className="px-3 py-1 border border-gray-300 rounded-full cursor-pointer hover:border-black transition-colors">
                Giá
              </span>
              <span className="px-3 py-1 border border-gray-300 rounded-full cursor-pointer hover:border-black transition-colors">
                Loại nơi ở
              </span>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 aspect-[4/3] rounded-xl mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
              {products.map((product) => (
                <div
                  key={getPhongId(product)}
                  onMouseEnter={() => setHighlightedItemId(getPhongId(product))}
                  onMouseLeave={() => setHighlightedItemId(null)}
                >
                  <ListingCard
                    item={product}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <svg
                  viewBox="0 0 32 32"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-12 h-12 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M13 24a11 11 0 1 0 0-22 11 11 0 0 0 0 22zm8-3 9 9" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy kết quả nào</h2>
              <p className="text-gray-500 mb-8 max-w-md">
                Hiện tại không có chỗ ở nào phù hợp với các tiêu chí tìm kiếm của bạn.
                Hãy thử thay đổi hoặc xóa bớt bộ lọc để tìm kiếm thêm nhiều lựa chọn khác.
              </p>
              <div className="flex gap-4">
                <Link
                  href="/"
                  className="px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-all shadow-md active:scale-95"
                >
                  Quay về trang chủ
                </Link>
                <button
                  onClick={() => window.location.href = '/listings'}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all active:scale-95"
                >
                  Xóa tất cả bộ lọc
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Map (always rendered) */}
        <div className="w-full lg:w-[40%] xl:w-[45%] px-4 lg:px-6 mt-4 lg:mt-0">
          <div className="relative h-[400px] lg:h-[83vh] lg:sticky lg:top-34 rounded-2xl overflow-hidden shadow-md border border-gray-200 bg-white">
            <Map
              items={products}
              highlightedItemId={highlightedItemId}
              onItemHover={setHighlightedItemId}
            />
          </div>
        </div>
      </div>

      <div className="mt-8 border-t pt-8 px-6 lg:px-12">
        <Footer />
      </div>
    </main>
  );
}

export default function ListingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải...</div>}>
      <ListingsContent />
    </Suspense>
  );
}
