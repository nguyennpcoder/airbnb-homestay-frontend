'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { adminAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';

interface Props {
    params: { id: string }
}

export default function EditListingPage({ params }: Props) {
    const router = useRouter();
    const listingId = parseInt(params.id);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Grouping state for UI management
    const [activeSection, setActiveSection] = useState('overview');

    // We don't necessarily need to change Host on edit, but if required we can add it.
    // Usually host transfer is a separate process, so I'll omit host selection for now to keep it simple, 
    // or just display it as read-only.

    const [formData, setFormData] = useState({
        tieuDe: '',
        moTa: '',
        urlAnhChinh: '',
        giaMoiKhach: '',
        soKhachToiDa: 1,
        loaiPhong: 'phong_rieng',
        quocGia: '',
        thanhPho: '',
        quanHuyen: '',
        phuongXa: '',
        diaChiDayDu: '',
        phiVeSinh: '',
        giaDatToiThieu: '',
        soPhongNgu: 1,
        soGiuong: 1,
        soPhongTam: 1,
    });

    const [listingImages, setListingImages] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (listingId) {
            fetchListingDetails();
        }
    }, [listingId]);

    const fetchListingDetails = async () => {
        try {
            const data = await adminAPI.getListingDetails(listingId);
            setFormData({
                tieuDe: data.tieuDe || '',
                moTa: data.moTa || '',
                urlAnhChinh: data.urlAnhChinh || '',
                giaMoiKhach: String(data.giaMoiKhach || ''),
                soKhachToiDa: data.soKhachToiDa || 1,
                loaiPhong: data.loaiPhong || 'phong_rieng',
                quocGia: data.quocGia || '',
                thanhPho: data.thanhPho || '',
                quanHuyen: data.quanHuyen || '',
                phuongXa: data.phuongXa || '',
                diaChiDayDu: data.diaChiDayDu || '',
                phiVeSinh: String(data.phiVeSinh || ''),
                giaDatToiThieu: String(data.giaDatToiThieu || ''),
                soPhongNgu: data.soPhongNgu || 1,
                soGiuong: data.soGiuong || 1,
                soPhongTam: data.soPhongTam || 1,
            });
            if (data.hinhAnhs) {
                setListingImages(data.hinhAnhs);
            }
        } catch (error) {
            console.error('Failed to load listing', error);
            toast.error('Không thể tải thông tin phòng');
            router.push('/admin/listings');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const isManualScroll = useRef(false);

    useEffect(() => {
        const handleScroll = () => {
            if (isManualScroll.current) return;

            const sections = ['overview', 'details', 'pricing', 'location', 'media'];
            const triggerLine = 200; // Point below the headers (80px + 80px + gap) where we check for content

            // Find the current section
            // We look for the first section whose bottom is below the trigger line
            // OR the last section if we're at the bottom

            for (const id of sections) {
                const element = document.getElementById(id);
                if (!element) continue;

                const rect = element.getBoundingClientRect();
                // Check if this section contains the trigger line
                // rect.top <= triggerLine means the section has started (scrolled past line)
                // rect.bottom > triggerLine means the section hasn't finished yet
                if (rect.top <= triggerLine && rect.bottom > triggerLine) {
                    setActiveSection(id);
                    break;
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        // Trigger once on mount to set initial state
        handleScroll();

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleScrollToSection = (id: string) => {
        setActiveSection(id);
        isManualScroll.current = true;
        const element = document.getElementById(id);
        if (element) {
            // Offset for fixed headers (approx 160px)
            const headerOffset = 180;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });

            // Reset manual scroll flag after animation
            setTimeout(() => {
                isManualScroll.current = false;
            }, 1000);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        setUploading(true);
        const files = Array.from(e.target.files);
        let successCount = 0;

        for (const file of files) {
            try {
                await adminAPI.uploadImage(listingId, file);
                successCount++;
            } catch (error) {
                console.error('Upload failed', error);
                toast.error(`Lỗi tải ảnh: ${file.name}`);
            }
        }

        if (successCount > 0) {
            toast.success(`Đã tải lên ${successCount} ảnh`);
            // Refresh details to get new images list
            fetchListingDetails();
        }
        setUploading(false);
        // Reset input
        e.target.value = '';
    };

    const handleDeleteImage = async (imageId: number) => {
        if (!confirm('Bạn có chắc muốn xóa ảnh này?')) return;
        try {
            await adminAPI.deleteImage(imageId);
            setListingImages(prev => prev.filter(img => img.maHinhAnh !== imageId));
            toast.success('Đã xóa ảnh');
        } catch (error) {
            console.error('Delete failed', error);
            toast.error('Xóa ảnh thất bại');
        }
    };

    const handleSetMainImage = (url: string) => {
        setFormData(prev => ({ ...prev, urlAnhChinh: url }));
        toast.success('Đã đặt làm ảnh chính (Cần lưu thay đổi)');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            await adminAPI.updateListing(listingId, {
                ...formData,
                giaMoiKhach: parseFloat(formData.giaMoiKhach) || 0,
                giaDatToiThieu: parseFloat(formData.giaDatToiThieu) || 0,
                phiVeSinh: parseFloat(formData.phiVeSinh) || 0,
                soKhachToiDa: parseInt(String(formData.soKhachToiDa)),
                soPhongNgu: parseInt(String(formData.soPhongNgu)),
                soGiuong: parseInt(String(formData.soGiuong)),
                soPhongTam: parseFloat(String(formData.soPhongTam)),
            });
            toast.success('Cập nhật phòng thành công');
            router.push('/admin/listings');
        } catch (error) {
            console.error('Update listing failed', error);
            toast.error('Có lỗi xảy ra khi cập nhật phòng');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
            </div>
        );
    }

    const sections = [
        { id: 'overview', label: 'Tổng quan' },
        { id: 'details', label: 'Chi tiết phòng' },
        { id: 'pricing', label: 'Định giá & Phí' },
        { id: 'location', label: 'Vị trí' },
        { id: 'media', label: 'Hình ảnh' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 fixed top-20 left-0 right-0 z-40">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/listings" className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </Link>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">Chỉnh sửa phòng</h1>
                            <div className="text-xs text-gray-500">ID: #{listingId}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href={`/admin/listings/${listingId}`} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                            Xem trước
                        </Link>
                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            className="px-6 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-all shadow-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Đang lưu...
                                </>
                            ) : 'Lưu thay đổi'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8 mt-16 flex gap-8 items-start">

                {/* Sidebar Navigation */}
                <div className="w-64 flex-shrink-0 sticky top-40 hidden lg:block">
                    <nav className="space-y-1">
                        {sections.map(section => (
                            <button
                                key={section.id}
                                onClick={() => handleScrollToSection(section.id)}
                                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeSection === section.id
                                    ? 'bg-black text-white'
                                    : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                {section.label}
                            </button>
                        ))}
                    </nav>

                    <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <h4 className="text-sm font-bold text-blue-900 mb-2">Mẹo quản trị viên</h4>
                        <p className="text-xs text-blue-700 leading-relaxed">
                            Cập nhật thông tin chính xác giúp tăng khả năng hiển thị của phòng trên trang chủ và kết quả tìm kiếm.
                        </p>
                    </div>
                </div>

                {/* Main Form Content */}
                <div className="flex-1 space-y-8">

                    {/* Section: Overview */}
                    <div id="overview" className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-8 scroll-mt-40 ${activeSection === 'overview' ? 'ring-2 ring-black ring-offset-2' : ''} transition-all duration-300`}>
                        <div className="mb-6 pb-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">Tổng quan</h2>
                            <p className="text-sm text-gray-500 mt-1">Thông tin cơ bản về chỗ nghỉ</p>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tiêu đề phòng nghỉ <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="tieuDe"
                                    value={formData.tieuDe}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all placeholder:text-gray-300"
                                    placeholder="Ví dụ: Căn hộ cao cấp view Hồ Tây..."
                                />
                                <p className="text-xs text-gray-500 mt-2 text-right">{formData.tieuDe.length}/100 ký tự</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Loại hình</label>
                                    <div className="relative">
                                        <select
                                            name="loaiPhong"
                                            value={formData.loaiPhong}
                                            onChange={handleChange}
                                            className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black appearance-none bg-white"
                                        >
                                            <option value="phong_rieng">Phòng riêng</option>
                                            <option value="nguyen_can">Nguyên căn</option>
                                            <option value="phong_chia_se">Phòng chia sẻ</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả chi tiết</label>
                                <textarea
                                    name="moTa"
                                    value={formData.moTa}
                                    onChange={handleChange}
                                    rows={6}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                                    placeholder="Mô tả những điểm nổi bật của chỗ nghỉ..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section: Details */}
                    <div id="details" className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-8 scroll-mt-40 ${activeSection === 'details' ? 'ring-2 ring-black ring-offset-2' : ''} transition-all duration-300`}>
                        <div className="mb-6 pb-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">Chi tiết tiện nghi phòng</h2>
                            <p className="text-sm text-gray-500 mt-1">Sức chứa và bố trí phòng</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Khách tối đa</label>
                                <input
                                    type="number"
                                    name="soKhachToiDa"
                                    value={formData.soKhachToiDa}
                                    onChange={handleChange}
                                    className="w-full bg-transparent text-2xl font-bold text-gray-900 focus:outline-none border-b border-gray-300 focus:border-black py-1"
                                />
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Phòng ngủ</label>
                                <input
                                    type="number"
                                    name="soPhongNgu"
                                    value={formData.soPhongNgu}
                                    onChange={handleChange}
                                    className="w-full bg-transparent text-2xl font-bold text-gray-900 focus:outline-none border-b border-gray-300 focus:border-black py-1"
                                />
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Giường</label>
                                <input
                                    type="number"
                                    name="soGiuong"
                                    value={formData.soGiuong}
                                    onChange={handleChange}
                                    className="w-full bg-transparent text-2xl font-bold text-gray-900 focus:outline-none border-b border-gray-300 focus:border-black py-1"
                                />
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Phòng tắm</label>
                                <input
                                    type="number"
                                    name="soPhongTam"
                                    value={formData.soPhongTam}
                                    onChange={handleChange}
                                    step="0.5"
                                    className="w-full bg-transparent text-2xl font-bold text-gray-900 focus:outline-none border-b border-gray-300 focus:border-black py-1"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section: Pricing */}
                    <div id="pricing" className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-8 scroll-mt-40 ${activeSection === 'pricing' ? 'ring-2 ring-black ring-offset-2' : ''} transition-all duration-300`}>
                        <div className="mb-6 pb-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">Định giá & Phí</h2>
                            <p className="text-sm text-gray-500 mt-1">Thiết lập giá cơ bản và các khoản phụ phí</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Giá mỗi đêm (VNĐ)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-3 text-gray-500 font-medium">₫</span>
                                        <input
                                            type="number"
                                            name="giaMoiKhach"
                                            value={formData.giaMoiKhach}
                                            onChange={handleChange}
                                            className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black font-semibold text-lg"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Phí vệ sinh (VNĐ)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-3 text-gray-500 font-medium">₫</span>
                                        <input
                                            type="number"
                                            name="phiVeSinh"
                                            value={formData.phiVeSinh}
                                            onChange={handleChange}
                                            className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Giá đặt tối thiểu</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-3 text-gray-500 font-medium">₫</span>
                                        <input
                                            type="number"
                                            name="giaDatToiThieu"
                                            value={formData.giaDatToiThieu}
                                            onChange={handleChange}
                                            className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                                            placeholder="0"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Giá trị đơn đặt phòng thấp nhất chấp nhận</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Location */}
                    <div id="location" className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-8 scroll-mt-40 ${activeSection === 'location' ? 'ring-2 ring-black ring-offset-2' : ''} transition-all duration-300`}>
                        <div className="mb-6 pb-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">Vị trí</h2>
                            <p className="text-sm text-gray-500 mt-1">Địa chỉ hiển thị cho khách</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Địa chỉ đầy đủ</label>
                                <input
                                    type="text"
                                    name="diaChiDayDu"
                                    value={formData.diaChiDayDu}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                                    placeholder="Số nhà, Tên đường..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Phường/Xã</label>
                                <input
                                    type="text"
                                    name="phuongXa"
                                    value={formData.phuongXa}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Quận/Huyện</label>
                                <input
                                    type="text"
                                    name="quanHuyen"
                                    value={formData.quanHuyen}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Thành phố/Tỉnh</label>
                                <input
                                    type="text"
                                    name="thanhPho"
                                    value={formData.thanhPho}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Quốc gia</label>
                                <input
                                    type="text"
                                    name="quocGia"
                                    value={formData.quocGia}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section: Media */}
                    <div id="media" className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-8 scroll-mt-40 ${activeSection === 'media' ? 'ring-2 ring-black ring-offset-2' : ''} transition-all duration-300`}>
                        <div className="mb-6 pb-6 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Hình ảnh</h2>
                                <p className="text-sm text-gray-500 mt-1">Quản lý hình ảnh và ảnh bìa</p>
                            </div>
                            <label className="cursor-pointer bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center gap-2">
                                {uploading ? <div className="animate-spin h-4 w-4 border-2 border-white/50 border-t-white rounded-full"></div> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
                                <span>Thêm ảnh</span>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                />
                            </label>
                        </div>

                        {/* Image Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {listingImages.map((img) => (
                                <div key={img.maHinhAnh} className={`relative aspect-[4/3] rounded-xl overflow-hidden group border-2 ${img.urlHinhAnh === formData.urlAnhChinh ? 'border-black' : 'border-transparent'}`}>
                                    <Image
                                        src={img.urlHinhAnh?.startsWith('http') ? img.urlHinhAnh : `/uploads${img.urlHinhAnh?.startsWith('/uploads') ? img.urlHinhAnh.substring(8) : img.urlHinhAnh}`}
                                        alt="Listing Image"
                                        fill
                                        className="object-cover bg-gray-100"
                                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                    />

                                    {/* Overlay Actions */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 gap-2">
                                        {img.urlHinhAnh !== formData.urlAnhChinh && (
                                            <button
                                                onClick={() => handleSetMainImage(img.urlHinhAnh)}
                                                type="button"
                                                className="w-full py-1.5 bg-white text-xs font-semibold rounded text-gray-900 hover:bg-gray-100"
                                            >
                                                Đặt làm ảnh bìa
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDeleteImage(img.maHinhAnh)}
                                            type="button"
                                            className="w-full py-1.5 bg-red-500 text-xs font-semibold rounded text-white hover:bg-red-600"
                                        >
                                            Xóa ảnh
                                        </button>
                                    </div>

                                    {/* Main Label */}
                                    {img.urlHinhAnh === formData.urlAnhChinh && (
                                        <div className="absolute top-2 left-2 bg-black text-white px-2 py-1 rounded-md text-xs font-bold">
                                            Ảnh bìa
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {!listingImages.length && (
                            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                                <p className="text-gray-500">Chưa có hình ảnh nào. Hãy tải lên ảnh mới.</p>
                            </div>
                        )}

                    </div>

                </div>
            </div>
        </div>
    );
}
