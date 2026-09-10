"use client";
export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState, type RefObject } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { hostAPI, reviewsAPI, Review } from "@/lib/api";
import { getValidSrc } from "@/lib/image";
import Image from "next/image";
import Header from "@/components/Header";
import { TrophyOutlined } from "@ant-design/icons";

export default function HostProfilePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAllListingsOpen = searchParams.get("view") === "all-listings";
  const hostId = Number(params?.id as string);
  const [profile, setProfile] = useState<any | null>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const listingScrollRef = useRef<HTMLDivElement>(null);
  const reviewScrollRef = useRef<HTMLDivElement>(null);

  const [canScrollListingsLeft, setCanScrollListingsLeft] = useState(false);
  const [canScrollListingsRight, setCanScrollListingsRight] = useState(false);
  const [canScrollReviewsLeft, setCanScrollReviewsLeft] = useState(false);
  const [canScrollReviewsRight, setCanScrollReviewsRight] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      router.back();
      setIsClosing(false);
    }, 300); // Match animation duration
  };

  useEffect(() => {
    if (!hostId) return;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const viewerId = Number(localStorage.getItem('userId')) || undefined;
        const results = await Promise.allSettled([
          hostAPI.profile(hostId),
          hostAPI.listings(hostId),
          reviewsAPI.listByHost(hostId, viewerId)
        ]);

        const [pResult, lResult, rResult] = results;

        if (pResult.status === 'fulfilled') {
          setProfile(pResult.value);
        } else {
          console.error("Failed to load profile", pResult.reason);
          throw pResult.reason; // Re-throw to show main error if profile fails
        }

        if (lResult.status === 'fulfilled') {
          setListings(Array.isArray(lResult.value) ? lResult.value : []);
        } else {
          console.error("Failed to load listings", lResult.reason);
          // Don't throw, just leave listings empty or handle error
        }

        if (rResult.status === 'fulfilled') {
          setReviews(Array.isArray(rResult.value) ? rResult.value : []);
        } else {
          console.error("Failed to load reviews", rResult.reason);
        }

      } catch (err: any) {
        console.error("Failed to load host page", err);
        setError("Không thể lấy thông tin chủ nhà ngay bây giờ.");
      } finally {
        setLoading(false);
      }
    })();
  }, [hostId]);

  const LISTING_CARD_WIDTH = 160;
  const REVIEW_CARD_WIDTH = 300;

  const displayName = profile?.hoTen?.trim();
  const hostName = displayName || (loading ? "Đang tải..." : "Không có tên");



  const useScrollWatcher = (
    ref: RefObject<HTMLDivElement>,
    setLeft: (v: boolean) => void,
    setRight: (v: boolean) => void,
    deps: any[],
  ) => {
    useEffect(() => {
      const el = ref.current;
      if (!el) return;
      const update = () => {
        const max = el.scrollWidth - el.clientWidth;
        setLeft(el.scrollLeft > 4);
        setRight(el.scrollLeft < max - 4);
      };
      update();
      el.addEventListener("scroll", update, { passive: true });
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => {
        el.removeEventListener("scroll", update);
        ro.disconnect();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
  };

  useScrollWatcher(listingScrollRef, setCanScrollListingsLeft, setCanScrollListingsRight, [listings.length]);
  useScrollWatcher(reviewScrollRef, setCanScrollReviewsLeft, setCanScrollReviewsRight, [reviews.length]);

  useEffect(() => {
    if (reviewScrollRef.current) reviewScrollRef.current.scrollLeft = 0;
  }, [reviews]);

  useEffect(() => {
    if (listingScrollRef.current) listingScrollRef.current.scrollLeft = 0;
  }, [listings]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isAllListingsOpen || isClosing) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isAllListingsOpen, isClosing]);

  const scrollHorizontal = (
    ref: RefObject<HTMLDivElement>,
    direction: "left" | "right",
    itemCount: number,
  ) => {
    if (!ref.current) return;
    const containerWidth = ref.current.clientWidth;
    const gap = 16; // space-x-4 is 16px
    const scrollAmount = (containerWidth + gap) / itemCount;

    ref.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const [reviewIndex, setReviewIndex] = useState(0);
  const [listingIndex, setListingIndex] = useState(0);

  const nextReview = () => {
    if (reviewIndex < reviews.length - 3) {
      setReviewIndex(prev => prev + 1);
    }
  };

  const prevReview = () => {
    if (reviewIndex > 0) {
      setReviewIndex(prev => prev - 1);
    }
  };

  const nextListing = () => {
    if (listingIndex < listings.length - 4) {
      setListingIndex(prev => prev + 1);
    }
  };

  const prevListing = () => {
    if (listingIndex > 0) {
      setListingIndex(prev => prev - 1);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="pt-28 pb-20">
        <div className="container mx-auto px-6 max-w-7xl">
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-12 lg:gap-24 items-start">

            {/* Left Column: Sticky Host Card */}
            <div className="lg:sticky lg:top-28">
              <div className="bg-white rounded-[32px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] border border-gray-200 overflow-hidden mb-8">
                <div className="p-6 flex gap-4">
                  {/* Left Side: Avatar & Name */}
                  <div className="flex flex-col items-center justify-center w-[60%] text-center space-y-2 pr-4">
                    <div className="relative w-28 h-28">
                      <Image
                        src={getValidSrc(profile?.urlAnhDaiDien, "/uploads/@avatar/21-1762268700691.jpg")}
                        alt="host"
                        fill
                        className="rounded-full object-cover"
                        sizes="112px"
                        priority
                      />
                      {profile?.laChuNha && (
                        <div className="absolute bottom-1 right-0 bg-[#FF385C] rounded-full p-2 border-[3px] border-white flex items-center justify-center shadow-sm">
                          <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', height: '12px', width: '12px', fill: 'white' }}>
                            <path d="M16 28.5c-1.5 0-3-.5-4.5-1.5C8.5 25 2 18.5 2 11.5 2 7 5.5 3.5 10 3.5c2.5 0 5 1.5 6 3.5 1-2 3.5-3.5 6-3.5 4.5 0 8 3.5 8 8 0 7-6.5 13.5-9.5 15.5-1.5 1-3 1.5-4.5 1.5z"></path>
                            <path d="M13.5 18.5l-3-3 1.5-1.5 1.5 1.5 4.5-4.5 1.5 1.5-6 6z" fill="white" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 pt-2">{hostName}</h2>
                    {profile?.laChuNha && (
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                        <TrophyOutlined style={{ fontSize: '12px', color: 'currentColor' }} />
                        <span>Chủ nhà siêu cấp</span>
                      </div>
                    )}
                  </div>

                  {/* Right Side: Stats */}
                  <div className="flex flex-col justify-center w-[40%] space-y-4">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{profile?.soLuongDanhGiaHost ?? reviews.length}</div>
                      <div className="text-[10px] font-bold text-gray-900">Đánh giá</div>
                    </div>
                    <div className="border-t border-gray-200" />
                    <div>
                      <div className="text-2xl font-bold text-gray-900 flex items-center gap-1">
                        {(profile?.diemDanhGiaHost != null ? profile.diemDanhGiaHost : (reviews.length > 0 ? (reviews.reduce((acc: number, r: any) => acc + r.diemSo, 0) / reviews.length) : 0)).toFixed(2)} <span className="text-xs">★</span>
                      </div>
                      <div className="text-[10px] font-bold text-gray-900">Xếp hạng</div>
                    </div>
                    <div className="border-t border-gray-200" />
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {profile?.ngayTao ? new Date().getFullYear() - new Date(profile.ngayTao).getFullYear() : "—"}
                      </div>
                      <div className="text-[10px] font-bold text-gray-900">Năm kinh nghiệm</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Host Button */}
              <div className="px-2 mb-6">
                <button
                  onClick={() => {
                    // Nếu khách đến từ trang phòng cụ thể thì ưu tiên phòng đó,
                    // không lấy room đầu tiên của host (tránh mở nhầm hội thoại phòng khác)
                    const fromRoomId = Number(searchParams.get("roomId"));
                    const firstRoomId = listings.length > 0 ? (listings[0].maPhong ?? listings[0].maSanPham) : null;
                    const targetRoomId = fromRoomId && !Number.isNaN(fromRoomId) ? fromRoomId : firstRoomId;
                    const url = targetRoomId
                      ? `/profile?tab=nhan-tin&hostId=${hostId}&roomId=${targetRoomId}`
                      : `/profile?tab=nhan-tin&hostId=${hostId}`;
                    router.push(url);
                  }}
                  className="w-full py-3 bg-[#FF385C] text-white rounded-xl text-sm font-bold hover:bg-[#E31C5F] transition flex items-center justify-center gap-2"
                >
                  <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', fill: 'none', height: '16px', width: '16px', stroke: 'currentColor', strokeWidth: 2, overflow: 'visible' }}><path d="M2 16h28M2 16l10-10M2 16l10 10" /></svg>
                  Liên hệ {hostName}
                </button>
              </div>

              {/* Verification Info */}
              <div className="space-y-4 px-2">
                <h3 className="text-lg font-semibold text-gray-900">Thông tin đã xác nhận của {hostName}</h3>
                <div className="flex items-center gap-3 text-gray-700">
                  <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', height: '16px', width: '16px', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, overflow: 'visible' }}><path d="M13.7 3.7 5.7 11.7l-3.4-3.4"></path></svg>
                  <span>Danh tính</span>
                </div>
                {profile?.emailDaXacNhan && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', height: '16px', width: '16px', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, overflow: 'visible' }}><path d="M13.7 3.7 5.7 11.7l-3.4-3.4"></path></svg>
                    <span>Địa chỉ email</span>
                  </div>
                )}
                {profile?.soDienThoai && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', height: '16px', width: '16px', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, overflow: 'visible' }}><path d="M13.7 3.7 5.7 11.7l-3.4-3.4"></path></svg>
                    <span>Số điện thoại</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Content */}
            <div className="w-full overflow-hidden">
              <div className="mb-10">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Thông tin về {hostName}</h1>
                <div className="text-gray-600">
                  {profile?.laChuNha ? "Chủ nhà siêu cấp · " : ""}
                  Bắt đầu đón tiếp khách từ năm {profile?.ngayTao ? new Date(profile.ngayTao).getFullYear() : "—"}
                </div>
              </div>

              {/* Reviews Section */}
              {/*<div className="border-t border-gray-200 py-10 space-y-6">
                <div className="flex flex-wrap items-start gap-4 justify-between">
                  <div className="space-y-2">
                    <h2 className="text-[32px] leading-tight font-semibold text-gray-900">
                      Đánh giá của {hostName}
                    </h2>
                    <p className="text-gray-500 text-sm">
                      Một số thông tin được hiển thị bằng ngôn ngữ gốc.{" "}
                      <button
                        type="button"
                        className="underline font-medium text-gray-700 hover:text-gray-900"
                      >
                        Dịch
                      </button>
                    </p>
                  </div>
                  <div className="hidden md:flex gap-3">
                    <button
                      onClick={() => scrollHorizontal(reviewScrollRef, "left", 3)}
                      disabled={!canScrollReviewsLeft}
                      className={`w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-800 flex items-center justify-center shadow-sm hover:shadow-md transition-all active:scale-95 ${!canScrollReviewsLeft ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-50"}`}
                      aria-label="Previous reviews"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() => scrollHorizontal(reviewScrollRef, "right", 3)}
                      disabled={!canScrollReviewsRight}
                      className={`w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-800 flex items-center justify-center shadow-sm hover:shadow-md transition-all active:scale-95 ${!canScrollReviewsRight ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-50"}`}
                      aria-label="Next reviews"
                    >
                      ›
                    </button>
                  </div>
                </div>

                <div className="relative overflow-hidden pt-2">
                  <div
                    ref={reviewScrollRef}
                    className="flex overflow-x-auto scrollbar-hide scroll-smooth pb-4 snap-x snap-mandatory"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                  >
                    {reviews.length > 0 ? reviews.map((review: Review, idx: number) => {
                      const formatDate = (dateStr: string) => {
                        const date = new Date(dateStr);
                        const now = new Date();
                        const diffTime = Math.abs(now.getTime() - date.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        if (diffDays === 0) return "Hôm nay";
                        if (diffDays === 1) return "1 ngày trước";
                        if (diffDays < 30) return `${diffDays} ngày trước`;
                        const diffMonths = Math.floor(diffDays / 30);
                        return diffMonths === 1 ? "1 tháng trước" : `${diffMonths} tháng trước`;
                      };

                      return (
                        <div
                          key={idx}
                          className="flex-shrink-0 snap-start mr-4 last:mr-0"
                          style={{ width: 'calc((100% - 32px) / 3)' }}
                        >
                          <div className="bg-white rounded-xl p-0 h-full">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 relative">
                                <Image
                                  src={getValidSrc(review.nguoiDung?.urlAnhDaiDien, `https://ui-avatars.com/api/?name=${review.nguoiDung?.hoTen || 'User'}&background=random`)}
                                  alt={review.nguoiDung?.hoTen || 'User'}
                                  fill
                                  className="object-cover"
                                  sizes="48px"
                                  unoptimized
                                />
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">{review.nguoiDung?.hoTen || 'Khách'}</div>
                                <div className="text-sm text-gray-500">{review.nguoiDung?.thanhPho || 'Việt Nam'}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex text-xs text-[#FF385C]">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <svg
                                    key={star}
                                    viewBox="0 0 32 32"
                                    xmlns="http://www.w3.org/2000/svg"
                                    aria-hidden="true"
                                    role="presentation"
                                    focusable="false"
                                    style={{
                                      display: 'block',
                                      height: '10px',
                                      width: '10px',
                                      fill: star <= Math.round(review.diemSo) ? 'currentColor' : '#E5E7EB'
                                    }}
                                  >
                                    <path d="M15.094 1.579l-4.124 8.885-9.86 1.27a1 1 0 0 0-.54 1.736l7.293 6.815-1.991 9.692a1 1 0 0 0 1.488 1.081L16 24.248l8.64 4.81a1 1 0 0 0 1.488-1.08l-1.991-9.693 7.293-6.815a1 1 0 0 0-.54-1.735l-9.86-1.271-4.127-8.885a1 1 0 0 0-1.798 0z"></path>
                                  </svg>
                                ))}
                              </div>
                              <div className="text-xs font-semibold text-gray-500">· {formatDate(review.ngayTao)}</div>
                              {review.ngayNhanPhong && review.ngayTraPhong && (
                                <div className="text-xs font-semibold text-gray-500">
                                  · Ở lại {Math.round((new Date(review.ngayTraPhong).getTime() - new Date(review.ngayNhanPhong).getTime()) / (1000 * 60 * 60 * 24))} đêm
                                </div>
                              )}
                            </div>
                            <p className="text-gray-700 text-sm leading-relaxed line-clamp-4">{review.binhLuan || 'Không có bình luận'}</p>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>Chưa có đánh giá nào</p>
                      </div>
                    )}

                  </div>
                </div>
                <div>
                  <button className="px-6 py-3 rounded-xl bg-white border border-black text-sm font-semibold text-gray-900 hover:bg-gray-50 transition">
                    Hiển thị thêm đánh giá
                  </button>
                </div>
              </div>

              {/* Listings Section */}
              <div className="border-t border-gray-200 py-8 space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <h2 className="text-[32px] leading-tight font-semibold text-gray-900">
                    Bài đăng của {hostName}
                  </h2>
                  <div className="hidden md:flex gap-3">
                    <button
                      onClick={() => scrollHorizontal(listingScrollRef, "left", 4)}
                      disabled={!canScrollListingsLeft}
                      className={`w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-800 flex items-center justify-center shadow-sm hover:shadow-md transition-all active:scale-95 ${!canScrollListingsLeft ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-50"}`}
                      aria-label="Previous listings"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() => scrollHorizontal(listingScrollRef, "right", 4)}
                      disabled={!canScrollListingsRight}
                      className={`w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-800 flex items-center justify-center shadow-sm hover:shadow-md transition-all active:scale-95 ${!canScrollListingsRight ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-50"}`}
                      aria-label="Next listings"
                    >
                      ›
                    </button>
                  </div>
                </div>

                <div className="relative overflow-hidden pt-1">
                  <div
                    ref={listingScrollRef}
                    className="flex overflow-x-auto scrollbar-hide scroll-smooth pb-3 snap-x snap-mandatory"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {listings.length > 0 ? listings.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex-shrink-0 snap-start mr-4 last:mr-0 group cursor-pointer"
                        style={{ width: 'calc((100% - 48px) / 4)' }}
                        onClick={() => router.push(`/phong/${item.maPhong ?? item.maSanPham}`)}
                      >
                        <div className="aspect-[4/3] rounded-2xl overflow-hidden mb-3 relative">
                          <Image
                            src={getValidSrc(item?.urlAnhChinh)}
                            alt="listing"
                            fill
                            className="object-cover group-hover:scale-105 transition duration-300"
                            sizes="(max-width: 768px) 100vw, 25vw"
                          />
                        </div>
                        <div className="space-y-1 text-[15px]">
                          <div className="font-semibold text-gray-900 line-clamp-1">
                            {item?.tieuDe || "Căn hộ cho thuê"}
                          </div>
                          <div className="text-gray-500 line-clamp-1">
                            {(item?.loaiBatDongSan && `${item.loaiBatDongSan} · `) || ""}
                            {item?.quanHuyen || item?.thanhPho || "Hà Nội"}
                          </div>
                          <div className="text-gray-900 font-semibold flex items-center gap-1">
                            <span>★ {(item?.diemTrungBinh ?? 5).toFixed(1)}</span>
                            <span className="text-gray-500 text-xs">
                              ({item?.soLuongDanhGia || 0} đánh giá)
                            </span>
                          </div>
                        </div>
                      </div>
                    )) : (
                      // Fallback listings if empty
                      [1, 2, 3, 4, 5, 6].map((i) => (
                        <div
                          key={i}
                          className="flex-shrink-0 snap-start mr-4 last:mr-0 group cursor-pointer"
                          style={{ width: 'calc((100% - 48px) / 4)' }}
                        >
                          <div className="aspect-[4/3] rounded-2xl overflow-hidden mb-3 relative bg-gray-200">
                            <Image
                              src={getValidSrc(`/uploads/product/product${20 + i}/1.avif`)}
                              alt="fallback listing"
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, 25vw"
                              onError={(e: any) => {
                                e.currentTarget.src = "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=1080&auto=format&fit=crop";
                              }}
                            />
                          </div>
                          <div className="font-semibold text-[15px]">Căn hộ cho thuê</div>
                          <div className="text-gray-500 text-sm">West Lake Big Room/Balcony...</div>
                          <div className="flex items-center gap-1 text-sm mt-1">
                            <span className="font-semibold">★ 4,95</span>
                            <span className="text-gray-500">(21 đánh giá)</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                {listings.length > 6 && (
                  <button
                    className="text-sm font-semibold underline text-gray-900 hover:text-gray-600 transition"
                    onClick={() => router.push(`/host/${hostId}?view=all-listings`, { scroll: false })}
                  >
                    Xem tất cả {listings.length} bài đăng
                  </button>
                )}
              </div>

              {/* Report Section */}
              <div className="border-t border-gray-200 py-8 mt-4">
                <div className="flex items-center gap-2 mb-4 cursor-pointer hover:underline text-gray-700 font-medium">
                  <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', height: '16px', width: '16px', fill: 'currentColor' }}><path d="M28 6H17V4a2 2 0 0 0-2-2H3v28h2V18h10v2a2 2 0 0 0 2 2h11l.115-.006a1 1 0 0 0 .884-.994V7a1 1 0 0 0-1-1zM3 4h12v2H3zm24 14H17v-2H5v-8h12v2h10z"></path></svg>
                  <span>Báo cáo {hostName}</span>
                </div>
                <div className="flex items-center gap-2 cursor-pointer hover:underline text-gray-700 font-medium">
                  <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', height: '16px', width: '16px', fill: 'currentColor' }}><path d="M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2zm0 26a12 12 0 1 1 12-12 12 12 0 0 1-12 12zm-3.3-20.3a1 1 0 0 0-1.4 1.4L14.6 16l-3.3 6.7a1 1 0 0 0 1.4 1.4l6.7-3.3 3.3 3.3a1 1 0 0 0 1.4-1.4L20.8 16l3.3-6.7a1 1 0 0 0-1.4-1.4l-6.7 3.3z"></path></svg>
                  <span>Chặn {hostName}</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>


      {/* All Listings Modal */}
      {(isAllListingsOpen || isClosing) && (
        <div
          className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 ${isClosing ? 'animate-backdropExit' : 'animate-backdropEnter'}`}
          onClick={handleClose}
        >
          <div
            className={`bg-white rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl ${isClosing ? 'animate-modalExit' : 'animate-modalEnter'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <button
                onClick={handleClose}
                className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition"
              >
                <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', fill: 'none', height: '16px', width: '16px', stroke: 'currentColor', strokeWidth: 3, overflow: 'visible' }}><path d="m6 6 20 20M26 6 6 26"></path></svg>
              </button>
              <h2 className="text-lg font-bold">Bài đăng của {hostName}</h2>
              <div className="w-8" /> {/* Spacer for centering */}
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((item, idx) => (
                  <div
                    key={idx}
                    className="group cursor-pointer"
                    onClick={() => router.push(`/phong/${item.maPhong ?? item.maSanPham}`)}
                  >
                    <div className="aspect-[4/3] rounded-xl overflow-hidden mb-3 relative bg-gray-200">
                      <Image
                        src={getValidSrc(item?.urlAnhChinh)}
                        alt="listing"
                        fill
                        className="object-cover group-hover:scale-105 transition duration-300"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-start">
                        <div className="font-semibold text-gray-900 line-clamp-1">
                          {item?.loaiBatDongSan || "Toàn bộ nhà"}
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', height: '12px', width: '12px', fill: 'currentColor' }}><path d="M15.094 1.579l-4.124 8.885-9.86 1.27a1 1 0 0 0-.54 1.736l7.293 6.815-1.991 9.692a1 1 0 0 0 1.488 1.081L16 24.248l8.64 4.81a1 1 0 0 0 1.488-1.08l-1.991-9.693 7.293-6.815a1 1 0 0 0-.54-1.735l-9.86-1.271-4.127-8.885a1 1 0 0 0-1.798 0z"></path></svg>
                          <span>{(item?.diemTrungBinh ?? 5).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="text-gray-500 text-sm line-clamp-1">
                        {item?.tieuDe}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

