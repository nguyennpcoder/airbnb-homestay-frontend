'use client';

import { useState, useRef } from 'react';
import { Modal } from 'antd';
import toast from 'react-hot-toast';
import { reviewsAPI } from '@/lib/api';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  phongId: number;
  maKhach: number;
  maDatCho?: number;
  onSuccess?: () => void;
}

const reviewCategories = [
  { key: 'diemSachSe', label: 'Sạch sẽ', description: 'Mức độ sạch sẽ của chỗ ở' },
  { key: 'diemChinhXac', label: 'Chính xác', description: 'Thông tin mô tả đúng với thực tế' },
  { key: 'diemNhanPhong', label: 'Nhận phòng', description: 'Quá trình nhận phòng thuận lợi' },
  { key: 'diemGiaoTiep', label: 'Giao tiếp', description: 'Chủ nhà phản hồi nhanh và rõ ràng' },
  { key: 'diemViTri', label: 'Vị trí', description: 'Vị trí thuận tiện, dễ tìm' },
  { key: 'diemGiaTri', label: 'Giá trị', description: 'Giá cả hợp lý với chất lượng' },
];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`text-2xl transition-colors ${star <= value ? 'text-[#FF385C]' : 'text-gray-300'}`}
          aria-label={`${star} sao`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function ReviewModal({ isOpen, onClose, phongId, maKhach, maDatCho, onSuccess }: ReviewModalProps) {
  const [ratings, setRatings] = useState<Record<string, number>>({
    diemSachSe: 5,
    diemChinhXac: 5,
    diemNhanPhong: 5,
    diemGiaoTiep: 5,
    diemViTri: 5,
    diemGiaTri: 5,
  });
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  const handleSubmit = async () => {
    if (submitting || submittedRef.current) return;
    submittedRef.current = true;
    const hasAllRatings = reviewCategories.every((cat) => ratings[cat.key] > 0);
    if (!hasAllRatings) {
      toast.error('Vui lòng đánh giá đủ 6 tiêu chí');
      return;
    }

    setSubmitting(true);
    try {
      await reviewsAPI.create({
        phongId,
        maKhach,
        maDatCho,
        diemSachSe: ratings.diemSachSe,
        diemChinhXac: ratings.diemChinhXac,
        diemNhanPhong: ratings.diemNhanPhong,
        diemGiaoTiep: ratings.diemGiaoTiep,
        diemViTri: ratings.diemViTri,
        diemGiaTri: ratings.diemGiaTri,
        binhLuan: comment,
        diemSo: 0,
      });

      toast.success('Đánh giá của bạn đã được gửi thành công!');
      onSuccess?.();
      handleClose();
    } catch (error: any) {
      const msg = error?.response?.data?.message || '';
      if (msg.includes('đánh giá') || msg.includes('review') || error?.response?.status === 400) {
        toast('Đánh giá đã được lưu', { icon: 'ℹ️' });
        onSuccess?.();
        handleClose();
      } else {
        console.error('Error submitting review:', error);
        toast.error(msg || 'Có lỗi xảy ra khi gửi đánh giá');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    submittedRef.current = false;
    setRatings({
      diemSachSe: 5,
      diemChinhXac: 5,
      diemNhanPhong: 5,
      diemGiaoTiep: 5,
      diemViTri: 5,
      diemGiaTri: 5,
    });
    setComment('');
    onClose();
  };

  const averageRating = Object.values(ratings).reduce((sum, val) => sum + val, 0) / 6;

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      footer={null}
      width={480}
      centered
      className="review-modal"
      styles={{ content: { borderRadius: 32, overflow: 'hidden' }, body: { padding: 24, maxHeight: '85vh', overflowY: 'auto' } }}
      closeIcon={<div className="p-2 rounded-full hover:bg-gray-100 transition"><svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', fill: 'none', height: '16px', width: '16px', stroke: 'currentColor', strokeWidth: 3, overflow: 'visible' }}><path d="m6 6 20 20m0-20-20 20"></path></svg></div>}
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Đánh giá chỗ ở</h3>
          <p className="text-xs text-gray-500 mt-1">Điểm trung bình: <span className="font-bold text-gray-900">{averageRating.toFixed(1)}</span></p>
        </div>

        <div className="space-y-4">
          {reviewCategories.map((category) => (
            <div key={category.key} className="bg-gray-50 rounded-xl p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-semibold text-sm text-gray-900">{category.label}</div>
                  <div className="text-xs text-gray-500">{category.description}</div>
                </div>
                <span className="text-lg font-bold text-gray-900">{ratings[category.key]}</span>
              </div>
              <StarRating
                value={ratings[category.key]}
                onChange={(value) => setRatings({ ...ratings, [category.key]: value })}
              />
            </div>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Chia sẻ thêm về trải nghiệm của bạn</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Hãy chia sẻ chi tiết hơn về trải nghiệm của bạn để giúp những khách khác..."
            rows={3}
            maxLength={500}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF385C]/20 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{comment.length}/500</p>
        </div>

        <div className="flex gap-3 pb-1">
          <button onClick={handleClose} disabled={submitting}
            className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">
            Hủy
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 py-2.5 bg-[#FF385C] text-white rounded-xl text-sm font-bold hover:bg-[#E31C5F] disabled:opacity-50">
            {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
