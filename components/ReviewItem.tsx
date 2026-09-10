import { useState } from 'react';
import BackendImage from '@/components/BackendImage';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Review, reviewsAPI } from '@/lib/api';
import { getValidSrc } from '@/lib/image';
import StarRating from './StarRating';
import toast from 'react-hot-toast';

interface ReviewItemProps {
    review: Review;
    isModal?: boolean;
    className?: string;
    id?: string;
}

export default function ReviewItem({ review, isModal = false, className = "mb-10 last:mb-0", id }: ReviewItemProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [huuIchClicked, setHuuIchClicked] = useState(review.isHuuIchByCurrentUser || false);
    const [soLuotHuuIch, setSoLuotHuuIch] = useState(review.soLuotHuuIch || 0);

    const user = review.khach || review.nguoiDung;
    const avatar = user?.avatarUrl || user?.urlAnhDaiDien;
    const name = user?.hoTen || "Người dùng Airbnb";
    const city = user?.thanhPho || "";

    const MAX_LENGTH = 150;
    const shouldTruncate = (review.binhLuan?.length || 0) > MAX_LENGTH;
    const displayContent = !shouldTruncate || isExpanded
        ? review.binhLuan
        : review.binhLuan?.substring(0, MAX_LENGTH) + "...";

    const handleHuuIch = async () => {
        try {
            const userId = Number(localStorage.getItem('userId')) || 0;
            const res = await reviewsAPI.markHuuIch(review.maDanhGia, userId);
            setHuuIchClicked(res.huuIch);
            setSoLuotHuuIch(res.soLuotHuuIch);
            toast.success(res.message);
        } catch {
            toast.error('Không thể đánh dấu hữu ích');
        }
    };

    return (
        <div id={id} className={className}>
            <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full overflow-hidden relative bg-gray-200">
                    <Image
                        src={getValidSrc(avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`}
                        alt={name}
                        fill
                        className="object-cover"
                        unoptimized
                    />
                </div>
                <div>
                    <div className="font-bold text-gray-900">{name}</div>
                    <div className="text-sm text-gray-500">
                        {city ? `${city} • ` : ''}Thành viên
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 text-xs mb-3 text-gray-900">
                <div className="flex text-gray-900 text-[10px]">
                    <StarRating score={review.diemSo} size={12} />
                </div>
                <span className="font-semibold">·</span>
                <span className="font-semibold text-gray-500">
                    {review.ngayTao ?
                        format(new Date(review.ngayTao), 'MMMM yyyy', { locale: vi })
                        : "Tháng 10 năm 2025"
                    }
                </span>
                {review.ngayNhanPhong && review.ngayTraPhong && (
                    <>
                        <span className="text-gray-500 font-semibold">·</span>
                        <span className="text-gray-500">
                            Ở lại {Math.floor((new Date(review.ngayTraPhong).getTime() - new Date(review.ngayNhanPhong).getTime()) / (1000 * 60 * 60 * 24))} đêm
                        </span>
                    </>
                )}
            </div>

            <div className="text-gray-800 leading-relaxed text-[15px]">
                {displayContent}
            </div>

            {shouldTruncate && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="font-bold underline mt-2 hover:text-gray-600 flex items-center gap-1"
                    style={{ textDecorationThickness: '1.5px' }}
                >
                    {isExpanded ? "Ẩn bớt" : "Hiển thị thêm"}
                    {isExpanded && (
                        <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', fill: 'none', height: '10px', width: '10px', stroke: 'currentColor', strokeWidth: 4, overflow: 'visible' }}><path fill="none" d="M4 20 16 8l12 12"></path></svg>
                    )}
                    {!isExpanded && (
                        <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', fill: 'none', height: '10px', width: '10px', stroke: 'currentColor', strokeWidth: 4, overflow: 'visible' }}><path fill="none" d="m4 12 12 12 12-12"></path></svg>
                    )}
                </button>
            )}

            {review.phanHoi && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden relative bg-gray-200 flex-shrink-0">
                            {review.chuNha ? (
                                <Image
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
                    <p className="text-sm text-gray-600 leading-relaxed">{review.phanHoi}</p>
                </div>
            )}

            <div className="flex items-center gap-4 mt-3">
                <button
                    onClick={handleHuuIch}
                    className={`flex items-center gap-1.5 text-xs transition-colors ${huuIchClicked ? 'text-[#FF385C] font-semibold' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <svg className="w-4 h-4" fill={huuIchClicked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                    {huuIchClicked ? 'Đã hữu ích' : 'Hữu ích'}
                    {soLuotHuuIch > 0 && (
                        <span className="ml-1 text-[10px]">({soLuotHuuIch})</span>
                    )}
                </button>
            </div>
        </div>
    );
}
