'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import BackendImage from './BackendImage';
import { wishlistAPI, getPhongId } from '@/lib/api';
import { getValidSrc } from '@/lib/image';
import { useRouter } from 'next/navigation';

// Icon Components
const HeartIcon = ({ isFilled, className = "" }: { isFilled: boolean; className?: string }) => (
  <svg
    viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M16 28c7-4.73 14-10 14-17a6.98 6.98 0 0 0-7-7c-1.8 0-3.58.68-4.95 2.05L16 8.1l-2.05-2.05a6.98 6.98 0 0 0-9.9 0A6.98 6.98 0 0 0 2 11c0 7 7 12.27 14 17z" />
  </svg>
);

const ArrowLeft = () => (
  <svg width="10" height="10" fill="none" viewBox="0 0 12 12">
    <path d="M7.5 2.25L3.75 6l3.75 3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ArrowRight = () => (
  <svg width="10" height="10" fill="none" viewBox="0 0 12 12">
    <path d="M4.5 2.25L8.25 6 4.5 9.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const StarIcon = ({ dimension = 14 }: { dimension?: number }) => (
  <svg width={dimension} height={dimension} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

interface PropertyCardData {
  maPhong: number;
  maSanPham?: number;
  tieuDe: string;
  urlAnhChinh: string;
  giaMoiKhach: number;
  diemTrungBinh?: number;
  soLuongDanhGia?: number;
  duocKhachYeuThich?: boolean;
  laOriginal?: boolean;
  laPhoBien?: boolean;
  thanhPho?: string;
  quocGia?: string;
  hinhAnhs?: Array<{ urlHinhAnh: string }>;
  hostInfo?: {
    maNguoiDung?: number;
    hoTen?: string;
    avatarUrl?: string; // Standardize this if possible
    urlAnhDaiDien?: string; // Support for SanPham mapping
    congViec?: string;
    thanhPho?: string;
    soLuongDanhGia?: number;
    diemDanhGia?: number;
    soNamKinhNghiem?: number;
  };
}

interface PropertyCardComponentProps {
  item: PropertyCardData;
  showHostAvatar?: boolean;
  className?: string;
  compact?: boolean;
  searchParams?: Record<string, string>;
}

const HostAvatar = ({ hostData }: { hostData: NonNullable<PropertyCardData['hostInfo']> }) => {
  const navigationRouter = useRouter();

  const avatarUrl = hostData.avatarUrl || hostData.urlAnhDaiDien;
  const safeAvatarUrl = getValidSrc(avatarUrl, '/placeholder-avatar.png');
  const hoTen = hostData.hoTen || 'Host';

  return (
    <div
      className="relative group cursor-pointer z-20"
      onClick={(evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        if (hostData.maNguoiDung) {
          navigationRouter.push(`/host/${hostData.maNguoiDung}`);
        }
      }}
    >
      <div className="relative w-12 h-12 transition-transform hover:scale-105 duration-200">
        <div className="w-full h-full rounded-full overflow-hidden border-2 border-white shadow-md">
          <BackendImage
            src={safeAvatarUrl}
            alt={hoTen}
            width={48}
            height={48}
            className="object-cover w-full h-full"
          />
        </div>
        <div className="absolute bottom-0 right-0 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
    </div>
  );
};

function PropertyCardComponent({
  item,
  showHostAvatar = true,
  className = '',
  compact = false,
  searchParams = {}
}: PropertyCardComponentProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [heartPulse, setHeartPulse] = useState(false);
  const [toggleInProgress, setToggleInProgress] = useState(false);

  // Carousel state - completely new variable names
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [mouseOverCard, setMouseOverCard] = useState(false);

  // Build complete image collection
  const assembleImageGallery = () => {
    const primaryImage = item.urlAnhChinh;
    const additionalImages = item.hinhAnhs?.map((imageData: any) => {
      if (typeof imageData === 'string') return imageData;
      return imageData?.urlHinhAnh || null;
    }).filter(Boolean) || [];

    return [primaryImage, ...additionalImages].filter(Boolean);
  };

  const imageGallery = assembleImageGallery();
  const totalImageCount = imageGallery.length;
  const hasNavigableImages = totalImageCount > 1;

  // Check favorite status
  useEffect(() => {
    const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    if (!currentUserId) return;

    wishlistAPI.check(Number(currentUserId), getPhongId(item))
      .then(data => setIsSaved(!!data?.liked))
      .catch(() => { });
  }, [item.maPhong, item.maSanPham]);

  // Navigation functions with new names
  const advanceToNextImage = (evt: React.MouseEvent) => {
    evt.preventDefault();
    evt.stopPropagation();
    if (totalImageCount > 0) {
      setCurrentImageIdx((previousIdx) => (previousIdx + 1) % totalImageCount);
    }
  };

  const returnToPreviousImage = (evt: React.MouseEvent) => {
    evt.preventDefault();
    evt.stopPropagation();
    if (totalImageCount > 0) {
      setCurrentImageIdx((previousIdx) => (previousIdx - 1 + totalImageCount) % totalImageCount);
    }
  };

  const navigateToSpecificImage = (targetIdx: number) => {
    if (targetIdx >= 0 && targetIdx < totalImageCount) {
      setCurrentImageIdx(targetIdx);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace(/\s/g, '');
  };

  const processImageUrl = (imageUrl: string) => {
    return getValidSrc(imageUrl, '/placeholder.jpg');
  };

  const roomHref = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([k, v]) => { if (v) params.set(k, v); });
    const qs = params.toString();
    return `/phong/${getPhongId(item)}${qs ? `?${qs}` : ''}`;
  }, [item, searchParams]);

  return (
    <Link
      href={roomHref}
      className={`flex-shrink-0 cursor-pointer block snap-start ${className || 'w-[280px] md:w-[236px]'}`}
      onMouseEnter={() => setMouseOverCard(true)}
      onMouseLeave={() => setMouseOverCard(false)}
    >
      <div className={`relative aspect-[4/3] rounded-xl overflow-hidden ${compact ? 'mb-0' : 'mb-3'} bg-gray-200`}>
        {/* Image Gallery Container */}
        <div className="relative w-full h-full overflow-hidden">
          {imageGallery.length > 0 ? (
            <div
              className="flex h-full transition-transform duration-300 ease-in-out"
              style={{
                transform: `translateX(-${currentImageIdx * 100}%)`,
                willChange: 'transform'
              }}
            >
              {imageGallery.map((imgUrl, imgPosition) => (
                <div key={imgPosition} className="relative w-full h-full flex-shrink-0">
                  <BackendImage
                    src={processImageUrl(imgUrl)}
                    alt={`${item.tieuDe} - Ảnh ${imgPosition + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
              <span className="text-gray-400 text-sm">Không có hình ảnh</span>
            </div>
          )}
        </div>

        {/* Previous Navigation Button - Show on hover only */}
        {hasNavigableImages && currentImageIdx > 0 && (
          <button
            onClick={returnToPreviousImage}
            onMouseDown={(evt) => evt.preventDefault()}
            className={`
              absolute left-3 top-1/2 -translate-y-1/2
              w-8 h-8
              bg-white/90 backdrop-blur-sm
              rounded-full
              flex items-center justify-center
              shadow-[0_2px_8px_rgba(0,0,0,0.15)]
              border border-white/40
              transition-all duration-200 ease-out
              z-[15]
              ${mouseOverCard ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}
              hover:bg-white hover:shadow-[0_2px_16px_rgba(0,0,0,0.3)] hover:scale-110
              active:scale-95
            `}
            aria-label="Ảnh trước"
          >
            <ArrowLeft />
          </button>
        )}

        {/* Next Navigation Button - Show on hover only */}
        {hasNavigableImages && currentImageIdx < totalImageCount - 1 && (
          <button
            onClick={advanceToNextImage}
            onMouseDown={(evt) => evt.preventDefault()}
            className={`
              absolute right-3 top-1/2 -translate-y-1/2
              w-8 h-8
              bg-white/90 backdrop-blur-sm
              rounded-full
              flex items-center justify-center
              shadow-[0_2px_8px_rgba(0,0,0,0.15)]
              border border-white/40
              transition-all duration-200 ease-out
              z-[15]
              ${mouseOverCard ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}
              hover:bg-white hover:shadow-[0_2px_16px_rgba(0,0,0,0.3)] hover:scale-110
              active:scale-95
            `}
            aria-label="Ảnh tiếp theo"
          >
            <ArrowRight />
          </button>
        )}

        {/* Image Position Indicators - Fixed 5 dots, only active dot changes */}
        {hasNavigableImages && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[15]">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: Math.min(totalImageCount, 5) }).map((_, displayIdx) => {
                // Always show first 5 dots, active dot jumps within these 5
                const isCurrentImage = displayIdx === currentImageIdx;
                return (
                  <button
                    key={displayIdx}
                    onClick={(evt) => {
                      evt.preventDefault();
                      evt.stopPropagation();
                      navigateToSpecificImage(displayIdx);
                    }}
                    className={`
                      rounded-full
                      flex-shrink-0
                      transition-all duration-300 ease-out
                      ${isCurrentImage
                        ? 'w-1.5 h-1.5 bg-white shadow-sm scale-110'
                        : 'w-1.5 h-1.5 bg-white/60 hover:bg-white/80 scale-100'
                      }
                    `}
                    aria-label={`Đến ảnh ${displayIdx + 1}`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-col space-y-1.5 z-10">
          {item.duocKhachYeuThich && (item.soLuongDanhGia ?? 0) > 0 && (
            <span className="bg-white/95 backdrop-blur px-3 py-1 rounded-full text-[13px] font-bold text-gray-900 shadow-sm border border-gray-200/50">
              Được khách yêu thích
            </span>
          )}
          {item.laOriginal && (
            <span className="bg-white/95 backdrop-blur px-2.5 py-1 rounded-md text-[11px] font-semibold text-gray-900 flex items-center space-x-1 shadow-sm">
              <span>🌿</span>
              <span>Original</span>
            </span>
          )}
        </div>

        {/* Host Avatar Display */}
        {showHostAvatar && item.hostInfo && (
          <div className="absolute bottom-3 left-3 z-20">
            <HostAvatar hostData={item.hostInfo} />
          </div>
        )}

        {/* Favorite Heart Button */}
        <button
          type="button"
          onClick={async (evt) => {
            evt.preventDefault();
            evt.stopPropagation();

            if (toggleInProgress) return;

            const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

            if (!currentUserId) {
              if (typeof window !== 'undefined') {
                const redirectPath = encodeURIComponent(window.location.pathname);
                window.location.href = `/login?returnTo=${redirectPath}`;
              }
              return;
            }

            setToggleInProgress(true);
            setHeartPulse(true);

            try {
              const data = await wishlistAPI.toggle(Number(currentUserId), getPhongId(item));
              setIsSaved(!!data.liked);

              setTimeout(() => {
                setHeartPulse(false);
                setToggleInProgress(false);
              }, 600);
            } catch (error) {
              console.error('Lỗi khi toggle yêu thích:', error);
              setTimeout(() => {
                setHeartPulse(false);
                setToggleInProgress(false);
              }, 600);
            }
          }}
          disabled={toggleInProgress}
          aria-label={isSaved ? 'Bỏ yêu thích' : 'Yêu thích'}
          className={`absolute top-3 right-3 z-10 flex items-center justify-center transition-transform active:scale-90 ${toggleInProgress ? 'cursor-wait' : 'cursor-pointer'
            }`}
        >
          <div className={`transition-all duration-300 ${heartPulse ? 'animate-heartBeat' : ''}`}>
            <HeartIcon
              isFilled={isSaved}
              className={`block h-6 w-6 stroke-[2px] overflow-visible ${isSaved
                ? 'fill-[#FF385C] stroke-[#FF385C]'
                : 'fill-[rgba(0,0,0,0.5)] stroke-white hover:fill-[rgba(0,0,0,0.5)]'
                }`}
            />
          </div>
        </button>
      </div>

      {/* Property Information Content */}
      <div className={`${compact ? 'pb-0 px-3' : ''}`}>
        <div className={`flex items-start justify-between ${compact ? 'mb-0' : 'mb-0.5'}`}>
          <h3 className="font-semibold text-gray-900 line-clamp-1 text-[14px] flex-1 pr-2">
            {item.tieuDe}
          </h3>
        </div>
        {item.quocGia && (
          <p className={`text-[13px] text-gray-600 line-clamp-1 ${compact ? 'mb-0' : 'mb-1'}`}>
            {item.thanhPho}{item.quocGia ? `, ${item.quocGia}` : ''}
          </p>
        )}
        <div className={`flex items-center justify-between ${compact ? 'mt-0' : 'mt-1.5'}`}>
          <div className="flex items-center space-x-1">
            <StarIcon dimension={14} />
            <span className="font-semibold text-gray-900 text-[12px] whitespace-nowrap leading-5">
              {(item.diemTrungBinh ?? 0) > 0 ? (item.diemTrungBinh ?? 0).toFixed(2).replace('.', ',') : 'Mới'}
            </span>
            {(item.soLuongDanhGia ?? 0) > 0 && (
              <span className="text-gray-600 text-[12px] whitespace-nowrap leading-5">
                ({item.soLuongDanhGia})
              </span>
            )}
          </div>
          <div className="text-right flex-shrink-0 ml-2 min-w-[110px]">
            <p className="font-semibold text-gray-900 text-[12px] whitespace-nowrap leading-5">
              {item.giaMoiKhach > 0 ? formatCurrency(item.giaMoiKhach * 2) : 'Liên hệ'}
              {item.giaMoiKhach > 0 && (
                <span className="font-normal text-gray-600 ml-1">cho 2 đêm</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Export as ListingCard for compatibility with existing imports
const ListingCard = PropertyCardComponent;
export default ListingCard;

