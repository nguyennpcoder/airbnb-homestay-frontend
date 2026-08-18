'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Modal, message } from 'antd';
import { quyDinhAPI, chinhSachHuyAPI, QuyDinh, ChinhSachHoanTien } from '@/lib/api';

const doiTuongLabels: Record<string, string> = { tat_ca: 'Tất cả', chu_nha: 'Chủ nhà', khach: 'Khách' };
const nhomLabels: Record<string, string> = {
    gia_ca: 'Giá cả', hoan_tien: 'Hoàn tiền', noi_quy: 'Nội quy', giao_tiep: 'Giao tiếp', chung: 'Chung',
};

const inputCls = "w-full px-3 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#FF385C]/20 focus:border-[#FF385C] transition-all border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 placeholder-gray-400";
const labelCls = "block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide";

function ModalShell({ title, subtitle, onClose, children, footer }: {
    title: string;
    subtitle?: string;
    onClose: () => void;
    children: React.ReactNode;
    footer: React.ReactNode;
}) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);
    if (!mounted) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/55"
            onClick={onClose}
        >
            <div className="admin-modal-panel w-full sm:max-w-lg flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="relative border-b admin-subtle-border pl-4 pr-12 py-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-full hover:bg-gray-100 text-gray-500 z-10"
                        aria-label="Đóng"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <h3 className="text-base font-semibold admin-heading">{title}</h3>
                    {subtitle && <p className="text-xs admin-muted mt-0.5">{subtitle}</p>}
                </div>
                <div className="overflow-y-auto max-h-[calc(100vh-8rem)] px-4 py-3">{children}</div>
                <div className="border-t admin-subtle-border px-4 py-3 flex items-center justify-end gap-2">
                    {footer}
                </div>
            </div>
        </div>,
        document.body
    );
}

const btnCancel = "px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors whitespace-nowrap";
const btnSave = "inline-flex items-center gap-2 px-4 py-2 bg-[#FF385C] hover:bg-[#E31C5F] text-white text-xs font-bold rounded-lg transition-colors shadow-sm whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed";

export default function AdminRegulationsPage() {
    const [policies, setPolicies] = useState<ChinhSachHoanTien[]>([]);
    const [quyDinhs, setQuyDinhs] = useState<QuyDinh[]>([]);
    const [loading, setLoading] = useState(true);

    // Editor state (shared between create & edit)
    const [policyDraft, setPolicyDraft] = useState<ChinhSachHoanTien | null>(null);
    const [policyIsNew, setPolicyIsNew] = useState(false);
    const [policySaving, setPolicySaving] = useState(false);
    const [quyDinhDraft, setQuyDinhDraft] = useState<QuyDinh | null>(null);
    const [quyDinhIsNew, setQuyDinhIsNew] = useState(false);
    const [quyDinhSaving, setQuyDinhSaving] = useState(false);

    const fetchAll = async () => {
        try {
            const [p, q] = await Promise.all([chinhSachHuyAPI.adminList(), quyDinhAPI.adminList()]);
            setPolicies(p);
            setQuyDinhs(q);
        } catch {
            message.error('Không thể tải dữ liệu quy định');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const stats = useMemo(() => {
        const activeQd = quyDinhs.filter(q => q.active).length;
        const hiddenQd = quyDinhs.length - activeQd;
        const nhomCount = new Set(quyDinhs.map(q => q.nhom)).size;
        return { policyCount: policies.length, activeQd, hiddenQd, nhomCount };
    }, [policies, quyDinhs]);

    const openNewPolicy = () => {
        setPolicyDraft({ maChinhSach: 0, ma: '', ten: '', moTa: '', tyLeHoanTien: 100, soNgayTruoc: 1, thuTu: policies.length + 1 });
        setPolicyIsNew(true);
    };

    const openEditPolicy = (p: ChinhSachHoanTien) => {
        setPolicyDraft({ ...p });
        setPolicyIsNew(false);
    };

    const handleSavePolicy = async () => {
        if (!policyDraft) return;
        if (!policyDraft.ma?.trim() || !policyDraft.ten?.trim()) {
            message.error('Mã và tên chính sách không được bỏ trống');
            return;
        }
        if (policyDraft.tyLeHoanTien < 0 || policyDraft.tyLeHoanTien > 100) {
            message.error('Tỷ lệ hoàn tiền phải từ 0% đến 100%');
            return;
        }
        setPolicySaving(true);
        try {
            if (policyIsNew) {
                await chinhSachHuyAPI.adminCreate(policyDraft);
                message.success('Đã thêm chính sách hủy mới');
            } else {
                await chinhSachHuyAPI.adminUpdate(policyDraft.maChinhSach, policyDraft);
                message.success('Đã cập nhật chính sách hủy');
            }
            setPolicyDraft(null);
            fetchAll();
        } catch (e: any) {
            message.error(e?.response?.data?.message || 'Lưu thất bại');
        } finally {
            setPolicySaving(false);
        }
    };

    const handleDeletePolicy = (p: ChinhSachHoanTien) => {
        Modal.confirm({
            title: 'Xóa chính sách hủy',
            content: `Bạn có chắc muốn xóa "${p.ten}"? Các phòng đang dùng chính sách này sẽ hiển thị tên chính sách cũ.`,
            okText: 'Xóa',
            okButtonProps: { danger: true },
            cancelText: 'Hủy',
            centered: true,
            onOk: async () => {
                try {
                    await chinhSachHuyAPI.adminDelete(p.maChinhSach);
                    message.success('Đã xóa chính sách hủy');
                    fetchAll();
                } catch (e: any) {
                    message.error(e?.response?.data?.message || 'Xóa thất bại');
                }
            },
        });
    };

    const openNewQuyDinh = () => {
        setQuyDinhDraft({ maQuyDinh: 0, ma: '', tieuDe: '', noiDung: '', doiTuong: 'tat_ca', nhom: 'chung', thuTu: quyDinhs.length + 1, active: true });
        setQuyDinhIsNew(true);
    };

    const openEditQuyDinh = (q: QuyDinh) => {
        setQuyDinhDraft({ ...q });
        setQuyDinhIsNew(false);
    };

    const handleSaveQuyDinh = async () => {
        if (!quyDinhDraft) return;
        if (!quyDinhDraft.ma?.trim() || !quyDinhDraft.tieuDe?.trim()) {
            message.error('Mã và tiêu đề không được bỏ trống');
            return;
        }
        setQuyDinhSaving(true);
        try {
            if (quyDinhIsNew) {
                await quyDinhAPI.adminCreate(quyDinhDraft);
                message.success('Đã thêm quy định mới');
            } else {
                await quyDinhAPI.adminUpdate(quyDinhDraft.maQuyDinh, quyDinhDraft);
                message.success('Đã cập nhật quy định');
            }
            setQuyDinhDraft(null);
            fetchAll();
        } catch (e: any) {
            message.error(e?.response?.data?.message || 'Lưu thất bại');
        } finally {
            setQuyDinhSaving(false);
        }
    };

    const handleDeleteQuyDinh = (q: QuyDinh) => {
        Modal.confirm({
            title: 'Xóa quy định',
            content: `Bạn có chắc muốn xóa "${q.tieuDe}"?`,
            okText: 'Xóa',
            okButtonProps: { danger: true },
            cancelText: 'Hủy',
            centered: true,
            onOk: async () => {
                try {
                    await quyDinhAPI.adminDelete(q.maQuyDinh);
                    message.success('Đã xóa quy định');
                    fetchAll();
                } catch (e: any) {
                    message.error(e?.response?.data?.message || 'Xóa thất bại');
                }
            },
        });
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
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#FF385C] mb-1">Quản lý quy định nền tảng</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Quản lý chính sách hủy và các quy định áp dụng cho khách và chủ nhà
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="admin-stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/15 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium admin-muted uppercase tracking-wider">Chính sách hủy</p>
                            <p className="text-lg font-bold admin-heading mt-0.5">{stats.policyCount}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t admin-inner-border-t text-xs text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        Dùng cho khi tạo phòng
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium admin-muted uppercase tracking-wider">Đang hoạt động</p>
                            <p className="text-lg font-bold text-emerald-600 mt-0.5">{stats.activeQd}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t admin-inner-border-t text-xs text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Quy định hiển thị công khai
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-500/15 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium admin-muted uppercase tracking-wider">Đang ẩn</p>
                            <p className="text-lg font-bold text-amber-600 mt-0.5">{stats.hiddenQd}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t admin-inner-border-t text-xs text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Không hiển thị cho người dùng
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-500/15 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium admin-muted uppercase tracking-wider">Nhóm quy định</p>
                            <p className="text-lg font-bold text-purple-600 mt-0.5">{stats.nhomCount}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t admin-inner-border-t text-xs text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        Giá cả · Hoàn tiền · Nội quy...
                    </div>
                </div>
            </div>

            {/* ===== CHÍNH SÁCH HỦY ===== */}
            <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Chính sách hủy & hoàn tiền</h2>
                <button
                    onClick={openNewPolicy}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#FF385C] rounded-lg hover:bg-[#E31C5F] transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Thêm mới
                </button>
            </div>
            <div className="admin-table-wrap justify-between overflow-hidden mb-8">
                <div className="overflow-x-auto flex-1">
                    <table className="min-w-full text-sm text-left table-auto">
                        <thead className="admin-thead text-gray-600 font-semibold text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Mã</th>
                                <th className="px-6 py-4">Tên chính sách</th>
                                <th className="px-6 py-4">Hoàn tiền</th>
                                <th className="px-6 py-4">Hủy miễn phí trước</th>
                                <th className="px-6 py-4 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="admin-tbody">
                            {policies.map(p => (
                                <tr key={p.maChinhSach} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.03] transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="admin-id-badge">{p.ma}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2.5">
                                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                                p.ma === 'LINH_HOAT' ? 'bg-emerald-500' : p.ma === 'TRUNG_BINH' ? 'bg-amber-500' : 'bg-red-500'
                                            }`} />
                                            <div className="min-w-0">
                                                <p className="font-semibold text-gray-900 dark:text-gray-100 leading-tight">{p.ten}</p>
                                                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{p.moTa}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                            p.tyLeHoanTien >= 100
                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                                : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                                        }`}>{p.tyLeHoanTien}%</span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                        {p.soNgayTruoc} ngày trước nhận phòng
                                    </td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                        <button onClick={() => openEditPolicy(p)}
                                            className="text-[#FF385C] hover:underline text-xs font-semibold mr-4">Chỉnh sửa</button>
                                        <button onClick={() => handleDeletePolicy(p)}
                                            className="text-red-500 hover:underline text-xs font-semibold">Xóa</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ===== QUY ĐỊNH ===== */}
            <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Quy định nền tảng</h2>
                <button
                    onClick={openNewQuyDinh}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#FF385C] rounded-lg hover:bg-[#E31C5F] transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Thêm mới
                </button>
            </div>
            <div className="admin-table-wrap justify-between overflow-hidden">
                <div className="overflow-x-auto flex-1">
                    <table className="min-w-full text-sm text-left table-auto">
                        <thead className="admin-thead text-gray-600 font-semibold text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Mã</th>
                                <th className="px-6 py-4">Tiêu đề</th>
                                <th className="px-6 py-4">Nhóm</th>
                                <th className="px-6 py-4">Đối tượng</th>
                                <th className="px-6 py-4">Trạng thái</th>
                                <th className="px-6 py-4 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="admin-tbody">
                            {quyDinhs.map(q => (
                                <tr key={q.maQuyDinh} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.03] transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="admin-id-badge">{q.ma}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-semibold text-gray-900 dark:text-gray-100 leading-tight">{q.tieuDe}</p>
                                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 max-w-md">{q.noiDung}</p>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-xs px-2.5 py-1 rounded-full bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400 font-semibold">
                                            {nhomLabels[q.nhom] || q.nhom}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                                            q.doiTuong === 'chu_nha'
                                                ? 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400'
                                                : q.doiTuong === 'khach'
                                                    ? 'bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400'
                                                    : 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                                        }`}>
                                            {doiTuongLabels[q.doiTuong] || q.doiTuong}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                                            q.active
                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                                : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                                        }`}>
                                            {q.active ? 'Hoạt động' : 'Ẩn'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                        <button onClick={() => openEditQuyDinh(q)}
                                            className="text-[#FF385C] hover:underline text-xs font-semibold mr-4">Chỉnh sửa</button>
                                        <button onClick={() => handleDeleteQuyDinh(q)}
                                            className="text-red-500 hover:underline text-xs font-semibold">Xóa</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ===== MODAL CHÍNH SÁCH HỦY ===== */}
            {policyDraft && (
                <ModalShell
                    title={policyIsNew ? 'Thêm chính sách hủy' : 'Chỉnh sửa chính sách hủy'}
                    subtitle="Chính sách áp dụng khi chủ nhà chọn trong lúc tạo phòng cho thuê"
                    onClose={() => setPolicyDraft(null)}
                    footer={
                        <>
                            <button className={btnCancel} onClick={() => setPolicyDraft(null)}>Hủy</button>
                            <button className={btnSave} onClick={handleSavePolicy} disabled={policySaving}>
                                {policySaving && (
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                    </svg>
                                )}
                                {policySaving ? 'Đang lưu...' : 'Lưu chính sách'}
                            </button>
                        </>
                    }
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>Mã chính sách</label>
                                <input className={inputCls} placeholder="VD: LINH_HOAT"
                                    value={policyDraft.ma}
                                    disabled={!policyIsNew}
                                    onChange={e => setPolicyDraft({ ...policyDraft, ma: e.target.value.toUpperCase() })} />
                                {!policyIsNew && (
                                    <p className="text-[11px] text-gray-400 mt-1.5">Mã không thể thay đổi sau khi tạo</p>
                                )}
                            </div>
                            <div>
                                <label className={labelCls}>Tên chính sách</label>
                                <input className={inputCls} placeholder="VD: Linh hoạt"
                                    value={policyDraft.ten}
                                    onChange={e => setPolicyDraft({ ...policyDraft, ten: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Mô tả</label>
                            <textarea className={`${inputCls} min-h-[90px] resize-none`} placeholder="Mô tả chi tiết chính sách hoàn tiền..."
                                value={policyDraft.moTa || ''}
                                onChange={e => setPolicyDraft({ ...policyDraft, moTa: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className={labelCls}>Tỷ lệ hoàn</label>
                                <div className="relative">
                                    <input type="number" min={0} max={100} className={`${inputCls} pr-8`} value={policyDraft.tyLeHoanTien}
                                        onChange={e => setPolicyDraft({ ...policyDraft, tyLeHoanTien: Number(e.target.value) })} />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">%</span>
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Hủy trước</label>
                                <div className="relative">
                                    <input type="number" min={0} className={`${inputCls} pr-14`} value={policyDraft.soNgayTruoc}
                                        onChange={e => setPolicyDraft({ ...policyDraft, soNgayTruoc: Number(e.target.value) })} />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">ngày</span>
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Thứ tự</label>
                                <input type="number" min={0} className={inputCls} value={policyDraft.thuTu}
                                    onChange={e => setPolicyDraft({ ...policyDraft, thuTu: Number(e.target.value) })} />
                            </div>
                        </div>
                    </div>
                </ModalShell>
            )}

            {/* ===== MODAL QUY ĐỊNH ===== */}
            {quyDinhDraft && (
                <ModalShell
                    title={quyDinhIsNew ? 'Thêm quy định' : 'Chỉnh sửa quy định'}
                    subtitle="Quy định sẽ hiển thị theo đối tượng trên trang Nội quy của khách và chủ nhà"
                    onClose={() => setQuyDinhDraft(null)}
                    footer={
                        <>
                            <button className={btnCancel} onClick={() => setQuyDinhDraft(null)}>Hủy</button>
                            <button className={btnSave} onClick={handleSaveQuyDinh} disabled={quyDinhSaving}>
                                {quyDinhSaving && (
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                    </svg>
                                )}
                                {quyDinhSaving ? 'Đang lưu...' : 'Lưu quy định'}
                            </button>
                        </>
                    }
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>Mã quy định</label>
                                <input className={inputCls} placeholder="VD: gio_yen_tinh"
                                    value={quyDinhDraft.ma}
                                    disabled={!quyDinhIsNew}
                                    onChange={e => setQuyDinhDraft({ ...quyDinhDraft, ma: e.target.value.toLowerCase().replace(/\s+/g, '_') })} />
                                {!quyDinhIsNew ? (
                                    <p className="text-[11px] text-gray-400 mt-1.5">Mã không thể thay đổi sau khi tạo</p>
                                ) : (
                                    <p className="text-[11px] text-gray-400 mt-1.5">Không dấu, dùng gạch dưới. VD: gio_yen_tinh</p>
                                )}
                            </div>
                            <div>
                                <label className={labelCls}>Tiêu đề</label>
                                <input className={inputCls} placeholder="VD: Giờ yên tĩnh"
                                    value={quyDinhDraft.tieuDe}
                                    onChange={e => setQuyDinhDraft({ ...quyDinhDraft, tieuDe: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Nội dung</label>
                            <textarea className={`${inputCls} min-h-[90px] resize-none`} placeholder="Nội dung quy định..."
                                value={quyDinhDraft.noiDung || ''}
                                onChange={e => setQuyDinhDraft({ ...quyDinhDraft, noiDung: e.target.value })} />
                        </div>
                        <div>
                            <label className={labelCls}>Nhóm</label>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(nhomLabels).map(([k, v]) => (
                                    <button key={k} type="button" onClick={() => setQuyDinhDraft({ ...quyDinhDraft, nhom: k })}
                                        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                                            quyDinhDraft.nhom === k
                                                ? 'border-[#FF385C] bg-[#FF385C]/5 text-[#FF385C]'
                                                : 'border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-300 hover:border-gray-400'
                                        }`}>
                                        <span className={`w-2 h-2 rounded-full ${
                                            k === 'gia_ca' ? 'bg-sky-500' : k === 'hoan_tien' ? 'bg-emerald-500'
                                                : k === 'noi_quy' ? 'bg-amber-500' : k === 'giao_tiep' ? 'bg-purple-500' : 'bg-gray-400'
                                        }`} />
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Đối tượng hiển thị</label>
                            <div className="grid grid-cols-3 gap-2">
                                {Object.entries(doiTuongLabels).map(([k, v]) => (
                                    <button key={k} type="button" onClick={() => setQuyDinhDraft({ ...quyDinhDraft, doiTuong: k })}
                                        className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                                            quyDinhDraft.doiTuong === k
                                                ? 'border-[#FF385C] bg-[#FF385C]/5 text-[#FF385C]'
                                                : 'border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-300 hover:border-gray-400'
                                        }`}>
                                        {v}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1.5">
                                Khách xem quy định <span className="font-semibold">Khách + Tất cả</span> · Chủ nhà xem <span className="font-semibold">Chủ nhà + Tất cả</span>
                            </p>
                        </div>
                        <div className="flex items-center justify-between gap-3 pt-1">
                            <div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Hoạt động</p>
                                <p className="text-xs text-gray-400 mt-0.5">Hiển thị công khai cho người dùng</p>
                            </div>
                            <button type="button" onClick={() => setQuyDinhDraft({ ...quyDinhDraft, active: !quyDinhDraft.active })}
                                className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                                    quyDinhDraft.active ? 'bg-[#FF385C]' : 'bg-gray-300 dark:bg-gray-600'
                                }`}>
                                <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                                    quyDinhDraft.active ? 'translate-x-5' : ''
                                }`} />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>Thứ tự</label>
                                <input type="number" min={0} className={inputCls} value={quyDinhDraft.thuTu}
                                    onChange={e => setQuyDinhDraft({ ...quyDinhDraft, thuTu: Number(e.target.value) })} />
                            </div>
                        </div>
                    </div>
                </ModalShell>
            )}
        </div>
    );
}