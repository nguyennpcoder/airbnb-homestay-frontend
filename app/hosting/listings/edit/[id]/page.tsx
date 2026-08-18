'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { hostAPI, chinhSachHuyAPI, Phong, adminAmenityAPI, type NhomTienNghi, type DanhMucTienNghi } from '@/lib/api';
import { getValidSrc } from '@/lib/image';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';

const LocationMapPicker = dynamic(
    () => import('@/components/hosting/LocationMapPicker'),
    { ssr: false, loading: () => <div className="h-64 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse" /> }
);
const CountryCityPicker = dynamic(
    () => import('@/components/hosting/CountryCityPicker'),
    { ssr: false }
);

// Amenity groups loaded dynamically from API

export default function EditListingPage() {
    const router = useRouter();
    const { id: listingId } = useParams();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [product, setProduct] = useState<Phong | null>(null);
    const [currentStep, setCurrentStep] = useState(0);

    // Form fields
    const [loaiPhong, setLoaiPhong] = useState('noi_luu_tru');
    const [loaiBatDongSan, setLoaiBatDongSan] = useState('');
    const [tieuDe, setTieuDe] = useState('');
    const [moTa, setMoTa] = useState('');
    const [thanhPho, setThanhPho] = useState('');
    const [quocGia, setQuocGia] = useState('Việt Nam');
    const [diaChiDayDu, setDiaChiDayDu] = useState('');
    const [quanHuyen, setQuanHuyen] = useState('');
    const [phuongXa, setPhuongXa] = useState('');

    // Room config
    const [soKhachToiDa, setSoKhachToiDa] = useState(1);
    const [soPhongNgu, setSoPhongNgu] = useState(1);
    const [soGiuong, setSoGiuong] = useState(1);
    const [soPhongTam, setSoPhongTam] = useState(1);

    // Pricing
    const [giaMoiKhach, setGiaMoiKhach] = useState<number>(0);
    const [phiVeSinh, setPhiVeSinh] = useState(0);

    // Amenities
    const [amenityGroups, setAmenityGroups] = useState<NhomTienNghi[]>([]);
    const [amenityCatalogs, setAmenityCatalogs] = useState<DanhMucTienNghi[]>([]);
    const [selectedAmenities, setSelectedAmenities] = useState<number[]>([]);

    // Images
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [existingImages, setExistingImages] = useState<{ maHinhAnh: number; urlHinhAnh: string; laAnhChinh: boolean }[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [newCoverIndex, setNewCoverIndex] = useState(0);

    // Location
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);

    // Policies
    const [chinhSachHuy, setChinhSachHuy] = useState<'LINH_HOAT' | 'TRUNG_BINH' | 'NGHIEM_NGAT'>('LINH_HOAT');
    const [cancellationPolicies, setCancellationPolicies] = useState<import('@/lib/api').ChinhSachHoanTien[]>([]);
    const [passPhong, setPassPhong] = useState('');

    useEffect(() => {
        const fetchListing = async () => {
            try {
                if (!listingId) return;
                const data: Phong = await hostAPI.getListingById(Number(listingId), Number(localStorage.getItem('userId')));
                setProduct(data);

                // Fill form fields
                setLoaiPhong(data.loaiPhong || 'noi_luu_tru');
                setLoaiBatDongSan(data.loaiBatDongSan || '');
                setTieuDe(data.tieuDe || '');
                setMoTa(data.moTa || '');
                setThanhPho(data.thanhPho || '');
                setQuocGia(data.quocGia || 'Việt Nam');
                setDiaChiDayDu(data.diaChiDayDu || '');
                setQuanHuyen(data.quanHuyen || '');
                setPhuongXa(data.phuongXa || '');
                setSoKhachToiDa(data.soKhachToiDa || 1);
                setSoPhongNgu(data.soPhongNgu || 1);
                setSoGiuong(data.soGiuong || 1);
                setSoPhongTam(data.soPhongTam || 1);
                setGiaMoiKhach(data.giaMoiKhach || 0);
                setPhiVeSinh(data.phiVeSinh || 0);
                setLatitude(data.viDo ?? null);
                setLongitude(data.kinhDo ?? null);
                setChinhSachHuy(data.chinhSachHuy || 'LINH_HOAT');
                setPassPhong(data.passPhong || '');

                // Parse amenities - store labels to match against catalogs later
                const amenityLabels: string[] = [];
                try {
                    if (data.tienNghi) {
                        const parsed = JSON.parse(data.tienNghi);
                        if (!Array.isArray(parsed) && typeof parsed === 'object') {
                            Object.values(parsed).forEach((items: any) => {
                                if (Array.isArray(items)) {
                                    items.forEach((label: string) => amenityLabels.push(label));
                                }
                            });
                        } else if (Array.isArray(parsed)) {
                            amenityLabels.push(...parsed);
                        }
                    }
                } catch (e) {
                    if (data.tienNghi) amenityLabels.push(...data.tienNghi.split(',').map(s => s.trim()));
                }
                // Store labels for matching after catalogs load
                (window as any).__pendingAmenityLabels = amenityLabels;

                // Load existing images
                if (data.hinhAnhs && data.hinhAnhs.length > 0) {
                    setExistingImages(data.hinhAnhs.map(img => ({
                        maHinhAnh: img.maHinhAnh,
                        urlHinhAnh: img.urlHinhAnh,
                        laAnhChinh: img.laAnhChinh
                    })));
                }

                setLoading(false);
            } catch (error) {
                console.error('Failed to fetch listing:', error);
                toast.error('Không thể tải thông tin bài đăng');
                router.push('/hosting/listings');
            }
        };

        fetchListing();
    }, [listingId, router]);

    // Fetch amenities from API
    useEffect(() => {
        const fetchAmenities = async () => {
            try {
                const hostId = Number(localStorage.getItem('userId'));
                if (!hostId) return;
                const [groups, catalogs] = await Promise.all([
                    adminAmenityAPI.getGroups(hostId),
                    adminAmenityAPI.getActiveCatalogs(hostId),
                ]);
                setAmenityGroups(groups);
                setAmenityCatalogs(catalogs);
            } catch {
                console.error('Failed to fetch amenities');
            }
        };
        fetchAmenities();
    }, []);

    // Fetch cancellation policies from API
    useEffect(() => {
        const fetchPolicies = async () => {
            try {
                const policies = await chinhSachHuyAPI.list();
                if (policies.length > 0) {
                    setCancellationPolicies(policies);
                }
            } catch {
                console.error('Failed to fetch cancellation policies');
            }
        };
        fetchPolicies();
    }, []);

    // Match pending amenity labels to catalog IDs after catalogs load
    useEffect(() => {
        const pendingLabels = (window as any).__pendingAmenityLabels;
        if (pendingLabels && amenityCatalogs.length > 0) {
            const matchedIds = pendingLabels
                .map((label: string) => {
                    const cat = amenityCatalogs.find(c => c.ten === label);
                    return cat?.maTienNghi;
                })
                .filter((id: number | undefined) => id !== undefined);
            setSelectedAmenities(matchedIds);
            delete (window as any).__pendingAmenityLabels;
        }
    }, [amenityCatalogs]);

    // Cleanup blob URLs only on unmount
    useEffect(() => {
        return () => {
            setImagePreviews(prev => {
                prev.forEach(url => URL.revokeObjectURL(url));
                return [];
            });
        };
    }, []);

    const handleAddImages = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        const newPreviews = files.map(f => URL.createObjectURL(f));
        setImageFiles(prev => [...prev, ...files]);
        setImagePreviews(prev => [...prev, ...newPreviews]);
        e.target.value = '';
    }, []);

    const handleRemoveImage = useCallback((index: number) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => {
            URL.revokeObjectURL(prev[index]);
            return prev.filter((_, i) => i !== index);
        });
        setNewCoverIndex(prev => {
            if (index === prev) return 0;
            if (index < prev) return prev - 1;
            return prev;
        });
    }, []);

    const handleDeleteExistingImage = async (maHinhAnh: number) => {
        try {
            // The backend handles:
            // 1. Physical file cleanup from disk
            // 2. Cover image fallback if deleted image was the cover
            // 3. Returns wasCover + newCoverUrl so frontend can sync
            const res = await hostAPI.deleteImage(maHinhAnh);
            if (res.wasCover) {
                // If the deleted image was the cover, refresh from backend to get updated state
                const refreshedImages = await hostAPI.getImages(Number(listingId));
                setExistingImages(refreshedImages.map((img: any) => ({
                    maHinhAnh: img.maHinhAnh,
                    urlHinhAnh: img.urlHinhAnh,
                    laAnhChinh: img.laAnhChinh,
                })));
            } else {
                setExistingImages(prev => prev.filter(img => img.maHinhAnh !== maHinhAnh));
            }
            toast.success('Đã xóa ảnh');
        } catch {
            toast.error('Không thể xóa ảnh');
        }
    };

    const handleSetMainImage = async (maHinhAnh: number, url: string) => {
        try {
            // Use the dedicated set-main endpoint which handles both:
            // 1. Updating hinh_anh.la_anh_chinh flags on all images
            // 2. Updating phong.url_anh_chinh (cover image)
            await hostAPI.setMainImage(maHinhAnh);
            // Refresh the image list from backend for consistency
            const images = await hostAPI.getImages(Number(listingId));
            setExistingImages(images.map((img: any) => ({
                maHinhAnh: img.maHinhAnh,
                urlHinhAnh: img.urlHinhAnh,
                laAnhChinh: img.laAnhChinh,
            })));
            toast.success('Đã thiết lập ảnh chính');
        } catch {
            toast.error('Không thể cập nhật ảnh chính');
        }
    };

    const toggleAmenity = (id: number) => {
        setSelectedAmenities(prev =>
            prev.includes(id)
                ? prev.filter(v => v !== id)
                : [...prev, id]
        );
    };

    const validateStep = (step: number): boolean => {
        switch (step) {
            case 0: return true;
            case 1: return thanhPho.trim().length > 0 && diaChiDayDu.trim().length > 0;
            case 2: return true;
            case 3: return tieuDe.trim().length > 0;
            case 4: return giaMoiKhach > 0;
            default: return true;
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            // Build amenities JSON from selected IDs
            const categorized: Record<string, string[]> = {};
            const selectedCatalogs = amenityCatalogs.filter(c => selectedAmenities.includes(c.maTienNghi));
            selectedCatalogs.forEach(cat => {
                const catGroupId = (cat as any).nhom?.maNhomTienNghi || (cat as any).maNhomTienNghi;
                const groupName = amenityGroups.find(g => g.maNhomTienNghi === catGroupId)?.tenNhom || 'Khác';
                if (!categorized[groupName]) categorized[groupName] = [];
                categorized[groupName].push(cat.ten);
            });

            const payload: any = {
                loaiPhong,
                loaiBatDongSan,
                tieuDe,
                moTa,
                thanhPho,
                quocGia,
                diaChiDayDu,
                quanHuyen,
                phuongXa,
                soKhachToiDa,
                soPhongNgu,
                soGiuong,
                soPhongTam,
                giaMoiKhach,
                phiVeSinh,
                chinhSachHuy,
                passPhong: passPhong || undefined,
                tienNghi: JSON.stringify(categorized),
                urlAnhChinh: imageFiles.length > 0 ? 'FILE_SELECTED' : existingImages.find(i => i.laAnhChinh)?.urlHinhAnh || '',
                viDo: latitude,
                kinhDo: longitude,
            };

            const updated = await hostAPI.updateListing(Number(listingId), payload);

            // Upload new images
            setIsUploading(true);
            if (imageFiles.length > 0) {
                const existingCount = existingImages.length;
                let uploadSuccess = 0;
                let uploadFail = 0;
                toast.loading(`Đang tải lên ${imageFiles.length} ảnh…`, { id: 'upload-images' });
                for (let i = 0; i < imageFiles.length; i++) {
                    try {
                        const isCover = i === newCoverIndex && (existingImages.length === 0 || !existingImages.some(img => img.laAnhChinh));
                        await hostAPI.uploadImage(Number(listingId), imageFiles[i], existingCount + i, isCover);
                        uploadSuccess++;
                    } catch (err: any) {
                        uploadFail++;
                        console.error(`Upload failed for ${imageFiles[i].name}:`, err);
                    }
                }
                toast.dismiss('upload-images');
                if (uploadFail > 0 && uploadSuccess === 0) {
                    toast.error(`Không thể tải lên ${uploadFail} ảnh.`);
                } else if (uploadFail > 0) {
                    toast.success(`${uploadSuccess} ảnh đã tải lên, ${uploadFail} ảnh thất bại.`);
                }
            }
            toast.success('Cập nhật bài đăng thành công!');
            router.push(`/hosting/listings/${listingId}`);
        } catch (error) {
            console.error('Update failed:', error);
            toast.error('Có lỗi xảy ra khi cập nhật. Vui lòng thử lại sau.');
        } finally {
            setSubmitting(false);
        }
    };

    const steps = [
        {
            title: 'Loại hình',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            ),
        },
        {
            title: 'Vị trí & Bản đồ',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
        },
        {
            title: 'Phòng & Tiện ích',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
            ),
        },
        {
            title: 'Giá cả & Chính sách',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
    ];

    if (loading || !product) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C]" />
            </div>
        );
    }

    return (
        <div className="admin-container admin-page-content relative admin-page-enter">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div>
                    <button
                        onClick={() => router.push(`/hosting/listings/${listingId}`)}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors mb-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth={2} /></svg>
                        Xem bản xem trước
                    </button>
                    {/* <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Chỉnh sửa bài đăng</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Cập nhật thông tin cho {product.tieuDe}</p> */}
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => router.push(`/hosting/listings/${listingId}`)}
                        className="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#333] rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                        Hủy bỏ
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-black dark:bg-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        {submitting ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white dark:border-gray-900" />
                                Đang lưu...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth={2} /></svg>
                                Lưu thay đổi
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                {steps.map((step, idx) => {
                    const isActive = currentStep === idx;
                    const isPast = idx < currentStep;
                    return (
                        <button
                            key={idx}
                            onClick={() => {
                                if (idx <= currentStep || validateStep(currentStep)) {
                                    setCurrentStep(idx);
                                }
                            }}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                                isActive
                                    ? 'bg-[#FF385C] text-white shadow-sm'
                                    : isPast
                                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                                        : 'bg-white dark:bg-[#1e1e1e] text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-[#333]'
                            }`}
                        >
                            {isPast ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth={2} /></svg>
                            ) : (
                                step.icon
                            )}
                            <span className="hidden sm:inline">{step.title}</span>
                            {idx < steps.length - 1 && (
                                <svg className="w-4 h-4 ml-1 hidden lg:block text-gray-300 dark:text-[#444]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth={2} /></svg>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="admin-panel shadow-sm">
                {/* Step 0: Listing Type */}
                {currentStep === 0 && (
                    <div className="p-6 md:p-8 space-y-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Loại hình & Nội dung</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Điều chỉnh thông tin cơ bản của bài đăng.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                                { value: 'noi_luu_tru', label: 'Nơi lưu trú', desc: 'Căn hộ, nhà, villa...', icon: '🏠' },
                                { value: 'trai_nghiem', label: 'Trải nghiệm', desc: 'Tour, hoạt động...', icon: '⛵' },
                                { value: 'dich_vu', label: 'Dịch vụ', desc: 'Dịch vụ khác', icon: '✨' },
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setLoaiPhong(opt.value)}
                                    className={`p-6 rounded-xl border-2 text-left transition-all ${
                                        loaiPhong === opt.value
                                            ? 'border-[#FF385C] bg-[#FF385C]/5'
                                            : 'border-gray-100 dark:border-[#333] hover:border-gray-300 dark:hover:border-[#555] bg-white dark:bg-[#1e1e1e]'
                                    }`}
                                >
                                    <span className="text-3xl block mb-3">{opt.icon}</span>
                                    <p className="font-bold text-gray-900 dark:text-gray-100">{opt.label}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{opt.desc}</p>
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tiêu đề bài đăng *</label>
                                <input
                                    type="text"
                                    value={tieuDe}
                                    onChange={e => setTieuDe(e.target.value)}
                                    maxLength={70}
                                    className="admin-field w-full px-4 py-3 text-lg font-semibold"
                                />
                                <p className="text-xs text-gray-400 mt-1 text-right">{tieuDe.length}/70</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tên loại hình chi tiết</label>
                                <input
                                    type="text"
                                    value={loaiBatDongSan}
                                    onChange={e => setLoaiBatDongSan(e.target.value)}
                                    placeholder="Ví dụ: Căn hộ cao cấp, Villa..."
                                    className="admin-field w-full px-4 py-3"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Mô tả chi tiết</label>
                            <textarea
                                value={moTa}
                                onChange={e => setMoTa(e.target.value)}
                                rows={6}
                                className="admin-field w-full px-4 py-3 resize-none"
                            />
                        </div>

                        {/* Image Management */}
                        <div className="border-t border-gray-100 dark:border-[#2a2a2a] pt-6">
                            <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">Hình ảnh bài đăng</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Quản lý hình ảnh cho bài đăng của bạn.</p>

                            {/* Existing Images */}
                            {existingImages.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                                    {existingImages.map((img) => (
                                        <div key={img.maHinhAnh} className="relative aspect-[4/3] rounded-xl overflow-hidden border border-gray-200 dark:border-[#333] group">
                                            <img src={getValidSrc(img.urlHinhAnh)} alt="Listing" className="w-full h-full object-cover" />
                                            {img.laAnhChinh && (
                                                <span className="absolute top-2 left-2 bg-[#FF385C] text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                                                    Ảnh bìa
                                                </span>
                                            )}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                {!img.laAnhChinh && (
                                                    <button type="button" onClick={() => handleSetMainImage(img.maHinhAnh, img.urlHinhAnh)}
                                                        className="w-8 h-8 rounded-full bg-white text-gray-900 flex items-center justify-center hover:bg-[#FF385C] hover:text-white transition-colors shadow-sm" title="Đặt làm ảnh chính">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                                                    </button>
                                                )}
                                                <button type="button" onClick={() => handleDeleteExistingImage(img.maHinhAnh)}
                                                    className="w-8 h-8 rounded-full bg-white text-gray-900 flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors shadow-sm" title="Xóa ảnh">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2} /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* New Image Previews */}
                            {imagePreviews.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                                    {imagePreviews.map((preview, index) => (
                                        <div key={`new-${index}`} className="relative aspect-[4/3] rounded-xl overflow-hidden border-2 border-dashed border-[#FF385C]/50 group">
                                            <img src={preview} alt={`New ${index + 1}`} className="w-full h-full object-cover" />
                                            {index === newCoverIndex && (
                                                <span className="absolute top-2 left-2 bg-[#FF385C] text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                                                    Ảnh bìa
                                                </span>
                                            )}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                {index !== newCoverIndex && (
                                                    <button type="button" onClick={() => setNewCoverIndex(index)}
                                                        className="w-8 h-8 rounded-full bg-white text-gray-900 flex items-center justify-center hover:bg-[#FF385C] hover:text-white transition-colors shadow-sm" title="Đặt làm ảnh bìa">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                                                    </button>
                                                )}
                                                <button type="button" onClick={() => handleRemoveImage(index)}
                                                    className="w-8 h-8 rounded-full bg-white text-gray-900 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors shadow-sm" title="Xóa ảnh">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2} /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Upload Button */}
                            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-all border-gray-200 dark:border-[#333] hover:border-[#FF385C] dark:hover:border-[#FF385C] bg-gray-50 dark:bg-white/5">
                                <div className="flex flex-col items-center justify-center pt-4 pb-4">
                                    <svg className="w-6 h-6 mb-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeWidth={2} /></svg>
                                    <p className="text-sm font-medium text-gray-500">Thêm ảnh mới</p>
                                    <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WEBP</p>
                                </div>
                                <input type="file" accept="image/*" multiple onChange={handleAddImages} className="hidden" />
                            </label>
                        </div>
                    </div>
                )}

                {/* Step 1: Location & Map */}
                {currentStep === 1 && (
                    <div className="p-6 md:p-8 space-y-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Địa chỉ & Bản đồ</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Cập nhật vị trí chỗ ở của bạn.</p>
                        </div>

                        <CountryCityPicker
                            country={quocGia}
                            city={thanhPho}
                            onCountryChange={setQuocGia}
                            onCityChange={setThanhPho}
                            required
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Quận / Huyện</label>
                                <input type="text" value={quanHuyen} onChange={e => setQuanHuyen(e.target.value)} className="admin-field w-full px-4 py-3" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Phường / Xã</label>
                                <input type="text" value={phuongXa} onChange={e => setPhuongXa(e.target.value)} className="admin-field w-full px-4 py-3" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Địa chỉ cụ thể *</label>
                            <textarea value={diaChiDayDu} onChange={e => setDiaChiDayDu(e.target.value)} rows={3} className="admin-field w-full px-4 py-3 resize-none" />
                        </div>

                        <div className="border-t border-gray-100 dark:border-[#2a2a2a] pt-6">
                            <LocationMapPicker
                                latitude={latitude}
                                longitude={longitude}
                                onChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }}
                                address={diaChiDayDu}
                            />
                        </div>
                    </div>
                )}

                {/* Step 2: Room Config & Amenities */}
                {currentStep === 2 && (
                    <div className="p-6 md:p-8 space-y-8">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Thông số phòng & Tiện ích</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Điều chỉnh thông số phòng và tiện ích.</p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { key: 'soKhachToiDa', label: 'Khách tối đa', icon: '👥', value: soKhachToiDa, setter: setSoKhachToiDa, min: 1 },
                                { key: 'soPhongNgu', label: 'Phòng ngủ', icon: '🛏️', value: soPhongNgu, setter: setSoPhongNgu, min: 1 },
                                { key: 'soGiuong', label: 'Số giường', icon: '🛌', value: soGiuong, setter: setSoGiuong, min: 1 },
                                { key: 'soPhongTam', label: 'Phòng tắm', icon: '🚿', value: soPhongTam, setter: setSoPhongTam, min: 1, step: 0.5 },
                            ].map(item => (
                                <div key={item.key} className="admin-stat-card !p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-lg">{item.icon}</span>
                                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{item.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button type="button" onClick={() => item.setter(Math.max(item.min, item.value - (item.step || 1)))}
                                            className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 12H4" strokeWidth={2} /></svg>
                                        </button>
                                        <span className="flex-1 text-center text-lg font-bold text-gray-900 dark:text-gray-100">{item.value}</span>
                                        <button type="button" onClick={() => item.setter(item.value + (item.step || 1))}
                                            className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth={2} /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-gray-100 dark:border-[#2a2a2a] pt-6">
                            <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">Tiện ích cung cấp</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Chọn những tiện ích có sẵn tại chỗ ở của bạn</p>
                            <div className="space-y-8">
                                {amenityGroups.filter(g => g.hoatDong).map(group => {
                                    const groupCatalogs = amenityCatalogs.filter(c => (c.maNhomTienNghi ?? c.nhom?.maNhomTienNghi) === group.maNhomTienNghi && c.hoatDong);
                                    if (groupCatalogs.length === 0) return null;
                                    return (
                                        <div key={group.maNhomTienNghi}>
                                            <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">{group.tenNhom}</h5>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                                {groupCatalogs.map(cat => (
                                                    <button key={cat.maTienNghi} type="button" onClick={() => toggleAmenity(cat.maTienNghi)}
                                                        className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-all text-left ${
                                                            selectedAmenities.includes(cat.maTienNghi)
                                                                ? 'border-[#FF385C] bg-[#FF385C]/5 dark:bg-[#FF385C]/10 text-[#FF385C] dark:text-[#FF385C]'
                                                                : 'border-gray-200 dark:border-[#333] bg-white dark:bg-[#1e1e1e] text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-[#555]'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {selectedAmenities.includes(cat.maTienNghi) && (
                                                                <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                            )}
                                                            {cat.ten}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Pricing & Policies */}
                {currentStep === 3 && (
                    <div className="p-6 md:p-8 space-y-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Giá cả & Chính sách hủy</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Điều chỉnh giá và chính sách đặt phòng.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Giá mỗi đêm (VND) *</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-gray-400">₫</span>
                                    <input type="text" value={giaMoiKhach > 0 ? giaMoiKhach.toLocaleString('vi-VN') : ''}
                                        onChange={e => { const raw = e.target.value.replace(/[^\d]/g, ''); setGiaMoiKhach(raw ? Number(raw) : 0); }}
                                        className="admin-field w-full px-4 py-3 pl-10 text-2xl font-bold" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Phí vệ sinh</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">₫</span>
                                        <input type="text" value={phiVeSinh > 0 ? phiVeSinh.toLocaleString('vi-VN') : ''}
                                            onChange={e => { const raw = e.target.value.replace(/[^\d]/g, ''); setPhiVeSinh(raw ? Number(raw) : 0); }}
                                            className="admin-field w-full px-4 py-3 pl-10" />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4 mt-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Mật mã phòng (Pass)</label>
                                    <input
                                        type="text"
                                        value={passPhong}
                                        onChange={e => setPassPhong(e.target.value)}
                                        placeholder="VD: 123456"
                                        maxLength={20}
                                        className="admin-field w-full px-4 py-3"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Mã 6 số để khách check-in tự động. Để trống nếu không cần.</p>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-100 dark:border-[#2a2a2a] pt-6">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Chính sách hủy</label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {cancellationPolicies.length > 0 ? cancellationPolicies.map(opt => (
                                    <button key={opt.ma} type="button" onClick={() => setChinhSachHuy(opt.ma as 'LINH_HOAT' | 'TRUNG_BINH' | 'NGHIEM_NGAT')}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                                            chinhSachHuy === opt.ma ? (opt.ma === 'LINH_HOAT' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : opt.ma === 'TRUNG_BINH' ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10' : 'border-red-500 bg-red-50 dark:bg-red-500/10') : 'border-gray-100 dark:border-[#333] hover:border-gray-300 dark:hover:border-[#555] bg-white dark:bg-[#1e1e1e]'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                                                chinhSachHuy === opt.ma
                                                    ? opt.ma === 'LINH_HOAT' ? 'bg-emerald-500 border-emerald-500' : opt.ma === 'TRUNG_BINH' ? 'bg-amber-500 border-amber-500' : 'bg-red-500 border-red-500'
                                                    : 'border-gray-300'
                                            }`}>
                                                {chinhSachHuy === opt.ma && (
                                                    <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                            </div>
                                            <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">{opt.ten}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 ml-5">{opt.moTa}</p>
                                    </button>
                                )) : (
                                    <p className="text-xs text-gray-400 col-span-3">Đang tải chính sách hủy...</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div className="px-6 md:px-8 py-4 border-t border-gray-100 dark:border-[#2a2a2a] flex items-center justify-between">
                    <div>
                        {currentStep > 0 ? (
                            <button type="button" onClick={() => setCurrentStep(currentStep - 1)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#333] rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth={2} /></svg>
                                Quay lại
                            </button>
                        ) : (
                            <button type="button" onClick={() => router.push(`/hosting/listings/${listingId}`)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                                Hủy bỏ
                            </button>
                        )}
                    </div>
                    <div>
                        {currentStep < steps.length - 1 ? (
                            <button type="button" onClick={() => { setCurrentStep(currentStep + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-black dark:bg-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm"
                            >
                                Tiếp theo
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth={2} /></svg>
                            </button>
                        ) : (
                            <button type="button" onClick={handleSubmit} disabled={submitting}
                                className="inline-flex items-center gap-2 px-8 py-2.5 text-sm font-semibold text-white bg-[#FF385C] rounded-lg hover:bg-[#E31C5F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                {submitting ? (
                                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Đang lưu...</>
                                ) : (
                                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth={2} /></svg>Lưu thay đổi</>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
