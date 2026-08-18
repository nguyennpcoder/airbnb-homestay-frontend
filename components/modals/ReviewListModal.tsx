import { Modal, Input } from 'antd';
import { SearchOutlined, StarFilled } from '@ant-design/icons';
import Image from 'next/image';
import { Review } from '@/lib/api';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import ReviewItem from '../ReviewItem';

interface CategoryScore {
    label: string;
    score?: number;
    icon: React.ReactNode;
}

interface ReviewListModalProps {
    isOpen: boolean;
    onClose: () => void;
    reviews: Review[];
    averageRating: number;
    reviewCount: number;
    categoryScores: CategoryScore[];
}

export default function ReviewListModal({
    isOpen,
    onClose,
    reviews,
    averageRating,
    reviewCount,
    categoryScores
}: ReviewListModalProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredReviews = useMemo(() => {
        if (!searchTerm) return reviews;
        const lower = searchTerm.toLowerCase();
        return reviews.filter(r =>
            r.binhLuan?.toLowerCase().includes(lower) ||
            r.khach?.hoTen?.toLowerCase().includes(lower) ||
            r.nguoiDung?.hoTen?.toLowerCase().includes(lower)
        );
    }, [reviews, searchTerm]);

    const ratingDistribution = useMemo(() => {
        const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach(r => {
            const rounded = Math.round(r.diemSo) as 1 | 2 | 3 | 4 | 5;
            if (counts[rounded] !== undefined) counts[rounded]++;
        });
        return counts;
    }, [reviews]);

    return (
        <Modal
            open={isOpen}
            onCancel={onClose}
            footer={null}
            width={1032}
            centered
            className="review-list-modal"
            styles={{
                body: { height: '85vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }
            }}
            bodyStyle={{ padding: 0, height: '85vh' }} // Fallback for older AntD
            closeIcon={<div className="p-2 rounded-full hover:bg-gray-100 transition"><svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', fill: 'none', height: '16px', width: '16px', stroke: 'currentColor', strokeWidth: 3, overflow: 'visible' }}><path d="m6 6 20 20m0-20-20 20"></path></svg></div>}
        >
            <div className="flex h-full">
                {/* Left Column: Stats (Sticky-ish behavior handled by flex box scroll) */}
                <div className="w-[360px] hidden md:block h-full overflow-y-auto p-8 border-r border-transparent scrollbar-hide">
                    <div className="mb-8">
                        <div className="flex items-center gap-4 mb-6">
                            <Image src="/rating1.avif" alt="laurels" width={40} height={40} className="object-contain" />
                            <div className="text-[64px] font-bold leading-none text-gray-900">
                                {averageRating.toFixed(2).replace('.', ',')}
                            </div>
                            <Image src="/rating1.avif" alt="laurels" width={40} height={40} className="object-contain scale-x-[-1]" />
                        </div>
                        <div className="text-center mb-8">
                            <div className="font-bold text-lg text-gray-900">Được khách yêu thích</div>
                            <div className="text-gray-500 text-sm mt-1">
                                Nhà này nằm trong nhóm 5% chỗ ở hàng đầu
                            </div>
                        </div>

                        {/* Rating Distribution */}
                        <div className="mb-8">
                            <div className="font-semibold text-sm mb-3">Xếp hạng tổng thể</div>
                            <div className="space-y-2">
                                {[5, 4, 3, 2, 1].map((star) => {
                                    const count = ratingDistribution[star as keyof typeof ratingDistribution];
                                    const percent = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
                                    return (
                                        <div key={star} className="flex items-center gap-3 text-xs">
                                            <span className="w-2">{star}</span>
                                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gray-900 rounded-full"
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Category Scores */}
                        <div className="space-y-4">
                            {categoryScores.map((cat, idx) => (
                                <div key={idx} className="flex items-center justify-between pb-3 border-b border-gray-100 last:border-0">
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <div className="text-xl">{cat.icon}</div>
                                        <span className="text-sm font-medium">{cat.label}</span>
                                    </div>
                                    <span className="font-bold text-sm text-gray-900">
                                        {cat.score?.toFixed(1).replace('.', ',')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Reviews List */}
                <div className="flex-1 h-full overflow-y-auto p-4 md:p-8">
                    <div className="max-w-[600px] mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6 md:hidden">
                            ★ {averageRating.toFixed(2).replace('.', ',')} · {reviewCount} đánh giá
                        </h2>

                        <div className="relative">
                            <Input
                                prefix={<SearchOutlined className="text-gray-800 font-bold" />}
                                placeholder="Tìm kiếm tất cả đánh giá"
                                className="rounded-full py-3 px-4 bg-gray-100 border-transparent hover:bg-gray-100 focus:bg-white focus:border-black focus:ring-0 text-gray-900 font-medium placeholder:text-gray-500 placeholder:font-normal"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col">
                        {filteredReviews.length > 0 ? (
                            filteredReviews.map((review) => (
                                <ReviewItem
                                    key={review.maDanhGia}
                                    id={`review-modal-${review.maDanhGia}`}
                                    review={review}
                                    isModal={true}
                                    className="mb-8 border-b border-gray-100 pb-8 last:border-0 last:mb-0 last:pb-0"
                                />
                            ))
                        ) : (
                            <div className="text-gray-500 pt-8">
                                Không tìm thấy đánh giá nào phù hợp với &quot;{searchTerm}&quot;.

                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
