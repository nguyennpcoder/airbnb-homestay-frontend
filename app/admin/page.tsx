'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { adminAPI, promotionAPI, pricingRulesAPI } from '@/lib/api';
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
  Cell,
} from 'recharts';

// ─── Airbnb Brand Colors ─────────────────────────────────────────────────
const BRAND = {
  primary: '#FF385C',
  secondary: '#008489',
  dark: '#222222',
  medium: '#717171',
  light: '#DDDDDD',
  bg: '#F7F7F7',
  success: '#0C9D58',
  warning: '#F4B400',
  error: '#DB4437',
};

const CHART_COLORS = ['#FF385C', '#008489', '#FFB400', '#717171', '#484848', '#DDDDDD', '#0C9D58', '#4285F4'];

// ─── Labels ──────────────────────────────────────────────────────────────
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

// ─── Utility Functions ────────────────────────────────────────────────────
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
        <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shrink-0 ring-1 ring-black/5`}>
          <div className={iconColor}>{icon}</div>
        </div>
        {trend}
      </div>
      <div className="mt-4">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${valueColor} group-hover:scale-[1.02] transition-transform origin-left`}>{value}</p>
      </div>
      {footer && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
          {footer}
        </div>
      )}
    </Link>
  );
}

// ─── Section Wrapper ──────────────────────────────────────────────────────
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

// ─── Mini KPI Pill ────────────────────────────────────────────────────────
function KPIPill({ label, value, color = '#717171' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{value}</span>
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
        <button
          disabled={loading || year <= 2020}
          onClick={() => onChange(year - 1)}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="px-3 text-sm font-bold text-gray-900 dark:text-gray-100 min-w-[4rem] text-center">{year}</span>
        <button
          disabled={loading || year >= cy}
          onClick={() => onChange(year + 1)}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>({});
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [occupancyData, setOccupancyData] = useState<any[]>([]);
  const [paymentStatusData, setPaymentStatusData] = useState<any[]>([]);
  const [topListings, setTopListings] = useState<any[]>([]);
  const [serviceFeeData, setServiceFeeData] = useState<any[]>([]);
  const [refundData, setRefundData] = useState<any[]>([]);
  const [cancelledFailedData, setCancelledFailedData] = useState<any[]>([]);
  const [adminReviews, setAdminReviews] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [pricingRules, setPricingRules] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const chartsReadyRef = useRef(false);

  const safeFetch = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try { return await fn(); }
    catch (e) { console.warn('[safeFetch]', e); return fallback; }
  };

  const applyChartData = (revenueRes: any[], growthRes: any[], occupancyRes: any[], serviceFeeRes?: any[]) => {
    const revenueSeries = mapMonthlySeries(revenueRes, (d) => ({ revenue: d?.revenue ?? 0 }));
    const feeSeries = mapMonthlySeries(serviceFeeRes ?? [], (d) => ({ serviceFee: d?.serviceFee ?? 0 }));
    const merged = revenueSeries.map((r, i) => ({ ...r, serviceFee: (feeSeries[i] as any)?.serviceFee ?? 0 }));
    setRevenueData(merged);
    setUserGrowthData(mapMonthlySeries(growthRes, (d) => ({ users: d?.count ?? 0 })));
    setOccupancyData(mapMonthlySeries(occupancyRes, (d) => ({ rate: d?.rate != null ? Math.round(d.rate * 10) / 10 : 0 })));
  };

  const fetchYearCharts = async (year: number) => {
    setChartsLoading(true);
    const [revenueRes, growthRes, occupancyRes, serviceFeeRes, refundsRes, cancelledRes] = await Promise.all([
      safeFetch(() => adminAPI.getRevenueChart(year), []),
      safeFetch(() => adminAPI.getUserGrowth(year), []),
      safeFetch(() => adminAPI.getOccupancyRate(year), []),
      safeFetch(() => adminAPI.getServiceFeeChart(year), []),
      safeFetch(() => adminAPI.getRefundsChart(year), []),
      safeFetch(() => adminAPI.getCancelledFailedChart(year), []),
    ]);
    applyChartData(revenueRes as any[], growthRes as any[], occupancyRes as any[], serviceFeeRes as any[]);
    setRefundData(mapMonthlySeries(refundsRes as any[], (d) => ({ refund: d?.refundAmount ?? 0 })));
    setCancelledFailedData(mapMonthlySeries(cancelledRes as any[], (d) => ({ failed: d?.failedAmount ?? 0 })));
    setChartsLoading(false);
  };

  useEffect(() => {
    const fetchAll = async () => {
      const [statsRes, categoryRes, activitiesRes, productsRes, paymentStatusRes, reviewsRes, promosRes, pricingRes] = await Promise.all([
        safeFetch(() => adminAPI.getStats(), {}),
        safeFetch(() => adminAPI.getCategoryDistribution(), []),
        safeFetch(() => adminAPI.getRecentActivities(), []),
        safeFetch(() => adminAPI.getListings(), []),
        safeFetch(() => adminAPI.getPaymentStatusDistribution(), []),
        safeFetch(() => adminAPI.getAllReviews(), []),
        safeFetch(() => promotionAPI.getAll(), []),
        safeFetch(() => pricingRulesAPI.get(), null),
      ]);

      setStats(statsRes);
      setActivities(activitiesRes);
      const safeProducts = Array.isArray(productsRes) ? productsRes : [];
      setProducts(safeProducts);
      setAdminReviews(Array.isArray(reviewsRes) ? reviewsRes : []);
      setPaymentStatusData(paymentStatusRes);
      setPromotions(Array.isArray(promosRes) ? promosRes : []);
      setPricingRules(pricingRes);
      setTopListings([...safeProducts].sort((a, b) => (b.soLuongDanhGia || 0) - (a.soLuongDanhGia || 0)).slice(0, 5));

      setCategoryData((categoryRes as any[])?.map((c: any) => ({
        name: LABEL_LISTING_TYPE[c.type] || c.type,
        value: c.count,
        color: c.type === 'noi_luu_tru' ? BRAND.primary : c.type === 'trai_nghiem' ? BRAND.secondary : '#484848',
      })) || []);

      const year = new Date().getFullYear();
      await fetchYearCharts(year);
      chartsReadyRef.current = true;
      setLoading(false);
    };
    fetchAll();
  }, []);

  useEffect(() => {
    if (!chartsReadyRef.current || loading) return;
    fetchYearCharts(selectedYear);
  }, [selectedYear]);

  // ─── Derived Data ─────────────────────────────────────────────────────
  const productSummary = useMemo(() => {
    const total = products.length;
    let totalRating = 0, ratingCount = 0;
    const byCity: Record<string, { count: number; sumRating: number; reviews: number }> = {};

    // Build review lookup from actual reviews data
    const reviewCountByListing: Record<number, number> = {};
    const ratingSumByListing: Record<number, number> = {};
    for (const r of adminReviews) {
      const pid = r.maSanPham || r.phong?.maPhong;
      if (pid) {
        reviewCountByListing[pid] = (reviewCountByListing[pid] || 0) + 1;
        ratingSumByListing[pid] = (ratingSumByListing[pid] || 0) + (r.diemSo || 0);
      }
    }

    for (const p of products) {
      const pid = p.maPhong || p.maSanPham;
      const hasRealReviews = pid && reviewCountByListing[pid] != null && reviewCountByListing[pid] > 0;
      const rating = hasRealReviews
        ? ratingSumByListing[pid] / reviewCountByListing[pid]
        : 0;
      const reviewCount = pid ? (reviewCountByListing[pid] || 0) : 0;

      if (rating > 0) { totalRating += rating; ratingCount++; }
      const city = p?.thanhPho || 'Khác';
      if (!byCity[city]) byCity[city] = { count: 0, sumRating: 0, reviews: 0 };
      byCity[city].count++;
      byCity[city].sumRating += rating;
      byCity[city].reviews += reviewCount;
    }
    const avgRating = ratingCount ? (totalRating / ratingCount) : 0;
    const totalReviews = adminReviews.length;
    const topCities = Object.entries(byCity)
      .map(([city, v]) => ({ city, count: v.count, avg: v.count ? (v.sumRating / v.count) : 0, reviews: v.reviews }))
      .sort((a, b) => b.count - a.count);
    return { total, avgRating, totalReviews, topCities };
  }, [products, adminReviews]);

  const growthMetrics = useMemo(() => {
    if (revenueData.length < 2) return { revenueGrowth: 0, userGrowth: 0, bookingGrowth: 0 };
    const lastHalf = revenueData.slice(-6).reduce((s, d) => s + (d.revenue || 0), 0);
    const firstHalf = revenueData.slice(0, 6).reduce((s, d) => s + (d.revenue || 0), 0);
    const revenueGrowth = firstHalf > 0 ? ((lastHalf - firstHalf) / firstHalf) * 100 : 0;
    const lastUsers = userGrowthData.slice(-6).reduce((s, d) => s + (d.users || 0), 0);
    const firstUsers = userGrowthData.slice(0, 6).reduce((s, d) => s + (d.users || 0), 0);
    const userGrowth = firstUsers > 0 ? ((lastUsers - firstUsers) / firstUsers) * 100 : 0;
    return { revenueGrowth, userGrowth };
  }, [revenueData, userGrowthData]);

  const avgOccupancy = useMemo(() => {
    const valid = occupancyData.filter((d) => d.rate > 0);
    if (!valid.length) return 0;
    return Math.round((valid.reduce((s, d) => s + d.rate, 0) / valid.length) * 10) / 10;
  }, [occupancyData]);

  const pendingPayments = useMemo(() => {
    const p = paymentStatusData.find((d: any) => d.status === 'CHO_XAC_NHAN' || d.status === 'CHUA_THANH_TOAN');
    return p ? Number(p.count) : 0;
  }, [paymentStatusData]);

  const paymentPieData = useMemo(() =>
    paymentStatusData.map((d: any) => ({
      name: LABEL_PAYMENT_STATUS[d.status] || d.status,
      value: Number(d.count),
    })), [paymentStatusData]);

  const refundChartData = useMemo(() =>
    refundData.map((r, i) => ({
      ...r,
      failed: cancelledFailedData[i]?.failed ?? 0,
    })), [refundData, cancelledFailedData]);

  const hasRefundData = useMemo(() =>
    refundChartData.some((d) => (d.refund || 0) > 0 || (d.failed || 0) > 0),
    [refundChartData]);

  const revenueTrend = useMemo(() => revenueData.map((d) => d.revenue || 0), [revenueData]);
  const userTrend = useMemo(() => userGrowthData.map((d) => d.users || 0), [userGrowthData]);

  const totalRevenue = stats.totalRevenue || 0;
  const totalUsers = stats.totalUsers || 0;
  const totalListings = stats.totalListings || 0;
  const activeListings = stats.activeListings || 0;

  const promoStats = useMemo(() => {
    const active = promotions.filter((p: any) => p.hoatDong);
    const totalUsed = promotions.reduce((s: number, p: any) => s + (p.soLuongDaDung || 0), 0);
    const totalCapacity = promotions.reduce((s: number, p: any) => s + (p.soLuongToiDa || 0), 0);
    return { active, totalUsed, totalCapacity, total: promotions.length };
  }, [promotions]);

  const todayLabel = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-14 h-14 border-[3px] border-gray-100 dark:border-gray-800 rounded-full" />
          <div className="absolute inset-0 w-14 h-14 border-[3px] border-transparent border-t-[#FF385C] rounded-full animate-spin" />
        </div>
        <p className="text-sm text-gray-400">Đang tải tổng quan…</p>
      </div>
    );
  }

  return (
    <div className="admin-container admin-page-content relative pb-12">
      {/* ─── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            Tổng quan
            <span className="text-xs font-normal text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-full border border-gray-100 dark:border-gray-700">
              Admin
            </span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{todayLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-gray-50 dark:bg-gray-800 rounded-xl p-0.5">
            {[
              { label: 'Thanh toán', href: '/admin/payments', color: 'bg-emerald-500' },
              { label: 'Người dùng', href: '/admin/users', color: 'bg-purple-500' },
              { label: 'Phòng', href: '/admin/listings', color: 'bg-amber-500' },
            ].map((item) => (
              <Link key={item.href} href={item.href}
                className="px-3.5 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
                {item.label}
              </Link>
            ))}
          </div>
          <button onClick={() => window.location.reload()}
            className="px-3.5 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Làm mới
          </button>
        </div>
      </div>

      {/* ─── KPI Grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard
          label="Tổng doanh thu"
          value={formatShortVND(totalRevenue)}
          href="/admin/payments"
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
          label="Người dùng"
          value={formatNumber(totalUsers)}
          href="/admin/users"
          iconBg="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-500/20 dark:to-blue-500/10"
          iconColor="text-blue-600"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          }
          trend={<Sparkline data={userTrend} color="#4285F4" />}
          footer={<GrowthBadge value={growthMetrics.userGrowth} />}
        />
        <StatCard
          label="Phòng cho thuê"
          value={formatNumber(totalListings)}
          href="/admin/listings"
          iconBg="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-500/20 dark:to-amber-500/10"
          iconColor="text-amber-600"
          valueColor="text-amber-600"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          }
          footer={<span>{formatNumber(activeListings)} đang hoạt động</span>}
        />
        <StatCard
          label="Lấp đầy TB"
          value={`${avgOccupancy}%`}
          href="#"
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
          value={(stats.pendingListings || 0) + pendingPayments}
          href="/admin/listings"
          iconBg="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-500/20 dark:to-purple-500/10"
          iconColor="text-purple-600"
          valueColor="text-purple-600"
          icon={
            <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          footer={<span>{stats.pendingListings || 0} chờ duyệt · {pendingPayments} TT chờ</span>}
        />
      </div>

      {/* ─── Chart Controls ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 bg-white dark:bg-[#161616] border border-gray-100 dark:border-gray-800 rounded-xl px-5 py-3 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#FF385C]" />
            <span className="text-xs text-gray-500">Doanh thu</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#F4B400]" />
            <span className="text-xs text-gray-500">Lấp đầy</span>
          </div>
        </div>
        <YearSelector year={selectedYear} onChange={setSelectedYear} loading={chartsLoading} />
      </div>

      {/* ─── Charts Grid ─────────────────────────────────────────────── */}
      <div className={`grid grid-cols-1 xl:grid-cols-12 gap-5 mb-5 transition-all duration-300 ${chartsLoading ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Row 1: Revenue + Fee */}
        <Section title={`Doanh thu theo tháng ${selectedYear}`} subtitle="Thu nhập và phí dịch vụ" className="xl:col-span-12">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BRAND.primary} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={BRAND.primary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="adminFeeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4285F4" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#4285F4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={formatShortVND} width={56} />
                <Tooltip content={<ChartTooltip formatter={(v: number) => formatVND(v)} />} />
                <Area type="monotone" dataKey="revenue" name="Doanh thu" stroke={BRAND.primary} strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: BRAND.primary, stroke: '#fff', strokeWidth: 2 }} />
                <Area type="monotone" dataKey="serviceFee" name="Phí dịch vụ" stroke="#4285F4" strokeWidth={2} fill="url(#adminFeeGrad)" dot={false} activeDot={{ r: 4, fill: '#4285F4', stroke: '#fff', strokeWidth: 2 }} />
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
                <KPIPill label="Tổng năm" value={formatShortVND(totalRevenue)} color={BRAND.primary} />
                <KPIPill label="TB tháng" value={formatShortVND(totalRevenue / 12)} color={BRAND.primary} />
              </>
            )}
          </div>
        </Section>

        {/* Row 2: Refund/Cancelled (6) | Occupancy (6) */}
        <Section title="Hoàn tiền & Hủy/Thất bại" subtitle="Phân tích theo tháng" className="xl:col-span-6">
          {hasRefundData ? (
            <>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={refundChartData} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                    <defs>
                      <linearGradient id="adminRefundGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={BRAND.success} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={BRAND.success} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="adminFailedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={BRAND.error} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={BRAND.error} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={formatShortVND} width={56} />
                    <Tooltip content={<ChartTooltip formatter={(v: number) => formatVND(v)} />} />
                    <Area type="monotone" dataKey="refund" name="Hoàn tiền" stroke={BRAND.success} strokeWidth={2} fill="url(#adminRefundGrad)" dot={false} activeDot={{ r: 4, fill: BRAND.success, stroke: '#fff', strokeWidth: 2 }} />
                    <Area type="monotone" dataKey="failed" name="Hủy / Thất bại" stroke={BRAND.error} strokeWidth={2} fill="url(#adminFailedGrad)" dot={false} activeDot={{ r: 4, fill: BRAND.error, stroke: '#fff', strokeWidth: 2 }} />
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

        <Section title={`Lấp đầy % · ${selectedYear}`} subtitle="Phần trăm phòng được đặt" className="xl:col-span-6">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={occupancyData} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} unit="%" width={32} domain={[0, 100]} />
                <Tooltip content={<ChartTooltip formatter={(v: number) => `${v.toFixed(1)}%`} />} />
                <Bar dataKey="rate" name="Lấp đầy" fill={BRAND.secondary} radius={[4, 4, 0, 0]} maxBarSize={32}>
                  {occupancyData.map((entry, i) => (
                    <Cell key={i} fill={entry.rate >= 70 ? BRAND.success : entry.rate >= 40 ? BRAND.warning : BRAND.error} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {/* Row 3: Category + Payment */}
        <div className="xl:col-span-12 space-y-5">
          <Section title="Phân loại listing" subtitle="Theo loại hình cho thuê">
            {categoryData.length > 0 ? (
              <div className="space-y-3">
                {categoryData.map((item: any, i: number) => {
                  const max = Math.max(...categoryData.map((c: any) => c.value), 1);
                  const pct = ((item.value / max) * 100);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-gray-600 dark:text-gray-400">{item.name}</span>
                        <span className="font-bold text-gray-900 dark:text-gray-100">{item.value}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: item.color }} />
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
              <div className="space-y-2.5">
                {paymentPieData.map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-gray-500 dark:text-gray-400 flex-1">{item.name}</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{item.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">Chưa có dữ liệu thanh toán</p>
            )}
          </Section>
        </div>
      </div>

      {/* ─── Khuyến mãi & Quy định giá ────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 mb-5">
        {/* Khuyến mãi */}
        <Section
          title="Khuyến mãi"
          subtitle={`${promoStats.active.length} đang hoạt động`}
          action={<Link href="/admin/promotions" className="text-xs text-[#FF385C] font-semibold hover:underline">Quản lý →</Link>}
          className="xl:col-span-7"
        >
          {promotions.length > 0 ? (
            <div className="space-y-3">
              {/* Summary pills */}
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">{promoStats.active.length} đang active</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Đã dùng: {promoStats.totalUsed} lần</span>
                </div>
                {promoStats.totalCapacity > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                      Còn lại: {promoStats.totalCapacity - promoStats.totalUsed} / {promoStats.totalCapacity}
                    </span>
                  </div>
                )}
              </div>

              {/* Promo list */}
              <div className="space-y-2">
                {promoStats.active.slice(0, 5).map((promo: any) => {
                  const usagePct = promo.soLuongToiDa > 0 ? Math.round((promo.soLuongDaDung / promo.soLuongToiDa) * 100) : 0;
                  const isExpiring = promo.dieuKienNgayKetThuc && new Date(promo.dieuKienNgayKetThuc).getTime() - Date.now() < 7 * 86400000;
                  return (
                    <div key={promo.maKhuyenMai} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-[#222] hover:shadow-sm transition-all group">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        promo.loaiGiamGia === 'PHAN_TRAM' ? 'bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400' : 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {promo.loaiGiamGia === 'PHAN_TRAM' ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{promo.tenKhuyenMai}</p>
                          {isExpiring && (
                            <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-full">Sắp hết hạn</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {promo.loaiGiamGia === 'PHAN_TRAM' ? `${promo.giaTri}%` : formatVND(promo.giaTri)}
                          {' · '}Áp dụng cho {promo.apCho === 'DON_HANG' ? 'đơn hàng' : promo.apCho === 'NGUOI_LON' ? 'người lớn' : 'trẻ em'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{promo.soLuongDaDung}/{promo.soLuongToiDa}</p>
                        <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{
                            width: `${Math.min(usagePct, 100)}%`,
                            backgroundColor: usagePct >= 90 ? BRAND.error : usagePct >= 60 ? BRAND.warning : BRAND.success,
                          }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {promoStats.active.length > 5 && (
                <Link href="/admin/promotions" className="block text-center text-xs font-semibold text-[#FF385C] hover:underline pt-1">
                  Xem tất cả {promoStats.active.length} khuyến mãi →
                </Link>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
              </div>
              <p className="text-sm text-gray-400">Chưa có khuyến mãi nào</p>
              <Link href="/admin/promotions" className="mt-2 inline-block text-xs font-semibold text-[#FF385C] hover:underline">Tạo khuyến mãi →</Link>
            </div>
          )}
        </Section>

        {/* Quy định giá */}
        <Section
          title="Quy định giá"
          subtitle="Tỷ lệ tính giá theo đối tượng"
          action={<Link href="/admin/pricing-rules" className="text-xs text-[#FF385C] font-semibold hover:underline">Chỉnh sửa →</Link>}
          className="xl:col-span-5"
        >
          {pricingRules ? (
            <div className="space-y-5">
              {/* Visual pricing breakdown */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-white/[0.03] dark:to-white/[0.01] rounded-xl p-5 border border-gray-100 dark:border-[#222]">
                <div className="text-center mb-5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Mô hình tính giá / đêm / người</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {/* Người lớn */}
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center mb-3">
                      <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <div className="inline-flex items-baseline gap-0.5">
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{pricingRules.tyLeNguoiLon}</span>
                      <span className="text-sm font-semibold text-blue-400 dark:text-blue-500">%</span>
                    </div>
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mt-1">Người lớn</p>
                  </div>
                  {/* Trẻ em */}
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center mb-3">
                      <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div className="inline-flex items-baseline gap-0.5">
                      <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pricingRules.tyLeTreEm}</span>
                      <span className="text-sm font-semibold text-amber-400 dark:text-amber-500">%</span>
                    </div>
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mt-1">Trẻ em</p>
                  </div>
                  {/* Em bé */}
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center mb-3">
                      <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    </div>
                    <div className="inline-flex items-baseline gap-0.5">
                      <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">0</span>
                      <span className="text-sm font-semibold text-emerald-400 dark:text-emerald-500">%</span>
                    </div>
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mt-1">Em bé</p>
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">Phí dịch vụ</p>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-0.5">{pricingRules?.tyLePhiDichVu ?? 10}%</p>
                  <p className="text-[10px] text-blue-500/70 dark:text-blue-400/60">của (giá phòng + phí vệ sinh)</p>
                </div>
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20">
                  <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">Phí vệ sinh</p>
                  <p className="text-lg font-bold text-purple-700 dark:text-purple-300 mt-0.5">Tùy phòng</p>
                  <p className="text-[10px] text-purple-500/70 dark:text-purple-400/60">Chủ nhà tự thiết lập</p>
                </div>
              </div>

              {/* Last updated */}
              {pricingRules.ngayCapNhat && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 text-right">
                  Cập nhật lần cuối: {new Date(pricingRules.ngayCapNhat).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-sm text-gray-400">Chưa có quy định giá</p>
            </div>
          )}
        </Section>
      </div>

      {/* ─── Bottom Section ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Recent Activities */}
        <Section title="Hoạt động gần đây" subtitle="Các sự kiện mới nhất trên hệ thống" className="xl:col-span-5">
          {activities.length > 0 ? (
            <div className="space-y-1">
              {activities.slice(0, 8).map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-black/5 ${
                    activity.type === 'BOOKING' ? 'bg-emerald-50 text-emerald-600' : 
                    activity.type === 'REVIEW' ? 'bg-amber-50 text-amber-600' :
                    activity.type === 'USER' ? 'bg-blue-50 text-blue-600' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    {activity.type === 'BOOKING' ? (
                      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    ) : activity.type === 'REVIEW' ? (
                      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    ) : (
                      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{activity.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{activity.description}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap">
                    {activity.timestamp ? new Date(activity.timestamp).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-gray-400">Chưa có hoạt động gần đây</p>
            </div>
          )}
        </Section>

        {/* Top Cities */}
        <Section
          title="Top thành phố"
          subtitle="Số lượng listing theo khu vực"
          action={<Link href="/admin/listings" className="text-xs text-[#FF385C] font-semibold hover:underline">Xem tất cả</Link>}
          className="xl:col-span-3"
        >
          {productSummary.topCities.length > 0 ? (
            <div className="space-y-4">
              {productSummary.topCities.map((city, index) => {
                const maxCount = productSummary.topCities[0]?.count || 1;
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
            <p className="text-sm text-gray-400 text-center py-8">Chưa có dữ liệu thành phố</p>
          )}
        </Section>

        {/* Top Listings */}
        <Section
          title="Top phòng nổi bật"
          subtitle="Xếp hạng theo đánh giá"
          action={<Link href="/admin/listings" className="text-xs text-[#FF385C] font-semibold hover:underline">Xem tất cả</Link>}
          className="xl:col-span-4"
        >
          {topListings.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800 -mx-6 -mb-6">
              {topListings.map((p, idx) => (
                <Link key={p.maPhong} href={`/admin/listings/${p.maPhong}`}
                  className="flex items-center gap-3 px-6 py-3.5 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                  <span className="text-[10px] font-bold text-gray-400 w-4 text-center">{idx + 1}</span>
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0">
                    {p.urlAnhChinh ? (
                      <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${p.urlAnhChinh})` }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-[#FF385C] transition-colors">{p.tieuDe}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {p.thanhPho || 'N/A'} · {p.giaMoiKhach ? formatShortVND(p.giaMoiKhach) : '—'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100">★ {Number(p.diemTrungBinh || 0).toFixed(1)}</p>
                    <p className="text-[10px] text-gray-400">{p.soLuongDanhGia || 0} đánh giá</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Chưa có dữ liệu</p>
          )}
        </Section>
      </div>
    </div>
  );
}
