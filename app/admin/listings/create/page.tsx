'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function CreateListingPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        maChuNha: '',
        tieuDe: '',
        moTa: '',
        urlAnhChinh: '',
        giaMoiKhach: '',
        soKhachToiDa: 1,
        loaiPhong: 'phong_rieng',
        quocGia: 'Việt Nam',
        thanhPho: '',
        diaChiDayDu: '',
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const data = await adminAPI.getUsers();
            // Filter to find potential hosts or just show all users
            if (Array.isArray(data)) {
                setUsers(data);
            }
        } catch (error) {
            console.error('Failed to load users', error);
            toast.error('Không thể tải danh sách người dùng');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.maChuNha) {
            toast.error('Vui lòng chọn chủ nhà');
            return;
        }

        setLoading(true);

        try {
            await adminAPI.createListing({
                ...formData,
                maChuNha: parseInt(formData.maChuNha),
                giaMoiKhach: parseFloat(formData.giaMoiKhach) || 0,
                // Add defaults for required fields if needed
            });
            toast.success('Tạo phòng thành công');
            router.push('/admin/listings');
        } catch (error) {
            console.error('Create listing failed', error);
            toast.error('Có lỗi xảy ra khi tạo phòng');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl px-6 py-8">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/admin/listings" className="text-gray-500 hover:text-gray-900">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Thêm phòng mới</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">

                {/* Host Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chủ nhà (Host) <span className="text-red-500">*</span></label>
                    <select
                        name="maChuNha"
                        value={formData.maChuNha}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    >
                        <option value="">-- Chọn chủ nhà --</option>
                        {users.map(user => (
                            <option key={user.maNguoiDung} value={user.maNguoiDung}>
                                {user.hoTen} ({user.email})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Title */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tiêu đề <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="tieuDe"
                            value={formData.tieuDe}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                            placeholder="Tiêu đề phòng nghỉ"
                        />
                    </div>

                    {/* Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Loại phòng</label>
                        <select
                            name="loaiPhong"
                            value={formData.loaiPhong}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                        >
                            <option value="phong_rieng">Phòng riêng</option>
                            <option value="nguyen_can">Nguyên căn</option>
                            <option value="phong_chia_se">Phòng chia sẻ</option>
                        </select>
                    </div>

                    {/* Price */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Giá mỗi đêm (VNĐ) <span className="text-red-500">*</span></label>
                        <input
                            type="number"
                            name="giaMoiKhach"
                            value={formData.giaMoiKhach}
                            onChange={handleChange}
                            required
                            min="0"
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                            placeholder="1,000,000"
                        />
                    </div>

                    {/* Guests & Nights */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Số khách tối đa</label>
                        <input
                            type="number"
                            name="soKhachToiDa"
                            value={formData.soKhachToiDa}
                            onChange={handleChange}
                            min="1"
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                        />
                    </div>

                    {/* Location */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Thành phố</label>
                        <input
                            type="text"
                            name="thanhPho"
                            value={formData.thanhPho}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                            placeholder="Đà Lạt, Hà Nội..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Địa chỉ chi tiết</label>
                        <input
                            type="text"
                            name="diaChiDayDu"
                            value={formData.diaChiDayDu}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                            placeholder="Số nhà, đường..."
                        />
                    </div>

                    {/* Image URL */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">URL Ảnh chính</label>
                        <input
                            type="text"
                            name="urlAnhChinh"
                            value={formData.urlAnhChinh}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                            placeholder="https://..."
                        />
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả chi tiết</label>
                        <textarea
                            name="moTa"
                            value={formData.moTa}
                            onChange={handleChange}
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                            placeholder="Mô tả về phòng nghỉ..."
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Link
                        href="/admin/listings"
                        className="px-6 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium transition-colors"
                    >
                        Hủy
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 rounded-lg bg-black text-white hover:bg-gray-800 font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>}
                        Tạo phòng
                    </button>
                </div>
            </form>
        </div>
    );
}
