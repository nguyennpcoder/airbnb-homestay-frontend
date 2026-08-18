'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { phongAPI, Phong, getPhongId } from '@/lib/api';
import ListingCard from './ListingCard';
import ListingSkeleton from './ListingSkeleton';

// Icons
const FiChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const FiChevronLeft = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

interface ListingCarouselProps {
  title: string;
  subtitle?: string;
  itemType: 'noi_luu_tru' | 'trai_nghiem' | 'dich_vu';
  city?: string;
  isOriginal?: boolean;
  showMore?: boolean;
}

// ListingItem is now standardized as SanPham from @/lib/api

export default function ListingCarousel({
  title,
  subtitle,
  itemType,
  city,
  isOriginal = false,
  showMore = false,
}: ListingCarouselProps) {
  const router = useRouter();
  const [items, setItems] = useState<Phong[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const data = await phongAPI.getAll({
          loaiPhong: itemType,
          thanhPho: city,
        });

        // Filter by isOriginal if needed
        let filteredData = data;
        if (isOriginal) {
          filteredData = data.filter((item) => item.laOriginal === true);
        }

        setItems(filteredData.slice(0, 12));
      } catch (error) {
        console.error('Error fetching listings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [itemType, city, isOriginal]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      setCanScrollLeft(el.scrollLeft > 5);
      setCanScrollRight(el.scrollLeft < max - 4);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [items.length]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const CARD_WIDTH = 236; // match ListingCard width
      const GAP = 12; // space-x-3
      const scrollAmount = CARD_WIDTH + GAP;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (loading) {
    return (
      <div className="py-8">
        <div className="flex items-center justify-between mb-6 max-w-[1476px] mx-auto px-2">
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
        </div>
        <div className="max-w-[1476px] mx-auto">
          <div className="flex space-x-3 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <ListingSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-1">{title}</h2>
            {subtitle && <p className="text-gray-600">{subtitle}</p>}
          </div>
        </div>
        <p className="text-gray-500">Không có dữ liệu để hiển thị</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 max-w-[1476px] mx-auto px-2">
        <div className="flex items-center gap-4">
          <div>
            <h2
              className={`text-2xl font-semibold text-gray-900 mb-1 ${showMore ? 'cursor-pointer hover:underline' : ''}`}
              onClick={() => {
                if (!showMore) return;

                const params = new URLSearchParams();
                params.set('title', title);
                params.set('loaiPhong', itemType);
                if (city) params.set('thanhPho', city);
                if (isOriginal) params.set('laOriginal', 'true');

                router.push(`/listings?${params.toString()}`);
              }}
            >
              {title}
            </h2>
            {subtitle && <p className="text-gray-600">{subtitle}</p>}
          </div>
          {/* {showMore && (
            <button
              onClick={() => city && router.push(`/search?city=${encodeURIComponent(city)}&itemType=${itemType}`)}
              className="text-sm font-medium underline text-gray-900 hover:text-gray-700 hidden md:block"
            >
              Hiện tất cả
            </button>
          )} */}
        </div>
        <div className="hidden md:flex items-center space-x-2">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className={`w-6 h-6 rounded-full border border-gray-200 bg-white text-gray-700 flex items-center justify-center shadow-sm transition-colors ${canScrollLeft ? 'hover:bg-gray-50' : 'opacity-40 cursor-default'}`}
            aria-label="Scroll left"
          >
            <FiChevronLeft className="text-xs" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className={`w-6 h-6 rounded-full border border-gray-200 bg-white text-gray-700 flex items-center justify-center shadow-sm transition-colors ${canScrollRight ? 'hover:bg-gray-50' : 'opacity-40 cursor-default'}`}
            aria-label="Scroll right"
          >
            <FiChevronRight className="text-xs" />
          </button>
        </div>
      </div>

      <div className="relative max-w-[1476px] mx-auto overflow-hidden">
        {/* Edge fades removed per design */}

        <div
          ref={scrollContainerRef}
          className="flex space-x-3 overflow-x-auto scrollbar-hide scroll-smooth pb-3 px-0 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.length > 0 ? (
            items.map((item) => (
              <div key={getPhongId(item)} className="snap-start">
                <ListingCard
                  item={{
                    ...item,
                    hostInfo: item.hostInfo || (item.chuNha ? {
                      maNguoiDung: item.chuNha.maNguoiDung,
                      hoTen: item.chuNha.hoTen,
                      avatarUrl: item.chuNha.urlAnhDaiDien
                    } : undefined)
                  }}
                  showHostAvatar={false}
                />
              </div>
            ))
          ) : !loading && (
            <div className="flex-shrink-0 w-full py-8 text-center text-gray-500">
              <p>Không có dữ liệu để hiển thị</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
