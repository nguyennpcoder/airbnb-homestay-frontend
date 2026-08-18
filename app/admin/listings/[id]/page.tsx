'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { adminAPI } from '@/lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Image from 'next/image';
import ConfirmModal from '@/components/ConfirmModal';
import { getValidSrc } from '@/lib/image';
import VerifiedBadge from '@/components/admin/VerifiedBadge';
import { adminUserProfileHref } from '@/lib/admin-navigation';
import dynamic from 'next/dynamic';

const ProductMap = dynamic(() => import('@/components/ProductMap'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-80 bg-gray-100 animate-pulse rounded-xl flex items-center justify-center">
            <span className="text-gray-400 text-sm">Đang tải bản đồ...</span>
        </div>
    ),
});

interface Props {
    params: { id: string };
}

const TYPE_LABELS: Record<string, string> = {
    noi_luu_tru: 'Lưu trú',
    trai_nghiem: 'Trải nghiệm',
    dich_vu: 'Dịch vụ',
};

function formatCurrency(amount?: number | null) {
    if (amount == null) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}

function IdBadge({ id, label }: { id: number | string; label?: string }) {
    return (
        <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200 shrink-0">
            {label && <span className="text-gray-400 font-sans font-medium normal-case">{label}</span>}
            #{id}
        </span>
    );
}

function getStatusBadge(listing: any) {
    if (listing.biKhoa) {
        return { label: 'Bị khóa', className: 'bg-red-50 text-red-700 border border-red-200', dot: 'bg-red-500' };
    }
    switch (listing.trangThai) {
        case 'hoat_dong':
            return { label: 'Hoạt động', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' };
        case 'cho_duyet':
            return { label: 'Chờ duyệt', className: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-500 animate-pulse' };
        default:
            return { label: 'Ngừng hoạt động', className: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
    }
}

function getMainImage(listing: any) {
    const primary = listing.hinhAnhs?.find((h: any) => h.laAnhChinh)?.urlHinhAnh;
    if (primary) return primary;
    if (listing.hinhAnhs?.length > 0) return listing.hinhAnhs[0].urlHinhAnh;
    if (listing.urlAnhChinh && listing.urlAnhChinh !== 'FILE_SELECTED') return listing.urlAnhChinh;
    return null;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex justify-between items-start py-3 border-b border-gray-100 last:border-0 gap-4">
            <span className="text-sm text-gray-500 shrink-0">{label}</span>
            <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
        </div>
    );
}

function ImageLightbox({
    images,
    index,
    onClose,
    onChange,
}: {
    images: string[];
    index: number;
    onClose: () => void;
    onChange: (i: number) => void;
}) {
    const [mounted, setMounted] = useState(false);
    const total = images.length;

    useEffect(() => setMounted(true), []);

    const goPrev = useCallback(() => onChange((index - 1 + total) % total), [index, total, onChange]);
    const goNext = useCallback(() => onChange((index + 1) % total), [index, total, onChange]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') goPrev();
            if (e.key === 'ArrowRight') goNext();
        };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', onKey);
        };
    }, [onClose, goPrev, goNext]);

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col" onClick={onClose}>
            <div className="flex items-center justify-between px-4 py-3 shrink-0" onClick={e => e.stopPropagation()}>
                <span className="text-white/80 text-sm font-medium">{index + 1} / {total}</span>
                <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                    aria-label="Đóng"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="relative flex-1 flex items-center justify-center px-4 min-h-0" onClick={e => e.stopPropagation()}>
                {total > 1 && (
                    <button
                        type="button"
                        onClick={goPrev}
                        className="absolute left-3 md:left-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
                        aria-label="Ảnh trước"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                )}
                <div className="relative w-full max-w-5xl h-full max-h-[calc(100vh-10rem)]">
                    <Image
                        src={getValidSrc(images[index])}
                        alt={`Ảnh ${index + 1}`}
                        fill
                        className="object-contain"
                        sizes="100vw"
                        priority
                    />
                </div>
                {total > 1 && (
                    <button
                        type="button"
                        onClick={goNext}
                        className="absolute right-3 md:right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
                        aria-label="Ảnh sau"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                )}
            </div>

            {total > 1 && (
                <div className="shrink-0 px-4 py-3 overflow-x-auto" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-2 justify-center min-w-min mx-auto">
                        {images.map((url, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => onChange(i)}
                                className={`relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${i === index ? 'border-white scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                            >
                                <Image src={getValidSrc(url)} alt="" fill className="object-cover" sizes="64px" />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
}

type ModalState = {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    confirmColor: 'green' | 'red' | 'gray';
    onConfirm: () => Promise<void>;
};

export default function ListingDetailPage({ params }: Props) {
    const [listing, setListing] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [confirmModal, setConfirmModal] = useState<ModalState>({
        isOpen: false, title: '', message: '', confirmText: '', confirmColor: 'gray', onConfirm: async () => {},
    });

    const fetchListing = async () => {
        try {
            setLoading(true);
            const data = await adminAPI.getListingDetails(parseInt(params.id));
            setListing(data);
        } catch {
            toast.error('Không thể tải thông tin listing');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchListing(); }, [params.id]);

    useEffect(() => {
        if (confirmModal.isOpen) {
            document.body.style.overflow = 'hidden';
        } else if (lightboxIndex === null) {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [confirmModal.isOpen, lightboxIndex]);

    const galleryImages = useMemo(() => {
        if (!listing) return [] as string[];
        const fromGallery = listing.hinhAnhs?.map((h: any) => h.urlHinhAnh).filter(Boolean) || [];
        if (fromGallery.length > 0) return fromGallery;
        const main = getMainImage(listing);
        return main ? [main] : [];
    }, [listing]);

    const openLightbox = (url: string) => {
        const idx = galleryImages.indexOf(url);
        setLightboxIndex(idx >= 0 ? idx : 0);
    };

    const handleLockAction = () => {
        if (!listing) return;
        const isLocked = listing.biKhoa === true;
        setConfirmModal({
            isOpen: true,
            title: isLocked ? 'Mở khóa listing' : 'Khóa listing',
            message: isLocked
                ? 'Listing sẽ hiển thị lại trên kết quả tìm kiếm.'
                : 'Listing sẽ bị ẩn khỏi tìm kiếm. Khách không thể đặt phòng này.',
            confirmText: isLocked ? 'Mở khóa' : 'Khóa listing',
            confirmColor: isLocked ? 'green' : 'red',
            onConfirm: async () => {
                try {
                    if (isLocked) {
                        await adminAPI.unlockListing(listing.maPhong);
                        toast.success('Đã mở khóa listing');
                    } else {
                        await adminAPI.lockListing(listing.maPhong);
                        toast.success('Đã khóa listing');
                    }
                    setListing((prev: any) => prev ? { ...prev, biKhoa: !isLocked } : prev);
                } catch {
                    toast.error('Có lỗi xảy ra, vui lòng thử lại');
                }
            },
        });
    };

    const handleApproveListing = () => {
        if (!listing) return;
        setConfirmModal({
            isOpen: true,
            title: 'Duyệt listing',
            message: 'Listing sẽ được công khai và khách có thể đặt ngay.',
            confirmText: 'Duyệt ngay',
            confirmColor: 'green',
            onConfirm: async () => {
                try {
                    await adminAPI.setStatus(listing.maPhong, 'hoat_dong');
                    toast.success('Đã duyệt listing');
                    fetchListing();
                } catch {
                    toast.error('Lỗi khi duyệt listing');
                }
            },
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C]" />
            </div>
        );
    }

    if (!listing) {
        return (
            <div className="admin-container py-16 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy listing</h1>
                <p className="text-sm text-gray-500 mb-4">Listing #{params.id} không tồn tại hoặc đã bị xóa.</p>
                <Link href="/admin/listings" className="text-sm font-semibold text-[#FF385C] hover:underline">
                    ← Quay lại danh sách
                </Link>
            </div>
        );
    }

    const statusMeta = getStatusBadge(listing);
    const isLocked = listing.biKhoa === true;
    const isPending = !isLocked && listing.trangThai === 'cho_duyet';
    const mainImage = getMainImage(listing);
    const secondaryImages = galleryImages.filter((url: string) => url !== mainImage).slice(0, 4);
    const locationLine = [listing.phuongXa, listing.quanHuyen, listing.thanhPho, listing.quocGia].filter(Boolean).join(', ');

    return (
        <div className="admin-container admin-page-content admin-page-enter">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
                <div className="flex items-start gap-3 min-w-0">
                    <Link
                        href="/admin/listings"
                        className="p-2 -ml-2 mt-0.5 rounded-full hover:bg-gray-100 transition-colors text-gray-500 shrink-0"
                        aria-label="Quay lại"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </Link>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <IdBadge id={listing.maPhong} label="Listing" />
                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${statusMeta.className}`}>
                                <span className={`w-2 h-2 rounded-full ${statusMeta.dot}`} />
                                {statusMeta.label}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium text-[10px] tracking-wider uppercase">
                                {TYPE_LABELS[listing.loaiPhong] || listing.loaiPhong?.replace(/_/g, ' ') || '—'}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                            {listing.tieuDe || 'Chưa có tiêu đề'}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {listing.thanhPho || listing.quocGia || '—'}
                            {listing.diemTrungBinh ? (
                                <span className="ml-2 text-gray-700 font-medium">
                                    · ★ {Number(listing.diemTrungBinh).toFixed(1)} ({listing.soLuongDanhGia ?? 0} đánh giá)
                                </span>
                            ) : null}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {isPending && (
                        <button
                            onClick={handleApproveListing}
                            className="px-4 py-2 bg-[#008489] hover:bg-[#006f73] text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                        >
                            Duyệt listing
                        </button>
                    )}
                    <button
                        onClick={handleLockAction}
                        className={`px-4 py-2 text-white text-xs font-bold rounded-lg transition-colors shadow-sm ${
                            isLocked ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#FF385C] hover:bg-[#E31C5F]'
                        }`}
                    >
                        {isLocked ? 'Mở khóa' : 'Khóa listing'}
                    </button>
                    <Link
                        href="/admin/listings"
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors"
                    >
                        Danh sách
                    </Link>
                </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Giá/đêm</p>
                    <p className="text-lg font-bold text-[#FF385C] mt-1">{formatCurrency(listing.giaMoiKhach)}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sức chứa</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{listing.soKhachToiDa ?? '—'} khách</p>
                    <p className="text-xs text-gray-400 mt-0.5">{listing.soPhongNgu ?? 0} PN · {listing.soGiuong ?? 0} giường · {listing.soPhongTam ?? 0} PT</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Đặt tối thiểu</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{listing.soDemToiThieu ?? '—'} đêm</p>
                    {listing.giaDatToiThieu != null && (
                        <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(listing.giaDatToiThieu)}</p>
                    )}
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phí vệ sinh</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">
                        {listing.phiVeSinh ? formatCurrency(listing.phiVeSinh) : 'Miễn phí'}
                    </p>
                </div>
            </div>

            {/* Gallery */}
            <div className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-6 ${isLocked ? 'opacity-90' : ''}`}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-1 h-[280px] md:h-[360px]">
                    <button
                        type="button"
                        onClick={() => mainImage && openLightbox(mainImage)}
                        className={`md:col-span-2 md:row-span-2 relative bg-gray-100 group cursor-pointer ${isLocked ? 'grayscale' : ''}`}
                        disabled={!mainImage}
                    >
                        {mainImage ? (
                            <>
                                <Image src={getValidSrc(mainImage)} alt={listing.tieuDe || 'Listing'} fill className="object-cover" sizes="50vw" priority />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <span className="px-3 py-1.5 bg-white/90 rounded-lg text-xs font-bold text-gray-900 shadow">Xem ảnh</span>
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-sm font-medium">Chưa có hình ảnh</span>
                            </div>
                        )}
                    </button>
                    {[0, 1, 2, 3].map(i => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => secondaryImages[i] && openLightbox(secondaryImages[i])}
                            disabled={!secondaryImages[i]}
                            className={`hidden md:block relative bg-gray-100 group cursor-pointer ${isLocked ? 'grayscale' : ''} ${!secondaryImages[i] ? 'cursor-default' : ''}`}
                        >
                            {secondaryImages[i] ? (
                                <>
                                    <Image src={getValidSrc(secondaryImages[i])} alt="" fill className="object-cover" sizes="25vw" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                </>
                            ) : null}
                        </button>
                    ))}
                </div>
                {galleryImages.length > 0 && (
                    <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs text-gray-400">{galleryImages.length} ảnh</span>
                        <button
                            type="button"
                            onClick={() => openLightbox(mainImage || galleryImages[0])}
                            className="text-xs font-bold text-[#FF385C] hover:underline"
                        >
                            Xem tất cả ảnh →
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_min(100%,380px)] gap-6 lg:gap-8 items-start">
                {/* Left: scrollable content */}
                <div className="min-w-0 space-y-6">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Mô tả</h2>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                            {listing.moTa || <span className="text-gray-400 italic">Chưa có mô tả</span>}
                        </p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Tiện nghi</h2>
                        {(() => {
                            // 1) Ưu tiên tienNghiItems (structured từ DB)
                            if (listing.tienNghiItems?.length > 0) {
                                return (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {listing.tienNghiItems.map((tn: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-2.5 text-sm text-gray-600 py-1.5">
                                                <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </span>
                                                <span>{tn.ten}</span>
                                            </div>
                                        ))}
                                    </div>
                                );
                            }
                            // 2) Fallback: parse JSON tienNghi string
                            try {
                                if (listing.tienNghi) {
                                    let parsed = JSON.parse(listing.tienNghi);
                                    if (parsed.amenities) parsed = parsed.amenities;
                                    const groups: Record<string, string[]> = typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : { 'Tiện nghi': Array.isArray(parsed) ? parsed : [] };
                                    const hasItems = Object.values(groups).some(v => Array.isArray(v) && v.length > 0);
                                    if (hasItems) {
                                        return (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {Object.entries(groups).flatMap(([cat, items]) =>
                                                    Array.isArray(items) ? items.map((item: string, idx: number) => (
                                                        <div key={`${cat}-${idx}`} className="flex items-center gap-2.5 text-sm text-gray-600 py-1.5">
                                                            <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            </span>
                                                            <span>{item}</span>
                                                        </div>
                                                    )) : []
                                                )}
                                            </div>
                                        );
                                    }
                                }
                            } catch {}
                            return <p className="text-sm text-gray-400 italic">Chưa có thông tin tiện nghi</p>;
                        })()}
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-gray-100">
                            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Vị trí</h2>
                        </div>
                        <div className="h-80">
                            <ProductMap
                                viDo={listing.viDo ?? null}
                                kinhDo={listing.kinhDo ?? null}
                                title={listing.tieuDe}
                                address={listing.diaChiDayDu || locationLine}
                            />
                        </div>
                        <div className="px-5 py-3 border-t border-gray-100">
                            {listing.diaChiDayDu && (
                                <p className="text-sm font-medium text-gray-900">{listing.diaChiDayDu}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-0.5">{locationLine || '—'}</p>
                        </div>
                    </div>
                </div>

                {/* Right: sticky sidebar — cố định khi scroll nội dung bên trái */}
                <aside className="w-full admin-sticky-sidebar space-y-4">
                        {/* Host card */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                            <div className="flex items-center justify-between gap-2 mb-4">
                                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Chủ nhà</h2>
                                {listing.hostInfo?.maNguoiDung && (
                                    <Link href={adminUserProfileHref(listing.hostInfo.maNguoiDung)} className="hover:opacity-80">
                                        <IdBadge id={listing.hostInfo.maNguoiDung} label="User" />
                                    </Link>
                                )}
                            </div>
                            {listing.hostInfo ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-200 shrink-0 border border-gray-100">
                                            {listing.hostInfo.avatarUrl ? (
                                                <Image src={getValidSrc(listing.hostInfo.avatarUrl)} alt={listing.hostInfo.hoTen || 'Host'} fill className="object-cover" sizes="48px" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">
                                                    {(listing.hostInfo.hoTen || 'H').charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-sm font-semibold text-gray-900 truncate">
                                                    {listing.hostInfo.hoTen || 'Chưa cập nhật'}
                                                </p>
                                                {listing.hostInfo.xacMinhDanhTinh && <VerifiedBadge />}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {listing.hostInfo.soNamKinhNghiem
                                                    ? `${listing.hostInfo.soNamKinhNghiem} năm kinh nghiệm`
                                                    : 'Chủ nhà mới'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-0">
                                        {listing.hostInfo.email && <InfoRow label="Email" value={listing.hostInfo.email} />}
                                        {listing.hostInfo.thanhPho && <InfoRow label="Thành phố" value={listing.hostInfo.thanhPho} />}
                                        {listing.hostInfo.congViec && <InfoRow label="Nghề nghiệp" value={listing.hostInfo.congViec} />}
                                        {listing.hostInfo.diemDanhGia != null && (
                                            <InfoRow label="Đánh giá host" value={`★ ${Number(listing.hostInfo.diemDanhGia).toFixed(1)} (${listing.hostInfo.soLuongDanhGia ?? 0})`} />
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 italic">Không có thông tin chủ nhà</p>
                            )}
                        </div>

                        {/* Pricing */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                            <div className="flex items-center justify-between gap-2 mb-4">
                                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Chi tiết giá</h2>
                                <IdBadge id={listing.maPhong} label="Listing" />
                            </div>
                            <InfoRow label="Giá/đêm" value={<span className="text-[#FF385C] font-bold">{formatCurrency(listing.giaMoiKhach)}</span>} />
                            <InfoRow label="Phí vệ sinh" value={listing.phiVeSinh ? formatCurrency(listing.phiVeSinh) : 'Miễn phí'} />
                            <InfoRow label="Đặt tối thiểu" value={listing.giaDatToiThieu ? formatCurrency(listing.giaDatToiThieu) : '—'} />
                            <InfoRow label="Đêm tối thiểu" value={`${listing.soDemToiThieu ?? '—'} đêm`} />
                            <InfoRow label="Loại listing" value={TYPE_LABELS[listing.loaiPhong] || listing.loaiPhong || '—'} />
                            <InfoRow label="Trạng thái" value={
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${statusMeta.className}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                                    {statusMeta.label}
                                </span>
                            } />
                        </div>

                    <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                        <p className="text-xs text-gray-400 text-center">
                            Chế độ xem quản trị viên
                        </p>
                    </div>
                </aside>
            </div>

            {lightboxIndex !== null && galleryImages.length > 0 && (
                <ImageLightbox
                    images={galleryImages}
                    index={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                    onChange={setLightboxIndex}
                />
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                isDangerous={confirmModal.confirmColor === 'red'}
            />
        </div>
    );
}
