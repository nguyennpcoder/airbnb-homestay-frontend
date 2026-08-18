'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { hostAPI, reviewsAPI, Booking } from '@/lib/api';
import { getValidSrc } from '@/lib/image';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

// ─── Airbnb Brand Colors ─────────────────────────────────────────────────
const BRAND = {
  primary: '#FF385C',
  secondary: '#008489',
  dark: '#222222',
  medium: '#717171',
  light: '#DDDDDD',
  success: '#0C9D58',
  warning: '#F4B400',
  error: '#DB4437',
};

const CHART_COLORS = ['#FF385C', '#008489', '#FFB400', '#717171', '#484848', '#DDDDDD', '#0C9D58', '#4285F4'];

// ─── Labels ──────────────────────────────────────────────────────────────
const LABEL_BOOKING_STATUS: Record<string, string> = {
  cho_xac_nhan: 'Chờ xác nhận',
  da_xac_nhan: 'Đã xác nhận',
  hoan_thanh: 'Hoàn thành',
  hoan_tat: 'Hoàn tất',
  da_huy: 'Đã hủy',
  cho_thanh_toan: 'Chờ thanh toán',
  da_thanh_toan: 'Đã thanh toán',
};

const LABEL_PAYMENT_STATUS: Record<string, string> = {
  CHO_XAC_NHAN: 'Chờ xác nhận',
  DA_XAC_NHAN: 'Đã xác nhận',
  HOAN_TIEN: 'Đã hoàn tiền',
  YEU_CAU_HOAN_TIEN: 'Yêu cầu hoàn',
  DA_HUY: 'Đã hủy',
  THAT_BAI: 'Thất bại',
  CHUA_THANH_TOAN: 'Chưa thanh toán',
};

const LABEL_LISTING_TYPE: Record<string, string> = {
  noi_luu_tru: 'Lưu trú',
  trai_nghiem: 'Trải nghiệm',
  dich_vu: 'Dịch vụ',
};

const MONTHS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

const BOOKING_STATUS_COLORS: Record<string, string> = {
  cho_xac_nhan: '#F4B400',
  da_xac_nhan: '#4285F4',
  hoan_thanh: '#0C9D58',
  da_huy: '#DB4437',
};

// ─── Utilities ────────────────────────────────────────────────────────────
const formatVND = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);

const formatShortVND = (amount: number) => {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} tỷ`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} tr`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)} k`;
  return formatVND(amount);
};

const formatNumber = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

function mapMonthlySeries<T extends { month?: number }>(
  rows: T[] | undefined,
  pick: (row: T | undefined) => Record<string, number>
) {
  return Array.from({ length: 12 }, (_, i) => {
    const monthData = rows?.find((d) => d.month === i + 1);
    return { name: MONTHS[i], ...pick(monthData) };
  });
}

// ─── Tooltip ──────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#1e1e1e] px-4 py-2.5 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 text-xs">
      <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.name}: <span className="font-semibold text-gray-900 dark:text-gray-100">
            {formatter ? formatter(entry.value) : entry.value}
          </span>
        </p>
      ))}
    </div>
  );
}

// ─── Growth Badge ─────────────────────────────────────────────────────────
function GrowthBadge({ value, suffix = '%' }: { value: number; suffix?: string }) {
  if (value === 0) return null;
  const positive = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
      positive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400'
    }`}>
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={positive ? "M5 10l7-7m0 0l7 7m-7-7v18" : "M19 14l-7 7m0 0l-7-7m7 7V3"} />
      </svg>
      {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
}

// ─── Mini Sparkline ──────────────────────────────────────────────────────
function Sparkline({ data, color = BRAND.primary }: { data: number[]; color?: string }) {
  const id = useRef(`spark-${Math.random().toString(36).slice(2, 8)}`).current;
  const h = 36;
  const w = 80;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => `${(i / (data.length - 1 || 1)) * w},${h - (v / max) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="shrink-0">
      <defs>
        <linearGradient id={`${id}-grad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={color} strokeWidth={1.5} points={pts} />
      <polygon fill={`url(#${id}-grad)`} points={`0,${h} ${pts} ${w},${h}`} />
    </svg>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────
function StatCard({
  label, value, footer, href, icon, iconBg, iconColor, valueColor = 'text-gray-900', trend,
}: {
  label: string; value: string | number; footer?: React.ReactNode; href: string;
  icon: React.ReactNode; iconBg: string; iconColor: string; valueColor?: string; trend?: React.ReactNode;
}) {
  return (
    <Link href={href} className="group admin-stat-card hover:shadow-lg transition-all duration-300 block">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0 ring-1 ring-black/5`}>
          <div className={iconColor}>{icon}</div>
        </div>
        {trend}
      </div>
      <div className="mt-3">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
        <p className={`text-xl font-bold mt-0.5 ${valueColor} group-hover:scale-[1.02] transition-transform origin-left`}>{value}</p>
      </div>
      {footer && (
        <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
          {footer}
        </div>
      )}
    </Link>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────
function Section({ title, subtitle, action, children, className = '' }: {
  title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`admin-surface rounded-xl overflow-hidden shadow-sm ${className}`}>
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── Year Selector ────────────────────────────────────────────────────────
function YearSelector({ year, onChange, loading }: { year: number; onChange: (y: number) => void; loading?: boolean }) {
  const cy = new Date().getFullYear();
  const years = Array.from({ length: cy - 2019 }, (_, i) => cy - i);
  return (
    <div className="flex items-center gap-2">
      {loading && (
        <span className="text-xs text-gray-400 flex items-center gap-1.5">
          <span className="w-3 h-3 border-2 border-gray-200 border-t-[#FF385C] rounded-full animate-spin" />
        </span>
      )}
      <div className="flex items-center bg-gray-50 dark:bg-gray-800 rounded-lg p-0.5">
        <button disabled={loading || year <= 2020} onClick={() => onChange(year - 1)}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="px-3 text-sm font-bold text-gray-900 dark:text-gray-100 min-w-[4rem] text-center">{year}</span>
        <button disabled={loading || year >= cy} onClick={() => onChange(year + 1)}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
}

// ─── Booking Status Badge ─────────────────────────────────────────────────
function BookingStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    cho_xac_nhan: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    da_xac_nhan: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    hoan_thanh: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    da_huy: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400 border-red-200 dark:border-red-800',
  };
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${colors[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {LABEL_BOOKING_STATUS[status] || status}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function HostingDashboard() {
  const [stats, setStats] = useState<any>({});
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [monthlyBookingsData, setMonthlyBookingsData] = useState<any[]>([]);
  const [occupancyData, setOccupancyData] = useState<any[]>([]);
  const [bookingStatusData, setBookingStatusData] = useState<any[]>([]);
  const [paymentStatusData, setPaymentStatusData] = useState<any[]>([]);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [hostReviews, setHostReviews] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [refundData, setRefundData] = useState<any[]>([]);
  const [cancelledFailedData, setCancelledFailedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const selectedYearRef = useRef(selectedYear);
  const chartsReadyRef = useRef(false);

  const safeFetch = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try { return await fn(); } catch (e) { console.warn('[safeFetch]', e); return fallback; }
  };

  const getUserId = () => Number(localStorage.getItem('userId'));

  const computeMonthlyBookings = (bookings: Booking[], year: number) => {
    const months = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, total: 0, cancelled: 0, confirmed: 0 }));
    for (const b of bookings) {
      const d = new Date(b.ngayTao || b.ngayDat || Date.now());
      if (d.getFullYear() !== year) continue;
      const m = d.getMonth();
      months[m].total++;
      if (b.trangThaiDatCho === 'da_huy') months[m].cancelled++;
      if (b.trangThaiDatCho === 'da_xac_nhan' || b.trangThaiDatCho === 'hoan_thanh') months[m].confirmed++;
    }
    return months;
  };

  const computeMonthlyOccupancy = (bookings: Booking[], year: number, listingCount: number) => {
    return Array.from({ length: 12 }, (_, i) => {
      const daysInMonth = new Date(year, i + 1, 0).getDate();
      const totalPossibleNights = daysInMonth * Math.max(listingCount, 1);
      let occupiedNights = 0;
      for (const b of bookings) {
        if (!b.ngayNhanPhong || !b.ngayTraPhong) continue;
        const checkIn = new Date(b.ngayNhanPhong);
        const checkOut = new Date(b.ngayTraPhong);
        if (checkOut.getFullYear() < year || checkIn.getFullYear() > year) continue;
        if (b.trangThaiDatCho === 'da_huy') continue;
        const monthStart = new Date(year, i, 1);
        const monthEnd = new Date(year, i + 1, 0);
        const overlapStart = checkIn > monthStart ? checkIn : monthStart;
        const overlapEnd = checkOut < monthEnd ? checkOut : monthEnd;
        if (overlapStart < overlapEnd) {
          const nights = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24));
          occupiedNights += Math.max(0, nights);
        }
      }
      const rate = totalPossibleNights > 0 ? Math.round((occupiedNights / totalPossibleNights) * 1000) / 10 : 0;
      return { month: i + 1, rate: Math.min(rate, 100) };
    });
  };

  const applyChartData = (revenueRes: any[], yearlyBookings: Booking[], year: number, paymentsRes: any[], listingCount?: number, serviceFeeRes?: any[]) => {
    const revenueSeries = mapMonthlySeries(revenueRes, (d) => ({ revenue: d?.revenue ?? 0 }));
    const feeSeries = mapMonthlySeries(serviceFeeRes ?? [], (d) => ({ serviceFee: d?.serviceFee ?? 0 }));
    const merged = revenueSeries.map((r, i) => ({ ...r, serviceFee: (feeSeries[i] as any)?.serviceFee ?? 0 }));
    setRevenueData(merged);
    const monthly = computeMonthlyBookings(yearlyBookings, year);
    setMonthlyBookingsData(monthly);
    const occ = computeMonthlyOccupancy(yearlyBookings, year, listingCount ?? listings.length);
    setOccupancyData(occ);

    const safePayments = Array.isArray(paymentsRes) ? paymentsRes : [];
    const sCount: Record<string, number> = {};
    for (const p of safePayments) {
      const s = p.trangThai || p.status || 'UNKNOWN';
      sCount[s] = (sCount[s] || 0) + 1;
    }
    setPaymentStatusData(Object.entries(sCount).map(([status, count]) => ({ status, count: Number(count) })));

    const bCount: Record<string, number> = {};
    for (const b of yearlyBookings) {
      const s = b.trangThaiDatCho || 'unknown';
      bCount[s] = (bCount[s] || 0) + 1;
    }
    setBookingStatusData(Object.entries(bCount).map(([status, count]) => ({ status, count: Number(count) })));
  };

  const fetchYearCharts = async (year: number) => {
    const userId = getUserId();
    if (!userId) return;
    setChartsLoading(true);
    const [revenueRes, bookingsRes, paymentsRes, serviceFeeRes, refundsRes, cancelledRes] = await Promise.all([
      safeFetch(() => hostAPI.getRevenueChart(userId, year), []),
      safeFetch(() => hostAPI.getBookings(userId), []),
      safeFetch(() => hostAPI.getPayments(userId), []),
      safeFetch(() => hostAPI.getServiceFeeChart(userId, year), []),
      safeFetch(() => hostAPI.getRefundsChart(userId, year), []),
      safeFetch(() => hostAPI.getCancelledFailedChart(userId, year), []),
    ]);
    const safeBookings = Array.isArray(bookingsRes) ? bookingsRes : [];
    applyChartData(revenueRes as any[], safeBookings, year, paymentsRes, undefined, serviceFeeRes as any[]);
    setRefundData(mapMonthlySeries(refundsRes as any[], (d) => ({ refund: d?.refundAmount ?? 0 })));
    setCancelledFailedData(mapMonthlySeries(cancelledRes as any[], (d) => ({ failed: d?.failedAmount ?? 0 })));
    setChartsLoading(false);
  };

  useEffect(() => {
    const fetchAll = async () => {
      const userId = getUserId();
      if (!userId) { setLoading(false); return; }

      const year = selectedYearRef.current;
      const [statsRes, listingsRes, revenueRes, bookingsRes, paymentsRes, reviewsRes, serviceFeeRes, refundsRes, cancelledRes] = await Promise.all([
        safeFetch(() => hostAPI.getStats(userId), {}),
        safeFetch(() => hostAPI.allListings(userId), []),
        safeFetch(() => hostAPI.getRevenueChart(userId, year), []),
        safeFetch(() => hostAPI.getBookings(userId), []),
        safeFetch(() => hostAPI.getPayments(userId), []),
        safeFetch(() => reviewsAPI.listByHost(userId), []),
        safeFetch(() => hostAPI.getServiceFeeChart(userId, year), []),
        safeFetch(() => hostAPI.getRefundsChart(userId, year), []),
        safeFetch(() => hostAPI.getCancelledFailedChart(userId, year), []),
      ]);

      setStats(statsRes);
      const safeListings = Array.isArray(listingsRes) ? listingsRes : [];
      setListings(safeListings);
      setHostReviews(Array.isArray(reviewsRes) ? reviewsRes : []);

      const typeCount: Record<string, number> = {};
      for (const l of safeListings) {
        const t = l.loaiPhong || l.loaiSanPham || 'noi_luu_tru';
        typeCount[t] = (typeCount[t] || 0) + 1;
      }
      setCategoryData(Object.entries(typeCount).map(([type, count]) => ({
        name: LABEL_LISTING_TYPE[type] || type,
        value: count,
        color: type === 'noi_luu_tru' ? BRAND.primary : type === 'trai_nghiem' ? BRAND.secondary : '#484848',
      })));

      const safeBookings = Array.isArray(bookingsRes) ? bookingsRes : [];
      const sorted = [...safeBookings].sort((a, b) => new Date(b.ngayTao || 0).getTime() - new Date(a.ngayTao || 0).getTime());
      setRecentBookings(sorted.slice(0, 5));

      // Upcoming check-ins: exclude cancelled, include da_xac_nhan + cho_xac_nhan with confirmed payment
      const now = new Date();
      const upcoming = safeBookings
        .filter(b => {
          if (b.trangThaiDatCho === 'da_huy') return false;
          if (!b.ngayNhanPhong) return false;
          const checkIn = new Date(b.ngayNhanPhong);
          if (checkIn < now) return false;
          if (b.trangThaiDatCho === 'da_xac_nhan') return true;
          if (b.trangThaiDatCho === 'cho_xac_nhan') {
            const payments = b.payments || [];
            return payments.some((p: any) => p.status === 'DA_XAC_NHAN');
          }
          return false;
        })
        .sort((a, b) => new Date(a.ngayNhanPhong).getTime() - new Date(b.ngayNhanPhong).getTime())
        .slice(0, 5);
      setUpcomingBookings(upcoming);

      applyChartData(revenueRes as any[], safeBookings, year, paymentsRes, safeListings.length, serviceFeeRes as any[]);
      setRefundData(mapMonthlySeries(refundsRes as any[], (d) => ({ refund: d?.refundAmount ?? 0 })));
      setCancelledFailedData(mapMonthlySeries(cancelledRes as any[], (d) => ({ failed: d?.failedAmount ?? 0 })));
      chartsReadyRef.current = true;
      setLoading(false);
    };
    fetchAll();

    const handleFocus = () => fetchAll();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  useEffect(() => {
    selectedYearRef.current = selectedYear;
  }, [selectedYear]);

  useEffect(() => {
    if (!chartsReadyRef.current || loading) return;
    fetchYearCharts(selectedYear);
  }, [selectedYear, loading]);

  // ─── Derived Data ─────────────────────────────────────────────────────
  const listingSummary = useMemo(() => {
    const normalizeCity = (name: string) => {
      const n = name.toLowerCase().trim();
      if (n === 'hcm' || n === 'ho chi minh city' || n === 'ho chi minh' || n === 'tp. hồ chí minh' || n === 'thành phố hồ chí minh') return 'TP. Hồ Chí Minh';
      return name.trim();
    };

    const total = listings.length;
    let totalRating = 0, ratingCount = 0;
    const byCity: Record<string, { count: number; sumRating: number; reviews: number }> = {};

    const reviewCountByListing: Record<number, number> = {};
    const ratingSumByListing: Record<number, number> = {};
    for (const r of hostReviews) {
      const pid = r.maSanPham || (r as any).maPhong;
      if (pid) {
        reviewCountByListing[pid] = (reviewCountByListing[pid] || 0) + 1;
        ratingSumByListing[pid] = (ratingSumByListing[pid] || 0) + (r.diemSo || 0);
      }
    }

    for (const l of listings) {
      const pid = l.maPhong || l.maSanPham;
      const hasRealReviews = pid && reviewCountByListing[pid] != null && reviewCountByListing[pid] > 0;
      const rating = hasRealReviews
        ? ratingSumByListing[pid] / reviewCountByListing[pid]
        : 0;
      const reviewCount = pid ? (reviewCountByListing[pid] || 0) : 0;

      if (rating > 0) { totalRating += rating; ratingCount++; }
      const city = normalizeCity(l?.thanhPho || 'Khác');
      if (!byCity[city]) byCity[city] = { count: 0, sumRating: 0, reviews: 0 };
      byCity[city].count++;
      byCity[city].sumRating += rating;
      byCity[city].reviews += reviewCount;
    }
    const avgRating = ratingCount ? (totalRating / ratingCount) : 0;
    const totalReviews = hostReviews.length;
    const topCities = Object.entries(byCity)
      .map(([city, v]) => ({ city, count: v.count, avg: v.count ? (v.sumRating / v.count) : 0, reviews: v.reviews }))
      .sort((a, b) => b.count - a.count);
    return { total, avgRating, totalReviews, topCities };
  }, [listings, hostReviews]);

  const growthMetrics = useMemo(() => {
    if (revenueData.length < 2) return { revenueGrowth: 0, bookingGrowth: 0 };
    const lastHalf = revenueData.slice(-6).reduce((s, d) => s + (d.revenue || 0), 0);
    const firstHalf = revenueData.slice(0, 6).reduce((s, d) => s + (d.revenue || 0), 0);
    const revenueGrowth = firstHalf > 0 ? ((lastHalf - firstHalf) / firstHalf) * 100 : 0;
    const lastB = monthlyBookingsData.slice(-6).reduce((s: number, d: any) => s + (d.total || 0), 0);
    const firstB = monthlyBookingsData.slice(0, 6).reduce((s: number, d: any) => s + (d.total || 0), 0);
    const bookingGrowth = firstB > 0 ? ((lastB - firstB) / firstB) * 100 : 0;
    return { revenueGrowth, bookingGrowth };
  }, [revenueData, monthlyBookingsData]);

  const avgOccupancy = useMemo(() => {
    const valid = occupancyData.filter((d) => d.rate > 0);
    if (!valid.length) return stats.occupancy || 0;
    return Math.round((valid.reduce((s, d) => s + d.rate, 0) / valid.length) * 10) / 10;
  }, [occupancyData, stats.occupancy]);

  const revenueTrend = useMemo(() => revenueData.map((d) => d.revenue || 0), [revenueData]);

  const bookingPieData = useMemo(() =>
    bookingStatusData.map((d: any) => ({
      name: LABEL_BOOKING_STATUS[d.status] || d.status,
      value: Number(d.count),
      color: BOOKING_STATUS_COLORS[d.status] || '#DDDDDD',
    })), [bookingStatusData]);

  const paymentPieData = useMemo(() =>
    paymentStatusData.map((d: any) => ({
      name: LABEL_PAYMENT_STATUS[d.status] || d.status,
      value: Number(d.count),
    })), [paymentStatusData]);

  const monthlyChartData = useMemo(() =>
    mapMonthlySeries(monthlyBookingsData, (d) => ({
      total: d?.total ?? 0,
      cancelled: d?.cancelled ?? 0,
    })), [monthlyBookingsData]);

  const occupancyChartData = useMemo(() =>
    mapMonthlySeries(occupancyData, (d) => ({
      rate: d?.rate != null ? Math.round(d.rate * 10) / 10 : 0,
    })), [occupancyData]);

  const refundChartData = useMemo(() =>
    refundData.map((r, i) => ({
      ...r,
      failed: cancelledFailedData[i]?.failed ?? 0,
    })), [refundData, cancelledFailedData]);

  const hasRefundData = useMemo(() =>
    refundChartData.some((d) => (d.refund || 0) > 0 || (d.failed || 0) > 0),
    [refundChartData]);

  const isCurrentYear = selectedYear === new Date().getFullYear();
  const pendingPayments = useMemo(() => {
    const p = paymentStatusData.find((d: any) => d.status === 'CHO_XAC_NHAN' || d.status === 'CHUA_THANH_TOAN');
    return p ? Number(p.count) : 0;
  }, [paymentStatusData]);

  const activeListings = useMemo(() => listings.filter(l => l.trangThai === 'hoat_dong').length, [listings]);
  const pendingListings = useMemo(() => listings.filter(l => l.trangThai === 'cho_duyet').length, [listings]);

  const totalRevenue = stats.revenue || 0;
  const totalBookings = stats.bookings || 0;

  const todayLabel = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-14 h-14 border-[3px] border-gray-100 dark:border-gray-800 rounded-full" />
          <div className="absolute inset-0 w-14 h-14 border-[3px] border-transparent border-t-[#FF385C] rounded-full animate-spin" />
        </div>
        <p className="text-sm text-gray-400">Đang tải bảng điều khiển…</p>
      </div>
    );
  }

  return (
    <div className="admin-container admin-page-content relative pb-12">
      {/* ─── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            Bảng điều khiển
            <span className="text-xs font-normal text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-full border border-gray-100 dark:border-gray-700">
              Chủ nhà
            </span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{todayLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/hosting/listings/create"
            className="px-4 py-2.5 text-xs font-bold text-white bg-[#FF385C] rounded-lg hover:bg-[#E31C5F] transition-colors shadow-sm flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Tạo mục cho thuê
          </Link>
          <div className="flex bg-gray-50 dark:bg-gray-800 rounded-xl p-0.5">
            {[
              { label: 'Đặt chỗ', href: '/hosting/bookings', color: 'bg-blue-500' },
              { label: 'Thanh toán', href: '/hosting/payments', color: 'bg-emerald-500' },
              { label: 'Phòng', href: '/hosting/listings', color: 'bg-amber-500' },
            ].map((item) => (
              <Link key={item.href} href={item.href}
                className="px-3.5 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
                {item.label}
              </Link>
            ))}
          </div>
          <button onClick={() => window.location.reload()}
            className="px-3.5 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* ─── KPI Grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard
          label="Doanh thu"
          value={formatShortVND(totalRevenue)}
          href="/hosting/payments"
          iconBg="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-500/20 dark:to-red-500/10"
          iconColor="text-[#FF385C]"
          valueColor="text-[#FF385C]"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          trend={<Sparkline data={revenueTrend} color={BRAND.primary} />}
          footer={<GrowthBadge value={growthMetrics.revenueGrowth} />}
        />
        <StatCard
          label="Đặt chỗ"
          value={formatNumber(totalBookings)}
          href="/hosting/bookings"
          iconBg="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-500/20 dark:to-emerald-500/10"
          iconColor="text-emerald-600"
          valueColor="text-emerald-600"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          footer={<GrowthBadge value={growthMetrics.bookingGrowth} />}
        />
        <StatCard
          label="Đánh giá TB"
          value={`${(stats.rating || 0).toFixed(1)} ★`}
          href="/hosting/reviews"
          iconBg="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-500/20 dark:to-amber-500/10"
          iconColor="text-amber-600"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          }
          footer={<span>{(stats.views || 0).toLocaleString()} lượt xem</span>}
        />
        <StatCard
          label="Phòng cho thuê"
          value={listingSummary.total}
          href="/hosting/listings"
          iconBg="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-500/20 dark:to-amber-500/10"
          iconColor="text-amber-600"
          valueColor="text-amber-600"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          }
          footer={<span>{activeListings} hoạt động{pendingListings > 0 ? ` · ${pendingListings} chờ duyệt` : ''}</span>}
        />
        <StatCard
          label="Lấp đầy TB"
          value={`${avgOccupancy}%`}
          href="/hosting/bookings"
          iconBg="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-500/20 dark:to-teal-500/10"
          iconColor="text-teal-600"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          footer={<span>Năm {selectedYear}</span>}
        />
        <StatCard
          label="Cần xử lý"
          value={(stats.pendingBookings || 0) + pendingPayments}
          href="/hosting/bookings"
          iconBg="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-500/20 dark:to-purple-500/10"
          iconColor="text-purple-600"
          valueColor="text-purple-600"
          icon={
            <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          footer={<span>{stats.pendingBookings || 0} đặt chờ · {pendingPayments} TT</span>}
        />
      </div>

      {/* ─── Upcoming Check-ins ──────────────────────────────────────── */}
      {upcomingBookings.length > 0 && (
        <div className="mb-5">
          <div className="bg-gradient-to-r from-[#FF385C]/5 to-transparent border border-[#FF385C]/10 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FF385C]/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#FF385C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Sắp nhận phòng</h3>
                  <p className="text-xs text-gray-500">{upcomingBookings.length} khách sắp đến</p>
                </div>
              </div>
              <Link href="/hosting/bookings" className="text-xs text-[#FF385C] font-semibold hover:underline">Xem tất cả</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {upcomingBookings.slice(0, 5).map((booking) => (
                <Link key={booking.maDatCho} href={`/hosting/bookings?selected=${booking.maDatCho}`}
                  className="bg-white dark:bg-gray-800/50 rounded-xl p-3.5 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 overflow-hidden flex-shrink-0">
                      {(booking.nguoiDat?.urlAnhDaiDien || booking.khach?.urlAnhDaiDien) ? (
                        <img src={getValidSrc(booking.nguoiDat?.urlAnhDaiDien || booking.khach?.urlAnhDaiDien)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (booking.nguoiDat?.hoTen?.charAt(0) || booking.khach?.hoTen?.charAt(0) || '?')
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-[#FF385C] transition-colors">
                        {booking.nguoiDat?.hoTen || booking.khach?.hoTen || 'Khách'}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">{booking.phong?.tieuDe || 'Đặt phòng'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-gray-400">
                      {booking.ngayNhanPhong ? new Date(booking.ngayNhanPhong).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '—'}
                      {' → '}
                      {booking.ngayTraPhong ? new Date(booking.ngayTraPhong).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '—'}
                    </span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{formatShortVND(booking.tongTien)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Chart Controls ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 bg-white dark:bg-[#161616] border border-gray-100 dark:border-gray-800 rounded-xl px-5 py-3 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#FF385C]" />
            <span className="text-xs text-gray-500">Doanh thu</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#008489]" />
            <span className="text-xs text-gray-500">Đặt chỗ</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-teal-500" />
            <span className="text-xs text-gray-500">Lấp đầy</span>
          </div>
        </div>
        <YearSelector year={selectedYear} onChange={setSelectedYear} loading={chartsLoading} />
      </div>

      {/* ─── Charts Grid ─────────────────────────────────────────────── */}
      <div className={`grid grid-cols-1 xl:grid-cols-12 gap-5 mb-5 transition-all duration-300 ${chartsLoading ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Row 1: Revenue + Fee (8) | Booking Pie (4) */}
        <Section title={`Doanh thu ${selectedYear}`} subtitle="Thu nhập và phí dịch vụ theo tháng" className="xl:col-span-8">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                <defs>
                  <linearGradient id="hostRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BRAND.primary} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={BRAND.primary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="hostFeeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4285F4" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#4285F4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={formatShortVND} width={56} />
                <Tooltip content={<ChartTooltip formatter={(v: number) => formatVND(v)} />} />
                <Area type="monotone" dataKey="revenue" name="Doanh thu" stroke={BRAND.primary} strokeWidth={2.5} fill="url(#hostRevGrad)" dot={false} activeDot={{ r: 5, fill: BRAND.primary, stroke: '#fff', strokeWidth: 2 }} />
                <Area type="monotone" dataKey="serviceFee" name="Phí dịch vụ" stroke="#4285F4" strokeWidth={2} fill="url(#hostFeeGrad)" dot={false} activeDot={{ r: 4, fill: '#4285F4', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="w-2.5 h-0.5 rounded-full" style={{ backgroundColor: BRAND.primary }} />
              Doanh thu
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="w-2.5 h-0.5 rounded-full bg-[#4285F4]" />
              Phí dịch vụ
            </span>
            {totalRevenue > 0 && (
              <>
                <span className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Tổng: <strong className="text-gray-900 dark:text-gray-100">{formatShortVND(totalRevenue)}</strong></span>
                <span className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs text-gray-500 dark:text-gray-400">TB tháng: <strong className="text-gray-900 dark:text-gray-100">{formatShortVND(totalRevenue / 12)}</strong></span>
              </>
            )}
          </div>
        </Section>

        <Section title="Trạng thái đặt chỗ" subtitle="Phân bổ" className="xl:col-span-4">
          {bookingPieData.length > 0 ? (
            <div className="flex flex-col gap-3">
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={bookingPieData} cx="50%" cy="50%" innerRadius={44} outerRadius={66} paddingAngle={3} dataKey="value">
                      {bookingPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5">
                {bookingPieData.map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color || CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-gray-500 dark:text-gray-400 flex-1">{item.name}</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Chưa có dữ liệu</p>
          )}
        </Section>

        {/* Row 2: Refund/Cancelled (6) | Occupancy (6) */}
        <Section title="Hoàn tiền & Hủy/Thất bại" subtitle="Phân tích theo tháng" className="xl:col-span-6">
          {hasRefundData ? (
            <>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={refundChartData} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                    <defs>
                      <linearGradient id="hostRefundGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={BRAND.success} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={BRAND.success} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="hostFailedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={BRAND.error} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={BRAND.error} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={formatShortVND} width={56} />
                    <Tooltip content={<ChartTooltip formatter={(v: number) => formatVND(v)} />} />
                    <Area type="monotone" dataKey="refund" name="Hoàn tiền" stroke={BRAND.success} strokeWidth={2} fill="url(#hostRefundGrad)" dot={false} activeDot={{ r: 4, fill: BRAND.success, stroke: '#fff', strokeWidth: 2 }} />
                    <Area type="monotone" dataKey="failed" name="Hủy / Thất bại" stroke={BRAND.error} strokeWidth={2} fill="url(#hostFailedGrad)" dot={false} activeDot={{ r: 4, fill: BRAND.error, stroke: '#fff', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <span className="w-2.5 h-0.5 rounded-full" style={{ backgroundColor: BRAND.success }} />
                  Hoàn tiền
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <span className="w-2.5 h-0.5 rounded-full" style={{ backgroundColor: BRAND.error }} />
                  Hủy / Thất bại
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center py-10">Chưa có dữ liệu hoàn tiền / hủy</p>
          )}
        </Section>

        <Section title={`Lấp đầy % · ${selectedYear}`} subtitle="Hiệu suất cho thuê" className="xl:col-span-6">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={occupancyChartData} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} unit="%" width={32} domain={[0, 100]} />
                <Tooltip content={<ChartTooltip formatter={(v: number) => `${v.toFixed(1)}%`} />} />
                <Bar dataKey="rate" name="Lấp đầy" fill={BRAND.secondary} radius={[4, 4, 0, 0]} maxBarSize={32}>
                  {occupancyChartData.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.rate >= 70 ? BRAND.success : entry.rate >= 40 ? BRAND.warning : BRAND.error} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {/* Row 3: Monthly Bookings (8) | Category + Payment (4) */}
        <Section title={`Đặt chỗ theo tháng · ${selectedYear}`} className="xl:col-span-8">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData} barGap={2} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} width={24} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="total" name="Đã đặt" fill={BRAND.secondary} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="cancelled" name="Đã hủy" fill="#E5E7EB" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <div className="xl:col-span-4 space-y-5">
          <Section title="Phân loại phòng" subtitle="Theo loại hình">
            {categoryData.length > 0 ? (
              <div className="space-y-3">
                {categoryData.map((item: any, i: number) => {
                  const max = Math.max(...categoryData.map((c: any) => c.value), 1);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-gray-600 dark:text-gray-400">{item.name}</span>
                        <span className="font-bold text-gray-900 dark:text-gray-100">{item.value}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">Chưa có dữ liệu</p>
            )}
          </Section>

          <Section title="Thanh toán" subtitle="Trạng thái giao dịch">
            {paymentPieData.length > 0 ? (
              <div className="space-y-2">
                {paymentPieData.map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-gray-500 dark:text-gray-400 flex-1">{item.name}</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{item.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">Chưa có dữ liệu</p>
            )}
          </Section>
        </div>
      </div>

      {/* ─── Bottom Section ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Recent Bookings */}
        <Section title="Đặt chỗ gần đây" subtitle="Các giao dịch mới nhất" className="xl:col-span-5">
          {recentBookings.length > 0 ? (
            <div className="space-y-1 -mx-2">
              {recentBookings.map((booking) => {
                const guestName = booking.nguoiDat?.hoTen || booking.khach?.hoTen || booking.nguoiDung?.hoTen || 'Khách';
                const listingName = booking.phong?.tieuDe || 'Đặt phòng';
                return (
                  <Link key={booking.maDatCho} href={`/hosting/bookings?selected=${booking.maDatCho}`}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                    <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400 shrink-0 ring-1 ring-black/5 overflow-hidden">
                      {(booking.nguoiDat?.urlAnhDaiDien || booking.khach?.urlAnhDaiDien) ? (
                        <img src={getValidSrc(booking.nguoiDat?.urlAnhDaiDien || booking.khach?.urlAnhDaiDien)} alt="" className="w-full h-full object-cover" />
                      ) : guestName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-[#FF385C] transition-colors">{guestName}</p>
                        <BookingStatusBadge status={booking.trangThaiDatCho} />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{listingName}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {booking.ngayNhanPhong ? new Date(booking.ngayNhanPhong).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '—'}
                        {' → '}
                        {booking.ngayTraPhong ? new Date(booking.ngayTraPhong).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '—'}
                        {' · '}
                        <strong>{formatShortVND(booking.tongTien)}</strong>
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap">
                      {booking.ngayTao ? new Date(booking.ngayTao).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-gray-400">Chưa có đặt chỗ nào</p>
            </div>
          )}
        </Section>

        {/* Top Cities */}
        <Section
          title="Phân bố theo thành phố"
          subtitle="Số lượng phòng theo khu vực"
          action={<Link href="/hosting/listings" className="text-xs text-[#FF385C] font-semibold hover:underline">Xem tất cả</Link>}
          className="xl:col-span-3"
        >
          {listingSummary.topCities.length > 0 ? (
            <div className="space-y-4">
              {listingSummary.topCities.map((city, index) => {
                const maxCount = listingSummary.topCities[0]?.count || 1;
                return (
                  <div key={city.city}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                          index === 0 ? 'bg-[#FF385C]' : index === 1 ? 'bg-[#008489]' : index === 2 ? 'bg-amber-500' : 'bg-gray-400'
                        }`}>{index + 1}</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{city.city}</span>
                      </div>
                      <span className="text-gray-500 font-medium">{city.count} phòng</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{
                        width: `${(city.count / maxCount) * 100}%`,
                        backgroundColor: index === 0 ? BRAND.primary : index === 1 ? BRAND.secondary : '#DDDDDD',
                      }} />
                    </div>
                    {city.avg > 0 && (
                      <p className="text-[11px] text-gray-400 mt-0.5">★ {city.avg.toFixed(1)} · {city.reviews} đánh giá</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Chưa có dữ liệu</p>
          )}
        </Section>

        {/* Quick Listings */}
        <Section
          title="Danh sách phòng"
          subtitle={`${activeListings} đang hoạt động${pendingListings > 0 ? `, ${pendingListings} chờ duyệt` : ''}`}
          action={<Link href="/hosting/listings" className="text-xs text-[#FF385C] font-semibold hover:underline">Quản lý</Link>}
          className="xl:col-span-4"
        >
          {listings.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800 -mx-6 -mb-6">
              {listings.slice(0, 5).map((l) => (
                <Link key={l.maPhong} href={`/hosting/listings/${l.maPhong}`}
                  className="flex items-center gap-3 px-6 py-3.5 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                  <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 ring-1 ring-black/5">
                    {l.urlAnhChinh ? (
                      <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${l.urlAnhChinh})` }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-[#FF385C] transition-colors">{l.tieuDe}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {l.thanhPho || 'N/A'} · {l.giaMoiKhach ? formatShortVND(l.giaMoiKhach) : '—'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className={`w-2 h-2 rounded-full ${
                      l.biKhoa ? 'bg-red-500' :
                      l.trangThai === 'hoat_dong' ? 'bg-emerald-500' :
                      l.trangThai === 'cho_duyet' ? 'bg-amber-500 animate-pulse' : 'bg-gray-300'
                    }`} />
                    {l.diemTrungBinh > 0 && (
                      <span className="text-[10px] text-gray-400">★ {Number(l.diemTrungBinh).toFixed(1)}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-sm text-gray-400 mb-3">Chưa có phòng cho thuê</p>
              <Link href="/hosting/listings/create"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-[#FF385C] rounded-lg hover:bg-[#E31C5F] transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                Tạo mục cho thuê đầu tiên
              </Link>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
