'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { Phong, ListingImage, Review } from '@/lib/api';
import dynamic from 'next/dynamic';
import ReviewItem from '@/components/ReviewItem';
import { createPortal } from 'react-dom';
import BackendImage from '@/components/BackendImage';
const ProductMap = dynamic(() => import('@/components/ProductMap'), {
    ssr: false,
    loading: () => <div className="w-full h-96 bg-gray-100 animate-pulse rounded-xl" />
});

interface HostListingViewProps {
    product: Phong;
    reviews?: Review[];
    onEdit?: () => void;
}

function formatCurrency(amount?: number | null) {
    if (amount == null) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}

function getMainImage(listing: Phong, images: ListingImage[]) {
    const primary = images.find((h: any) => h.laAnhChinh)?.urlHinhAnh;
    if (primary) return primary;
    if (images.length > 0) return images[0].urlHinhAnh;
    if (listing.urlAnhChinh && listing.urlAnhChinh !== 'FILE_SELECTED') return listing.urlAnhChinh;
    return null;
}

function ImageLightbox({ images, index, onClose, onChange }: {
    images: string[]; index: number; onClose: () => void; onChange: (i: number) => void;
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
        return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
    }, [onClose, goPrev, goNext]);
    if (!mounted) return null;
    return createPortal(
        <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col" onClick={onClose}>
            <div className="flex items-center justify-between px-4 py-3 shrink-0" onClick={e => e.stopPropagation()}>
                <span className="text-white/80 text-sm font-medium">{index + 1} / {total}</span>
                <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            <div className="relative flex-1 flex items-center justify-center px-4 min-h-0" onClick={e => e.stopPropagation()}>
                {total > 1 && (
                    <button type="button" onClick={goPrev} className="absolute left-3 md:left-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                )}
                <div className="relative w-full max-w-5xl h-full max-h-[calc(100vh-10rem)]">
                    <BackendImage src={images[index]} alt={`Ảnh ${index + 1}`} fill className="object-contain" sizes="100vw" priority />
                </div>
                {total > 1 && (
                    <button type="button" onClick={goNext} className="absolute right-3 md:right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                )}
            </div>
            {total > 1 && (
                <div className="shrink-0 px-4 py-3 overflow-x-auto" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-2 justify-center min-w-min mx-auto">
                        {images.map((url, i) => (
                            <button key={i} type="button" onClick={() => onChange(i)}
                                className={`relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${i === index ? 'border-white scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                                <BackendImage src={url} alt="" fill className="object-cover" sizes="64px" />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex justify-between items-start py-3 border-b border-gray-100 dark:border-[#2a2a2a] last:border-0 gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-right">{value}</span>
        </div>
    );
}

export default function HostListingView({ product, reviews = [], onEdit }: HostListingViewProps) {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    const images: ListingImage[] = useMemo(() => {
        if (product.hinhAnhs?.length) {
            return [...product.hinhAnhs]
                .filter(img => img.urlHinhAnh && img.urlHinhAnh !== 'FILE_SELECTED')
                .sort((a, b) => (a.thuTu ?? 0) - (b.thuTu ?? 0));
        }
        if (product.urlAnhChinh && product.urlAnhChinh !== 'FILE_SELECTED') {
            return [{ maHinhAnh: 0, urlHinhAnh: product.urlAnhChinh, laAnhChinh: true }];
        }
        return [];
    }, [product]);

    const galleryImages = useMemo(() => images.map(i => i.urlHinhAnh).filter(Boolean), [images]);

    const amenities = useMemo(() => {
        // Parse tienNghi JSON (primary source - saved by create/edit form)
        try {
            if (product.tienNghi) {
                const parsed = JSON.parse(product.tienNghi);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    const grouped: Record<string, string[]> = {};
                    Object.entries(parsed).forEach(([groupName, items]) => {
                        if (Array.isArray(items) && items.length > 0) {
                            grouped[groupName] = items;
                        }
                    });
                    if (Object.keys(grouped).length > 0) return grouped;
                }
            }
        } catch (e) { }
        // Fallback to tienNghiItems (structured from tien_nghi_phong table)
        if (product.tienNghiItems && product.tienNghiItems.length > 0) {
            const grouped: Record<string, string[]> = {};
            product.tienNghiItems.forEach(item => {
                const nhom = item.nhom || 'Khác';
                if (!grouped[nhom]) grouped[nhom] = [];
                grouped[nhom].push(item.ten);
            });
            if (Object.keys(grouped).length > 0) return grouped;
        }
        return null;
    }, [product]);

    const mainImage = getMainImage(product, images);
    const secondaryImages = galleryImages.filter(url => url !== mainImage).slice(0, 4);
    const locationLine = [product.phuongXa, product.quanHuyen, product.thanhPho, product.quocGia].filter(Boolean).join(', ');

    const statusMeta = product.biKhoa
        ? { label: 'Bị khóa bởi admin', className: 'bg-red-50 text-red-700 border border-red-200', dot: 'bg-red-500' }
        : product.trangThai === 'hoat_dong'
            ? { label: 'Đang hoạt động', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' }
            : product.trangThai === 'khong_hoat_dong'
                ? { label: 'Ngừng hoạt động', className: 'bg-gray-100 text-gray-600 border border-gray-200', dot: 'bg-gray-400' }
                : { label: 'Đang chờ duyệt', className: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-500 animate-pulse' };

    const openLightbox = (url: string) => {
        const idx = galleryImages.indexOf(url);
        setLightboxIndex(idx >= 0 ? idx : 0);
    };

    return (
        <div>
            {/* Quick stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="admin-panel shadow-sm !rounded-xl p-4">
                    <p className="text-xs font-medium admin-muted uppercase tracking-wider">Giá/đêm</p>
                    <p className="text-lg font-bold text-[#FF385C] mt-1">{formatCurrency(product.giaMoiKhach)}</p>
                </div>
                <div className="admin-panel shadow-sm !rounded-xl p-4">
                    <p className="text-xs font-medium admin-muted uppercase tracking-wider">Sức chứa</p>
                    <p className="text-lg font-bold admin-heading mt-1">{product.soKhachToiDa || '—'} khách</p>
                    <p className="text-xs admin-muted mt-0.5">{product.soPhongNgu ?? 0} PN · {product.soGiuong ?? 0} giường · {product.soPhongTam ?? 0} PT</p>
                </div>
                <div className="admin-panel shadow-sm !rounded-xl p-4">
                    <p className="text-xs font-medium admin-muted uppercase tracking-wider">Đặt tối thiểu</p>
                    <p className="text-lg font-bold admin-heading mt-1">{product.soDemToiThieu || '—'} đêm</p>
                </div>
                <div className="admin-panel shadow-sm !rounded-xl p-4">
                    <p className="text-xs font-medium admin-muted uppercase tracking-wider">Phí vệ sinh</p>
                    <p className="text-lg font-bold admin-heading mt-1">{product.phiVeSinh ? formatCurrency(product.phiVeSinh) : 'Miễn phí'}</p>
                </div>
            </div>

            {/* Gallery */}
            <div className="admin-panel shadow-sm overflow-hidden mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-1 h-[280px] md:h-[360px]">
                    <button type="button" onClick={() => mainImage && openLightbox(mainImage)}
                        className={`md:col-span-2 md:row-span-2 relative bg-gray-100 group cursor-pointer ${product.biKhoa ? 'grayscale' : ''}`} disabled={!mainImage}>
                        {mainImage ? (
                            <>
                                <BackendImage src={mainImage} alt={product.tieuDe || 'Listing'} fill className="object-cover" sizes="50vw" priority />
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
                        <button key={i} type="button" onClick={() => secondaryImages[i] && openLightbox(secondaryImages[i])}
                            disabled={!secondaryImages[i]}
                            className={`hidden md:block relative bg-gray-100 group cursor-pointer ${product.biKhoa ? 'grayscale' : ''} ${!secondaryImages[i] ? 'cursor-default' : ''}`}>
                            {secondaryImages[i] ? (
                                <BackendImage src={secondaryImages[i]} alt="" fill className="object-cover" sizes="25vw" />
                            ) : null}
                        </button>
                    ))}
                </div>
                {galleryImages.length > 0 && (
                    <div className="px-4 py-2.5 border-t admin-subtle-border flex items-center justify-between">
                        <span className="text-xs admin-muted">{galleryImages.length} ảnh</span>
                        <button type="button" onClick={() => openLightbox(mainImage || galleryImages[0])}
                            className="text-xs font-bold text-[#FF385C] hover:underline">
                            Xem tất cả ảnh →
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_min(100%,380px)] gap-6 lg:gap-8 items-start">
                {/* Left: content */}
                <div className="min-w-0 space-y-6">
                    {/* Description */}
                    <div className="admin-panel shadow-sm p-5">
                        <h2 className="text-sm font-semibold admin-heading uppercase tracking-wider mb-3">Mô tả</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                            {product.moTa || <span className="text-gray-400 italic">Chưa có mô tả</span>}
                        </p>
                    </div>

                    {/* Amenities */}
                    <div className="admin-panel shadow-sm p-5">
                        <h2 className="text-sm font-semibold admin-heading uppercase tracking-wider mb-3">Tiện nghi</h2>
                        {amenities ? (
                            <div className="space-y-4">
                                {Object.entries(amenities).map(([cat, list]: any) => {
                                    if (!Array.isArray(list) || list.length === 0) return null;
                                    return (
                                        <div key={cat}>
                                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{cat}</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {list.map((item: string, i: number) => (
                                                    <div key={`${cat}-${i}`} className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400 py-1.5">
                                                        <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </span>
                                                        <span>{item}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 italic">Chưa có thông tin tiện nghi</p>
                        )}
                    </div>

                    {/* Map */}
                    <div className="admin-panel shadow-sm overflow-hidden">
                        <div className="px-5 py-3.5 border-b admin-subtle-border">
                            <h2 className="text-sm font-semibold admin-heading uppercase tracking-wider">Vị trí</h2>
                        </div>
                        <div className="h-80">
                            <ProductMap
                                viDo={product.viDo ?? null}
                                kinhDo={product.kinhDo ?? null}
                                title={product.tieuDe}
                                address={product.diaChiDayDu || locationLine}
                            />
                        </div>
                        {product.diaChiDayDu && (
                            <div className="px-5 py-3 border-t admin-subtle-border">
                                <p className="text-sm text-gray-600 dark:text-gray-400">{product.diaChiDayDu}</p>
                                <p className="text-xs admin-muted mt-0.5">{locationLine || '—'}</p>
                            </div>
                        )}
                    </div>

                    {/* Reviews */}
                    <div className="admin-panel shadow-sm p-5">
                        <h2 className="text-sm font-semibold admin-heading uppercase tracking-wider mb-4 flex items-center gap-2">
                            ★ {reviews.length > 0 ? (reviews.reduce((sum: number, r: any) => sum + (r.diemSo || 0), 0) / reviews.length).toFixed(1) : (product.diemTrungBinh?.toFixed(1) || '5.0')} · {reviews.length} đánh giá
                        </h2>
                        {reviews.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {reviews.map(review => (
                                    <ReviewItem key={review.maDanhGia} review={review} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 italic">Chưa có đánh giá nào cho bài đăng này</p>
                        )}
                    </div>
                </div>

                {/* Right: sticky sidebar */}
                <aside className="w-full admin-sticky-sidebar space-y-4">
                    {/* Status Card */}
                    <div className="admin-panel shadow-sm p-5">
                        <div className="flex items-center justify-between gap-2 mb-4">
                            <h2 className="text-sm font-semibold admin-heading uppercase tracking-wider">Trạng thái</h2>
                            <span className="font-mono text-xs font-semibold text-gray-500 bg-gray-50 dark:bg-white/5 px-2.5 py-1 rounded-md border border-gray-200 dark:border-[#333]">
                                #{product.maPhong}
                            </span>
                        </div>
                        <InfoRow label="Trạng thái" value={
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${statusMeta.className}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />{statusMeta.label}
                            </span>
                        } />
                        <InfoRow label="Loại" value={product.loaiBatDongSan || product.loaiPhong?.replace(/_/g, ' ') || '—'} />
                        <InfoRow label="Địa điểm" value={product.thanhPho || '—'} />
                    </div>

                    {/* Pricing Card */}
                    <div className="admin-panel shadow-sm p-5">
                        <h2 className="text-sm font-semibold admin-heading uppercase tracking-wider mb-4">Chi tiết giá</h2>
                        <InfoRow label="Giá/đêm" value={<span className="text-[#FF385C] font-bold">{formatCurrency(product.giaMoiKhach)}</span>} />
                        <InfoRow label="Phí vệ sinh" value={product.phiVeSinh ? formatCurrency(product.phiVeSinh) : 'Miễn phí'} />
                        <InfoRow label="Đêm tối thiểu" value={`${product.soDemToiThieu ?? '—'} đêm`} />
                        {product.passPhong && (
                            <InfoRow label="Pass phòng" value={<span className="font-mono font-bold text-emerald-600">{product.passPhong}</span>} />
                        )}
                    </div>

                    {/* Edit action */}
                    {onEdit && (
                        <button
                            onClick={onEdit}
                            className="w-full py-3 px-5 bg-[#FF385C] hover:bg-[#E31C5F] text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
                        >
                            <svg className="w-4 h-4 inline mr-2 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Chỉnh sửa bài đăng
                        </button>
                    )}
                </aside>
            </div>

            {lightboxIndex !== null && galleryImages.length > 0 && (
                <ImageLightbox images={galleryImages} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onChange={setLightboxIndex} />
            )}
        </div>
    );
}
