'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { hostAPI, chinhSachHuyAPI, Phong, adminAmenityAPI, type NhomTienNghi, type DanhMucTienNghi } from '@/lib/api';
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

export default function CreateListingPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState<number | null>(null);

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
    const [coverIndex, setCoverIndex] = useState(0);

    // Location
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);

    // Policies
    const [chinhSachHuy, setChinhSachHuy] = useState<'LINH_HOAT' | 'TRUNG_BINH' | 'NGHIEM_NGAT'>('LINH_HOAT');
    const [cancellationPolicies, setCancellationPolicies] = useState<import('@/lib/api').ChinhSachHoanTien[]>([]);
    const [passPhong, setPassPhong] = useState('');

    // Image upload state
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        const id = localStorage.getItem('userId');
        if (id) {
            setUserId(Number(id));
        } else {
            router.push(`/login?callbackUrl=${encodeURIComponent('/hosting/listings/create')}`);
        }
    }, [router]);

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
        setCoverIndex(prev => {
            if (index === prev) return 0;
            if (index < prev) return prev - 1;
            return prev;
        });
    }, []);

    const toggleAmenity = (id: number) => {
        setSelectedAmenities(prev =>
            prev.includes(id)
                ? prev.filter(v => v !== id)
                : [...prev, id]
        );
    };

    const validateStep = (step: number): boolean => {
        switch (step) {
            case 0: return loaiBatDongSan.trim().length > 0;
            case 1: return thanhPho.trim().length > 0 && diaChiDayDu.trim().length > 0;
            case 2: return true; // Room config & amenities - optional
            case 3: return tieuDe.trim().length > 0;
            case 4: return giaMoiKhach > 0;
            default: return true;
        }
    };

    const handleSubmit = async () => {
        if (!userId) {
            toast.error('Vui lòng đăng nhập lại');
            return;
        }

        setLoading(true);
        setIsUploading(true);

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
                maChuNha: userId,
                urlAnhChinh: imageFiles.length > 0 ? 'FILE_SELECTED' : '',
                viDo: latitude,
                kinhDo: longitude,
            };

            toast.loading('Đang tạo bài đăng…', { id: 'create-listing' });
            const newListing = await hostAPI.createListing(payload);

            // Upload multiple images
            let uploadSuccess = 0;
            let uploadFail = 0;
            if (imageFiles.length > 0) {
                toast.loading(`Đang tải lên ${imageFiles.length} ảnh…`, { id: 'upload-images' });
                for (let i = 0; i < imageFiles.length; i++) {
                    try {
                        await hostAPI.uploadImage(newListing.maPhong, imageFiles[i], i, i === coverIndex);
                        uploadSuccess++;
                    } catch (err: any) {
                        uploadFail++;
                        console.error(`Upload failed for ${imageFiles[i].name}:`, err);
                    }
                }
                toast.dismiss('upload-images');
                if (uploadFail > 0 && uploadSuccess > 0) {
                    toast.success(`${uploadSuccess} ảnh đã tải lên, ${uploadFail} ảnh thất bại. Bạn có thể bổ sung sau.`);
                } else if (uploadFail > 0 && uploadSuccess === 0) {
                    toast.error(`Không thể tải lên ${uploadFail} ảnh. Bạn có thể bổ sung sau.`);
                }
            }
            
            toast.dismiss('create-listing');

            toast.success('Tạo mục cho thuê thành công! Phòng sẽ được tự động duyệt trong vài giây.');
            router.push(`/hosting/listings/${newListing.maPhong}`);
        } catch (error) {
            console.error('Create listing failed:', error);
            toast.dismiss('create-listing');
            toast.error('Có lỗi xảy ra khi tạo mục cho thuê');
        } finally {
            setLoading(false);
            setIsUploading(false);
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
            title: 'Hình ảnh & Mô tả',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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

    return (
        <div className="admin-container admin-page-content relative admin-page-enter">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
                {/* <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tạo mục cho thuê</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Thêm chỗ ở mới để bắt đầu kinh doanh</p>
                </div> */}
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
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                step.icon
                            )}
                            <span className="hidden sm:inline">{step.title}</span>
                            {idx < steps.length - 1 && (
                                <svg className="w-4 h-4 ml-1 hidden lg:block text-gray-300 dark:text-[#444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Step Content */}
            <div className="admin-panel shadow-sm">
                {/* Step 0: Listing Type */}
                {currentStep === 0 && (
                    <div className="p-6 md:p-8 space-y-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Chỗ ở của bạn thuộc loại nào?</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Chọn loại hình phản ánh chính xác nhất không gian bạn muốn chia sẻ.</p>
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

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tên loại hình chi tiết</label>
                            <input
                                type="text"
                                value={loaiBatDongSan}
                                onChange={e => setLoaiBatDongSan(e.target.value)}
                                placeholder="Ví dụ: Căn hộ cao cấp, Nhà gỗ ven hồ, Studio..."
                                className="admin-field w-full px-4 py-3"
                            />
                        </div>
                    </div>
                )}

                {/* Step 1: Location & Map */}
                {currentStep === 1 && (
                    <div className="p-6 md:p-8 space-y-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Chỗ ở của bạn nằm ở đâu?</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Địa chỉ chính xác và vị trí trên bản đồ giúp khách hàng tìm thấy bạn dễ dàng hơn.</p>
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
                                <input
                                    type="text"
                                    value={quanHuyen}
                                    onChange={e => setQuanHuyen(e.target.value)}
                                    placeholder="Quận, huyện"
                                    className="admin-field w-full px-4 py-3"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Phường / Xã</label>
                                <input
                                    type="text"
                                    value={phuongXa}
                                    onChange={e => setPhuongXa(e.target.value)}
                                    placeholder="Phường, xã"
                                    className="admin-field w-full px-4 py-3"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Địa chỉ cụ thể *</label>
                            <textarea
                                value={diaChiDayDu}
                                onChange={e => setDiaChiDayDu(e.target.value)}
                                placeholder="Số nhà, tên đường, tên tòa nhà (nếu có)..."
                                rows={3}
                                className="admin-field w-full px-4 py-3 resize-none"
                            />
                        </div>

                        <div className="border-t border-gray-100 dark:border-[#2a2a2a] pt-6">
                            <LocationMapPicker
                                latitude={latitude}
                                longitude={longitude}
                                onChange={(lat, lng) => {
                                    setLatitude(lat);
                                    setLongitude(lng);
                                }}
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
                            <p className="text-sm text-gray-500 dark:text-gray-400">Cho khách biết họ sẽ có những gì tại đây.</p>
                        </div>

                        {/* Room Config */}
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
                                        <button
                                            type="button"
                                            onClick={() => item.setter(Math.max(item.min, item.value - (item.step || 1)))}
                                            className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                            </svg>
                                        </button>
                                        <span className="flex-1 text-center text-lg font-bold text-gray-900 dark:text-gray-100">{item.value}</span>
                                        <button
                                            type="button"
                                            onClick={() => item.setter(item.value + (item.step || 1))}
                                            className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Amenities */}
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
                                                    <button
                                                        key={cat.maTienNghi}
                                                        type="button"
                                                        onClick={() => toggleAmenity(cat.maTienNghi)}
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

                {/* Step 3: Images & Description */}
                {currentStep === 3 && (
                    <div className="p-6 md:p-8 space-y-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Làm cho bài đăng nổi bật</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Tiêu đề hay, mô tả hấp dẫn và nhiều hình ảnh đẹp sẽ thu hút khách hàng hơn.</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tiêu đề bài đăng *</label>
                                    <input
                                        type="text"
                                        value={tieuDe}
                                        onChange={e => setTieuDe(e.target.value)}
                                        placeholder="Ví dụ: Căn hộ hiện đại trung tâm TP.HCM"
                                        maxLength={70}
                                        className="admin-field w-full px-4 py-3 text-lg font-semibold"
                                    />
                                    <p className="text-xs text-gray-400 mt-1 text-right">{tieuDe.length}/70</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Mô tả chi tiết</label>
                                    <textarea
                                        value={moTa}
                                        onChange={e => setMoTa(e.target.value)}
                                        placeholder="Hãy mô tả những điều làm nên sự độc đáo của không gian này. Chỗ ở của bạn có gì đặc biệt? Khu vực xung quanh có gì thú vị?"
                                        rows={10}
                                        className="admin-field w-full px-4 py-3 resize-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Hình ảnh (có thể chọn nhiều)</label>

                                {/* Image Upload Grid */}
                                {imagePreviews.length > 0 && (
                                    <div className="grid grid-cols-2 gap-3">
                                        {imagePreviews.map((preview, index) => (
                                            <div key={index} className="relative aspect-[4/3] rounded-xl overflow-hidden border border-gray-200 dark:border-[#333] group">
                                                <img
                                                    src={preview}
                                                    alt={`Preview ${index + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                                {index === coverIndex && (
                                                    <span className="absolute top-2 left-2 bg-[#FF385C] text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                                                        Ảnh bìa
                                                    </span>
                                                )}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    {index !== coverIndex && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setCoverIndex(index)}
                                                            className="w-8 h-8 rounded-full bg-white text-gray-900 flex items-center justify-center hover:bg-[#FF385C] hover:text-white transition-colors shadow-sm"
                                                            title="Đặt làm ảnh bìa"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveImage(index)}
                                                        className="w-8 h-8 rounded-full bg-white text-gray-900 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors shadow-sm"
                                                        title="Xóa ảnh"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2} /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Upload Button */}
                                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                                    imagePreviews.length > 0
                                        ? 'border-gray-200 dark:border-[#333] hover:border-gray-300 dark:hover:border-[#555] bg-white dark:bg-[#1e1e1e]'
                                        : 'border-gray-200 dark:border-[#333] hover:border-[#FF385C] dark:hover:border-[#FF385C] bg-gray-50 dark:bg-white/5'
                                }`}>
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <svg className="w-8 h-8 mb-2 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                            {imagePreviews.length > 0 ? 'Thêm ảnh khác' : 'Nhấn để chọn ảnh (có thể chọn nhiều)'}
                                        </p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">JPG, PNG, WEBP (tối đa 5MB mỗi ảnh)</p>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleAddImages}
                                        className="hidden"
                                    />
                                </label>

                                <div className="p-4 bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 rounded-xl flex items-start gap-3">
                                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-xs text-blue-700 dark:text-blue-300">
                                        Bài đăng có từ 5 ảnh chất lượng cao thường có tỷ lệ đặt phòng cao hơn 25%. Hover vào ảnh và nhấn biểu tượng ngôi sao để đặt làm ảnh bìa. Nên chụp ảnh ngang, đủ ánh sáng tự nhiên.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Pricing & Policies */}
                {currentStep === 4 && (
                    <div className="p-6 md:p-8 space-y-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Thiết lập giá & Chính sách hủy</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Bạn có toàn quyền kiểm soát giá cả và chính sách đặt phòng.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Giá mỗi đêm (VND) *</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-gray-400">₫</span>
                                    <input
                                        type="text"
                                        value={giaMoiKhach > 0 ? giaMoiKhach.toLocaleString('vi-VN') : ''}
                                        onChange={e => {
                                            const raw = e.target.value.replace(/[^\d]/g, '');
                                            setGiaMoiKhach(raw ? Number(raw) : 0);
                                        }}
                                        placeholder="Nhập giá mỗi đêm"
                                        className="admin-field w-full px-4 py-3 pl-10 text-2xl font-bold"
                                    />
                                </div>
                                {giaMoiKhach > 0 && (
                                    <div className="mt-3 p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-[#333]">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Tổng thu ước tính (30 ngày): <span className="font-bold text-gray-900 dark:text-gray-100">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(giaMoiKhach * 20)}</span>
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">Dựa trên tỷ lệ lấp đầy ước tính ~66%</p>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Phí vệ sinh</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">₫</span>
                                        <input
                                            type="text"
                                            value={phiVeSinh > 0 ? phiVeSinh.toLocaleString('vi-VN') : ''}
                                            onChange={e => {
                                                const raw = e.target.value.replace(/[^\d]/g, '');
                                                setPhiVeSinh(raw ? Number(raw) : 0);
                                            }}
                                            placeholder="0"
                                            className="admin-field w-full px-4 py-3 pl-10"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
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

                        {/* Cancellation Policy */}
                        <div className="border-t border-gray-100 dark:border-[#2a2a2a] pt-6">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Chính sách hủy</label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {cancellationPolicies.length > 0 ? cancellationPolicies.map(opt => (
                                    <button
                                        key={opt.ma}
                                        type="button"
                                        onClick={() => setChinhSachHuy(opt.ma as 'LINH_HOAT' | 'TRUNG_BINH' | 'NGHIEM_NGAT')}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                                            chinhSachHuy === opt.ma
                                                ? opt.ma === 'LINH_HOAT' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : opt.ma === 'TRUNG_BINH' ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10' : 'border-red-500 bg-red-50 dark:bg-red-500/10'
                                                : 'border-gray-100 dark:border-[#333] hover:border-gray-300 dark:hover:border-[#555] bg-white dark:bg-[#1e1e1e]'
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

                {/* Navigation Buttons */}
                <div className="px-6 md:px-8 py-4 border-t border-gray-100 dark:border-[#2a2a2a] flex items-center justify-between">
                    <div>
                        {currentStep > 0 ? (
                            <button
                                type="button"
                                onClick={() => setCurrentStep(currentStep - 1)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#333] rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Quay lại
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => router.push('/hosting/listings')}
                                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                                Hủy bỏ
                            </button>
                        )}
                    </div>

                    <div>
                        {currentStep < steps.length - 1 ? (
                            <button
                                type="button"
                                onClick={() => {
                                    if (validateStep(currentStep)) {
                                        setCurrentStep(currentStep + 1);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    } else {
                                        toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
                                    }
                                }}
                                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-black dark:bg-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm"
                            >
                                Tiếp theo
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading || !validateStep(currentStep)}
                                className="inline-flex items-center gap-2 px-8 py-2.5 text-sm font-semibold text-white bg-[#FF385C] rounded-lg hover:bg-[#E31C5F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                        {isUploading ? 'Đang tải ảnh lên...' : 'Đang tạo...'}
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Hoàn tất & Đăng bài
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
