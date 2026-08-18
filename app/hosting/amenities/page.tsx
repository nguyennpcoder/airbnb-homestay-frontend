'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminAmenityAPI, type NhomTienNghi, type DanhMucTienNghi } from '@/lib/api';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import { AdminModalShell } from '@/components/admin/AdminModal';

const PAGE_SIZE = 10;

// ==================== MODALS ====================

function GroupModal({ open, onClose, onSave, initial }: {
  open: boolean; onClose: () => void;
  onSave: (d: { tenNhom: string; thuTu: number }) => Promise<void>;
  initial?: NhomTienNghi | null;
}) {
  const [tenNhom, setTenNhom] = useState('');
  const [thuTu, setThuTu] = useState(0);
  const [saving, setSaving] = useState(false);
  const [thuTuError, setThuTuError] = useState('');

  useEffect(() => {
    if (open) { setTenNhom(initial?.tenNhom || ''); setThuTu(initial?.thuTu || 0); setThuTuError(''); }
  }, [initial, open]);

  const handleThuTuChange = (val: string) => {
    const num = Number(val);
    setThuTu(num);
    if (num < 0) setThuTuError('Thứ tự không được là số âm');
    else setThuTuError('');
  };

  if (!open) return null;
  return (
    <AdminModalShell onClose={onClose} maxWidth="max-w-md">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#2a2a2a] bg-gray-50/60 dark:bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#222] border border-gray-100 dark:border-[#333] flex items-center justify-center shrink-0 text-[#FF385C]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{initial ? 'Sửa nhóm tiện nghi' : 'Thêm nhóm tiện nghi'}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{initial ? 'Cập nhật thông tin nhóm' : 'Tạo nhóm tiện nghi mới'}</p>
            </div>
          </div>
        </div>
        {/* Body */}
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tên nhóm <span className="text-red-500">*</span></label>
            <input type="text" value={tenNhom} onChange={e => setTenNhom(e.target.value)}
              placeholder="Ví dụ: Phòng tắm, Giải trí..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF385C]/40 focus:border-[#FF385C] transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Thứ tự hiển thị</label>
            <input type="number" value={thuTu} onChange={e => handleThuTuChange(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF385C]/40 focus:border-[#FF385C] transition-all ${thuTuError ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-[#333]'}`} />
            {thuTuError && <p className="text-xs text-red-500 dark:text-red-400 mt-1.5">{thuTuError}</p>}
          </div>
        </div>
        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-[#2a2a2a]">
          <button onClick={onClose}
            className="px-5 py-2 rounded-xl border border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 font-medium text-sm transition-colors">
            Hủy
          </button>
          <button disabled={!tenNhom.trim() || thuTu < 0 || saving} onClick={async () => { setSaving(true); try { await onSave({ tenNhom: tenNhom.trim(), thuTu }); onClose(); } finally { setSaving(false); } }}
            className="px-5 py-2 rounded-xl bg-[#FF385C] hover:bg-[#E31C5F] text-white font-medium text-sm transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {saving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />}
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </AdminModalShell>
  );
}

function CatalogModal({ open, onClose, onSave, initial, groups }: {
  open: boolean; onClose: () => void;
  onSave: (d: { maNhomTienNghi: number; ten: string; bieuTuong?: string; moTa?: string }) => Promise<void>;
  initial?: DanhMucTienNghi | null; groups: NhomTienNghi[];
}) {
  const [maNhom, setMaNhom] = useState<number>(0);
  const [ten, setTen] = useState('');
  const [bieuTuong, setBieuTuong] = useState('');
  const [moTa, setMoTa] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setMaNhom(initial?.nhom?.maNhomTienNghi || initial?.maNhomTienNghi || groups[0]?.maNhomTienNghi || 0);
      setTen(initial?.ten || ''); setBieuTuong(initial?.bieuTuong || ''); setMoTa(initial?.moTa || '');
    }
  }, [initial, open, groups]);

  if (!open) return null;
  return (
    <AdminModalShell onClose={onClose} maxWidth="max-w-md">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#2a2a2a] bg-gray-50/60 dark:bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#222] border border-gray-100 dark:border-[#333] flex items-center justify-center shrink-0 text-[#FF385C]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{initial ? 'Sửa tiện ích' : 'Thêm tiện ích mới'}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{initial ? 'Cập nhật thông tin tiện ích' : 'Tạo tiện ích mới cho danh mục'}</p>
            </div>
          </div>
        </div>
        {/* Body */}
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nhóm tiện nghi <span className="text-red-500">*</span></label>
            <select value={maNhom} onChange={e => setMaNhom(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FF385C]/40 focus:border-[#FF385C] transition-all appearance-none cursor-pointer">
              {groups.map(g => <option key={g.maNhomTienNghi} value={g.maNhomTienNghi}>{g.tenNhom}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tên tiện ích <span className="text-red-500">*</span></label>
            <input type="text" value={ten} onChange={e => setTen(e.target.value)}
              placeholder="Ví dụ: WiFi, TV, Bếp..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF385C]/40 focus:border-[#FF385C] transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Icon slug</label>
            <input type="text" value={bieuTuong} onChange={e => setBieuTuong(e.target.value)}
              placeholder="Ví dụ: wifi, tv, kitchen..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF385C]/40 focus:border-[#FF385C] transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mô tả</label>
            <textarea value={moTa} onChange={e => setMoTa(e.target.value)} rows={3}
              placeholder="Mô tả ngắn về tiện ích..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF385C]/40 focus:border-[#FF385C] transition-all resize-none" />
          </div>
        </div>
        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-[#2a2a2a]">
          <button onClick={onClose}
            className="px-5 py-2 rounded-xl border border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 font-medium text-sm transition-colors">
            Hủy
          </button>
          <button disabled={!ten.trim() || !maNhom || saving} onClick={async () => { setSaving(true); try { await onSave({ maNhomTienNghi: maNhom, ten: ten.trim(), bieuTuong: bieuTuong.trim() || undefined, moTa: moTa.trim() || undefined }); onClose(); } finally { setSaving(false); } }}
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

export default function HostingAmenitiesPage() {
  const [groups, setGroups] = useState<NhomTienNghi[]>([]);
  const [catalogs, setCatalogs] = useState<DanhMucTienNghi[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'groups' | 'catalog'>('catalog');

  const [groupPage, setGroupPage] = useState(1);
  const [catalogPage, setCatalogPage] = useState(1);

  const [groupModal, setGroupModal] = useState<{ open: boolean; edit: NhomTienNghi | null }>({ open: false, edit: null });
  const [catalogModal, setCatalogModal] = useState<{ open: boolean; edit: DanhMucTienNghi | null }>({ open: false, edit: null });

  const hostId = typeof window !== 'undefined' ? Number(localStorage.getItem('userId')) : 0;

  const fetchGroups = useCallback(async () => {
    if (!hostId) return;
    try { setGroups(await adminAmenityAPI.getGroups(hostId)); } catch { toast.error('Lỗi tải nhóm tiện nghi'); }
  }, [hostId]);

  // Luôn fetch TẤT CẢ catalog (không filter) để đếm số tiện ích cho groups tab
  const fetchAllCatalogs = useCallback(async () => {
    if (!hostId) return;
    try { setCatalogs(await adminAmenityAPI.getCatalogs(hostId)); } catch { toast.error('Lỗi tải tiện ích'); }
  }, [hostId]);

  useEffect(() => {
    (async () => { setLoading(true); await Promise.all([fetchGroups(), fetchAllCatalogs()]); setLoading(false); })();
  }, [fetchGroups, fetchAllCatalogs]);

  const handleSaveGroup = async (d: { tenNhom: string; thuTu: number }) => {
    try {
      if (groupModal.edit) { await adminAmenityAPI.updateGroup(groupModal.edit.maNhomTienNghi, d); toast.success('Đã cập nhật'); }
      else { await adminAmenityAPI.createGroup({ ...d, hostId }); toast.success('Đã thêm nhóm mới'); }
      await fetchGroups();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Thao tác thất bại';
      toast.error(msg, { duration: 5000 });
    }
  };

  const handleToggleGroup = async (id: number) => {
    try {
      const r = await adminAmenityAPI.toggleGroup(id);
      toast.success(r.hoatDong ? 'Đã hiển thị nhóm và tất cả tiện ích con' : 'Đã ẩn nhóm và tất cả tiện ích con');
      await fetchGroups();
      await fetchAllCatalogs();
    } catch { toast.error('Thao tác thất bại'); }
  };

  const handleSaveCatalog = async (d: { maNhomTienNghi: number; ten: string; bieuTuong?: string; moTa?: string }) => {
    try {
      if (catalogModal.edit) { await adminAmenityAPI.updateCatalog(catalogModal.edit.maTienNghi, d); toast.success('Đã cập nhật'); }
      else { await adminAmenityAPI.createCatalog({ ...d, hostId }); toast.success('Đã thêm tiện ích mới'); }
      await fetchAllCatalogs();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Thao tác thất bại';
      toast.error(msg, { duration: 5000 });
    }
  };

  const handleToggleCatalog = async (id: number) => {
    try {
      const r = await adminAmenityAPI.toggleCatalog(id);
      toast.success(r.hoatDong ? 'Đã hiển thị' : 'Đã ẩn');
      await fetchAllCatalogs();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Thao tác thất bại';
      toast.error(msg, { duration: 5000 });
    }
  };

  const getGroupName = (c: DanhMucTienNghi) => c.nhom?.tenNhom || groups.find(g => g.maNhomTienNghi === c.maNhomTienNghi)?.tenNhom || '—';

  // Count catalogs per group - check both direct field and nested nhom object
  const catalogCountByGroup = (groupId: number) => catalogs.filter(c => {
    const catGroupId = c.maNhomTienNghi ?? c.nhom?.maNhomTienNghi;
    return catGroupId === groupId;
  }).length;

  if (loading) return (
    <div className="admin-container admin-page-content">
      <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF385C]" /></div>
    </div>
  );

  return (
    <div className="admin-container admin-page-content relative admin-page-enter">
      {/* Header + Tabs + Nút thêm trên cùng 1 hàng */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* Tabs bên trái */}
        <div className="flex gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-xl w-fit">
          {([ { k: 'groups' as const, l: 'Nhóm tiện nghi' }, { k: 'catalog' as const, l: 'Danh mục tiện ích' } ]).map(t => (
            <button key={t.k} onClick={() => { setTab(t.k); setGroupPage(1); setCatalogPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t.k ? 'bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
              {t.l}
            </button>
          ))}
        </div>
        {/* Nút thêm bên phải */}
        <button
          onClick={() => tab === 'groups' ? setGroupModal({ open: true, edit: null }) : setCatalogModal({ open: true, edit: null })}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#FF385C] rounded-lg hover:bg-[#E31C5F] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          {tab === 'groups' ? 'Thêm nhóm' : 'Thêm tiện ích'}
        </button>
      </div>

      {/* ===== GROUPS TAB ===== */}
      {tab === 'groups' && (() => {
        const paginatedGroups = groups.slice((groupPage - 1) * PAGE_SIZE, groupPage * PAGE_SIZE);
        return (
        <div className="bg-white dark:bg-[#161616] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] shadow-sm overflow-hidden">
          {groups.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p className="font-medium">Chưa có nhóm tiện nghi nào</p>
              <p className="text-sm mt-1">Nhấn &quot;Thêm nhóm&quot; để bắt đầu</p>
            </div>
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-[#2a2a2a]">
                    <th className="text-left px-6 py-3 font-semibold text-gray-500 dark:text-gray-400">Thứ tự</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-500 dark:text-gray-400">Tên nhóm</th>
                    <th className="text-center px-6 py-3 font-semibold text-gray-500 dark:text-gray-400">Số tiện ích</th>
                    <th className="text-center px-6 py-3 font-semibold text-gray-500 dark:text-gray-400">Hiển thị</th>
                    <th className="text-right px-6 py-3 font-semibold text-gray-500 dark:text-gray-400">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#2a2a2a]">
                  {paginatedGroups.map(g => {
                    const hidden = !g.hoatDong;
                    const count = catalogCountByGroup(g.maNhomTienNghi);
                    return (
                      <tr key={g.maNhomTienNghi} className={`transition-colors ${hidden ? 'bg-gray-50/50 opacity-55' : 'hover:bg-gray-50 dark:hover:bg-white/[0.02]'}`}>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${hidden ? 'bg-gray-100 text-gray-400' : 'bg-[#FF385C]/10 text-[#FF385C]'}`}>
                            {g.thuTu}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={hidden ? 'line-through decoration-gray-400 text-gray-400 dark:text-gray-500 font-semibold' : 'font-semibold text-gray-900 dark:text-gray-100'}>
                            {g.tenNhom}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${hidden ? 'bg-gray-100 text-gray-400' : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'}`}>
                            {count} tiện ích
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <button onClick={() => handleToggleGroup(g.maNhomTienNghi)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${g.hoatDong ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                            title={g.hoatDong ? 'Đang hiển thị - nhấn để ẩn nhóm và tất cả tiện ích con' : 'Đang ẩn - nhấn để hiển thị'}>
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${g.hoatDong ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center justify-end">
                            <button onClick={() => setGroupModal({ open: true, edit: g })} className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Sửa">
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
            <Pagination inline currentPage={groupPage} totalPages={Math.ceil(groups.length / PAGE_SIZE)} onPageChange={setGroupPage} />
            </>
          )}
        </div>
        );
      })()}

      {/* ===== CATALOG TAB ===== */}
      {tab === 'catalog' && (() => {
        // Lọc local theo selectedGroup
        const displayed = selectedGroup ? catalogs.filter(c => (c.maNhomTienNghi ?? c.nhom?.maNhomTienNghi) === selectedGroup) : catalogs;
        const paginatedCatalogs = displayed.slice((catalogPage - 1) * PAGE_SIZE, catalogPage * PAGE_SIZE);
        return (
        <>
          {/* Filter Pills */}
          <div className="flex gap-2 mb-2 overflow-x-auto pb-3 scrollbar-thin">
            <button onClick={() => { setSelectedGroup(null); setCatalogPage(1); }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${selectedGroup === null ? 'bg-[#FF385C] text-white shadow-sm' : 'bg-white dark:bg-[#1e1e1e] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#333] hover:border-gray-300'}`}>
              Tất cả ({catalogs.length})
            </button>
            {groups.filter(g => g.hoatDong).map(g => {
              const count = catalogs.filter(c => (c.maNhomTienNghi ?? c.nhom?.maNhomTienNghi) === g.maNhomTienNghi).length;
              return (
                <button key={g.maNhomTienNghi} onClick={() => { setSelectedGroup(g.maNhomTienNghi); setCatalogPage(1); }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${selectedGroup === g.maNhomTienNghi ? 'bg-[#FF385C] text-white shadow-sm' : 'bg-white dark:bg-[#1e1e1e] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#333] hover:border-gray-300'}`}>
                  {g.tenNhom} <span className={`ml-1 text-xs ${selectedGroup === g.maNhomTienNghi ? 'text-white/70' : 'text-gray-400'}`}>({count})</span>
                </button>
              );
            })}
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-[#161616] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] shadow-sm overflow-hidden">
            {displayed.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <p className="font-medium">Chưa có tiện ích nào</p>
                <p className="text-sm mt-1">Nhấn &quot;Thêm tiện ích&quot; để bắt đầu</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-[#2a2a2a]">
                      <th className="text-left px-6 py-3 font-semibold text-gray-500 dark:text-gray-400">Tiện ích</th>
                      <th className="text-left px-6 py-3 font-semibold text-gray-500 dark:text-gray-400">Nhóm</th>
                      <th className="text-left px-6 py-3 font-semibold text-gray-500 dark:text-gray-400">Icon</th>
                      <th className="text-center px-6 py-3 font-semibold text-gray-500 dark:text-gray-400">Hiển thị</th>
                      <th className="text-right px-6 py-3 font-semibold text-gray-500 dark:text-gray-400">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#2a2a2a]">
                    {paginatedCatalogs.map(c => {
                      const hidden = !c.hoatDong;
                      return (
                        <tr key={c.maTienNghi} className={`transition-colors ${hidden ? 'bg-gray-50/50 opacity-55' : 'hover:bg-gray-50 dark:hover:bg-white/[0.02]'}`}>
                          <td className="px-6 py-3.5">
                            <span className={hidden ? 'line-through decoration-gray-400 text-gray-400 dark:text-gray-500 font-medium' : 'font-medium text-gray-900 dark:text-gray-100'}>
                              {c.ten}
                            </span>
                            {c.moTa && <p className="text-xs text-gray-400 mt-0.5">{c.moTa}</p>}
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${hidden ? 'bg-gray-100 text-gray-400' : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'}`}>
                              {getGroupName(c)}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-xs font-mono text-gray-400">{c.bieuTuong || '—'}</td>
                          <td className="px-6 py-3.5 text-center">
                            <button onClick={() => handleToggleCatalog(c.maTienNghi)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${c.hoatDong ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                              title={c.hoatDong ? 'Đang hiển thị - nhấn để ẩn' : 'Đang ẩn - nhấn để hiển thị'}>
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${c.hoatDong ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="flex items-center justify-end">
                              <button onClick={() => setCatalogModal({ open: true, edit: c })} className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Sửa">
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
            )}
            <Pagination inline currentPage={catalogPage} totalPages={Math.ceil(displayed.length / PAGE_SIZE)} onPageChange={setCatalogPage} />
          </div>
        </>
        );
      })()}

      {/* Modals */}
      <GroupModal open={groupModal.open} onClose={() => setGroupModal({ open: false, edit: null })} onSave={handleSaveGroup} initial={groupModal.edit} />
      <CatalogModal open={catalogModal.open} onClose={() => setCatalogModal({ open: false, edit: null })} onSave={handleSaveCatalog} initial={catalogModal.edit} groups={groups} />
    </div>
  );
}
