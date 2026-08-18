'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import api from '@/lib/api';
import EmptyState from './EmptyState';
import { FavoritesSkeleton } from './ProfileSkeleton';

interface FavoriteItem {
  maPhong: number;
  /** @deprecated use maPhong */
  maSanPham?: number;
  tieuDe: string;
  urlAnhChinh: string;
  giaMoiKhach: number;
  diemTrungBinh: number;
  soLuongDanhGia: number;
  thanhPho?: string;
  quocGia?: string;
  loaiPhong?: string;
  /** @deprecated use loaiPhong */
  loaiSanPham?: string;
}

interface FavoritesListProps {
  favorites: FavoriteItem[];
  onRemove?: (maPhong: number) => void;
}

const FiHeart = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const FiStar = ({ className, size }: { className?: string; size?: number }) => (
  <svg className={className} width={size || 14} height={size || 14} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

// Slashed Heart icon to represent "remove from favorites"
const FiHeartOff = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path
      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M4 20L20 4" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

import Pagination from './Pagination';

export default function FavoritesList({ favorites: initialFavorites, onRemove }: FavoritesListProps) {
  const [favorites, setFavorites] = useState(initialFavorites);
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Simulate loading if no initial favorites but maybe we are fetching?
  // Actually initialFavorites comes from parent, but let's add a loading prop if needed.
  // For now, let's just use it if initialFavorites is null/undefined during fetch.

  // Update local state when props change
  useEffect(() => {
    setFavorites(initialFavorites);
  }, [initialFavorites]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price).replace(/\s/g, '');
  };

  const getImageUrl = (url: string) => {
    if (!url) return '/placeholder-image.jpg';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads')) return url;
    return url;
  };

  const getItemId = (item: FavoriteItem) => item.maPhong ?? item.maSanPham!;

  const handleRemove = async (id: number) => {
    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    if (!userId) return;

    setRemovingId(id);

    try {
      await api.post(`/yeu-thich/toggle`, null, {
        params: { userId, phongId: id }
      });

      // Xóa khỏi danh sách local
      setFavorites(prev => {
        const newFavorites = prev.filter(item => getItemId(item) !== id);
        // Adjust current page if empty
        const totalPages = Math.ceil(newFavorites.length / ITEMS_PER_PAGE);
        if (currentPage > totalPages && totalPages > 0) {
          setCurrentPage(totalPages);
        }
        return newFavorites;
      });

      // Callback để parent component cập nhật
      if (onRemove) {
        onRemove(id);
      }
    } catch (error) {
      console.error('Lỗi khi xóa yêu thích:', error);
    } finally {
      setRemovingId(null);
    }
  };

  if (favorites.length === 0) {
    return (
      <EmptyState
        title="Chưa có mục yêu thích nào"
        subtitle="Khi bạn duyệt qua các nơi ở, hãy nhấp vào biểu tượng trái tim để lưu những nơi bạn thích vào danh sách này."
        icon={<FiHeart className="w-10 h-10 text-[#FF385C]" />}
        showReset
        resetLabel="Bắt đầu khám phá"
      />
    );
  }

  const totalPages = Math.ceil(favorites.length / ITEMS_PER_PAGE);
  const currentFavorites = favorites.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {favorites.length} mục yêu thích
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Những nơi bạn đã lưu
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 min-h-[500px]">
        {currentFavorites.map((item, index) => (
          <div
            key={getItemId(item)}
            className={`group relative transition-all duration-300 animate-slideInUp ${removingId === getItemId(item) ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
              }`}
            style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'both' }}
          >
            <Link
              href={`/phong/${getItemId(item)}`}
              className="block"
            >
              {/* Image Container */}
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-3 bg-gray-200">
                {item.urlAnhChinh ? (
                  <Image
                    src={getImageUrl(item.urlAnhChinh)}
                    alt={item.tieuDe}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">Không có hình ảnh</span>
                  </div>
                )}

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemove(getItemId(item));
                  }}
                  disabled={removingId === getItemId(item)}
                  className="absolute top-3 right-3 z-10 flex items-center justify-center transition-transform active:scale-90 hover:scale-110"
                  aria-label="Gỡ khỏi yêu thích"
                >
                  <svg
                    viewBox="0 0 32 32"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                    role="presentation"
                    focusable="false"
                    className="block h-6 w-6 stroke-[2px] overflow-visible fill-[#FF385C] stroke-[#FF385C]"
                  >
                    <path d="M16 28c7-4.73 14-10 14-17a6.98 6.98 0 0 0-7-7c-1.8 0-3.58.68-4.95 2.05L16 8.1l-2.05-2.05a6.98 6.98 0 0 0-9.9 0A6.98 6.98 0 0 0 2 11c0 7 7 12.27 14 17z"></path>
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div>
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-semibold text-gray-900 line-clamp-1 text-[15px] flex-1 pr-2">
                    {item.tieuDe}
                  </h3>
                </div>

                {item.thanhPho && (
                  <p className="text-[13px] text-gray-600 mb-2 line-clamp-1">
                    {item.thanhPho}{item.quocGia ? `, ${item.quocGia}` : ''}
                  </p>
                )}

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-1">
                    <FiStar className="fill-black text-black" size={14} />
                    <span className="font-semibold text-gray-900 text-[13px]">
                      {item.diemTrungBinh > 0 ? item.diemTrungBinh.toFixed(2).replace('.', ',') : 'Mới'}
                    </span>
                    {item.soLuongDanhGia > 0 && (
                      <span className="text-gray-600 text-[13px]">
                        ({item.soLuongDanhGia})
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-gray-900 text-[13px]">
                      {item.giaMoiKhach > 0 ? formatPrice(item.giaMoiKhach * 2) : 'Liên hệ'}
                    </p>
                    {item.giaMoiKhach > 0 && (
                      <p className="text-[12px] text-gray-600">cho 2 đêm</p>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
