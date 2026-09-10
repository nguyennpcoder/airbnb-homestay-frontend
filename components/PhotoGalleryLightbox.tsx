'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BackendImage from './BackendImage';

interface HinhAnh {
  maHinhAnh: number;
  urlHinhAnh: string;
  thuTu?: number;
  laAnhChinh: boolean;
  phanLoaiAnh?: string;
}

import { wishlistAPI } from '@/lib/api';

interface PhotoGalleryLightboxProps {
  images: HinhAnh[];
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string;
  phongId?: number;
  userId?: number;
  liked?: boolean;
  onLikedChange?: (liked: boolean) => void;
}

interface CategoryInfo {
  key: string;
  label: string;
  amenities: string;
}

const categories: Record<string, CategoryInfo> = {
  phong_khach: {
    key: 'phong_khach',
    label: 'Phòng khách',
    amenities: 'Nệm trải sàn - Quạt trần - TV - Điều hòa nhiệt độ'
  },
  bep: {
    key: 'bep',
    label: 'Bếp đầy đủ tiện nghi',
    amenities: 'Bát đĩa và đồ bạc - Ly uống rượu vang - Tủ lạnh mini - Ấm đun nước nóng - Lò vi sóng'
  },
  phong_ngu: {
    key: 'phong_ngu',
    label: 'Phòng ngủ',
    amenities: 'Giường Queen - Điều hòa nhiệt độ - Móc treo quần áo. Bàn là'
  },
  phong_tam: {
    key: 'phong_tam',
    label: 'Phòng tắm đầy đủ',
    amenities: 'Dầu gội đầu - Máy sấy tóc - Nước nóng - Sữa tắm'
  },
  ban_cong: {
    key: 'ban_cong',
    label: 'Ban công',
    amenities: 'Bộ sơ cứu - Cho phép gửi hành lý - Máy giặt'
  },
  khu_vuc_giat_la: {
    key: 'khu_vuc_giat_la',
    label: 'Khu vực giặt là',
    amenities: 'Máy giặt - Khu vực giặt là riêng'
  },
  anh_bo_sung: {
    key: 'anh_bo_sung',
    label: 'Ảnh bổ sung',
    amenities: 'Các hình ảnh bổ sung về căn hộ'
  }
};

export default function PhotoGalleryLightbox({
  images,
  isOpen,
  onClose,
  initialCategory,
  phongId,
  userId,
  liked,
  onLikedChange
}: PhotoGalleryLightboxProps) {
  const router = useRouter();
  // Use parent's liked state if provided, otherwise use local state
  const [localLiked, setLocalLiked] = useState(false);
  const isFavorite = liked !== undefined ? liked : localLiked;
  const setIsFavorite = (val: boolean) => {
    setLocalLiked(val);
    if (onLikedChange) onLikedChange(val);
  };

  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'gallery' | 'image'>('gallery');

  // Sync favorite state with real wishlist API
  useEffect(() => {
    if (!isOpen || !phongId || !userId) return;
    wishlistAPI.check(userId, phongId)
      .then(data => setIsFavorite(!!data?.liked))
      .catch(() => {});
  }, [isOpen, phongId, userId]);

  // Group images by category
  const imagesByCategory: Record<string, HinhAnh[]> = {};
  images.forEach(img => {
    const category = img.phanLoaiAnh || 'anh_bo_sung';
    if (!imagesByCategory[category]) {
      imagesByCategory[category] = [];
    }
    imagesByCategory[category].push(img);
  });

  // Sort images in each category by thuTu
  Object.keys(imagesByCategory).forEach(cat => {
    imagesByCategory[cat].sort((a, b) => (a.thuTu || 0) - (b.thuTu || 0));
  });

  // Get available categories (ordered by our predefined list)
  const availableCategories = Object.keys(categories).filter(cat =>
    imagesByCategory[cat] && imagesByCategory[cat].length > 0
  );

  // Flatten all images for the full-screen slider
  const allImages: Array<{ image: HinhAnh; category: string }> = [];
  availableCategories.forEach(cat => {
    imagesByCategory[cat].forEach(img => {
      allImages.push({ image: img, category: cat });
    });
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (initialCategory) {
        // Allow time for the modal to render and layout to stabilize
        setTimeout(() => {
          scrollToCategory(initialCategory);
        }, 100);
      }
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialCategory]);

  // Handle keyboard navigation for single image view
  useEffect(() => {
    if (viewMode === 'image' && isOpen) {
      const handleKeyPress = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') goToPreviousImage();
        else if (e.key === 'ArrowRight') goToNextImage();
        else if (e.key === 'Escape') {
          setViewMode('gallery');
          setSelectedImageIndex(null);
        }
      };
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [viewMode, selectedImageIndex, isOpen]);

  if (!isOpen) return null;

  const getImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads')) return url;
    return url;
  };

  // --- Single Image Viewer Logic ---
  const currentImageViewImage = selectedImageIndex !== null ? allImages[selectedImageIndex] : null;
  const currentImageGlobalIndex = selectedImageIndex !== null ? selectedImageIndex + 1 : 0;
  const totalImagesCount = allImages.length;

  const goToPreviousImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };

  const goToNextImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex < allImages.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  };

  const handleImageClick = (img: HinhAnh) => {
    const globalIndex = allImages.findIndex(item => item.image.maHinhAnh === img.maHinhAnh);
    if (globalIndex !== -1) {
      setSelectedImageIndex(globalIndex);
      setViewMode('image');
    }
  };

  // Scroll to category function
  const scrollToCategory = (catKey: string) => {
    const el = document.getElementById(`category-${catKey}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // --- Render: Single Image View ---
  if (viewMode === 'image' && currentImageViewImage) {
    return (
      <div className="fixed inset-0 z-[60] bg-black flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 text-white">
          <button
            onClick={() => {
              setViewMode('gallery');
              setSelectedImageIndex(null);
            }}
            className="flex items-center gap-2 hover:bg-white/10 px-3 py-2 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="font-medium">Đóng</span>
          </button>
          <div className="font-medium">
            {currentImageGlobalIndex} / {totalImagesCount}
          </div>
          <button className="p-2 hover:bg-white/10 rounded-full transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>

        {/* Main Image Area */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          {/* Prev Button */}
          {selectedImageIndex !== null && selectedImageIndex > 0 && (
            <button
              onClick={goToPreviousImage}
              className="absolute left-4 z-10 w-12 h-12 rounded-full border border-white/30 bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <BackendImage
            src={getImageUrl(currentImageViewImage.image.urlHinhAnh)}
            alt="Full view"
            fill
            className="object-contain"
            sizes="100vw"
          />

          {/* Next Button */}
          {selectedImageIndex !== null && selectedImageIndex < allImages.length - 1 && (
            <button
              onClick={goToNextImage}
              className="absolute right-4 z-10 w-12 h-12 rounded-full border border-white/30 bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  // --- Render: Gallery View (Sticky Headers) ---
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex-none px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-white z-20">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition text-sm font-medium underline">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Chia sẻ
          </button>
          <button
            onClick={async () => {
              if (!phongId) return;
              if (!userId) {
                router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
                return;
              }
              try {
                const res = await wishlistAPI.toggle(userId, phongId);
                setIsFavorite(!!res?.liked);
              } catch {}
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition text-sm font-medium underline"
          >
            <svg
              className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-800'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {isFavorite ? 'Đã lưu' : 'Lưu'}
          </button>
        </div>
      </div>

      {/* Categories Navigation (Restored) */}
      <div className="border-b border-gray-200 bg-white flex-shrink-0 z-10 shadow-sm">
        <div className="px-6 py-4 overflow-x-auto scrollbar-hide">
          <div className="flex space-x-4 min-w-max justify-center">
            {availableCategories.map(categoryKey => {
              const categoryInfo = categories[categoryKey];
              const categoryImages = imagesByCategory[categoryKey] || [];
              const thumbnail = categoryImages[0];

              return (
                <button
                  key={categoryKey}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    scrollToCategory(categoryKey);
                  }}
                  className="group flex flex-col items-center gap-2 cursor-pointer min-w-[120px]"
                >
                  {thumbnail && (
                    <div className="relative w-32 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 group-hover:brightness-95 transition">
                      <BackendImage
                        src={getImageUrl(thumbnail.urlHinhAnh)}
                        alt={categoryInfo.label}
                        fill
                        className="object-cover"
                        sizes="128px"
                      />
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700 group-hover:text-black whitespace-nowrap">
                    {categoryInfo.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Scroll Area */}
      <div className="flex-1 overflow-y-auto bg-white" id="gallery-scroll-container">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {availableCategories.map((catKey) => {
            const catInfo = categories[catKey];
            const catImages = imagesByCategory[catKey];
            if (!catImages?.length) return null;

            return (
              <div key={catKey} id={`category-${catKey}`} className="relative mb-12 last:mb-0">
                {/* Sticky Header Section */}
                <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[240px_1fr] gap-6">
                  {/* Left Column: Sticky Title */}
                  <div className="hidden md:block">
                    <div className="sticky top-8 self-start">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{catInfo.label}</h3>
                      {catInfo.amenities && (
                        <p className="text-gray-500 text-xs leading-relaxed">{catInfo.amenities}</p>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Images Grid */}
                  <div>
                    {/* Mobile Title (not sticky) */}
                    <div className="md:hidden mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{catInfo.label}</h3>
                      {catInfo.amenities && (
                        <p className="text-gray-500 text-xs mt-1">{catInfo.amenities}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {catImages.map((img, idx) => {
                        // Pattern: Small, Small, Full, Full
                        // 0, 1: Small (col-span-1)
                        // 2, 3: Full (col-span-2)
                        const patternIdx = idx % 4;
                        const isFullWidth = patternIdx === 2 || patternIdx === 3;

                        return (
                          <div
                            key={img.maHinhAnh}
                            onClick={() => handleImageClick(img)}
                            className={`relative cursor-pointer group overflow-hidden rounded-sm ${isFullWidth ? 'col-span-2 aspect-[16/9]' : 'col-span-1 aspect-[3/2]'}`}
                          >
                            <BackendImage
                              src={getImageUrl(img.urlHinhAnh)}
                              alt={`${catInfo.label} ${idx + 1}`}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                              sizes={isFullWidth ? "(max-width: 768px) 100vw, 800px" : "(max-width: 768px) 50vw, 400px"}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

