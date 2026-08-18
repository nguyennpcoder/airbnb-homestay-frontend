"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import ReviewItem from "@/components/ReviewItem";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import PhotoGalleryLightbox from "@/components/PhotoGalleryLightbox";
import GuestSelector, { GuestCounts } from "@/components/GuestSelector";
import { phongAPI, wishlistAPI, bookingAPI, availabilityAPI, reviewsAPI, pricingRulesAPI, chinhSachHuyAPI, Review, Phong, ListingImage } from "@/lib/api";
import { getPhongId } from "@/lib/api";
import { calculateLuuTru, getPricingRules } from "@/lib/priceCalc";
import { TrophyOutlined, CheckCircleOutlined, KeyOutlined, MessageOutlined, EnvironmentOutlined, TagOutlined, FormatPainterOutlined } from "@ant-design/icons";
import { message } from "antd";
import toast from 'react-hot-toast';
import ProductDetailSkeleton from "@/components/ProductDetailSkeleton";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const ProductMap = dynamic(() => import('@/components/ProductMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[480px] overflow-hidden rounded-xl border bg-gray-100 flex items-center justify-center">
      <div className="text-gray-500 text-sm">Đang tải bản đồ...</div>
    </div>
  )
});


type CategoryAverages = {
  diemSachSe?: number;
  diemChinhXac?: number;
  diemNhanPhong?: number;
  diemGiaoTiep?: number;
  diemViTri?: number;
  diemGiaTri?: number;
};

const AMENITY_CATEGORY_LABELS: Record<string, string> = {
  "phong_tam": "Phòng tắm",
  "phong_ngu_giat_ui": "Phòng ngủ và giặt ủi",
  "giai_tri": "Giải trí",
  "he_thong_nhiet_lam_mat": "Hệ thống sưởi và làm mát",
  "internet_van_phong": "Internet và văn phòng",
  "nau_an_an_uong": "Đồ dùng nấu bếp và ăn uống",
  "dac_diem_vi_tri": "Các đặc điểm về vị trí",
  "ngoai_troi": "Ngoài trời",
  "co_so_vat_chat": "Chỗ đỗ xe và cơ sở vật chất",
  "dich_vu": "Dịch vụ",
  "an_toan": "An toàn nhà ở",
  "khong_bao_gom": "Không bao gồm",
  "luu_y": "Lưu ý",
  "quy_tac": "Quy tắc nhà",
  "tien_ich_khac": "Tiện ích khác",
  "quyen_rieng_tu_an_toan": "Quyền riêng tư và an toàn"
};

import ReviewListModal from "@/components/modals/ReviewListModal";

function SingleMonthCalendar({ checkIn, checkOut, onPick, isUnavailable, todayLocal }: {
  checkIn: string;
  checkOut: string;
  onPick: (d: Date) => void;
  isUnavailable: (d: Date) => boolean;
  todayLocal: Date;
}) {
  const [offset, setOffset] = useState(0);
  const parseDate = (v: string) => (v ? new Date(v + "T00:00:00") : null);
  const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const addMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() + months, 1);

  const baseMonth = useMemo(() => addMonths(startOfMonth(todayLocal), offset), [todayLocal, offset]);
  const daysInMonth = new Date(baseMonth.getFullYear(), baseMonth.getMonth() + 1, 0).getDate();
  const firstDow = (baseMonth.getDay() + 6) % 7;

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(baseMonth.getFullYear(), baseMonth.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);

  const ci = parseDate(checkIn);
  const co = parseDate(checkOut);


  //view 1 lịch tháng
  // return (
  //   <div className="border-t pt-6 mt-6">
  //     <h3 className="text-xl font-semibold mb-4">Lịch tháng</h3>
  //     <div className="relative">
  //       <button type="button" className="absolute left-0 top-10 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition z-20"
  //         onClick={() => setOffset((v) => v - 1)}>
  //         <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', fill: 'none', height: '12px', width: '12px', stroke: 'currentColor', strokeWidth: 4, overflow: 'visible' }}>
  //           <path d="m20 28-11.29289322-11.2928932c-.39052429-.3905243-.39052429-1.0236893 0-1.4142136l11.29289322-11.2928932"></path>
  //         </svg>
  //       </button>
  //       <button type="button" className="absolute right-0 top-10 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition z-20"
  //         onClick={() => setOffset((v) => v + 1)}>
  //         <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', fill: 'none', height: '12px', width: '12px', stroke: 'currentColor', strokeWidth: 4, overflow: 'visible' }}>
  //           <path d="m12 4 11.2928932 11.2928932c.3905243.3905243.3905243 1.0236893 0 1.4142136l-11.2928932 11.2928932"></path>
  //         </svg>
  //       </button>
  //       <div className="max-w-sm mx-auto px-1">
  //         <div className="text-center font-bold text-base mb-4 text-gray-900">Tháng {baseMonth.getMonth() + 1} năm {baseMonth.getFullYear()}</div>
  //         <div className="grid grid-cols-7 gap-1 mb-2 text-[12px] font-bold text-gray-500">
  //           {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((w) => (
  //             <div key={w} className="h-6 flex items-center justify-center">{w}</div>
  //           ))}
  //         </div>
  //         <div className="grid grid-cols-7 gap-y-1 select-none">
  //           {cells.map((d, idx) => {
  //             if (!d) return <div key={`e-${idx}`} className="h-10" />;
  //             const isStart = !!ci && d.getTime() === ci.getTime();
  //             const isEnd = !!co && d.getTime() === co.getTime();
  //             const inBetween = !!ci && !!co && d.getTime() > ci.getTime() && d.getTime() < co.getTime();
  //             const unavailable = isUnavailable(d);
  //             let btnClass = "relative z-10 w-11 h-11 flex items-center justify-center rounded-full text-sm font-semibold transition-all";
  //             if (unavailable) {
  //               btnClass += " text-gray-300 line-through cursor-not-allowed";
  //             } else if (isStart || isEnd) {
  //               btnClass += " bg-[#222222] text-white hover:bg-black";
  //             } else if (inBetween) {
  //               btnClass += " bg-gray-50 text-gray-900 !rounded-none w-full";
  //             } else {
  //               btnClass += " text-gray-900 hover:ring-2 hover:ring-black hover:ring-inset";
  //             }
  //             return (
  //               <div key={d.toISOString()} className="relative h-10 w-full flex items-center justify-center">
  //                 {inBetween && <div className="absolute inset-0 bg-gray-50" />}
  //                 {isStart && co && <div className="absolute top-0 bottom-0 right-0 w-1/2 bg-gray-50" />}
  //                 {isEnd && ci && <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-gray-50" />}
  //                 <button type="button" onClick={() => onPick(d)} disabled={unavailable} className={btnClass}>
  //                   {d.getDate()}
  //                 </button>
  //               </div>
  //             );
  //           })}
  //         </div>
  //       </div>
  //     </div>
  //   </div>
  // );
}

export default function ProductDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = Number(params.id);
  const [product, setProduct] = useState<Phong | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState<boolean>(false);
  // Guest breakdown state
  const [adults, setAdults] = useState<number>(1);
  const [children, setChildren] = useState<number>(0);
  const [infants, setInfants] = useState<number>(0);
  const [listingDays, setListingDays] = useState<Array<{ ngay: string; conKhaDung: boolean }>>([]);
  const [reviewsCount, setReviewsCount] = useState<number>(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [categoryAverages, setCategoryAverages] = useState<CategoryAverages | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showAmenities, setShowAmenities] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [scrollExecuted, setScrollExecuted] = useState(false);
  const [pricingRules, setPricingRules] = useState<{ tyLeNguoiLon: number; tyLeTreEm: number; tyLePhiDichVu: number } | null>(null);
  const [cancellationPolicies, setCancellationPolicies] = useState<import('@/lib/api').ChinhSachHoanTien[]>([]);
  // Ref guard: đảm bảo logic scroll chỉ chạy đúng một lần mà không gây re-render làm hủy interval
  const scrollExecutedRef = useRef(false);
  const router = useRouter();

  // Capture scrollToReview on first render so booking URL sync cannot strip it before scroll fires
  const pendingScrollToReviewRef = useRef<string | null>(searchParams.get('scrollToReview'));
  // Lưu ID cần scroll vào modal (để useEffect modal có thể đọc sau khi URL đã clean)
  const scrollTargetIdRef = useRef<string | null>(searchParams.get('scrollToReview'));

  // Save current booking state before navigating away (e.g. to host page)
  const saveBookingDraft = () => {
    if (id && (checkIn || checkOut || adults > 1 || children > 0 || infants > 0)) {
      localStorage.setItem('roomBookingDraft', JSON.stringify({
        roomId: id,
        checkIn,
        checkOut,
        adults,
        children,
        infants
      }));
    }
  };
  // Booking state
  const [checkIn, setCheckIn] = useState<string>("");
  const [checkOut, setCheckOut] = useState<string>("");

  // Calculate rating distribution
  const ratingDistribution = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      const rounded = Math.round(r.diemSo) as 1 | 2 | 3 | 4 | 5;
      if (counts[rounded] !== undefined) counts[rounded]++;
    });
    return counts;
  }, [reviews]);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch ALL data in parallel — no waterfall
        const uid = Number(localStorage.getItem('userId'));

        const [productRes, reviewsRes, averagesRes, wishlistRes] = await Promise.all([
          phongAPI.getById(id),
          reviewsAPI.listByProduct(id, uid).catch(err => {
            console.error('Error fetching reviews:', err);
            return [];
          }),
          reviewsAPI.getCategoryAverages(id).catch(err => {
            console.error('Error fetching averages:', err);
            return null;
          }),
          uid ? wishlistAPI.list(uid).catch(() => []) : Promise.resolve([])
        ]);

        setProduct(productRes);

        if (Array.isArray(reviewsRes)) {
          setReviews(reviewsRes);
          setReviewsCount(reviewsRes.length);
        }

        if (averagesRes) {
          setCategoryAverages(averagesRes);
        }

        if (uid && Array.isArray(wishlistRes)) {
          setLiked(wishlistRes.some((p: any) => Number(p?.maPhong ?? p?.maSanPham) === id));
        }
      } catch (error) {
        console.error('Error fetching product details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Fetch pricing rules from API (avoid localStorage race condition)
  useEffect(() => {
    pricingRulesAPI.get().then(data => {
      const rules = { tyLeNguoiLon: data.tyLeNguoiLon / 100, tyLeTreEm: data.tyLeTreEm / 100, tyLePhiDichVu: (data.tyLePhiDichVu ?? 10) / 100 };
      setPricingRules(rules);
      localStorage.setItem('quyDinhGia', JSON.stringify(data));
    }).catch(() => {});
    chinhSachHuyAPI.list().then(setCancellationPolicies).catch(() => {});
  }, []);

  // Scroll to review section when navigating from profile
  useEffect(() => {
    if (loading || reviews.length === 0) return;
    // Dùng ref để guard, không dùng state để tránh re-render hủy interval
    if (scrollExecutedRef.current) return;

    const scrollToReviewId = pendingScrollToReviewRef.current;
    if (!scrollToReviewId) return;

    // Đánh dấu ngay bằng ref (không gây re-render) để không chạy lại
    scrollExecutedRef.current = true;
    pendingScrollToReviewRef.current = null;

    // Kiểm tra review có trong 6 cái đang hiển thị không
    const isInVisible = reviews.slice(0, 6).some(r => String(r.maDanhGia) === scrollToReviewId);

    if (isInVisible) {
      // Dùng polling để chờ element xuất hiện trong DOM
      let attempts = 0;
      const maxAttempts = 30; // 30 * 200ms = 6s max
      const interval = setInterval(() => {
        attempts++;
        const el = document.getElementById(`review-${scrollToReviewId}`);
        if (el) {
          clearInterval(interval);
          // Scroll mượt đến review
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight review
          el.classList.add('ring-2', 'ring-[#FF385C]', 'ring-opacity-50', 'rounded-lg', 'transition-all');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-[#FF385C]', 'ring-opacity-50', 'rounded-lg');
          }, 2500);
          // Sau khi scroll xong mới cập nhật state để URL cleanup
          setScrollExecuted(true);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setScrollExecuted(true);
        }
      }, 200);
      // Không return clearInterval ở đây vì effect sẽ không re-run (ref guard)
    } else {
      // Review ở trong modal → mở modal, useEffect showAllReviews sẽ lo scroll
      setShowAllReviews(true);
      // Cập nhật state để URL cleanup
      setScrollExecuted(true);
    }
  }, [loading, reviews.length, id]); // eslint-disable-line react-hooks/exhaustive-deps


  // Khi modal mở do scrollToReview, cuộn đến review đúng trong scroll container của modal
  useEffect(() => {
    if (!showAllReviews) return;
    const targetId = scrollTargetIdRef.current;
    if (!targetId) return;

    // Dùng polling để chờ cả modal animation xong VÀ element review được mount vào DOM
    let attempts = 0;
    const maxAttempts = 30; // 30 * 100ms = 3s max
    const interval = setInterval(() => {
      attempts++;
      const reviewEl = document.getElementById(`review-modal-${targetId}`);
      if (!reviewEl) {
        if (attempts >= maxAttempts) clearInterval(interval);
        return;
      }
      clearInterval(interval);

      // Tìm scroll container của cột phải trong modal:
      // Ant Design modal body chứa flex row, cột phải có class overflow-y-auto
      // Thử tìm bằng cách đi lên DOM từ element cho đến khi gặp container có scroll thực sự
      let container: HTMLElement | null = reviewEl.parentElement;
      while (container) {
        const style = getComputedStyle(container);
        if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && container.scrollHeight > container.clientHeight) {
          break;
        }
        container = container.parentElement;
      }

      const doScroll = () => {
        if (container) {
          // Tính offset để review nằm chính giữa container
          const containerRect = container.getBoundingClientRect();
          const elRect = reviewEl.getBoundingClientRect();
          const scrollTarget = container.scrollTop + elRect.top - containerRect.top - container.clientHeight / 2 + reviewEl.clientHeight / 2;
          container.scrollTo({ top: Math.max(0, scrollTarget), behavior: 'smooth' });
        } else {
          reviewEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        // Highlight sau khi scroll bắt đầu
        setTimeout(() => {
          reviewEl.classList.add('ring-2', 'ring-[#FF385C]', 'ring-opacity-50', 'rounded-lg');
          setTimeout(() => reviewEl.classList.remove('ring-2', 'ring-[#FF385C]', 'ring-opacity-50', 'rounded-lg'), 2500);
        }, 300);
      };

      // Đợi thêm một chút để animation modal settle xong rồi mới scroll
      setTimeout(doScroll, 200);
    }, 100);

    return () => clearInterval(interval);
  }, [showAllReviews]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasInitialized = useRef(false);


  // Initialize booking selections once on mount / room ID change
  useEffect(() => {
    if (!id || hasInitialized.current) return;

    // 1. Get from URL search params
    const urlCheckIn = searchParams.get('ngayNhan');
    const urlCheckOut = searchParams.get('ngayTra');
    const urlAdults = searchParams.get('nguoiLon');
    const urlChildren = searchParams.get('treEm');
    const urlInfants = searchParams.get('emBe');

    let finalCheckIn = urlCheckIn;
    let finalCheckOut = urlCheckOut;
    let finalAdults = urlAdults ? Number(urlAdults) : null;
    let finalChildren = urlChildren ? Number(urlChildren) : null;
    let finalInfants = urlInfants ? Number(urlInfants) : null;

    // 2. Fallback to localStorage draft if not fully present in URL
    if (!urlCheckIn || !urlCheckOut) {
      try {
        const draftRaw = localStorage.getItem('roomBookingDraft');
        if (draftRaw) {
          const draft = JSON.parse(draftRaw);
          if (draft.roomId === id) {
            if (!finalCheckIn && draft.checkIn) finalCheckIn = draft.checkIn;
            if (!finalCheckOut && draft.checkOut) finalCheckOut = draft.checkOut;
            if (finalAdults === null && draft.adults) finalAdults = draft.adults;
            if (finalChildren === null && draft.children != null) finalChildren = draft.children;
            if (finalInfants === null && draft.infants != null) finalInfants = draft.infants;
          }
        }
      } catch (e) {
        console.error('Error reading roomBookingDraft:', e);
      }
    }

    // 3. Fallback to default dates if still empty
    const toLocalISODate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    const today = new Date();
    const plus2 = new Date(today.getTime());
    plus2.setDate(today.getDate() + 2);

    if (!finalCheckIn) {
      finalCheckIn = toLocalISODate(today);
    }
    if (!finalCheckOut) {
      finalCheckOut = toLocalISODate(plus2);
    }

    // Ensure checkout is after checkin, otherwise adjust checkout to checkin + 2 days
    if (finalCheckIn && finalCheckOut) {
      const ciDate = new Date(finalCheckIn);
      const coDate = new Date(finalCheckOut);
      if (coDate <= ciDate) {
        const adjustedCo = new Date(ciDate.getTime());
        adjustedCo.setDate(ciDate.getDate() + 2);
        finalCheckOut = toLocalISODate(adjustedCo);
      }
    }

    // Update state variables
    setCheckIn(finalCheckIn);
    setCheckOut(finalCheckOut);
    setAdults(finalAdults && finalAdults >= 1 ? finalAdults : 1);
    setChildren(finalChildren && finalChildren >= 0 ? finalChildren : 0);
    setInfants(finalInfants && finalInfants >= 0 ? finalInfants : 0);

    // Mark as initialized
    hasInitialized.current = true;
  }, [id, searchParams]);

  // Sync booking selections to URL and localStorage in real-time
  useEffect(() => {
    // Only sync if we have successfully initialized the state
    if (!id || !hasInitialized.current) return;

    const params = new URLSearchParams();
    // Preserve all existing params from URL (thanhPho, etc.)
    // Strip scrollToReview once scroll has been handled (or it was never present)
    searchParams.forEach((value, key) => {
      if (key === 'scrollToReview' && scrollExecuted) return; // remove after scroll done
      params.set(key, value);
    });

    // Update URL with current selections (override any existing values)
    if (checkIn) params.set('ngayNhan', checkIn);
    if (checkOut) params.set('ngayTra', checkOut);
    if (adults > 1) params.set('nguoiLon', String(adults));
    if (children > 0) params.set('treEm', String(children));
    if (infants > 0) params.set('emBe', String(infants));

    const newUrl = `/phong/${id}${params.toString() ? '?' + params.toString() : ''}`;
    router.replace(newUrl, { scroll: false });

    // Also save to localStorage as fallback
    if (checkIn || checkOut || adults > 1 || children > 0 || infants > 0) {
      localStorage.setItem('roomBookingDraft', JSON.stringify({
        roomId: id,
        checkIn,
        checkOut,
        adults,
        children,
        infants
      }));
    }
  }, [checkIn, checkOut, adults, children, infants, id, router, searchParams, scrollExecuted]);

  // Lock body scroll when any modal is open - remember original overflow once
  const originalOverflowRef = useRef<string | null>(null);
  useEffect(() => {
    const lock = showAbout || showAmenities || showGallery;
    if (lock) {
      // Save only once when transitioning from unlocked -> locked
      if (originalOverflowRef.current === null) {
        originalOverflowRef.current = document.body.style.overflow || "";
      }
      document.body.style.overflow = "hidden";
    } else {
      // Restore from the saved value, then clear
      const restore = originalOverflowRef.current ?? "";
      document.body.style.overflow = restore;
      originalOverflowRef.current = null;
    }
    return () => {
      // On unmount, always restore if we had modified it
      if (originalOverflowRef.current !== null) {
        document.body.style.overflow = originalOverflowRef.current || "";
        originalOverflowRef.current = null;
      }
    };
  }, [showAbout, showAmenities, showGallery]);

  const images: ListingImage[] = useMemo(() => {
    if (product?.hinhAnhs?.length) {
      // Create a copy to avoid modifying the original product object
      const sortedImages = [...product.hinhAnhs].sort((a, b) => (a.thuTu ?? 0) - (b.thuTu ?? 0));
      return sortedImages;
    }
    if (product?.urlAnhChinh)
      return [
        { maHinhAnh: 1, urlHinhAnh: product.urlAnhChinh, thuTu: 0, laAnhChinh: true, phanLoaiAnh: "anh_bo_sung" },
      ];
    return [];
  }, [product]);

  const displayed = images.slice(0, 5);
  const main = displayed[0];
  const thumbs = displayed.slice(1);
  const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);
  // First images by category to showcase (living room / bedroom)
  const idxLiving = useMemo(() => images.findIndex((i) => i.phanLoaiAnh === "phong_khach"), [images]);
  const idxBedroom = useMemo(() => images.findIndex((i) => i.phanLoaiAnh === "phong_ngu"), [images]);
  const livingImg = idxLiving >= 0 ? images[idxLiving] : undefined;
  const bedroomImg = idxBedroom >= 0 ? images[idxBedroom] : undefined;
  const parseDate = (v: string) => (v ? new Date(v + "T00:00:00") : null);
  const addDays = (date: Date, days: number) => {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  };
  const nights = useMemo(() => {
    const ci = parseDate(checkIn);
    const co = parseDate(checkOut);
    if (!ci || !co) return 0;
    const diff = Math.round((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(diff, 0);
  }, [checkIn, checkOut]);
  const totalPrice = (() => {
    const result = calculateLuuTru({
        giaMoiKhach: product?.giaMoiKhach || 0,
        nights,
        soNguoiLon: adults,
        soTreEm: children,
        soEmBe: infants,
        phiVeSinh: product?.phiVeSinh || 0,
    }, 0, pricingRules || undefined);
    return result.roomCost;
  })();

  // Two-month calendar with navigation, Monday-first
  const [monthOffset, setMonthOffset] = useState(0);
  const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const addMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() + months, 1);
  const getMonthMatrix = (base: Date): (Date | null)[] => {
    // Create 6 weeks * 7 days grid, Monday first
    const firstDay = startOfMonth(base);
    const firstDow = (firstDay.getDay() + 6) % 7; // 0=>Mon, ... 6=>Sun
    const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    // leading blanks
    for (let i = 0; i < firstDow; i++) cells.push(null);
    // month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(base.getFullYear(), base.getMonth(), d));
    }
    // trailing blanks to reach 42 cells
    while (cells.length % 7 !== 0) cells.push(null);
    while (cells.length < 42) cells.push(null);
    return cells;
  };
  const todayLocal = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const leftMonth = useMemo(() => addMonths(startOfMonth(todayLocal), monthOffset), [todayLocal, monthOffset]);
  const rightMonth = useMemo(() => addMonths(leftMonth, 1), [leftMonth]);
  const leftMatrix = useMemo(() => getMonthMatrix(leftMonth), [leftMonth]);
  const rightMatrix = useMemo(() => getMonthMatrix(rightMonth), [rightMonth]);
  // Fetch listing availability for current two months window
  useEffect(() => {
    if (!product) return;
    const fromISO = toISO(leftMonth);
    const endOfRight = new Date(rightMonth.getFullYear(), rightMonth.getMonth() + 1, 0);
    const toISOEnd = toISO(endOfRight);
    (async () => {
      try {
        const days = await availabilityAPI.listingDays(getPhongId(product), fromISO, toISOEnd);
        setListingDays(Array.isArray(days) ? days.map((d: any) => ({ ngay: d.ngay, conKhaDung: d.conKhaDung })) : []);
      } catch {
        setListingDays([]);
      }
    })();
  }, [product, leftMonth, rightMonth]);
  const isUnavailable = (d: Date) => {
    // Also block dates in the past
    if (d.getTime() < todayLocal.getTime()) return true;

    const iso = toISO(d);
    const rec = listingDays.find((x) => String(x.ngay).startsWith(iso));
    return rec ? rec.conKhaDung === false : false;
  };
  const isInRange = (d: Date) => {
    const ci = parseDate(checkIn);
    const co = parseDate(checkOut);
    if (!ci && !co) return false;
    if (ci && !co) return d.getTime() === ci.getTime();
    if (!ci || !co) return false;
    return d.getTime() >= ci.getTime() && d.getTime() <= co.getTime();
  };
  const handlePick = (d: Date) => {
    if (isUnavailable(d)) return; // block picking an unavailable day
    const ci = parseDate(checkIn);
    const co = parseDate(checkOut);
    // If no start selected yet OR a full range already exists -> start new selection and clear end
    if (!ci || (ci && co)) {
      // If we start a new selection, ensure it's not in the past (handled by pick block)
      setCheckIn(toISO(d));
      setCheckOut("");
      return;
    }
    // Only start exists -> set end
    if (d.getTime() <= ci.getTime()) {
      // enforce at least +1 day when clicked before/same day
      setCheckOut(toISO(addDays(ci, 1)));
    } else {
      // Ensure entire range is available
      let cur = new Date(ci.getTime());
      let ok = true;
      while (cur <= d) {
        if (isUnavailable(cur)) { ok = false; break; }
        cur = addDays(cur, 1);
      }
      if (!ok) return;
      setCheckOut(toISO(d));
    }
  };

  // Some DB rows may contain unescaped control characters (e.g. raw newlines) inside JSON string literals.
  // Sanitize before JSON.parse to avoid "Bad control character in string literal" errors without altering structural whitespace.
  const escapeControlsInJsonStrings = (input: string) =>
    input.replace(/"(?:[^"\\]|\\.)*"/g, (segment) =>
      segment.replace(/[\u0000-\u001F]/g, (ch) => {
        if (ch === "\n") return "\\n";
        if (ch === "\r") return "\\r";
        if (ch === "\t") return "\\t";
        return "";
      })
    );

  const safeParseTienNghi = (raw: unknown): any | null => {
    if (raw == null) return null;
    if (typeof raw === 'object') return raw as any;
    if (typeof raw !== 'string') return null;
    try {
      // Trim BOM and surrounding spaces first
      let s = raw.trim().replace(/^\uFEFF/, '');
      s = escapeControlsInJsonStrings(s);
      return JSON.parse(s);
    } catch (e) {
      console.error('Error parsing tienNghi JSON:', e);
      return null;
    }
  };

  const amenities = useMemo(() => {
    // 1) Parse tienNghi JSON string from database
    try {
      if (product?.tienNghi) {
        const parsed = safeParseTienNghi(product.tienNghi);

        // Check if it has nested 'amenities' structure (from your SQL) and normalize
        if (parsed && parsed.amenities) {
          const raw = parsed.amenities as Record<string, unknown>;
          const normalized: Record<string, string[]> = {};
          Object.entries(raw).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              const texts = value.filter((v) => typeof v === 'string') as string[];
              if (texts.length) normalized[key] = texts;
            }
          });
          // Optional: include 'tien_ich_khac' if present as a single-item group
          if (typeof parsed.tien_ich_khac === 'string' && parsed.tien_ich_khac.trim().length) {
            normalized.tien_ich_khac = [parsed.tien_ich_khac.trim()];
          }
          return Object.keys(normalized).length ? normalized : null;
        }

        // Direct amenities object - normalize only array-of-string entries
        if (parsed && typeof parsed === 'object') {
          const raw = parsed as Record<string, unknown>;
          const normalized: Record<string, string[]> = {};
          Object.entries(raw).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              const texts = value.filter((v) => typeof v === 'string') as string[];
              if (texts.length) normalized[key] = texts;
            }
          });
          return Object.keys(normalized).length ? normalized : null;
        }
      }
    } catch (e) {
      console.error('Error parsing tienNghi JSON:', e);
      // Continue to try other methods
    }

    // 2) New shape: array items from tienNghiItems -> grouped record
    if (product?.tienNghiItems && product.tienNghiItems.length > 0) {
      const grouped: Record<string, string[]> = {};
      for (const item of product.tienNghiItems) {
        const groupKey = item.nhom?.trim()?.length ? item.nhom : "khac";
        if (!grouped[groupKey]) grouped[groupKey] = [];
        // If duocCungCap === false keep item under its group (e.g. "Không bao gồm")
        const label = item.ten;
        if (label && label.trim().length) grouped[groupKey].push(label.trim());
      }
      return grouped;
    }

    return null;
  }, [product]);

  if (loading) {
    return (
      <>
        <Header />
        <ProductDetailSkeleton />
        <Footer />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="pt-0 md:pt-20 pb-24 md:pb-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-semibold text-gray-900">{product?.tieuDe || "Chi tiết chỗ ở"}</h1>
            <div className="flex gap-4 text-sm text-gray-700">
              <button onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: product?.tieuDe, url: window.location.href });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Đã sao chép liên kết');
                  }
                }} className="hover:text-gray-900 flex items-center gap-1.5">
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                  <path d="M13 2.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM3 6.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm10 5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM4.92 8.86l6.16 3.28-.16.86-6.16-3.28.16-.86zm6.16-4.72l.16.86-6.16 3.28-.16-.86 6.16-3.28z"/>
                </svg>
                Chia sẻ
              </button>
              <button
                className={`hover:text-gray-900 ${liked ? 'text-[#FF385C]' : ''}`}
                onClick={async () => {
                  try {
                    const uid = Number(localStorage.getItem('userId'));
                    if (!uid) {
                      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
                      return;
                    }
                    const res = await wishlistAPI.toggle(uid, id);
                    setLiked(!!res?.liked);
                  } catch { }
                }}
              >
                {liked ? 'Đã lưu' : 'Lưu'}
              </button>
            </div>
          </div>

          <div className="mb-8 relative">
            <div className="mb-8 relative -mx-4 md:mx-0">
              {/* Mobile Carousel */}
              <div className="md:hidden relative w-full h-[300px]">
                <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide h-full">
                  {images.map((img, idx) => (
                    <div key={img.maHinhAnh} className="snap-center flex-shrink-0 w-full h-full relative border-r border-white/10"
                      onClick={() => {
                        setSelectedIndex(idx);
                        setShowGallery(true);
                      }}
                    >
                      <Image
                        src={img.urlHinhAnh}
                        alt={`img-${idx}`}
                        fill
                        className="object-cover"
                        sizes="100vw"
                        priority={idx === 0}
                      />
                    </div>
                  ))}
                </div>
                <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-md text-xs font-semibold">
                  1 / {images.length}
                </div>
              </div>

              {/* Desktop Grid */}
              <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2 rounded-xl overflow-hidden" style={{ height: "560px" }}>
                {/* Main Image */}
                <div className="col-span-2 row-span-2 relative cursor-pointer group bg-gray-100"
                  onClick={() => {
                    setSelectedIndex(0);
                    setShowGallery(true);
                  }}
                >
                  {main && (
                    <>
                      <Image
                        src={main.urlHinhAnh}
                        alt="main"
                        fill
                        className="object-cover group-hover:opacity-95 transition duration-300"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        priority
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition duration-300" />
                    </>
                  )}
                </div>

                {/* Thumbnails */}
                {thumbs.slice(0, 4).map((img, idx) => (
                  <div
                    key={img.maHinhAnh}
                    className="relative cursor-pointer overflow-hidden group col-span-1 row-span-1 bg-gray-100"
                    onClick={() => {
                      setSelectedIndex(idx + 1);
                      setShowGallery(true);
                    }}
                  >
                    <Image
                      src={img.urlHinhAnh}
                      alt={`thumb-${idx}`}
                      fill
                      className="object-cover group-hover:opacity-95 transition duration-300"
                      sizes="25vw"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition duration-300" />
                  </div>
                ))}
              </div>

              <button
                className="hidden md:flex absolute bottom-6 right-6 bg-white border border-gray-300 text-black px-4 py-1.5 rounded-lg text-sm font-semibold shadow-md hover:bg-gray-50 items-center gap-2 transition"
                onClick={() => {
                  setSelectedIndex(-1);
                  setShowGallery(true);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', height: '16px', width: '16px', fill: 'currentColor' }}><path d="M3 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3zm0 1h10v12H3V2zm2 2h2v2H5V4zm0 4h2v2H5V8zm0 4h2v2H5v-2zm4-8h2v2H9V4zm0 4h2v2H9V8zm0 4h2v2H9v-2z"></path></svg>
                Hiển thị tất cả {images.length} ảnh
              </button>
            </div>



            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <h2 className="text-lg font-semibold mb-1">
                  {product?.loaiBatDongSan ? `Toàn bộ ${product.loaiBatDongSan} cho thuê` : "Nơi lưu trú"} tại {product?.quanHuyen}, {product?.thanhPho}
                </h2>
                <div className="text-gray-600 mb-6 flex flex-wrap gap-2">
                  <span>{product?.soKhachToiDa} khách</span>
                  <span>•</span>
                  <span>{product?.soPhongNgu} phòng ngủ</span>
                  <span>•</span>
                  <span>{product?.soGiuong} giường</span>
                  <span>•</span>
                  <span>{product?.soPhongTam} phòng tắm</span>
                </div>

                {/* Banner giống Airbnb: Được khách yêu thích + điểm + số đánh giá */}
                {reviews.length > 0 && (
                <div className="mb-8 border rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🥇</div>
                    <div>
                      <div className="text-lg font-semibold">Được khách yêu thích</div>
                      <div className="text-sm text-gray-600">Khách đánh giá đây là một trong những ngôi nhà được yêu thích nhất trên Airbnb</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-semibold">{reviews.length > 0 ? (reviews.reduce((sum, r) => sum + (r.diemSo || 0), 0) / reviews.length).toFixed(1) : (product?.diemTrungBinh?.toFixed(1) ?? "0,0")}</div>
                      <div className="text-yellow-500">★★★★★</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-semibold">{reviews.length}</div>
                      <div className="text-gray-600">đánh giá</div>
                    </div>
                  </div>
                </div>
                )}
                {/* Thông tin chủ nhà và các điểm nổi bật */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-3 cursor-pointer" onClick={() => { saveBookingDraft(); router.push(`/host/${product?.hostInfo?.maNguoiDung}?roomId=${id}`); }}>
                    <div className="w-12 h-12 rounded-full overflow-hidden relative border border-gray-100 shadow-sm bg-gray-100">
                      <Image
                        src={product?.hostInfo?.avatarUrl || "/placeholder-avatar.jpg"}
                        alt="host"
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <div>
                      <div className="font-semibold">Host: {product?.hostInfo?.hoTen || "Chủ nhà"}</div>
                      <div className="text-gray-600 text-sm">
                        {product?.hostInfo?.soNamKinhNghiem ? `${product.hostInfo.soNamKinhNghiem} năm kinh nghiệm` : "Chủ nhà siêu cấp"}
                      </div>
                    </div>
                  </div>
                  <div className="divide-y rounded-2xl border">
                    <div className="flex items-start gap-3 p-4">
                      <div>🏆</div>
                      <div>
                        <div className="font-medium">Nhóm 5% những ngôi nhà hàng đầu</div>
                        <div className="text-gray-600 text-sm">Nhà này được xếp hạng cao dựa trên điểm xếp hạng, lượt đánh giá và độ tin cậy.</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4">
                      <div>🌊</div>
                      <div>
                        <div className="font-medium">Trên hồ</div>
                        <div className="text-gray-600 text-sm">Nhà này nằm ngay trên West Lake.</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4">
                      <div>🗓️</div>
                      <div>
                        <div className="font-medium">Hủy miễn phí trước 16 tháng 11</div>
                        <div className="text-gray-600 text-sm">Được hoàn tiền đầy đủ nếu bạn thay đổi kế hoạch.</div>
                      </div>
                    </div>
                  </div>
                </div>



                <div className="mb-6 relative">
                  <div className="relative max-h-56 overflow-hidden">
                    <p className="text-gray-800 leading-relaxed whitespace-pre-line">{product?.moTa}</p>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white to-transparent" />
                  </div>
                  <button
                    className="mt-4 px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-gray-50"
                    onClick={() => setShowAbout(true)}
                  >
                    Hiển thị thêm
                  </button>
                </div>

                {/* Nơi bạn sẽ ngủ nghỉ - preview by category */}
                {(livingImg || bedroomImg) && (
                  <div className="mt-10">
                    <div className="text-2xl font-semibold mb-4">Nơi bạn sẽ ngủ nghỉ</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {livingImg && (
                        <div
                          className="rounded-2xl overflow-hidden cursor-pointer group relative"
                          onClick={() => {
                            if (idxLiving >= 0) {
                              setSelectedIndex(idxLiving);
                              setShowGallery(true);
                            }
                          }}
                        >
                          <div className="relative w-full h-64 bg-gray-100">
                            <Image
                              src={livingImg.urlHinhAnh}
                              alt="Phòng khách"
                              fill
                              className="object-cover group-hover:opacity-95 transition"
                              sizes="(max-width: 768px) 100vw, 50vw"
                            />
                          </div>
                          <div className="mt-2 font-medium">Phòng khách</div>
                          <div className="text-gray-600 text-sm">1 nệm trải sàn</div>
                        </div>
                      )}
                      {bedroomImg && (
                        <div
                          className="rounded-2xl overflow-hidden cursor-pointer group relative"
                          onClick={() => {
                            if (idxBedroom >= 0) {
                              setSelectedIndex(idxBedroom);
                              setShowGallery(true);
                            }
                          }}
                        >
                          <div className="relative w-full h-64 bg-gray-100">
                            <Image
                              src={bedroomImg.urlHinhAnh}
                              alt="Phòng ngủ"
                              fill
                              className="object-cover group-hover:opacity-95 transition"
                              sizes="(max-width: 768px) 100vw, 50vw"
                            />
                          </div>
                          <div className="mt-2 font-medium">Phòng ngủ</div>
                          <div className="text-gray-600 text-sm">1 giường queen</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="border-t pt-6 mt-6">
                  <h3 className="text-xl font-semibold mb-4">Nơi này có những gì cho bạn</h3>
                  {amenities ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      {Object.values(amenities).flatMap((v) => (Array.isArray(v) ? v : []))
                        .slice(0, 8)
                        .map((t) => (
                          <div key={t} className="flex items-center gap-2 text-gray-800">
                            <span className="text-gray-500">•</span>
                            <span>{t}</span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 mb-4">Chủ nhà chưa cung cấp danh sách tiện nghi chi tiết.</p>
                  )}
                  <button
                    className="px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-gray-50"
                    onClick={() => setShowAmenities(true)}
                  >
                    Hiển thị tất cả tiện nghi
                  </button>
                </div>

                <div className="border-t pt-6 mt-6">
                  <div className="flex items-baseline justify-between mb-2">
                    <h3 className="text-xl font-semibold">
                      {nights || 2} đêm tại {product?.quanHuyen}
                    </h3>
                    <div className="text-sm text-gray-600">
                      {checkIn && checkOut ? (
                        <>
                          {new Date(checkIn + "T00:00:00").toLocaleDateString("vi-VN")} - {new Date(checkOut + "T00:00:00").toLocaleDateString("vi-VN")}
                        </>
                      ) : (
                        <>Chọn ngày</>
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl p-0 text-sm text-gray-700">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 px-2">
                      <div>
                        <h2 className="text-2xl font-semibold text-gray-900">
                          {nights > 0 ? `${nights} đêm` : (checkIn && !checkOut ? "Chọn ngày trả phòng" : "Chọn ngày nhận phòng")}
                        </h2>
                        <div className="text-sm text-gray-500">
                          {checkIn && checkOut
                            ? `${new Date(checkIn).toLocaleDateString("vi-VN", { day: '2-digit', month: 'short', year: 'numeric' })} - ${new Date(checkOut).toLocaleDateString("vi-VN", { day: '2-digit', month: 'short', year: 'numeric' })}`
                            : (product?.quanHuyen && product?.thanhPho ? `Tại ${product.quanHuyen}, ${product.thanhPho}` : "Thêm ngày đi để biết giá chính xác")
                          }
                        </div>
                      </div>
                      <div className="flex gap-0 w-full md:w-auto border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-black">
                        <div className={`flex-1 md:w-36 p-2.5 relative cursor-pointer border-r border-gray-300 ${!checkOut && checkIn ? 'bg-gray-100' : 'bg-white'}`} onClick={() => { if (checkIn) { setCheckIn(''); setCheckOut(''); } }}>
                          <div className="text-[10px] font-bold text-gray-900 uppercase">NHẬN PHÒNG</div>
                          <div className={`text-sm ${checkIn ? 'text-gray-900' : 'text-gray-400'}`}>
                            {checkIn ? new Date(checkIn + "T00:00:00").toLocaleDateString("vi-VN") : "Thêm ngày"}
                          </div>
                          {checkIn && (
                            <button onClick={(e) => { e.stopPropagation(); setCheckIn(''); setCheckOut(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black">
                              <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', fill: 'none', height: '12px', width: '12px', stroke: 'currentColor', strokeWidth: 4, overflow: 'visible' }}>
                                <path d="m6 6 20 20m0-20-20 20"></path>
                              </svg>
                            </button>
                          )}
                        </div>
                        <div className={`flex-1 md:w-36 p-2.5 relative cursor-pointer ${checkOut ? 'bg-white' : (checkIn ? 'bg-white' : 'bg-white')}`} onClick={() => { if (checkOut) setCheckOut(''); }}>
                          <div className="text-[10px] font-bold text-gray-900 uppercase">TRẢ PHÒNG</div>
                          <div className={`text-sm ${checkOut ? 'text-gray-900' : 'text-gray-400'}`}>
                            {checkOut ? new Date(checkOut + "T00:00:00").toLocaleDateString("vi-VN") : "Thêm ngày"}
                          </div>
                          {checkOut && (
                            <button onClick={(e) => { e.stopPropagation(); setCheckOut(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black">
                              <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', fill: 'none', height: '12px', width: '12px', stroke: 'currentColor', strokeWidth: 4, overflow: 'visible' }}>
                                <path d="m6 6 20 20m0-20-20 20"></path>
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="relative group/cal">
                      <button
                        type="button"
                        className="absolute left-0 top-12 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition z-20"
                        onClick={() => setMonthOffset((v) => v - 1)}
                      >
                        <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', fill: 'none', height: '12px', width: '12px', stroke: 'currentColor', strokeWidth: 4, overflow: 'visible' }}>
                          <path d="m20 28-11.29289322-11.2928932c-.39052429-.3905243-.39052429-1.0236893 0-1.4142136l11.29289322-11.2928932"></path>
                        </svg>
                      </button>

                      <button
                        type="button"
                        className="absolute right-0 top-12 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition z-20"
                        onClick={() => setMonthOffset((v) => v + 1)}
                      >
                        <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', fill: 'none', height: '12px', width: '12px', stroke: 'currentColor', strokeWidth: 4, overflow: 'visible' }}>
                          <path d="m12 4 11.2928932 11.2928932c.3905243.3905243.3905243 1.0236893 0 1.4142136l-11.2928932 11.2928932"></path>
                        </svg>
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {[{ matrix: leftMatrix, base: leftMonth }, { matrix: rightMatrix, base: rightMonth }].map(({ matrix, base }) => (
                          <div key={`${base.getFullYear()}-${base.getMonth()}`} className="px-1">
                            <div className="text-center font-bold text-base mb-6 text-gray-900">Tháng {base.getMonth() + 1} năm {base.getFullYear()}</div>
                            <div className="grid grid-cols-7 gap-1 mb-2 text-[12px] font-bold text-gray-500">
                              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((w) => (
                                <div key={w} className="h-6 flex items-center justify-center">{w}</div>
                              ))}
                            </div>
                            <div className="grid grid-cols-7 gap-y-1 select-none">
                              {matrix.map((d, idx) => {
                                if (!d) return <div key={`e-${idx}`} className="h-10" />;
                                const ci = parseDate(checkIn);
                                const co = parseDate(checkOut);
                                const isStart = !!ci && d.getTime() === ci.getTime();
                                const isEnd = !!co && d.getTime() === co.getTime();
                                const inBetween = !!ci && !!co && d.getTime() > ci.getTime() && d.getTime() < co.getTime();
                                const label = d.getDate();
                                const unavailable = isUnavailable(d);

                                let btnClass = "relative z-10 w-11 h-11 flex items-center justify-center rounded-full text-sm font-semibold transition-all";

                                if (unavailable) {
                                  btnClass += " text-gray-300 line-through cursor-not-allowed";
                                } else if (isStart || isEnd) {
                                  btnClass += " bg-[#222222] text-white hover:bg-black scale-100";
                                } else if (inBetween) {
                                  btnClass += " bg-gray-50 text-gray-900 !rounded-none w-full scale-100";
                                } else {
                                  btnClass += " text-gray-900 hover:ring-2 hover:ring-black hover:ring-inset";
                                }

                                const isRangeStart = isStart && co;
                                const isRangeEnd = isEnd && ci;

                                return (
                                  <div key={d.toISOString()} className="relative h-11 w-full flex items-center justify-center">
                                    {inBetween && <div className="absolute inset-0 bg-gray-50" />}
                                    {isRangeStart && <div className="absolute top-0 bottom-0 right-0 w-1/2 bg-gray-50" />}
                                    {isRangeEnd && <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-gray-50" />}

                                    <button
                                      type="button"
                                      onClick={() => handlePick(d)}
                                      disabled={unavailable}
                                      className={btnClass}
                                    >
                                      {label}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-10 px-2 pb-2">
                      <div className="p-2 cursor-pointer hover:bg-gray-100 rounded-lg transition">
                        <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', fill: 'none', height: '16px', width: '16px', stroke: 'currentColor', strokeWidth: 3, overflow: 'visible' }}>
                          <path d="M29 5a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h26zm0 2H3v18h26V7zm-8 13v2H11v-2h10zm4-5v2h-2v-2h2zm-4 0v2h-2v-2h2zm-4 0v2h-2v-2h2zm-4 0v2h-2v-2h2zm-4 0v2H7v-2h2zm16-4v2h-2V8h2zm-4 0v2h-2V8h2zm-4 0v2h-2V8h2zm-4 0v2h-2V8h2zm-4 0v2H7V8h2z"></path>
                        </svg>
                      </div>
                      <div className="flex items-center gap-6">
                        <button
                          className="text-sm font-semibold underline text-gray-900 hover:text-black transition"
                          onClick={() => {
                            setCheckIn("");
                            setCheckOut("");
                          }}
                        >
                          Xóa ngày
                        </button>
                        <button
                          className="bg-[#222222] text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-black transition-colors"
                          onClick={() => {
                            // Focus Guest Selector or scroll to booking card
                            const bookingCard = document.querySelector('.sticky');
                            if (bookingCard) bookingCard.scrollIntoView({ behavior: 'smooth' });
                          }}
                        >
                          Đóng
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Calendar 1 tháng - mới
                <SingleMonthCalendar
                  checkIn={checkIn}
                  checkOut={checkOut}
                  onPick={(date) => handlePick(date)}
                  isUnavailable={isUnavailable}
                  todayLocal={todayLocal}
                /> */}


              </div>

              <div className="lg:col-span-1 relative">
                <div className="hidden lg:block sticky top-24">
                  {/* Listing Unavailable Banner */}
                  {(product?.biKhoa || product?.trangThai === 'khong_hoat_dong') && (
                    <div className="mb-6 border border-red-200 bg-red-50 rounded-xl p-5 flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      <div>
                        <div className="font-semibold text-red-700 text-sm">Chỗ ở này hiện không khả dụng</div>
                        <div className="text-red-600 text-xs mt-1">
                          {product?.biKhoa ? 'Chỗ ở đã bị khóa bởi quản trị viên.' : 'Chủ nhà đã tạm dừng nhận đặt phòng.'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rare Find Banner */}
                  <div className="mb-6 border border-gray-200 rounded-xl p-6 flex items-start gap-4 shadow-sm bg-white">
                    <div className="text-pink-600 mt-1">
                      <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', height: '24px', width: '24px', fill: 'currentColor' }}><path d="M25.46 3.18a3 3 0 0 1 2.3 1.25l3.88 5.54a3 3 0 0 1-.55 4.08l-13.67 13.33a3 3 0 0 1-4.24 0L.91 14.05a3 3 0 0 1-.55-4.08l3.88-5.54a3 3 0 0 1 2.3-1.25zm-6.69 13.06 9.4-9.17-2.6-3.72-6.8 12.9zm-5.54 0 6.8-12.9-2.6-3.71-9.4 9.16zM16 17.5l6.03-11.44H9.97z"></path></svg>
                    </div>
                    <div>
                      <div className="font-bold text-base mb-1">Hiếm khi còn phòng! Chỗ ở này thường kín phòng</div>
                    </div>
                  </div>

                  {/* Main Booking Card */}
                  <div className="border border-gray-200 rounded-xl p-6 shadow-xl bg-white">
                    <div className="mb-6">
                      <div className="flex items-baseline flex-wrap gap-1">
                        {nights > 0 ? (
                          <>
                            <span className="text-2xl font-semibold">₫{fmt(totalPrice)}</span>
                            <span className="text-gray-600 text-base"> cho {nights} đêm</span>
                          </>
                        ) : (
                          <>
                            <span className="text-2xl font-semibold">₫{fmt(product?.giaMoiKhach || 0)}</span>
                            <span className="text-gray-600 text-base"> / đêm</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mb-4 border border-gray-400 rounded-lg">
                      <div className="grid grid-cols-2 border-b border-gray-400">
                        <div className="p-3 border-r border-gray-400 relative hover:bg-gray-100 transition cursor-pointer">
                          <label className="block text-[10px] font-bold text-gray-800 mb-0.5">NHẬN PHÒNG</label>
                          <input
                            type="date"
                            className="w-full text-sm border-none outline-none bg-transparent p-0 text-gray-600 font-light cursor-pointer"
                            value={checkIn}
                            min={toISO(todayLocal)}
                            onChange={(e) => {
                              const v = e.target.value;
                              setCheckIn(v);
                              const ci = parseDate(v);
                              const co = parseDate(checkOut);
                              if (ci && co && co <= ci) {
                                // Check-out is before or equal to new check-in -> clear it
                                setCheckOut('');
                              }
                            }}
                          />
                        </div>
                        <div className="p-3 relative hover:bg-gray-100 transition cursor-pointer">
                          <label className="block text-[10px] font-bold text-gray-800 mb-0.5">TRẢ PHÒNG</label>
                          <input
                            type="date"
                            className="w-full text-sm border-none outline-none bg-transparent p-0 text-gray-600 font-light cursor-pointer"
                            value={checkOut}
                            min={(() => {
                              const ci = parseDate(checkIn);
                              if (!ci) return undefined;
                              const m = addDays(ci, 1);
                              return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}-${String(m.getDate()).padStart(2, "0")}`;
                            })()}
                            onChange={(e) => setCheckOut(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="">
                        <GuestSelector
                          adults={adults}
                          childrenCount={children}
                          infants={infants}
                          pets={0}
                          onUpdate={(counts: GuestCounts) => {
                            setAdults(counts.adults);
                            setChildren(counts.children);
                            setInfants(counts.infants);
                          }}
                          maxGuests={product?.soKhachToiDa}
                          mode="dropdown"
                          showPets={false}
                        />
                      </div>
                    </div>

                    {product?.biKhoa || product?.trangThai === 'khong_hoat_dong' ? (
                      <button
                        disabled
                        className="w-full bg-gray-200 text-gray-400 py-3.5 rounded-lg font-semibold text-base mb-4 cursor-not-allowed line-through decoration-2"
                      >
                        Đặt phòng
                      </button>
                    ) : (
                    <button
                      className="w-full bg-[#FF385C] hover:bg-[#D90B3E] text-white py-3.5 rounded-lg font-semibold text-base transition-colors mb-4"
                      onClick={async () => {
                        try {
                          if (!product) return;
                          const uid = Number(localStorage.getItem('userId') || localStorage.getItem('adminId'));
                          if (!uid) {
                            localStorage.setItem('roomBookingDraft', JSON.stringify({
                              roomId: getPhongId(product),
                              checkIn, checkOut, adults, children, infants
                            }));
                            message.error('Vui lòng đăng nhập');
                            router.replace(`/login?callbackUrl=${encodeURIComponent(`/phong/${getPhongId(product)}`)}`);
                            return;
                          }

                          // Validate dates are not blocked
                          if (product.loaiPhong === 'noi_luu_tru' && checkIn && checkOut) {
                            const ci = parseDate(checkIn);
                            const co = parseDate(checkOut);
                            if (ci && co) {
                              let cur = new Date(ci.getTime());
                              while (cur < co) {
                                if (isUnavailable(cur)) {
                                  message.error('Ngày bạn chọn đã bị khóa. Vui lòng chọn ngày khác.');
                                  return;
                                }
                                cur = addDays(cur, 1);
                              }
                            }
                          }

                          // Adults + children count as guests; infants are free
                          const totalGuests = adults + children;
                          const maxGuests = product.soKhachToiDa || null;

                          if (maxGuests && totalGuests > maxGuests) {
                            message.error(`Số khách tối đa cho chỗ ở này là ${maxGuests}`);
                            return;
                          }

                          const payload: any = {
                            maKhach: uid,
                            phongId: getPhongId(product),
                            soLuongKhach: totalGuests,
                            soNguoiLon: adults,
                            soTreEm: children,
                            soEmBe: infants
                          };

                          if (product.loaiPhong === 'noi_luu_tru') {
                            if (!checkIn || !checkOut) { message.error('Chọn ngày'); return; }
                            payload.ngayNhanPhong = checkIn;
                            payload.ngayTraPhong = checkOut;
                          } else if (product.loaiPhong === 'trai_nghiem' || product.loaiPhong === 'dich_vu') {
                            payload.ngayDat = checkIn || new Date().toISOString().split('T')[0];
                          } else {
                            payload.ngayNhanPhong = checkIn || undefined;
                            payload.ngayTraPhong = checkOut || undefined;
                          }

                          const created = await bookingAPI.create(payload);
                          if (created?.maDatCho) {
                            // Pass guest data via URL params (reliable across page reload)
                            const guestParams = `&adults=${adults}&children=${children}&infants=${infants}`;
                            window.location.href = `/payment?bookingId=${created.maDatCho}${guestParams}`;
                          } else {
                            message.error('Đặt chỗ không thành công');
                          }
                        } catch (e: any) {
                          console.error('Booking error:', e);
                          const msg = e.response?.data?.message || 'Không thể đặt chỗ';
                          message.error(msg);
                          toast.error(msg);
                        }
                      }}
                    >
                      Đặt phòng 
                    </button>
                    )}

                    <div className="text-center text-sm text-gray-600 mb-2">
                      Bạn vẫn chưa bị trừ tiền
                    </div>
                  </div>

                  <div className="mt-6 flex justify-center">
                    <button className="text-gray-500 text-sm font-semibold flex items-center gap-2 hover:underline">
                      <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', height: '16px', width: '16px', fill: 'currentColor' }}><path d="M28 6H17V4a2 2 0 0 0-2-2H3v28h2V18h10v2a2 2 0 0 0 2 2h11l.115-.006a1 1 0 0 0 .884-.994V7a1 1 0 0 0-1-1zM3 4h12v2H3zm24 14H17v-2H5v-8h12v2h10z"></path></svg>
                      Báo cáo nhà/phòng cho thuê này
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews, Location, Host - Moved out of grid */}
            <div className="mt-12">
              <div className="border-t pt-12">
                {/* Reviews Section */}
                <div className="border-t pt-12">
                  {reviews.length > 0 && (
                  <div className="flex flex-col items-center text-center mb-12">
                    <div className="relative inline-block mb-2">
                      <div className="flex items-center justify-center">
                        <Image
                          src="/rating1.avif"
                          alt="Guest Favorite Left"
                          height={80}
                          width={120}
                          className="-mr-4 object-contain"
                        />
                        <span className="text-[80px] font-bold text-gray-900 leading-none z-10 mx-4">
                          {(reviews.reduce((sum, r) => sum + (r.diemSo || 0), 0) / reviews.length).toFixed(1).replace('.', ',')}
                        </span>
                        <Image
                          src="/rating1.avif"
                          alt="Guest Favorite Right"
                          height={80}
                          width={120}
                          className="-ml-4 scale-x-[-1] object-contain"
                        />
                      </div>
                    </div>
                    <div className="text-2xl font-semibold mb-2">Được khách yêu thích</div>
                    <div className="text-gray-600 max-w-lg mx-auto text-center leading-relaxed">
                      Trong số các chỗ ở cho thuê đủ điều kiện dựa trên điểm xếp hạng, lượt đánh giá và độ tin cậy, nhà này nằm trong <strong>nhóm 5% chỗ ở hàng đầu</strong>
                    </div>
                  </div>
                  )}

                  {/* Rating Categories */}
                  {reviews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-6 mb-12 text-sm">
                    <div className="lg:col-span-1 border-r border-gray-200 pr-4 hidden lg:block">
                      <div className="font-semibold mb-1">Xếp hạng tổng thể</div>
                      <div className="space-y-1">
                        {[5, 4, 3, 2, 1].map((star) => {
                          const count = ratingDistribution[star as keyof typeof ratingDistribution];
                          const percent = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                          return (
                            <div key={star} className="flex items-center gap-2">
                              <span className="text-xs w-3">{star}</span>
                              <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-gray-800 rounded-full" style={{ width: `${percent}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {[
                      { label: "Mức độ sạch sẽ", score: categoryAverages?.diemSachSe, icon: <FormatPainterOutlined /> },
                      { label: "Độ chính xác", score: categoryAverages?.diemChinhXac, icon: <CheckCircleOutlined /> },
                      { label: "Nhận phòng", score: categoryAverages?.diemNhanPhong, icon: <KeyOutlined /> },
                      { label: "Giao tiếp", score: categoryAverages?.diemGiaoTiep, icon: <MessageOutlined /> },
                      { label: "Vị trí", score: categoryAverages?.diemViTri, icon: <EnvironmentOutlined /> },
                      { label: "Giá trị", score: categoryAverages?.diemGiaTri, icon: <TagOutlined /> },
                    ].map((cat, idx) => {
                      // Format score with comma for Vietnamese locale (e.g., "4,8" instead of "4.8")
                      const formattedScore = cat.score != null
                        ? cat.score.toFixed(1).replace('.', ',')
                        : product?.diemTrungBinh?.toFixed(1).replace('.', ',') ?? "0,0";

                      return (
                        <div key={idx} className={`lg:col-span-1 ${idx < 5 ? 'lg:border-r lg:border-gray-200' : ''} px-2`}>
                          <div className="font-semibold mb-1">{cat.label}</div>
                          <div className="text-lg font-semibold mb-2">{formattedScore}</div>
                          <div className="text-2xl text-gray-800">{cat.icon}</div>
                        </div>
                      );
                    })}
                  </div>
                  )}

                  {/* Reviews Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
                    {reviews.slice(0, 6).map((review) => (
                      <div key={review.maDanhGia} id={`review-${review.maDanhGia}`} className="transition-all duration-300">
                        <ReviewItem review={review} />
                      </div>
                    ))}
                  </div>

                  {reviews.length > 6 && (
                    <button
                      className="mt-8 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold rounded-lg transition"
                      onClick={() => setShowAllReviews(true)}
                    >
                      Hiển thị tất cả {reviews.length} đánh giá
                    </button>
                  )}
                </div>
              </div>

              <div className="border-t pt-12 mt-12">
                <h3 className="text-xl font-semibold mb-4">Vị trí</h3>
                <div className="text-gray-700 mb-1">{product?.diaChiDayDu || product?.tieuDe}</div>
                <div className="text-sm text-gray-500 mb-3">
                  {[product?.phuongXa, product?.quanHuyen, product?.thanhPho, product?.quocGia].filter(Boolean).join(', ')}
                </div>
                <Suspense fallback={
                  <div className="w-full h-[480px] overflow-hidden rounded-xl border bg-gray-100 flex items-center justify-center">
                    <div className="text-gray-500 text-sm">Đang tải bản đồ...</div>
                  </div>
                }>
                  <ProductMap
                    viDo={product?.viDo ?? null}
                    kinhDo={product?.kinhDo ?? null}
                    title={product?.tieuDe}
                    address={product?.diaChiDayDu || [product?.phuongXa, product?.quanHuyen, product?.thanhPho, product?.quocGia].filter(Boolean).join(', ')}
                  />
                </Suspense>
                <div className="mt-4 text-sm text-gray-600">
                  <p>Người dùng sẽ nhận được vị trí chính xác sau khi đặt phòng.</p>
                </div>
              </div>

              <div className="border-t pt-12 mt-12">
                {/* Title with icons */}
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-semibold">Gặp gỡ host của bạn</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', height: '16px', width: '16px', fill: 'currentColor' }}>
                        <path d="M16 1a1 1 0 0 1 .707.293l8 8a1 1 0 0 1-1.414 1.414L16 3.414 8.707 10.707a1 1 0 0 1-1.414-1.414l8-8A1 1 0 0 1 16 1zM4 12v16a1 1 0 0 0 1 1h6v-9a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v9h6a1 1 0 0 0 1-1V12H4zm2 2h20v13h-5v-8h-10v8H6V14z"></path>
                      </svg>
                    </div>
                    <div className="w-8 h-8 rounded-full overflow-hidden relative border border-gray-100">
                      <Image
                        src={product?.hostInfo?.avatarUrl || "/placeholder-avatar.jpg"}
                        alt="Host"
                        fill
                        className="object-cover"
                        sizes="32px"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-12">
                  {/* Left Card - Left-aligned with stats on right */}
                  <div className="bg-white rounded-3xl shadow-[0_6px_16px_rgba(0,0,0,0.12)] p-8 w-full lg:w-[380px] h-fit">
                    <div className="flex flex-row items-center justify-between gap-6">
                      {/* Left: Avatar and Name */}
                      <div className="flex flex-col items-center text-center w-[60%]">
                        {/* Avatar with Badge */}
                        <div className="relative mb-4">
                          <div className="w-28 h-28 rounded-full overflow-hidden relative border-4 border-white shadow-md">
                            <Image
                              src={product?.hostInfo?.avatarUrl || "/placeholder-avatar.jpg"}
                              alt={product?.hostInfo?.hoTen || "Host"}
                              fill
                              className="object-cover"
                              sizes="112px"
                            />
                          </div>
                          <div className="absolute bottom-1 right-0 bg-[#FF385C] rounded-full p-2 border-[3px] border-white flex items-center justify-center shadow-sm">
                            <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', height: '12px', width: '12px', fill: 'white' }}>
                              <path d="M16 28.5c-1.5 0-3-.5-4.5-1.5C8.5 25 2 18.5 2 11.5 2 7 5.5 3.5 10 3.5c2.5 0 5 1.5 6 3.5 1-2 3.5-3.5 6-3.5 4.5 0 8 3.5 8 8 0 7-6.5 13.5-9.5 15.5-1.5 1-3 1.5-4.5 1.5z"></path>
                              <path d="M13.5 18.5l-3-3 1.5-1.5 1.5 1.5 4.5-4.5 1.5 1.5-6 6z" fill="white" />
                            </svg>
                          </div>
                        </div>

                        {/* Name */}
                        <h4 className="text-3xl font-bold mb-2 text-gray-900 leading-tight">{product?.hostInfo?.hoTen || "Chủ nhà"}</h4>

                        {/* Badge */}
                        <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
                          <TrophyOutlined style={{ fontSize: '12px', color: 'currentColor' }} />
                          <span>Chủ nhà siêu cấp</span>
                        </div>
                      </div>

                      {/* Right: Stats - Vertical stack */}
                      <div className="flex flex-col gap-5 w-[40%]">
                        <div className="border-b border-gray-200 pb-2.5">
                          <div className="text-[22px] font-bold text-gray-900 leading-none mb-1">{product?.hostInfo?.soLuongDanhGia || 0}</div>
                          <div className="text-[10px] font-bold text-gray-900 leading-tight">Đánh giá</div>
                        </div>

                        <div className="border-b border-gray-200 pb-2.5">
                          <div className="text-[22px] font-bold text-gray-900 leading-none mb-1 flex items-center gap-1">
                            {product?.hostInfo?.diemDanhGia?.toFixed(1) || "New"}
                            <span className="text-[10px]">★</span>
                          </div>
                          <div className="text-[10px] font-bold text-gray-900 leading-tight">Xếp hạng</div>
                        </div>

                        <div>
                          <div className="text-[22px] font-bold text-gray-900 leading-none mb-1">{product?.hostInfo?.soNamKinhNghiem || 1}</div>
                          <div className="text-[10px] font-bold text-gray-900 leading-tight">Năm kinh nghiệm</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Content */}
                  <div className="flex-1 flex flex-col justify-center">
                    {/* Info Items */}
                    <div className="mb-8 space-y-4">
                      {product?.hostInfo?.congViec && (
                        <div className="flex items-start gap-3">
                          <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', height: '24px', width: '24px', fill: 'currentColor', flexShrink: 0 }}>
                            <path d="M26 4H6a2 2 0 0 0-2 2v20a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM6 6h20v4H6V6zm0 6v12h20V12H6zm2 2h16v2H8v-2zm0 4h12v2H8v-2z"></path>
                          </svg>
                          <span className="text-base text-gray-800">Công việc của tôi: {product.hostInfo.congViec}</span>
                        </div>
                      )}

                      <div className="flex items-start gap-3">
                        <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', height: '24px', width: '24px', fill: 'currentColor', flexShrink: 0 }}>
                          <path d="M16 31c-8.284 0-15-6.716-15-15 0-8.284 6.716-15 15-15 8.284 0 15 6.716 15 15 0 8.284-6.716 15-15 15zm0-28C8.82 3 3 8.82 3 16s5.82 13 13 13 13-5.82 13-13S23.18 3 16 3zm.5 8v8.25l5.86 3.52-.92 1.58-6.94-4.17V11h2z"></path>
                        </svg>
                        <span className="text-base text-gray-800">Tôi dành quá nhiều thời gian để: Âm nhạc/Bảo tàng Nghệ thuật/Tập thể dục</span>
                      </div>

                      <button className="text-base font-semibold underline hover:no-underline text-left">
                        Hiển thị thêm →
                      </button>
                    </div>

                    {/* Superhost Description */}
                    <div className="mb-8">
                      <h4 className="text-xl font-bold mb-3">{product?.hostInfo?.hoTen || "Chủ nhà"} là một Chủ nhà siêu cấp</h4>
                      <p className="text-gray-700 leading-relaxed">
                        Chủ nhà siêu cấp là những người có kinh nghiệm, được đánh giá cao và cam kết mang lại kỳ nghỉ tuyệt vời cho khách.
                      </p>
                    </div>

                    {/* Message Button */}
                    <button
                      className="bg-black text-white px-6 py-3.5 rounded-lg font-semibold hover:bg-gray-800 transition w-fit mb-6"
                      onClick={() => { saveBookingDraft(); router.push(`/host/${product?.hostInfo?.maNguoiDung}?roomId=${id}`); }}
                    >
                      Xem thông tin host
                    </button>

                    {/* Response Info */}
                    <div className="mb-6 space-y-1">
                      <p className="text-sm text-gray-700">Tỉ lệ phản hồi: 100%</p>
                      <p className="text-sm text-gray-700">Họ thường phản hồi trong vòng 1 giờ</p>
                    </div>

                    {/* Security Notice */}
                    <div className="flex items-start gap-3 text-xs text-gray-800 pt-4 border-t">
                      <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', height: '20px', width: '20px', fill: '#FF385C', flexShrink: 0 }}>
                        <path d="M16 1a7 7 0 0 0-7 7v3H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V13a2 2 0 0 0-2-2h-3V8a7 7 0 0 0-7-7zm0 2a5 5 0 0 1 5 5v3H11V8a5 5 0 0 1 5-5zM6 15h20v12H6V15zm10 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"></path>
                      </svg>
                      <span>Để bảo vệ khoản thanh toán của bạn, hãy luôn sử dụng Airbnb để chuyển tiền và liên lạc với host.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>


          {/* Add ReviewListModal */}
          <ReviewListModal
            isOpen={showAllReviews}
            onClose={() => setShowAllReviews(false)}
            reviews={reviews}
            averageRating={product?.diemTrungBinh || 0}
            reviewCount={reviews.length}
            categoryScores={[
              { label: "Mức độ sạch sẽ", score: categoryAverages?.diemSachSe, icon: <FormatPainterOutlined /> },
              { label: "Độ chính xác", score: categoryAverages?.diemChinhXac, icon: <CheckCircleOutlined /> },
              { label: "Nhận phòng", score: categoryAverages?.diemNhanPhong, icon: <KeyOutlined /> },
              { label: "Giao tiếp", score: categoryAverages?.diemGiaoTiep, icon: <MessageOutlined /> },
              { label: "Vị trí", score: categoryAverages?.diemViTri, icon: <EnvironmentOutlined /> },
              { label: "Giá trị", score: categoryAverages?.diemGiaTri, icon: <TagOutlined /> },
            ]}
          />

          <>
            {showGallery && images.length > 0 && (
              <PhotoGalleryLightbox
                images={images}
                isOpen={showGallery}
                onClose={() => setShowGallery(false)}
                initialCategory={selectedIndex === -1 ? undefined : images[selectedIndex]?.phanLoaiAnh}
                phongId={getPhongId(product!)}
                userId={Number(localStorage.getItem('userId')) || undefined}
                liked={liked}
                onLikedChange={setLiked}
              />
            )}

            {showAbout && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/40" onClick={() => setShowAbout(false)} />
                <div className="relative bg-white rounded-2xl max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
                  <div className="text-lg font-semibold mb-4">Giới thiệu về chỗ ở này</div>
                  <p className="text-gray-800 whitespace-pre-line">{product?.moTa}</p>
                </div>
              </div>
            )}

            {showAmenities && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/40" onClick={() => setShowAmenities(false)} />
                <div className="relative bg-white rounded-2xl max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
                  <div className="text-lg font-semibold mb-4">Nơi này có những gì cho bạn</div>
                  {amenities ? (
                    <div className="space-y-6 text-gray-800">
                      {Object.entries(amenities).map(([group, items]) => {
                        const list = Array.isArray(items) ? items : [];
                        if (list.length === 0) return null;
                        return (
                          <div key={group}>
                            <div className="font-semibold mb-2 capitalize">{AMENITY_CATEGORY_LABELS[group] || group.replaceAll("_", " ")}</div>
                            <ul className="space-y-1">
                              {list.map((i: string) => (
                                <li key={i} className="flex items-center gap-2">
                                  <span className="text-gray-500">•</span>
                                  <span>{i}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-gray-600">Chưa có dữ liệu tiện nghi.</div>
                  )}
                </div>
              </div>
            )}

            {/* Things to know section */}
            <div className="border-t pt-12 pb-12 mt-12 mb-12">
              <h3 className="text-2xl font-semibold mb-8">Thông tin cần biết</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <h4 className="font-semibold mb-4 text-base">Nội quy nhà</h4>
                  <ul className="space-y-3 text-gray-600 text-sm">
                    <li className="flex items-center gap-2">
                      Nhận phòng sau 14:00
                    </li>
                    <li className="flex items-center gap-2">
                      Trả phòng trước 12:00
                    </li>
                    <li className="flex items-center gap-2">
                      Tối đa {product?.soKhachToiDa || 2} khách
                    </li>
                  </ul>
                  <button className="mt-4 font-semibold underline text-sm">Hiển thị thêm</button>
                </div>
                <div>
                  <h4 className="font-semibold mb-4 text-base">An toàn & chỗ ở</h4>
                  <ul className="space-y-3 text-gray-600 text-sm">
                    <li>Camera an ninh/Thiết bị ghi hình ngoài trời</li>
                    <li>Không có máy báo khói</li>
                    <li>Không có máy báo khí carbon monoxide</li>
                  </ul>
                  <button className="mt-4 font-semibold underline text-sm">Hiển thị thêm</button>
                </div>
                <div>
                  <h4 className="font-semibold mb-4 text-base">Chính sách hủy</h4>
                  <div className="text-gray-600 text-sm leading-relaxed mb-4">
                    {cancellationPolicies.find(p => p.ma === product?.chinhSachHuy)?.moTa || (
                      product?.chinhSachHuy === 'NGHIEM_NGAT' ? (
                        'Hoàn tiền 50% nếu hủy ít nhất 7 ngày trước khi nhận phòng. Nếu hủy sau thời gian này, bạn sẽ không được hoàn tiền.'
                      ) : product?.chinhSachHuy === 'TRUNG_BINH' ? (
                        'Hoàn tiền đầy đủ nếu hủy ít nhất 5 ngày trước khi nhận phòng. Nếu hủy trong vòng 5 ngày, bạn sẽ được hoàn tiền 50%.'
                      ) : (
                        'Hoàn tiền đầy đủ nếu hủy ít nhất 24 giờ trước khi nhận phòng. Nếu hủy sau thời gian này, bạn sẽ không được hoàn tiền.'
                      )
                    )}
                  </div>
                  <button className="font-semibold underline text-sm">Hiển thị thêm</button>
                </div>
              </div>
            </div>

            <div className="px-6 py-12 border-t border-gray-100 mt-12 bg-gray-50/30">
            </div>
          </>
        </div>
      </div>

      {/* Mobile Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50 lg:hidden flex items-center justify-between pb-safe">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-gray-900">{fmt(product?.giaMoiKhach || 0)}₫</span>
            <span className="text-sm text-gray-600">/ đêm</span>
          </div>
          <div className="text-xs text-gray-500 underline">
            {checkIn && checkOut ? `${new Date(checkIn).getDate()} thg ${new Date(checkIn).getMonth() + 1} – ${new Date(checkOut).getDate()} thg ${new Date(checkOut).getMonth() + 1}` : 'Chọn ngày'}
          </div>
        </div>
        {product?.biKhoa || product?.trangThai === 'khong_hoat_dong' ? (
          <button
            disabled
            className="bg-gray-200 text-gray-400 px-6 py-3 rounded-lg font-bold text-base cursor-not-allowed line-through decoration-2"
          >
            Đặt phòng
          </button>
        ) : (
        <button
          className="bg-[#FF385C] text-white px-6 py-3 rounded-lg font-bold text-base shadow-md active:scale-95 transition-transform"
          onClick={() => {
            // Scroll to calendar or open booking modal
            const calendarEl = document.querySelector('.react-calendar'); // Need to add id/class to calendar
            if (calendarEl) {
              calendarEl.scrollIntoView({ behavior: 'smooth' });
            } else {
              window.scrollTo({ top: 500, behavior: 'smooth' });
            }
          }}
        >
          Đặt phòng
        </button>
        )}
      </div>
    </div>
  );
}
