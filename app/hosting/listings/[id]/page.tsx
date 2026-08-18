'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { hostAPI, reviewsAPI, Phong, Review } from '@/lib/api';
import { Spin, message, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import HostListingView from '@/components/hosting/HostListingView';

export default function ListingDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [product, setProduct] = useState<Phong | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                const uid = Number(localStorage.getItem('userId'));
                const [productData, reviewsData] = await Promise.all([
                    hostAPI.getListingById(Number(id), uid),
                    reviewsAPI.listByProduct(Number(id), uid)
                ]);
                setProduct(productData);
                setReviews(reviewsData);
            } catch (error) {
                console.error('Error fetching listing details:', error);
                message.error('Không thể tải thông tin bài đăng');
                router.push('/hosting/listings');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, router]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Spin size="large" className="custom-spin-pink" />
                <p className="text-gray-400 font-medium animate-pulse">Đang tải bản xem trước chuyên nghiệp...</p>
                <style jsx global>{`
                    .custom-spin-pink .ant-spin-dot-item {
                        background-color: #FF385C !important;
                    }
                `}</style>
            </div>
        );
    }

    if (!product) return null;

    return (
        <div className="admin-container admin-page-content relative admin-page-enter">
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={() => router.push('/hosting/listings')}
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Quay lại danh sách
                </button>
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Chế độ xem trước của chủ nhà</span>
            </div>

            <HostListingView
                product={product}
                reviews={reviews}
                onEdit={() => router.push(`/hosting/listings/edit/${product.maPhong}`)}
            />

            {/* <div className="admin-panel shadow-sm mt-6 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Bạn muốn thay đổi điều gì đó?</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Cập nhật hình ảnh, tiện nghi hoặc giá cả bất cứ lúc nào.</p>
                </div>
                <div className="flex gap-3 shrink-0">
                    <button
                        onClick={() => router.push('/hosting/calendar')}
                        className="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#333] rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                        Quản lý lịch
                    </button>
                    <button
                        onClick={() => router.push(`/hosting/listings/edit/${product.maPhong}`)}
                        className="px-5 py-2.5 text-sm font-semibold text-white bg-black dark:bg-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm"
                    >
                        Chỉnh sửa ngay
                    </button>
                </div>
            </div> */}
        </div>
    );
}
