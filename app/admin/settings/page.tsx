'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAdminTheme, type AdminThemeMode } from '@/context/AdminThemeContext';
import { adminWalletAPI, pricingRulesAPI, type AdminWallet } from '@/lib/api';

const SETTINGS_KEY = 'admin-platform-settings';

type PlatformSettings = {
    siteName: string;
    contactEmail: string;
    serviceFeePercent: number;
    maintenanceMode: boolean;
    allowNewRegistrations: boolean;
    emailAlerts: boolean;
    compactTables: boolean;
};

const DEFAULT_SETTINGS: PlatformSettings = {
    siteName: 'Airbnb Homestay',
    contactEmail: 'support@airbnb-homestay.vn',
    serviceFeePercent: 12,
    maintenanceMode: false,
    allowNewRegistrations: true,
    emailAlerts: true,
    compactTables: false,
};

function Toggle({
    checked,
    onChange,
    accent = 'brand',
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    accent?: 'brand' | 'green';
}) {
    const onClass = accent === 'green' ? 'bg-emerald-500' : 'bg-[#FF385C]';
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${checked ? onClass : 'bg-gray-200 dark:bg-gray-600'}`}
        >
            <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
            />
        </button>
    );
}

function ThemeOption({
    mode,
    current,
    label,
    description,
    preview,
    onSelect,
}: {
    mode: AdminThemeMode;
    current: AdminThemeMode;
    label: string;
    description: string;
    preview: React.ReactNode;
    onSelect: (m: AdminThemeMode) => void;
}) {
    const active = current === mode;
    return (
        <button
            type="button"
            onClick={() => onSelect(mode)}
            className={`text-left rounded-xl border-2 p-3 transition-all w-full ${
                active
                    ? 'border-[#FF385C] bg-[#FF385C]/5 dark:bg-[#FF385C]/10 ring-1 ring-[#FF385C]/30'
                    : 'border-gray-200 dark:border-[#333] hover:border-gray-300 dark:hover:border-[#444] bg-white dark:bg-[#1a1a1a]'
            }`}
        >
            <div className="mb-3 rounded-lg overflow-hidden border border-gray-100 dark:border-[#333] h-20 relative">
                {preview}
                {active && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#FF385C] flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                )}
            </div>
            <p className={`text-sm font-semibold ${active ? 'text-[#FF385C]' : 'text-gray-900 dark:text-gray-100'}`}>{label}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        </button>
    );
}

export default function AdminSettingsPage() {
    const { theme, setTheme, resolvedTheme } = useAdminTheme();
    const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
    const [hydrated, setHydrated] = useState(false);
    const [wallet, setWallet] = useState<AdminWallet | null>(null);
    const [serviceFeeRate, setServiceFeeRate] = useState<number>(10);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
        } catch {
            /* ignore */
        }
        setHydrated(true);

        adminWalletAPI.get().then(data => {
            setWallet(data);
        }).catch(() => {});

        pricingRulesAPI.get().then(data => {
            setServiceFeeRate(data.tyLePhiDichVu ?? 10);
        }).catch(() => {});
    }, []);

    const patch = (partial: Partial<PlatformSettings>) => {
        setSettings(prev => ({ ...prev, ...partial }));
    };

    const handleSave = () => {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        toast.success('Đã lưu cài đặt nền tảng');
    };

    const handleCancel = () => {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
            else setSettings(DEFAULT_SETTINGS);
        } catch {
            setSettings(DEFAULT_SETTINGS);
        }
        toast('Đã hủy thay đổi', { icon: '↩️' });
    };

    if (!hydrated) {
        return (
            <div className="admin-container admin-page-content flex justify-center py-24">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FF385C]" />
            </div>
        );
    }

    return (
        <div className="admin-container admin-page-content admin-page-enter max-w-4xl">
            <div className="space-y-8">
                {/* ═══════════════════════════ Giao diện ═══════════════════════════ */}
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-sm">
                            <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900 dark:text-gray-50">Giao diện</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Chế độ sáng / tối cho toàn bộ khu vực admin</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                        <ThemeOption
                            mode="light"
                            current={theme}
                            label="Sáng"
                            description="Nền sáng, dễ đọc ban ngày"
                            onSelect={setTheme}
                            preview={<div className="h-full bg-[#F7F7F7] flex"><div className="w-1/3 bg-white border-r border-gray-200" /><div className="flex-1 p-2 space-y-1"><div className="h-2 bg-gray-200 rounded w-3/4" /><div className="h-2 bg-gray-100 rounded w-1/2" /></div></div>}
                        />
                        <ThemeOption
                            mode="dark"
                            current={theme}
                            label="Tối"
                            description="Giảm mỏi mắt khi làm việc đêm"
                            onSelect={setTheme}
                            preview={<div className="h-full bg-[#0d0d0d] flex"><div className="w-1/3 bg-[#161616] border-r border-[#333]" /><div className="flex-1 p-2 space-y-1"><div className="h-2 bg-[#333] rounded w-3/4" /><div className="h-2 bg-[#222] rounded w-1/2" /></div></div>}
                        />
                        <ThemeOption
                            mode="system"
                            current={theme}
                            label="Hệ thống"
                            description="Theo thiết bị (macOS / Windows)"
                            onSelect={setTheme}
                            preview={<div className="h-full flex"><div className="w-1/2 bg-[#F7F7F7]" /><div className="w-1/2 bg-[#0d0d0d]" /></div>}
                        />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Đang hiển thị: <span className="font-semibold text-gray-700 dark:text-gray-200">{resolvedTheme === 'dark' ? 'Chế độ tối' : 'Chế độ sáng'}</span>
                        {theme === 'system' && ' (theo hệ thống)'}
                    </p>
                </section>

                {/* ═══════════════════════════ Ví admin ═══════════════════════════ */}
                <section className="admin-card rounded-2xl border border-gray-100 dark:border-[#2a2a2a] bg-white dark:bg-[#161616] shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-[#2a2a2a]">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF385C] to-[#E31C5F] flex items-center justify-center shrink-0 shadow-sm">
                                <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-gray-900 dark:text-gray-50">Ví admin</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Số dư từ phí dịch vụ hệ thống</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="bg-gradient-to-br from-[#FF385C] via-[#E8365A] to-[#C00B36] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                            {/* Decorative circles */}
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />
                            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-widest opacity-80 font-semibold">Tài khoản</p>
                                            <p className="font-bold text-sm">{wallet?.hoTen || 'nguyenp coder'}</p>
                                        </div>
                                    </div>
                                    <span className="bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider border border-white/20">
                                        Premium Admin
                                    </span>
                                </div>

                                <div className="mb-5">
                                    <p className="text-xs opacity-70 mb-1 font-medium">số dư ví</p>
                                    <p className="text-4xl font-extrabold tracking-tight">
                                        {(wallet?.soDu || 0).toLocaleString('vi-VN')} <span className="text-2xl opacity-80">đ</span>
                                    </p>
                                </div>

                                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3.5 flex items-center justify-between border border-white/10">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium opacity-90">Tổng phí dịch vụ đã thu</span>
                                    </div>
                                    <span className="text-lg font-bold">
                                        {(wallet?.totalServiceFee || 0).toLocaleString('vi-VN')}đ
                                    </span>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Ví chỉ nhận tiền từ phí dịch vụ ({serviceFeeRate}% mỗi giao dịch). Không bao gồm tiền thanh toán của khách.
                        </p>
                    </div>
                </section>

                {/* ═══════════════════════════ Vận hành & trải nghiệm ═══════════════════════════ */}
                <section>
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm">
                            <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900 dark:text-gray-50">Vận hành & trải nghiệm</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Điều khiển hệ thống và tùy chọn giao diện bảng</p>
                        </div>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-[#2a2a2a]">
                        {[
                            {
                                title: 'Chế độ bảo trì',
                                desc: 'Chặn truy cập website công khai (chỉ admin)',
                                key: 'maintenanceMode' as const,
                                accent: 'brand' as const,
                            },
                            {
                                title: 'Cho phép đăng ký mới',
                                desc: 'Người dùng có thể tạo tài khoản',
                                key: 'allowNewRegistrations' as const,
                                accent: 'green' as const,
                            },
                            {
                                title: 'Cảnh báo email admin',
                                desc: 'Thông báo đơn chờ xác nhận, hoàn tiền',
                                key: 'emailAlerts' as const,
                                accent: 'brand' as const,
                            },
                            {
                                title: 'Bảng dạng compact',
                                desc: 'Giảm padding trên danh sách admin',
                                key: 'compactTables' as const,
                                accent: 'brand' as const,
                            },
                        ].map(row => (
                            <div key={row.key} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{row.title}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{row.desc}</p>
                                </div>
                                <Toggle
                                    checked={settings[row.key]}
                                    onChange={v => patch({ [row.key]: v })}
                                    accent={row.accent}
                                />
                            </div>
                        ))}
                    </div>
                </section>

                {/* ═══════════════════════════ Footer ═══════════════════════════ */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-[#2a2a2a]">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        Cài đặt lưu trên trình duyệt. Giao diện áp dụng ngay; các tham số khác cần tích hợp API backend.
                    </p>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="px-6 py-2.5 border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-sm hover:bg-gray-50 dark:hover:bg-[#222] transition-all active:scale-[0.98]"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#FF385C] hover:bg-[#E31C5F] text-white rounded-xl font-semibold text-sm transition-all shadow-md active:scale-[0.98] shrink-0"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Lưu thay đổi
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
