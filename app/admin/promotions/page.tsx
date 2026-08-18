'use client';

import { useEffect, useState } from 'react';
import { promotionAPI, type KhuyenMai } from '@/lib/api';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import { AdminModalShell } from '@/components/admin/AdminModal';

const PAGE_SIZE = 10;

// ==================== MODAL ====================

function PromoModal({ open, onClose, onSave, initial }: {
  open: boolean; onClose: () => void;
  onSave: (d: Partial<KhuyenMai>) => Promise<void>;
  initial?: KhuyenMai | null;
}) {
  const [tenKhuyenMai, setTenKhuyenMai] = useState('');
  const [moTa, setMoTa] = useState('');
  const [loaiGiamGia, setLoaiGiamGia] = useState<'PHAN_TRAM' | 'SO_TIEN'>('PHAN_TRAM');
  const [giaTri, setGiaTri] = useState<number>(0);
  const [apCho, setApCho] = useState<'NGUOI_LON' | 'TRE_EM' | 'DON_HANG'>('DON_HANG');
  const [dieuKienApDung, setDieuKienApDung] = useState<'KHONG' | 'CO_TRE_EM' | 'CO_NGUOI_LON'>('KHONG');
  const [dieuKienNgayBatDau, setDieuKienNgayBatDau] = useState('');
  const [dieuKienNgayKetThuc, setDieuKienNgayKetThuc] = useState('');
  const [soLuongToiDa, setSoLuongToiDa] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTenKhuyenMai(initial?.tenKhuyenMai || '');
      setMoTa(initial?.moTa || '');
      setLoaiGiamGia(initial?.loaiGiamGia || 'PHAN_TRAM');
      setGiaTri(initial?.giaTri || 0);
      setApCho(initial?.apCho || 'DON_HANG');
      setDieuKienApDung(initial?.dieuKienApDung || 'KHONG');
      setDieuKienNgayBatDau(initial?.dieuKienNgayBatDau || '');
      setDieuKienNgayKetThuc(initial?.dieuKienNgayKetThuc || '');
      setSoLuongToiDa(initial?.soLuongToiDa || 0);
    }
  }, [initial, open]);

  if (!open) return null;
  return (
    <AdminModalShell onClose={onClose} maxWidth="max-w-lg">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#2a2a2a] bg-gray-50/60 dark:bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#222] border border-gray-100 dark:border-[#333] flex items-center justify-center shrink-0 text-[#FF385C]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{initial ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi mới'}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{initial ? 'Cập nhật thông tin khuyến mãi' : 'Tạo chương trình khuyến mãi'}</p>
            </div>
          </div>
        </div>
        {/* Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Tên KM */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tên khuyến mãi <span className="text-red-500">*</span></label>
            <input type="text" value={tenKhuyenMai} onChange={e => setTenKhuyenMai(e.target.value)}
              placeholder="Ví dụ: Giảm 10% cho gia đình"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF385C]/40 focus:border-[#FF385C] transition-all" />
          </div>

          {/* Mô tả */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mô tả</label>
            <textarea value={moTa} onChange={e => setMoTa(e.target.value)} rows={2}
              placeholder="Mô tả ngắn về chương trình..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF385C]/40 focus:border-[#FF385C] transition-all resize-none" />
          </div>

          {/* Loại giảm giá + Giá trị */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Loại giảm giá <span className="text-red-500">*</span></label>
              <select value={loaiGiamGia} onChange={e => setLoaiGiamGia(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FF385C]/40 focus:border-[#FF385C] transition-all appearance-none cursor-pointer">
                <option value="PHAN_TRAM">Phần trăm (%)</option>
                <option value="SO_TIEN">Số tiền cố định (₫)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Giá trị <span className="text-red-500">*</span></label>
              <div className="flex items-center gap-2">
                <input type="number" value={giaTri} onChange={e => setGiaTri(Number(e.target.value))} min={0}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF385C]/40 focus:border-[#FF385C] transition-all" />
                <span className="text-gray-500 dark:text-gray-400 font-medium shrink-0">{loaiGiamGia === 'PHAN_TRAM' ? '%' : '₫'}</span>
              </div>
            </div>
          </div>

          {/* Áp dụng cho */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Áp dụng cho <span className="text-red-500">*</span></label>
            <select value={apCho} onChange={e => setApCho(e.target.value as any)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FF385C]/40 focus:border-[#FF385C] transition-all appearance-none cursor-pointer">
              <option value="DON_HANG">Toàn bộ đơn hàng</option>
              <option value="NGUOI_LON">Người lớn</option>
              <option value="TRE_EM">Trẻ em</option>
            </select>
          </div>

          {/* Điều kiện áp dụng */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Điều kiện áp dụng</label>
            <select value={dieuKienApDung} onChange={e => setDieuKienApDung(e.target.value as any)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FF385C]/40 focus:border-[#FF385C] transition-all appearance-none cursor-pointer">
              <option value="KHONG">Không điều kiện</option>
              <option value="CO_TRE_EM">Đơn phải có trẻ em</option>
              <option value="CO_NGUOI_LON">Đơn phải có người lớn</option>
            </select>
          </div>

          {/* Ngày áp dụng */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ngày bắt đầu</label>
              <input type="date" value={dieuKienNgayBatDau} onChange={e => setDieuKienNgayBatDau(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FF385C]/40 focus:border-[#FF385C] transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ngày kết thúc</label>
              <input type="date" value={dieuKienNgayKetThuc} onChange={e => setDieuKienNgayKetThuc(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FF385C]/40 focus:border-[#FF385C] transition-all" />
            </div>
          </div>

          {/* Số lượng tối đa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Số lượng tối đa (0 = vô hạn)</label>
            <input type="number" value={soLuongToiDa} onChange={e => setSoLuongToiDa(Number(e.target.value))} min={0}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF385C]/40 focus:border-[#FF385C] transition-all" />
          </div>
        </div>
        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-[#2a2a2a]">
          <button onClick={onClose}
            className="px-5 py-2 rounded-xl border border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 font-medium text-sm transition-colors">
            Hủy
          </button>
          <button disabled={!tenKhuyenMai.trim() || giaTri <= 0 || saving} onClick={async () => {
            setSaving(true);
            try {
              await onSave({
                tenKhuyenMai: tenKhuyenMai.trim(),
                moTa: moTa.trim() || undefined,
                loaiGiamGia,
                giaTri,
                apCho,
                dieuKienApDung,
                dieuKienNgayBatDau: dieuKienNgayBatDau || undefined,
                dieuKienNgayKetThuc: dieuKienNgayKetThuc || undefined,
                soLuongToiDa,
              });
              onClose();
            } finally { setSaving(false); }
          }}
            className="px-5 py-2 rounded-xl bg-[#FF385C] hover:bg-[#E31C5F] text-white font-medium text-sm transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {saving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />}
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </AdminModalShell>
  );
}

// ==================== MAIN PAGE ====================

export default function AdminPromotionsPage() {
  const [promos, setPromos] = useState<KhuyenMai[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [modal, setModal] = useState<{ open: boolean; edit: KhuyenMai | null }>({ open: false, edit: null });

  const fetchPromos = async () => {
    try {
      setPromos(await promotionAPI.getAll());
    } catch {
      toast.error('Lỗi tải danh sách khuyến mãi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPromos(); }, []);

  const handleSave = async (data: Partial<KhuyenMai>) => {
    try {
      if (modal.edit) {
        await promotionAPI.update(modal.edit.maKhuyenMai, data);
        toast.success('Đã cập nhật khuyến mãi');
      } else {
        await promotionAPI.create(data);
        toast.success('Đã tạo khuyến mãi mới');
      }
      await fetchPromos();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Thao tác thất bại';
      toast.error(msg, { duration: 5000 });
    }
  };

  const handleToggle = async (id: number) => {
    try {
      const r = await promotionAPI.toggle(id);
      toast.success(r.hoatDong ? 'Đã kích hoạt' : 'Đã tắt');
      await fetchPromos();
    } catch {
      toast.error('Thao tác thất bại');
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

  const isExpired = (km: KhuyenMai) => {
    const today = new Date().toISOString().slice(0, 10);
    if (km.dieuKienNgayKetThuc && km.dieuKienNgayKetThuc < today) return true;
    if (km.soLuongToiDa > 0 && km.soLuongDaDung >= km.soLuongToiDa) return true;
    return false;
  };

  const filtered = promos.filter(km => {
    if (filterStatus === 'active') return km.hoatDong;
    if (filterStatus === 'inactive') return !km.hoatDong;
    return true;
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getApChoLabel = (apCho: string) => {
    switch (apCho) {
      case 'DON_HANG': return 'Toàn đơn';
      case 'NGUOI_LON': return 'Người lớn';
      case 'TRE_EM': return 'Trẻ em';
      default: return apCho;
    }
  };

  if (loading) return (
    <div className="admin-container admin-page-content">
      <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF385C]" /></div>
    </div>
  );

  return (
    <div className="admin-container admin-page-content relative admin-page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#FF385C] mb-1">Quản lý</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Khuyến mãi</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Quản lý các chương trình khuyến mãi theo đối tượng khách</p>
        </div> */}
        <button
          onClick={() => setModal({ open: true, edit: null })}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#FF385C] rounded-lg hover:bg-[#E31C5F] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Thêm khuyến mãi
        </button>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-thin">
        {[
          { key: 'all', label: 'Tất cả', count: promos.length },
          { key: 'active', label: 'Đang hoạt động', count: promos.filter(k => k.hoatDong).length },
          { key: 'inactive', label: 'Đã ẩn', count: promos.filter(k => !k.hoatDong).length },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => { setFilterStatus(f.key as any); setPage(1); }}
            className={`whitespace-nowrap flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${filterStatus === f.key
              ? 'bg-[#FF385C] text-white shadow-sm'
              : 'bg-white dark:bg-[#1e1e1e] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#333] hover:border-gray-300'
            }`}
          >
            {f.label} <span className={`ml-1 text-xs ${filterStatus === f.key ? 'text-white/70' : 'text-gray-400'}`}>({f.count})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#161616] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] shadow-sm overflow-hidden">
        {promos.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="font-medium">Chưa có khuyến mãi nào</p>
            <p className="text-sm mt-1">Nhấn &quot;Thêm khuyến mãi&quot; để bắt đầu</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-[#2a2a2a]">
                    <th className="text-left px-6 py-3 font-semibold text-gray-500 dark:text-gray-400">Tên khuyến mãi</th>
                    <th className="text-center px-6 py-3 font-semibold text-gray-500 dark:text-gray-400">Loại</th>
                    <th className="text-center px-6 py-3 font-semibold text-gray-500 dark:text-gray-400">Giá trị</th>
                    <th className="text-center px-6 py-3 font-semibold text-gray-500 dark:text-gray-400">Áp dụng cho</th>
                    <th className="text-center px-6 py-3 font-semibold text-gray-500 dark:text-gray-400">Thời hạn</th>
                    <th className="text-center px-6 py-3 font-semibold text-gray-500 dark:text-gray-400">Đã dùng</th>
                    <th className="text-center px-6 py-3 font-semibold text-gray-500 dark:text-gray-400">Hiển thị</th>
                    <th className="text-right px-6 py-3 font-semibold text-gray-500 dark:text-gray-400">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#2a2a2a]">
                  {paginated.map(km => {
                    const hidden = !km.hoatDong;
                    return (
                      <tr key={km.maKhuyenMai} className={`transition-colors ${hidden ? 'bg-gray-50/50 opacity-55' : 'hover:bg-gray-50 dark:hover:bg-white/[0.02]'}`}>
                        <td className="px-6 py-3.5">
                          <span className={hidden ? 'line-through decoration-gray-400 text-gray-400 dark:text-gray-500 font-semibold' : 'font-semibold text-gray-900 dark:text-gray-100'}>
                            {km.tenKhuyenMai}
                          </span>
                          {km.moTa && <p className="text-xs text-gray-400 mt-0.5 max-w-[250px] truncate">{km.moTa}</p>}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${km.loaiGiamGia === 'PHAN_TRAM' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                            {km.loaiGiamGia === 'PHAN_TRAM' ? 'Phần trăm' : 'Số tiền'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className="font-bold text-gray-900 dark:text-gray-100">
                            {km.loaiGiamGia === 'PHAN_TRAM' ? `${km.giaTri}%` : `₫${fmt(km.giaTri)}`}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${hidden ? 'bg-gray-100 text-gray-400' : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'}`}>
                            {getApChoLabel(km.apCho)}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-center text-xs">
                          {km.dieuKienNgayBatDau || km.dieuKienNgayKetThuc ? (
                            <span className={isExpired(km) ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                              {km.dieuKienNgayBatDau || '...'} → {km.dieuKienNgayKetThuc || '...'}
                              {isExpired(km) && <span className="block text-[10px] mt-0.5">Hết hạn</span>}
                            </span>
                          ) : (
                            <span className="text-gray-400">Không giới hạn</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className={`text-sm font-medium ${km.soLuongToiDa > 0 && km.soLuongDaDung >= km.soLuongToiDa ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'}`}>
                            {km.soLuongDaDung}{km.soLuongToiDa > 0 ? `/${km.soLuongToiDa}` : ''}
                            {km.soLuongToiDa > 0 && km.soLuongDaDung >= km.soLuongToiDa && (
                              <span className="block text-[10px] text-red-500 mt-0.5">Hết lượt</span>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <button onClick={() => handleToggle(km.maKhuyenMai)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${km.hoatDong ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${km.hoatDong ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center justify-end">
                            <button onClick={() => setModal({ open: true, edit: km })} className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Sửa">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination inline currentPage={page} totalPages={Math.ceil(promos.length / PAGE_SIZE)} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Modal */}
      <PromoModal open={modal.open} onClose={() => setModal({ open: false, edit: null })} onSave={handleSave} initial={modal.edit} />
    </div>
  );
}
