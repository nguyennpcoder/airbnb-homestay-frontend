'use client';

import { useEffect, useState } from 'react';
import { pricingRulesAPI, type QuyDinhGia } from '@/lib/api';
import toast from 'react-hot-toast';

export default function AdminPricingRulesPage() {
  const [rules, setRules] = useState<QuyDinhGia | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tyLeNguoiLon, setTyLeNguoiLon] = useState<number>(100);
  const [tyLeTreEm, setTyLeTreEm] = useState<number>(60);
  const [tyLePhiDichVu, setTyLePhiDichVu] = useState<number>(10);

  useEffect(() => {
    pricingRulesAPI.get().then(data => {
      setRules(data);
      setTyLeNguoiLon(data.tyLeNguoiLon);
      setTyLeTreEm(data.tyLeTreEm);
      setTyLePhiDichVu(data.tyLePhiDichVu ?? 10);
      localStorage.setItem('quyDinhGia', JSON.stringify(data));
    }).catch(() => {
      toast.error('Lỗi tải quy định giá');
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (tyLeNguoiLon < 0 || tyLeNguoiLon > 100) {
      toast.error('Tỷ lệ người lớn phải từ 0% đến 100%');
      return;
    }
    if (tyLeTreEm < 0 || tyLeTreEm > 100) {
      toast.error('Tỷ lệ trẻ em phải từ 0% đến 100%');
      return;
    }
    if (tyLePhiDichVu < 0 || tyLePhiDichVu > 100) {
      toast.error('Tỷ lệ phí dịch vụ phải từ 0% đến 100%');
      return;
    }
    setSaving(true);
    try {
      const updated = await pricingRulesAPI.update({ tyLeNguoiLon, tyLeTreEm, tyLePhiDichVu });
      setRules(updated);
      localStorage.setItem('quyDinhGia', JSON.stringify(updated));
      toast.success('Đã cập nhật quy định giá');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-container admin-page-content">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF385C]" />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container admin-page-content relative admin-page-enter">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#FF385C] mb-1">Quy định giá theo đối tượng</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Cấu hình tỷ lệ giá áp dụng cho từng loại khách trên mỗi đêm
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-[#161616] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Người lớn</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Từ 13 tuổi trở lên</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tỷ lệ giá (%)</label>
              <div className="flex items-center gap-2">
                <input type="number" value={tyLeNguoiLon} min={0} max={100}
                  onChange={e => setTyLeNguoiLon(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FF385C]/40 focus:border-[#FF385C] transition-all text-lg font-bold" />
                <span className="text-gray-500 dark:text-gray-400 font-medium shrink-0">%</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                = <span className="font-semibold text-gray-600 dark:text-gray-300">{tyLeNguoiLon}%</span> giá gốc / đêm
              </p>
            </div>
            <div className="pt-3 border-t border-gray-100 dark:border-[#2a2a2a]">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                VD: 100% = khách trả đầy đủ giá phòng
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#161616] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Trẻ em</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Từ 2 đến 12 tuổi</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tỷ lệ giá (%)</label>
              <div className="flex items-center gap-2">
                <input type="number" value={tyLeTreEm} min={0} max={100}
                  onChange={e => setTyLeTreEm(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FF385C]/40 focus:border-[#FF385C] transition-all text-lg font-bold" />
                <span className="text-gray-500 dark:text-gray-400 font-medium shrink-0">%</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                = <span className="font-semibold text-gray-600 dark:text-gray-300">{100 - tyLeTreEm}%</span> giảm giá so với người lớn
              </p>
            </div>
            <div className="pt-3 border-t border-gray-100 dark:border-[#2a2a2a]">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                VD: 60% = trẻ em trả 60% giá phòng (giảm 40%)
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#161616] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Em bé</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Dưới 2 tuổi</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tỷ lệ giá (%)</label>
              <div className="flex items-center gap-2">
                <div className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1a1a1a] text-gray-500 dark:text-gray-400 text-lg font-bold">
                  0%
                </div>
                <span className="text-gray-500 dark:text-gray-400 font-medium shrink-0">%</span>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1.5 font-medium">
                Miễn phí — không thay đổi
              </p>
            </div>
            <div className="pt-3 border-t border-gray-100 dark:border-[#2a2a2a]">
              <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                Em bé luôn luôn miễn phí
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#161616] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Phí dịch vụ nền tảng</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Tỷ lệ phí áp dụng trên mỗi giao dịch đặt chỗ (mặc định 10%)</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FF385C]/10 text-[#FF385C]">Thu nhập của hệ thống</span>
        </div>
        <div className="flex items-end gap-3 mt-4">
          <div className="max-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tỷ lệ phí (%)</label>
            <div className="flex items-center gap-2">
              <input type="number" value={tyLePhiDichVu} min={0} max={100}
                onChange={e => setTyLePhiDichVu(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FF385C]/40 focus:border-[#FF385C] transition-all text-lg font-bold" />
              <span className="text-gray-500 dark:text-gray-400 font-medium shrink-0">%</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 pb-2.5">
            VD: 10% = khách trả thêm <span className="font-semibold text-gray-700 dark:text-gray-300">{tyLePhiDichVu}%</span> trên (giá phòng + phí vệ sinh)
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#161616] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] shadow-sm p-6 mb-6">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Ví dụ minh họa</h3>
        <div className="bg-gray-50 dark:bg-[#1a1a1a] rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="flex justify-between sm:block">
              <span className="text-gray-500 dark:text-gray-400">Giá phòng gốc:</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100 sm:block">1.000.000đ / đêm</span>
            </div>
            <div className="flex justify-between sm:block">
              <span className="text-gray-500 dark:text-gray-400">Người lớn trả:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400 sm:block">
                {(1000000 * tyLeNguoiLon / 100).toLocaleString('vi-VN')}đ / đêm
              </span>
            </div>
            <div className="flex justify-between sm:block">
              <span className="text-gray-500 dark:text-gray-400">Trẻ em trả:</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400 sm:block">
                {(1000000 * tyLeTreEm / 100).toLocaleString('vi-VN')}đ / đêm
              </span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#2a2a2a] text-sm flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Phí dịch vụ ({tyLePhiDichVu}%) trên (1.000.000 + phí vệ sinh):</span>
            <span className="font-semibold text-[#FF385C]">{(1000000 * tyLePhiDichVu / 100).toLocaleString('vi-VN')}đ</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#FF385C] rounded-lg hover:bg-[#E31C5F] transition-colors disabled:opacity-50">
          {saving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />}
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>
    </div>
  );
}
