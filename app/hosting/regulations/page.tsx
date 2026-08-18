'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { quyDinhAPI, chinhSachHuyAPI, pricingRulesAPI, QuyDinh, ChinhSachHoanTien } from '@/lib/api';

const nhomLabels: Record<string, string> = {
    gia_ca: 'Quy định về giá',
    hoan_tien: 'Hoàn tiền',
    noi_quy: 'Nội quy chỗ ở',
    giao_tiep: 'Giao tiếp & hỗ trợ',
    chung: 'Quy định chung',
};

const doiTuongLabels: Record<string, string> = { tat_ca: 'Tất cả', chu_nha: 'Chủ nhà', khach: 'Khách' };

export default function HostingRegulationsPage() {
    const [quyDinhs, setQuyDinhs] = useState<QuyDinh[]>([]);
    const [policies, setPolicies] = useState<ChinhSachHoanTien[]>([]);
    const [pricingRules, setPricingRules] = useState<{ tyLeNguoiLon: number; tyLeTreEm: number; tyLePhiDichVu: number } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [qd, cs, pr] = await Promise.all([
                    quyDinhAPI.list({ doiTuong: 'chu_nha' }),
                    chinhSachHuyAPI.list(),
                    pricingRulesAPI.get().then(d => ({
                        tyLeNguoiLon: d.tyLeNguoiLon,
                        tyLeTreEm: d.tyLeTreEm,
                        tyLePhiDichVu: d.tyLePhiDichVu ?? 10,
                    })).catch(() => null),
                ]);
                setQuyDinhs(qd);
                setPolicies(cs);
                setPricingRules(pr);
            } catch {
                console.error('Failed to fetch regulations');
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    const grouped = useMemo(() => quyDinhs.reduce<Record<string, QuyDinh[]>>((acc, q) => {
        (acc[q.nhom] = acc[q.nhom] || []).push(q);
        return acc;
    }, {}), [quyDinhs]);

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
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#FF385C] mb-1">Quy định & chính sách nền tảng</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Các quy định áp dụng cho chủ nhà, chính sách hoàn tiền và cách tính giá phòng
                    </p>
                </div>
                <Link href="/hosting/listings"
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#FF385C] rounded-lg hover:bg-[#E31C5F] transition-colors shrink-0">
                    Quản lý phòng cho thuê
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="admin-stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/15 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium admin-muted uppercase tracking-wider">Phí dịch vụ nền tảng</p>
                            <p className="text-lg font-bold text-blue-600 mt-0.5">
                                {pricingRules ? `${pricingRules.tyLePhiDichVu}%` : '10%'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t admin-inner-border-t text-xs text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        Trên giá phòng + phí vệ sinh
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium admin-muted uppercase tracking-wider">Người lớn</p>
                            <p className="text-lg font-bold text-emerald-600 mt-0.5">{pricingRules ? `${pricingRules.tyLeNguoiLon}%` : '100%'} giá gốc</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t admin-inner-border-t text-xs text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Từ 13 tuổi trở lên
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-500/15 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium admin-muted uppercase tracking-wider">Trẻ em (2–12 tuổi)</p>
                            <p className="text-lg font-bold text-amber-600 mt-0.5">{pricingRules ? `${pricingRules.tyLeTreEm}%` : '60%'} giá gốc</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t admin-inner-border-t text-xs text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Em bé dưới 2 tuổi: miễn phí
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-500/15 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium admin-muted uppercase tracking-wider">Chính sách hủy</p>
                            <p className="text-lg font-bold text-purple-600 mt-0.5">{policies.length} lựa chọn</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t admin-inner-border-t text-xs text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        Chọn khi tạo phòng cho thuê
                    </div>
                </div>
            </div>

            {/* ===== CHÍNH SÁCH HỦY & HOÀN TIỀN ===== */}
            <div className="mb-3">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Chính sách hủy & hoàn tiền</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 mb-8">
                {policies.map(p => (
                    <div key={p.maChinhSach}
                        className="bg-white dark:bg-[#161616] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] shadow-sm p-5 flex flex-col w-[calc((100%-32px)/3)] shrink-0">
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                    p.ma === 'LINH_HOAT' ? 'bg-emerald-500' : p.ma === 'TRUNG_BINH' ? 'bg-amber-500' : 'bg-red-500'
                                }`} />
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{p.ten}</h3>
                            </div>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
                                p.tyLeHoanTien >= 100
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                            }`}>
                                Hoàn {p.tyLeHoanTien}%
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed flex-1">{p.moTa}</p>
                        <p className="text-[11px] text-gray-400 mt-3 pt-3 border-t border-gray-100 dark:border-[#2a2a2a]">
                            Hủy miễn phí trước <span className="font-semibold text-gray-600 dark:text-gray-300">{p.soNgayTruoc} ngày</span> khi nhận phòng
                        </p>
                    </div>
                ))}
            </div>

            {/* ===== QUY ĐỊNH THEO NHÓM ===== */}
            {Object.entries(grouped).map(([nhom, items]) => (
                <div key={nhom} className="mb-6">
                    <div className="mb-3">
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100">{nhomLabels[nhom] || nhom}</h2>
                    </div>
                    <div className="admin-table-wrap justify-between overflow-hidden">
                        <div className="overflow-x-auto flex-1">
                            <table className="min-w-full text-sm text-left table-auto">
                                <thead className="admin-thead text-gray-600 font-semibold text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 w-10"></th>
                                        <th className="px-6 py-4">Quy định</th>
                                        <th className="px-6 py-4 w-32">Đối tượng</th>
                                    </tr>
                                </thead>
                                <tbody className="admin-tbody">
                                    {items.map(q => (
                                        <tr key={q.maQuyDinh} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.03] transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-gray-900 dark:text-gray-100 leading-tight">{q.tieuDe}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed max-w-3xl">{q.noiDung}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                                                    q.doiTuong === 'chu_nha'
                                                        ? 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400'
                                                        : 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                                                }`}>
                                                    {q.doiTuong === 'chu_nha' && (
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                    )}
                                                    {doiTuongLabels[q.doiTuong] || q.doiTuong}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ))}

            {/* Lưu ý */}
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-400">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>
                    <span className="font-semibold">Lưu ý:</span> Chủ nhà chịu trách nhiệm tuân thủ quy định nền tảng. Chính sách hủy được chọn khi tạo phòng sẽ được áp dụng cho mọi đặt chỗ. Liên hệ qua Hộp thư đến nếu cần hỗ trợ thêm.
                </p>
            </div>
        </div>
    );
}