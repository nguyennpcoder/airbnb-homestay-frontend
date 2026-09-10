'use client';

import { useEffect, useState, useMemo } from 'react';
import { reviewsAPI, hostAPI, Review, Phong, getPhongId } from '@/lib/api';
import BackendImage from '@/components/BackendImage';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';
import AdminUserAvatar, { resolvePersonName } from '@/components/admin/AdminUserAvatar';
import { VerifiedName } from '@/components/admin/VerifiedBadge';
import Pagination from '@/components/Pagination';
import { getValidSrc } from '@/lib/image';
import { Modal } from 'antd';

const ITEMS_PER_PAGE = 6;

const CATEGORY_LABELS: Record<string, string> = {
  diemSachSe: 'Sạch sẽ',
  diemChinhXac: 'Chính xác',
  diemNhanPhong: 'Nhận phòng',
  diemGiaoTiep: 'Giao tiếp',
  diemViTri: 'Vị trí',
  diemGiaTri: 'Giá trị',
};

const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS);

export default function HostReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [listings, setListings] = useState<Phong[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [listingFilter, setListingFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [editingReplyTo, setEditingReplyTo] = useState<number | null>(null);
  const [editReplyContent, setEditReplyContent] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [deletingReplyId, setDeletingReplyId] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userId = Number(localStorage.getItem('userId'));
        if (!userId) return;
        const [reviewsData, listingsData] = await Promise.all([
          reviewsAPI.listByHost(userId, userId),
          hostAPI.allListings(userId),
        ]);
        setReviews(reviewsData);
        setListings(listingsData);
      } catch (error) {
        console.error('Error fetching reviews:', error);
        toast.error('Không thể tải đánh giá');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = useMemo(() => {
    if (reviews.length === 0) return { total: 0, avg: 0, categoryAverages: {} as Record<string, number> };
    const avg = reviews.reduce((sum, r) => sum + (r.diemSo || 0), 0) / reviews.length;
    const categoryAverages: Record<string, number> = {};
    for (const key of CATEGORY_KEYS) {
      const vals = reviews.filter((r: any) => r[key] != null).map((r: any) => Number(r[key]));
      categoryAverages[key] = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    }
    return { total: reviews.length, avg, categoryAverages };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    let result = [...reviews];
    if (listingFilter !== 'all') {
      result = result.filter((r) => r.maSanPham === Number(listingFilter));
    }
    if (ratingFilter !== 'all') {
      result = result.filter((r) => Math.floor(r.diemSo) === Number(ratingFilter));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.binhLuan?.toLowerCase().includes(q) ||
          resolvePersonName(r.khach || r.nguoiDung, '').toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      switch (sortOrder) {
        case 'newest': return (b.ngayTao || '').localeCompare(a.ngayTao || '');
        case 'oldest': return (a.ngayTao || '').localeCompare(b.ngayTao || '');
        case 'highest': return (b.diemSo || 0) - (a.diemSo || 0);
        case 'lowest': return (a.diemSo || 0) - (b.diemSo || 0);
      }
    });
    return result;
  }, [reviews, listingFilter, ratingFilter, searchQuery, sortOrder]);

  const totalPages = Math.ceil(filteredReviews.length / ITEMS_PER_PAGE);
  const currentItems = filteredReviews.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const ratingDistribution = useMemo(() => {
    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const r of reviews) {
      const rounded = Math.round(r.diemSo);
      if (dist[rounded] !== undefined) dist[rounded]++;
    }
    return dist;
  }, [reviews]);

  const getRatingColor = (score: number) => {
    if (score >= 4.5) return 'text-emerald-600';
    if (score >= 4.0) return 'text-emerald-500';
    if (score >= 3.5) return 'text-yellow-500';
    if (score >= 3.0) return 'text-yellow-600';
    return 'text-red-500';
  };

  const getRatingBg = (score: number) => {
    if (score >= 4.5) return 'bg-emerald-500';
    if (score >= 4.0) return 'bg-emerald-400';
    if (score >= 3.5) return 'bg-yellow-400';
    if (score >= 3.0) return 'bg-yellow-500';
    return 'bg-red-400';
  };

  const handleReply = async (reviewId: number) => {
    if (!replyContent.trim()) return;
    setSubmittingReply(true);
    try {
      const userId = Number(localStorage.getItem('userId')) || 0;
      await reviewsAPI.reply(reviewId, replyContent.trim(), userId);
      setReviews(prev => prev.map(r => 
        r.maDanhGia === reviewId ? { ...r, phanHoi: replyContent.trim() } : r
      ));
      toast.success('Đã phản hồi đánh giá');
      setReplyingTo(null);
      setReplyContent('');
    } catch (error) {
      console.error('Reply error:', error);
      toast.error('Không thể phản hồi đánh giá');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleUpdateReply = async (reviewId: number) => {
    if (!editReplyContent.trim()) return;
    setSubmittingEdit(true);
    try {
      const userId = Number(localStorage.getItem('userId')) || 0;
      await reviewsAPI.updateReply(reviewId, editReplyContent.trim(), userId);
      setReviews(prev => prev.map(r => 
        r.maDanhGia === reviewId ? { ...r, phanHoi: editReplyContent.trim() } : r
      ));
      toast.success('Đã cập nhật phản hồi');
      setEditingReplyTo(null);
      setEditReplyContent('');
    } catch (error) {
      console.error('Update reply error:', error);
      toast.error('Không thể cập nhật phản hồi');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteReply = (reviewId: number) => {
    Modal.confirm({
      title: 'Xóa phản hồi',
      content: 'Bạn có chắc chắn muốn xóa phản hồi này? Thao tác không thể hoàn tác.',
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      centered: true,
      onOk: async () => {
        setDeletingReplyId(reviewId);
        try {
          const userId = Number(localStorage.getItem('userId')) || 0;
          await reviewsAPI.deleteReply(reviewId, userId);
          setReviews(prev => prev.map(r => 
            r.maDanhGia === reviewId ? { ...r, phanHoi: null as any } : r
          ));
          toast.success('Đã xóa phản hồi');
        } catch (error) {
          console.error('Delete reply error:', error);
          toast.error('Không thể xóa phản hồi');
        } finally {
          setDeletingReplyId(null);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C]" />
      </div>
    );
  }

  return (
    <div className="admin-container admin-page-content relative admin-page-enter">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          {/* <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Đánh giá</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Quản lý {reviews.length} đánh giá từ khách hàng
          </p> */}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Overall Rating */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center">
          <div className={`text-5xl font-bold tracking-tight ${getRatingColor(stats.avg)}`}>
            {stats.avg.toFixed(1)}
          </div>
          <div className="flex items-center gap-0.5 mt-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg key={star} className={`w-5 h-5 ${star <= Math.round(stats.avg) ? 'text-[#FF385C]' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>
          <p className="text-sm text-gray-400 mt-2">{stats.total} đánh giá</p>
          <div className="flex items-center gap-1 mt-3 text-emerald-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            <span className="text-xs font-semibold">+0.2 so với tháng trước</span>
          </div>
        </div>

        {/* Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Phân bố</h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingDistribution[star] || 0;
              const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 w-3">{star}</span>
                  <svg className="w-3 h-3 text-[#FF385C]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#FF385C] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Hạng mục</h3>
          <div className="space-y-2.5">
            {CATEGORY_KEYS.map((key) => {
              const val = stats.categoryAverages[key] || 0;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-16 shrink-0">{CATEGORY_LABELS[key]}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${getRatingBg(val)}`} style={{ width: `${(val / 5) * 100}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-600 w-7 text-right">{val.toFixed(1)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <input type="text" placeholder="Tìm kiếm đánh giá..." value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF385C]/30 focus:border-[#FF385C] transition-all" />
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <div className="relative">
            <select value={listingFilter} onChange={e => { setListingFilter(e.target.value); setCurrentPage(1); }}
              className="appearance-none bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF385C]/20 focus:border-[#FF385C] transition-all">
              <option value="all">Tất cả bài đăng</option>
              {listings.map(l => <option key={getPhongId(l)} value={String(getPhongId(l))}>{l.tieuDe || `#${getPhongId(l)}`}</option>)}
            </select>
            <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Sắp xếp theo:</span>
            <div className="relative">
              <select value={sortOrder} onChange={e => { setSortOrder(e.target.value as any); setCurrentPage(1); }}
                className="appearance-none bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF385C]/20 focus:border-[#FF385C] transition-all font-semibold">
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="highest">Cao nhất</option>
                <option value="lowest">Thấp nhất</option>
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
          <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
          </button>
        </div>
      </div>

      {/* Reviews */}
      {reviews.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Chưa có đánh giá</h3>
          <p className="text-sm text-gray-400">Đánh giá sẽ hiển thị khi khách hoàn thành đặt chỗ</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-400">Không tìm thấy đánh giá phù hợp</p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentItems.map((review) => {
            const reviewer = review.khach || review.nguoiDung;
            const listing = listings.find((l) => getPhongId(l) === review.maSanPham);
            const isGoodReview = review.diemSo >= 4.0;
            return (
              <div key={review.maDanhGia} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <AdminUserAvatar person={reviewer} size={44} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">{resolvePersonName(reviewer, 'Khách')}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {review.ngayNhanPhong && review.ngayTraPhong && (
                              <p className="text-xs text-gray-400">
                                {format(new Date(review.ngayNhanPhong), 'dd/MM')} - {format(new Date(review.ngayTraPhong), 'dd/MM/yyyy')}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xl font-bold ${getRatingColor(review.diemSo)}`}>
                              {review.diemSo?.toFixed(1)}
                            </span>
                            <svg className="w-4 h-4 text-[#FF385C]" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          </div>
                          {isGoodReview && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Đánh giá tốt
                            </span>
                          )}
                        </div>
                      </div>

                      {listing && (
                        <a href={`/hosting/listings/${getPhongId(listing)}`}
                           className="inline-flex items-center gap-1.5 text-xs text-[#008489] hover:underline font-medium mt-2">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                          {listing.tieuDe || `Listing #${getPhongId(listing)}`}
                        </a>
                      )}

                      {review.binhLuan && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-3 leading-relaxed">
                          {review.binhLuan}
                        </p>
                      )}

                      {review.phanHoi && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full overflow-hidden relative bg-gray-200 flex-shrink-0">
                                {review.chuNha ? (
                                  <BackendImage
                                    src={getValidSrc(review.chuNha.avatarUrl || review.chuNha.urlAnhDaiDien) || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.chuNha.hoTen || 'Host')}&background=FF385C&color=fff`}
                                    alt={review.chuNha.hoTen || 'Chủ nhà'}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="w-full h-full bg-[#FF385C] flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                  </div>
                                )}
                              </div>
                              <span className="text-xs font-semibold text-gray-700">
                                Từ chủ nhà: {review.chuNha?.hoTen || 'Chủ nhà'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => { setEditingReplyTo(review.maDanhGia); setEditReplyContent(review.phanHoi || ''); setReplyingTo(null); }}
                                className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-[#FF385C] transition-colors px-2 py-1 rounded hover:bg-gray-100"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                Chỉnh sửa
                              </button>
                              <button
                                onClick={() => handleDeleteReply(review.maDanhGia)}
                                disabled={deletingReplyId === review.maDanhGia}
                                className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-50"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                {deletingReplyId === review.maDanhGia ? 'Đang xóa...' : 'Xóa'}
                              </button>
                            </div>
                          </div>
                          {editingReplyTo === review.maDanhGia ? (
                            <div className="flex flex-col gap-2">
                              <textarea
                                value={editReplyContent}
                                onChange={e => setEditReplyContent(e.target.value)}
                                placeholder="Nội dung phản hồi..."
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF385C]/20 focus:border-[#FF385C] resize-none"
                                rows={3}
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => { setEditingReplyTo(null); setEditReplyContent(''); }}
                                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900"
                                >
                                  Hủy
                                </button>
                                <button
                                  onClick={() => handleUpdateReply(review.maDanhGia)}
                                  disabled={submittingEdit || !editReplyContent.trim()}
                                  className="px-4 py-1.5 text-xs font-medium bg-[#FF385C] text-white rounded-lg hover:bg-[#E31C5F] disabled:opacity-50"
                                >
                                  {submittingEdit ? 'Đang lưu...' : 'Lưu'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600">{review.phanHoi}</p>
                          )}
                        </div>
                      )}

                      {replyingTo === review.maDanhGia && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <textarea
                            value={replyContent}
                            onChange={e => setReplyContent(e.target.value)}
                            placeholder="Nhập phản hồi của bạn..."
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF385C]/20 focus:border-[#FF385C] resize-none"
                            rows={3}
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <button
                              onClick={() => { setReplyingTo(null); setReplyContent(''); }}
                              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900"
                            >
                              Hủy
                            </button>
                            <button
                              onClick={() => handleReply(review.maDanhGia)}
                              disabled={submittingReply || !replyContent.trim()}
                              className="px-4 py-1.5 text-xs font-medium bg-[#FF385C] text-white rounded-lg hover:bg-[#E31C5F] disabled:opacity-50"
                            >
                              {submittingReply ? 'Đang gửi...' : 'Gửi phản hồi'}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-4 pt-4 border-t border-gray-100">
                        {CATEGORY_KEYS.map((key) => {
                          const val = (review as any)[key];
                          if (val == null) return null;
                          return (
                            <div key={key} className="text-center">
                              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{CATEGORY_LABELS[key]}</p>
                              <p className={`text-sm font-bold ${getRatingColor(Number(val))}`}>{Number(val).toFixed(1)}</p>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
                        <button 
                          onClick={async () => {
                            try {
                              const userId = Number(localStorage.getItem('userId')) || 0;
                              const res = await reviewsAPI.markHuuIch(review.maDanhGia, userId);
                              setReviews(prev => prev.map(r => r.maDanhGia === review.maDanhGia ? { ...r, isHuuIchByCurrentUser: res.huuIch, soLuotHuuIch: res.soLuotHuuIch } : r));
                              toast.success(res.message);
                            } catch (error) {
                              toast.error('Không thể đánh dấu hữu ích');
                            }
                          }}
                          className={`flex items-center gap-1.5 text-xs transition-colors ${review.isHuuIchByCurrentUser ? 'text-[#FF385C] font-semibold' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          <svg className="w-4 h-4" fill={review.isHuuIchByCurrentUser ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                          {review.isHuuIchByCurrentUser ? 'Đã hữu ích' : 'Hữu ích'}
                          {(review.soLuotHuuIch || 0) > 0 && (
                            <span className="ml-1 text-[10px]">({review.soLuotHuuIch})</span>
                          )}
                        </button>
                        {!review.phanHoi && (
                          <button 
                            onClick={() => { setReplyingTo(review.maDanhGia); setReplyContent(''); }}
                            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                            Phản hồi
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredReviews.length > ITEMS_PER_PAGE && (
            <div className="flex justify-center pt-4">
              <Pagination inline currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
