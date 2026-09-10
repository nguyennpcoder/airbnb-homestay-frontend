'use client';
export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminAPI, thongBaoAPI, User } from '@/lib/api';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import ConfirmModal from '@/components/ConfirmModal';
import BackendImage from '@/components/BackendImage';
import { getValidSrc } from '@/lib/image';
import AdminPhoneLink from '@/components/admin/AdminPhoneLink';

const ITEMS_PER_PAGE = 6;

type RoleFilter = 'all' | 'admin' | 'host' | 'guest';
type StatusFilter = 'all' | 'active' | 'locked' | 'unverified' | 'pending_host';

const ROLE_OPTIONS: { value: RoleFilter; label: string }[] = [
    { value: 'all', label: 'Tất cả vai trò' },
    { value: 'admin', label: 'Admin' },
    { value: 'host', label: 'Host' },
    { value: 'guest', label: 'Guest' },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'active', label: 'Hoạt động' },
    { value: 'locked', label: 'Bị khóa' },
    { value: 'unverified', label: 'Chưa xác nhận email' },
    { value: 'pending_host', label: 'Chờ duyệt Host' },
];

function isAdminUser(user: User) {
    return user.laAdmin || user.email === 'admin@airbnb.com.vn';
}

function getRoleInfo(user: User) {
    if (isAdminUser(user)) return { label: 'Admin', className: 'bg-red-50 text-red-700 border border-red-200' };
    if (user.laChuNha) return { label: 'Host', className: 'bg-amber-50 text-amber-700 border border-amber-200' };
    return { label: 'Guest', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
}

function getAccountStatus(user: User) {
    if (user.biKhoa) return { label: 'Bị khóa', className: 'bg-red-50 text-red-700 border border-red-200', dot: 'bg-red-500' };
    if (!user.emailDaXacNhan) return { label: 'Chưa xác nhận', className: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-500' };
    return { label: 'Hoạt động', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' };
}

function formatDate(value?: string, withTime = false) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('vi-VN', withTime
        ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
        : { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatVND(amount?: number | null) {
    if (amount == null) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}

function VerifiedBadge({ className = 'w-4 h-4' }: { className?: string }) {
    return (
        <svg className={`${className} text-blue-500 shrink-0`} fill="currentColor" viewBox="0 0 20 20" aria-label="Đã xác minh danh tính">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
    );
}

function UserName({ user, className = 'font-medium text-gray-900 truncate' }: { user: User; className?: string }) {
    return (
        <span className={`inline-flex items-center gap-1 min-w-0 ${className}`}>
            <span className="truncate">{user.hoTen || user.ten || 'Người dùng'}</span>
            {user.xacMinhDanhTinh && <VerifiedBadge className="w-3.5 h-3.5" />}
        </span>
    );
}

function UserAvatar({ user, size = 40 }: { user: User; size?: number }) {
    const cls = 'rounded-full bg-gray-200 overflow-hidden relative shrink-0 flex items-center justify-center text-xs font-bold text-gray-500 border border-gray-100';
    const style = { width: size, height: size };
    if (user.urlAnhDaiDien) {
        return (
            <div className={cls} style={style}>
                <BackendImage src={getValidSrc(user.urlAnhDaiDien)} alt={user.hoTen || 'User'} fill className="object-cover" sizes={`${size}px`} />
            </div>
        );
    }
    return (
        <div className={cls} style={style}>
            {(user.hoTen || user.ten || 'U').charAt(0).toUpperCase()}
        </div>
    );
}

function PillBadge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <span className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-semibold whitespace-nowrap border ${className}`}>
            {children}
        </span>
    );
}

function WaitingIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
    return (
        <svg className={`${className} shrink-0 text-amber-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
        </svg>
    );
}

function ErrorIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
    return (
        <svg className={`${className} shrink-0 text-red-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

function SuccessCheckIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
    return (
        <svg className={`${className} shrink-0 text-emerald-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
    );
}

function StatusBadges({ user }: { user: User }) {
    return (
        <>
            {user.xacMinhDanhTinh && (
                <PillBadge className="bg-blue-50 text-blue-700 border-blue-200">KYC</PillBadge>
            )}
            {user.emailDaXacNhan ? (
                <PillBadge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    <SuccessCheckIcon className="w-3 h-3" /> Email
                </PillBadge>
            ) : (
                <PillBadge className="bg-amber-50 text-amber-700 border-amber-200">
                    <WaitingIcon className="w-3 h-3" /> Email
                </PillBadge>
            )}
            {user.daChapNhanCamKetCongDong ? (
                <PillBadge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    <SuccessCheckIcon className="w-3 h-3" /> Cam kết
                </PillBadge>
            ) : (
                <PillBadge className="bg-amber-50 text-amber-700 border-amber-200">
                    <WaitingIcon className="w-3 h-3" /> Cam kết
                </PillBadge>
            )}
        </>
    );
}

function StatusValue({ variant, children }: { variant: 'success' | 'warning' | 'error' | 'neutral'; children: React.ReactNode }) {
    const styles = {
        success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        warning: 'bg-amber-50 text-amber-700 border-amber-200',
        error: 'bg-red-50 text-red-700 border-red-200',
        neutral: 'bg-gray-50 text-gray-600 border-gray-200',
    };
    const icons = {
        success: <SuccessCheckIcon />,
        warning: <WaitingIcon />,
        error: <ErrorIcon />,
        neutral: null,
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border ${styles[variant]}`}>
            {icons[variant]}
            {children}
        </span>
    );
}

function DetailCell({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="py-2.5 min-h-[3.25rem]">
            <p className="text-[11px] font-medium admin-muted uppercase tracking-wide leading-none">{label}</p>
            <div className="text-sm admin-heading mt-1.5 break-words">{value}</div>
        </div>
    );
}

function DetailRowPair({
    left,
    right,
}: {
    left: { label: string; value: React.ReactNode };
    right: { label: string; value: React.ReactNode };
}) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 border-b admin-subtle-border last:border-0">
            <DetailCell label={left.label} value={left.value} />
            <DetailCell label={right.label} value={right.value} />
        </div>
    );
}

function UserIdBadge({ id }: { id: number }) {
    return (
        <span className="admin-id-badge shrink-0 w-[3rem] text-center">
            #{id}
        </span>
    );
}

function ModalCloseButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="absolute top-2.5 right-2.5 p-1.5 rounded-full hover:bg-gray-100 text-gray-500 z-10"
            aria-label="Đóng"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
    );
}

function ModalPortal({
    children,
    onClose,
    zIndexClass = 'z-[200]',
}: {
    children: React.ReactNode;
    onClose: () => void;
    zIndexClass?: string;
}) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted) return null;

    return createPortal(
        <div
            className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-4 bg-black/55`}
            onClick={onClose}
        >
            {children}
        </div>,
        document.body
    );
}

function UserManagementPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean; title: string; message: string; onConfirm: () => void; isDangerous?: boolean;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [kycImageViewer, setKycImageViewer] = useState<{ isOpen: boolean; url: string }>({ isOpen: false, url: '' });
    const [kycModal, setKycModal] = useState<{ isOpen: boolean; user: User | null; verify: boolean }>({ isOpen: false, user: null, verify: false });
    const [hostRoleModal, setHostRoleModal] = useState<{ isOpen: boolean; user: User | null; makeHost: boolean }>({ isOpen: false, user: null, makeHost: false });
    const [approveHostModal, setApproveHostModal] = useState<{ isOpen: boolean; user: User | null; notificationId: number | null; commitment: string; showRejectConfirm: boolean }>({ isOpen: false, user: null, notificationId: null, commitment: '', showRejectConfirm: false });
    const [lockModal, setLockModal] = useState<{ isOpen: boolean; user: User | null; reason: string; lockError: string }>({ isOpen: false, user: null, reason: '', lockError: '' });

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await adminAPI.getUsers();
            setUsers(Array.isArray(res) ? res : []);
        } catch {
            toast.error('Không thể tải danh sách người dùng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    // Real-time refresh: listen for new notifications/host requests from WebSocket
    useEffect(() => {
        const handleRefresh = () => fetchUsers();
        window.addEventListener('notifications-updated', handleRefresh);
        window.addEventListener('hostRequestApproved', handleRefresh);
        return () => {
            window.removeEventListener('notifications-updated', handleRefresh);
            window.removeEventListener('hostRequestApproved', handleRefresh);
        };
    }, []);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, roleFilter, statusFilter]);

    const openUserDetail = (user: User) => {
        setSelectedUser(user);
        router.replace(`/admin/users?userId=${user.maNguoiDung}`, { scroll: false });
    };

    const closeUserDetail = () => {
        setSelectedUser(null);
        if (searchParams.get('userId')) {
            router.replace('/admin/users', { scroll: false });
        }
    };

    const summary = useMemo(() => ({
        total: users.length,
        hosts: users.filter(u => u.laChuNha && !isAdminUser(u)).length,
        verified: users.filter(u => u.xacMinhDanhTinh).length,
        locked: users.filter(u => u.biKhoa).length,
        active: users.filter(u => u.emailDaXacNhan && !u.biKhoa).length,
    }), [users]);

    const filteredUsers = useMemo(() => users.filter(user => {
        const q = searchTerm.toLowerCase();
        const matchSearch = !q ||
            (user.hoTen || user.ten || '').toLowerCase().includes(q) ||
            (user.email || '').toLowerCase().includes(q) ||
            (user.soDienThoai || '').includes(q) ||
            (user.thanhPhoSong || '').toLowerCase().includes(q) ||
            String(user.maNguoiDung).includes(q);

        const matchRole =
            roleFilter === 'all' ||
            (roleFilter === 'admin' && isAdminUser(user)) ||
            (roleFilter === 'host' && user.laChuNha && !isAdminUser(user)) ||
            (roleFilter === 'guest' && !user.laChuNha && !isAdminUser(user));

        const matchStatus =
            statusFilter === 'all' ||
            (statusFilter === 'active' && user.emailDaXacNhan && !user.biKhoa) ||
            (statusFilter === 'locked' && user.biKhoa) ||
            (statusFilter === 'unverified' && !user.emailDaXacNhan) ||
            (statusFilter === 'pending_host' && (user as any).coYeuCauHost === true && !user.laChuNha && !isAdminUser(user));

        return matchSearch && matchRole && matchStatus;
    }), [users, searchTerm, roleFilter, statusFilter]);

    const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
    const hasActiveFilters = searchTerm !== '' || roleFilter !== 'all' || statusFilter !== 'all';

    useEffect(() => {
        if (loading) return;
        const idParam = searchParams.get('userId');
        if (!idParam) return;
        const id = Number(idParam);
        if (!Number.isFinite(id)) return;
        const user = users.find(u => u.maNguoiDung === id);
        if (user) setSelectedUser(user);
    }, [loading, users, searchParams]);

    useEffect(() => {
        const idParam = searchParams.get('userId');
        if (!idParam || filteredUsers.length === 0) return;
        const id = Number(idParam);
        const idx = filteredUsers.findIndex(u => u.maNguoiDung === id);
        if (idx >= 0) setCurrentPage(Math.floor(idx / ITEMS_PER_PAGE) + 1);
    }, [searchParams, filteredUsers]);

    const clearFilters = () => {
        setSearchTerm('');
        setRoleFilter('all');
        setStatusFilter('all');
    };

    useEffect(() => {
        const open = !!selectedUser || kycModal.isOpen || hostRoleModal.isOpen || approveHostModal.isOpen || lockModal.isOpen || confirmModal.isOpen;
        document.body.style.overflow = open ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [selectedUser, kycModal.isOpen, hostRoleModal.isOpen, approveHostModal.isOpen, lockModal.isOpen, confirmModal.isOpen]);

    const handleOpenLockModal = (user: User) => setLockModal({ isOpen: true, user, reason: '', lockError: '' });

    const handleLockConfirm = async () => {
        const reason = lockModal.reason.trim();
        const user = lockModal.user;
        if (!user || !reason) {
            setLockModal(prev => ({ ...prev, lockError: 'Vui lòng nhập lý do khóa tài khoản' }));
            return;
        }
        try {
            await adminAPI.lockUserWithReason(user.maNguoiDung, reason);
            toast.success(`Đã khóa người dùng ${user.hoTen}`);
            fetchUsers();
            if (selectedUser?.maNguoiDung === user.maNguoiDung) {
                setSelectedUser(prev => prev ? { ...prev, biKhoa: true, lyDoKhoa: reason } : null);
            }
            setLockModal({ isOpen: false, user: null, reason: '', lockError: '' });
        } catch {
            toast.error('Lỗi khi khóa người dùng');
        }
    };

    const handleUnlockUser = (user: User) => {
        setConfirmModal({
            isOpen: true,
            title: 'Mở khóa người dùng',
            message: `Bạn có muốn mở khóa tài khoản cho ${user.hoTen}?`,
            isDangerous: false,
            onConfirm: async () => {
                try {
                    await adminAPI.unlockUser(user.maNguoiDung);
                    toast.success(`Đã mở khóa người dùng ${user.hoTen}`);
                    fetchUsers();
                    if (selectedUser?.maNguoiDung === user.maNguoiDung) {
                        setSelectedUser(prev => prev ? { ...prev, biKhoa: false, lyDoKhoa: undefined } : null);
                    }
                } catch {
                    toast.error('Lỗi khi mở khóa người dùng');
                }
            },
        });
    };

    const handleKycConfirm = async () => {
        if (!kycModal.user) return;
        try {
            await adminAPI.verifyUserIdentity(kycModal.user.maNguoiDung, kycModal.verify);
            toast.success(kycModal.verify ? 'Đã xác minh KYC' : 'Đã hủy xác minh KYC');
            fetchUsers();
            setSelectedUser(prev => prev ? { ...prev, xacMinhDanhTinh: kycModal.verify } : null);
        } catch {
            toast.error('Lỗi khi cập nhật xác minh KYC');
        }
        setKycModal({ isOpen: false, user: null, verify: false });
    };

    const handleHostRoleConfirm = async () => {
        if (!hostRoleModal.user) return;
        try {
            await adminAPI.toggleHostRole(hostRoleModal.user.maNguoiDung);
            toast.success(`Đã đổi vai trò thành ${hostRoleModal.makeHost ? 'Host' : 'Guest'}`);
            fetchUsers();
            setSelectedUser(prev => prev ? { ...prev, laChuNha: hostRoleModal.makeHost } : null);
        } catch {
            toast.error('Lỗi khi thay đổi vai trò');
        }
        setHostRoleModal({ isOpen: false, user: null, makeHost: false });
    };

    const handleOpenApproveHost = async (user: User) => {
        // Fetch pending HOST_REQUEST notification for this user
        try {
            const adminId = localStorage.getItem('adminId') || localStorage.getItem('userId');
            if (!adminId) return;
            const notifs = await thongBaoAPI.getNotifications(Number(adminId));
            const pendingReq = notifs.find(n =>
                n.loaiThongBao === 'HOST_REQUEST' &&
                n.trangThai === 'PENDING' &&
                n.nguoiGui?.maNguoiDung === user.maNguoiDung
            );
            if (pendingReq) {
                setApproveHostModal({
                    isOpen: true,
                    user,
                    notificationId: pendingReq.id,
                    commitment: pendingReq.noiDung || 'Không có cam kết',
                    showRejectConfirm: false
                });
            } else {
                toast.error('Không tìm thấy yêu cầu host nào từ người dùng này');
            }
        } catch {
            toast.error('Lỗi khi tải thông tin yêu cầu');
        }
    };

    const handleApproveHost = async () => {
        if (!approveHostModal.notificationId) return;
        try {
            await thongBaoAPI.accept(approveHostModal.notificationId);
            toast.success(`Đã duyệt ${approveHostModal.user?.hoTen} làm Host!`);
            fetchUsers();
            setSelectedUser(prev => prev ? { ...prev, laChuNha: true, coYeuCauHost: false } : null);
            setApproveHostModal({ isOpen: false, user: null, notificationId: null, commitment: '', showRejectConfirm: false });
            // Notify all listeners to refresh
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('hostRequestApproved'));
                window.dispatchEvent(new Event('profile-updated'));
            }
        } catch {
            toast.error('Lỗi khi duyệt host');
        }
    };

    const handleRejectHost = async () => {
        if (!approveHostModal.notificationId) return;
        const userEmail = approveHostModal.user?.email || 'Không có email';
        try {
            await thongBaoAPI.reject(approveHostModal.notificationId);
            toast.success(`Đã từ chối ${approveHostModal.user?.hoTen} làm Host`);
            fetchUsers();
            setSelectedUser(prev => prev ? { ...prev, coYeuCauHost: false } : null);
            setApproveHostModal({ isOpen: false, user: null, notificationId: null, commitment: '', showRejectConfirm: false });
            // Notify all listeners to refresh
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('hostRequestApproved'));
                window.dispatchEvent(new Event('profile-updated'));
            }
        } catch {
            toast.error('Lỗi khi từ chối host');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C]" />
            </div>
        );
    }

    return (
        <div className="admin-container admin-page-content relative admin-page-enter">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>
                    {/* <h1 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h1> */}
                    {/* <p className="text-sm text-gray-500 mt-1">
                        {summary.total} tài khoản trên hệ thống ·{' '}
                        <span className="font-medium text-gray-700">{summary.active} đang hoạt động</span>
                    </p> */}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="admin-stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/15 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium admin-muted uppercase tracking-wider">Tổng người dùng</p>
                            <p className="text-lg font-bold admin-heading mt-0.5">{summary.total}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t admin-inner-border-t text-xs text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        Toàn bộ hệ thống
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
                            <p className="text-xs font-medium admin-muted uppercase tracking-wider">Hoạt động</p>
                            <p className="text-lg font-bold text-emerald-600 mt-0.5">{summary.active}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t admin-inner-border-t text-xs text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {summary.verified} đã KYC
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-500/15 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium admin-muted uppercase tracking-wider">Host</p>
                            <p className="text-lg font-bold text-amber-600 mt-0.5">{summary.hosts}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t admin-inner-border-t text-xs text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Chủ nhà trên nền tảng
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-500/15 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium admin-muted uppercase tracking-wider">Bị khóa</p>
                            <p className="text-lg font-bold text-red-600 mt-0.5">{summary.locked}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t admin-inner-border-t text-xs text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        Tài khoản bị vô hiệu hóa
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="admin-toolbar flex flex-wrap items-center gap-3 mb-6">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <input
                        type="text"
                        placeholder="Tìm tên, email, SĐT, thành phố, ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm admin-field rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF385C]/20 focus:border-[#FF385C] transition-all"
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                <div className="relative">
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
                        className="admin-select pr-9 cursor-pointer hover:border-gray-300 dark:hover:border-[#444] focus:outline-none focus:ring-2 focus:ring-[#FF385C]/20 focus:border-[#FF385C] transition-all"
                    >
                        {ROLE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>

                <div className="relative">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                        className="admin-select pr-9 cursor-pointer hover:border-gray-300 dark:hover:border-[#444] focus:outline-none focus:ring-2 focus:ring-[#FF385C]/20 focus:border-[#FF385C] transition-all"
                    >
                        {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>

                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Xóa bộ lọc
                    </button>
                )}

                <div className="ml-auto text-sm text-gray-400 font-medium">
                    <span className="text-gray-700">{filteredUsers.length}</span> / {users.length} người dùng
                </div>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
                <div className="admin-table-wrap justify-between overflow-hidden">
                    <div className="overflow-x-auto flex-1">
                        <table className="min-w-full text-sm text-left table-auto">
                            <thead className="admin-thead text-gray-600 font-semibold text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Người dùng</th>
                                    <th className="px-6 py-4">Liên hệ</th>
                                    <th className="px-6 py-4">Hồ sơ</th>
                                    <th className="px-6 py-4">Vai trò</th>
                                    <th className="px-6 py-4">Trạng thái</th>
                                    <th className="px-6 py-4">Hoạt động</th>
                                    <th className="px-6 py-4">Tham gia</th>
                                    <th className="px-6 py-4 text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="admin-tbody">
                                {paginatedUsers.length > 0 ? paginatedUsers.map((user, index) => {
                                    const role = getRoleInfo(user);
                                    const accountStatus = getAccountStatus(user);
                                    return (
                                        <tr
                                            key={user.maNguoiDung}
                                            className="hover:bg-gray-50/50 dark:hover:bg-white/[0.03] transition-colors admin-table-row-stagger"
                                            style={{ '--row-delay': `${index * 0.04}s` } as React.CSSProperties}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2.5 min-w-[200px]">
                                                    <UserIdBadge id={user.maNguoiDung} />
                                                    <UserAvatar user={user} size={40} />
                                                    <div className="min-w-0">
                                                        <UserName user={user} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 min-w-[160px]">
                                                <p className="text-gray-900 truncate text-sm">{user.email}</p>
                                                <p className="text-xs admin-muted mt-0.5">
                                                    <AdminPhoneLink phone={user.soDienThoai} />
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 min-w-[120px]">
                                                <p className="text-sm text-gray-900 truncate">{user.thanhPhoSong || '—'}</p>
                                                <p className="text-xs text-gray-500 truncate">{user.congViec || (user.ngaySinh ? formatDate(user.ngaySinh) : '—')}</p>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${role.className}`}>{role.label}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${accountStatus.className}`}>
                                                    <span className={`w-2 h-2 rounded-full ${accountStatus.dot}`} />
                                                    {accountStatus.label}
                                                </span>
                                                {user.xacMinhDanhTinh && (
                                                    <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-semibold text-blue-600">KYC ✓</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-xs space-y-0.5">
                                                    <p className="text-gray-900"><span className="text-gray-500">Đặt chỗ:</span> {user.soLuongDatCho ?? 0}</p>
                                                    <p className="text-gray-900"><span className="text-gray-500">Listing:</span> {user.soLuongListing ?? 0}</p>
                                                    {(user.soDu != null && user.soDu > 0) && (
                                                        <p className="text-emerald-600 font-semibold">{formatVND(user.soDu)}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <p className="text-sm text-gray-900">{formatDate(user.ngayTao)}</p>
                                                {user.laChuNha && user.diemDanhGiaHost != null && Number(user.diemDanhGiaHost) > 0 && (
                                                    <p className="text-xs text-gray-500">★ {Number(user.diemDanhGiaHost).toFixed(1)} ({user.soLuongDanhGiaHost ?? 0})</p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openUserDetail(user)}
                                                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
                                                    >
                                                        Chi tiết
                                                    </button>
                                                    {(user as any).coYeuCauHost && !user.laChuNha && !isAdminUser(user) && (
                                                        <button
                                                            onClick={() => handleOpenApproveHost(user)}
                                                            className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-amber-900 text-xs font-bold rounded-lg transition-colors shadow-sm whitespace-nowrap border border-amber-300"
                                                        >
                                                            Duyệt Host
                                                        </button>
                                                    )}
                                                    {user.email !== 'admin@airbnb.com.vn' && (
                                                        user.biKhoa ? (
                                                            <button
                                                                onClick={() => handleUnlockUser(user)}
                                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm whitespace-nowrap"
                                                            >
                                                                Mở khóa
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleOpenLockModal(user)}
                                                                className="px-4 py-2 bg-[#FF385C] hover:bg-[#E31C5F] text-white text-xs font-bold rounded-lg transition-colors shadow-sm whitespace-nowrap"
                                                            >
                                                                Khóa
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                </div>
                                                <p className="text-gray-500 font-medium">
                                                    {hasActiveFilters ? 'Không tìm thấy người dùng nào' : 'Chưa có người dùng nào'}
                                                </p>
                                                {hasActiveFilters && (
                                                    <button onClick={clearFilters} className="mt-3 text-sm text-[#FF385C] font-medium hover:underline">
                                                        Xóa bộ lọc
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="border-t border-gray-100 px-6 py-3 flex items-center justify-center h-16 shrink-0">
                        {filteredUsers.length > ITEMS_PER_PAGE && (
                            <Pagination inline currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
                {paginatedUsers.length > 0 ? paginatedUsers.map((user, index) => {
                    const role = getRoleInfo(user);
                    const accountStatus = getAccountStatus(user);
                    return (
                        <div
                            key={user.maNguoiDung}
                            className="admin-panel shadow-sm admin-mobile-card-enter"
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold ${accountStatus.className}`}>
                                        <span className={`w-2 h-2 rounded-full ${accountStatus.dot}`} />
                                        {accountStatus.label}
                                    </span>
                                </div>
                                <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold ${role.className}`}>{role.label}</span>
                            </div>
                            <div className="px-4 py-3 space-y-3">
                                <div className="flex items-center gap-2.5">
                                    <UserIdBadge id={user.maNguoiDung} />
                                    <UserAvatar user={user} size={44} />
                                    <div className="flex-1 min-w-0">
                                        <UserName user={user} className="font-semibold text-gray-900 truncate" />
                                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div><span className="text-gray-500">Đặt chỗ</span><p className="font-semibold text-gray-900">{user.soLuongDatCho ?? 0}</p></div>
                                    <div><span className="text-gray-500">Listing</span><p className="font-semibold text-gray-900">{user.soLuongListing ?? 0}</p></div>
                                    <div><span className="text-gray-500">Tham gia</span><p className="font-semibold text-gray-900">{formatDate(user.ngayTao)}</p></div>
                                </div>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    <button
                                        onClick={() => openUserDetail(user)}
                                        className="flex-1 min-w-[100px] text-center px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold transition-colors"
                                    >
                                        Chi tiết
                                    </button>
                                    {(user as any).coYeuCauHost && !user.laChuNha && !isAdminUser(user) && (
                                        <button
                                            onClick={() => handleOpenApproveHost(user)}
                                            className="flex-1 min-w-[100px] px-3 py-2.5 bg-amber-400 hover:bg-amber-500 text-amber-900 text-sm font-bold rounded-lg transition-colors shadow-sm border border-amber-300"
                                        >
                                            Duyệt Host
                                        </button>
                                    )}
                                    {user.email !== 'admin@airbnb.com.vn' && (
                                        user.biKhoa ? (
                                            <button onClick={() => handleUnlockUser(user)} className="flex-1 min-w-[100px] px-3 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold">Mở khóa</button>
                                        ) : (
                                            <button onClick={() => handleOpenLockModal(user)} className="flex-1 min-w-[100px] px-3 py-2.5 bg-[#FF385C] text-white rounded-lg text-sm font-bold">Khóa</button>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="admin-panel shadow-sm py-12 text-center">
                        <p className="text-sm text-gray-500">
                            {hasActiveFilters ? 'Không tìm thấy người dùng nào' : 'Chưa có người dùng nào'}
                        </p>
                    </div>
                )}
                {filteredUsers.length > ITEMS_PER_PAGE && (
                    <div className="pt-3 flex justify-center">
                        <Pagination inline currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </div>
                )}
            </div>

            {/* Detail modal */}
            {selectedUser && (
                <ModalPortal onClose={closeUserDetail}>
                    <div className="admin-modal-panel w-full sm:max-w-2xl" onClick={e => e.stopPropagation()}>
                        <div className="relative border-b admin-subtle-border pl-4 pr-12 py-3">
                            <ModalCloseButton onClick={closeUserDetail} />
                            <div className="flex items-center gap-2.5">
                                <UserIdBadge id={selectedUser.maNguoiDung} />
                                <UserAvatar user={selectedUser} size={48} />
                                <div className="min-w-0">
                                    <h2 className="text-base font-semibold admin-heading flex items-center gap-1.5 min-w-0">
                                        <span className="truncate">{selectedUser.hoTen || selectedUser.ten}</span>
                                        {selectedUser.xacMinhDanhTinh && <VerifiedBadge className="w-4 h-4" />}
                                    </h2>
                                    <p className="text-xs admin-muted truncate">{selectedUser.email}</p>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-y-auto max-h-[calc(100vh-8rem)] px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                <PillBadge className={getRoleInfo(selectedUser).className}>
                                    {getRoleInfo(selectedUser).label}
                                </PillBadge>
                                <PillBadge className={getAccountStatus(selectedUser).className}>
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${getAccountStatus(selectedUser).dot}`} />
                                    {getAccountStatus(selectedUser).label}
                                </PillBadge>
                                <StatusBadges user={selectedUser} />
                            </div>

                            <div className="grid grid-cols-3 gap-3 mb-4">
                                <div className="bg-gray-50 dark:bg-white/[0.04] rounded-xl px-3 py-2.5 border admin-subtle-border">
                                    <p className="text-[10px] font-semibold uppercase text-gray-500">Đặt chỗ</p>
                                    <p className="text-base font-bold text-gray-900">{selectedUser.soLuongDatCho ?? 0}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-white/[0.04] rounded-xl px-3 py-2.5 border admin-subtle-border">
                                    <p className="text-[10px] font-semibold uppercase text-gray-500">Listing</p>
                                    <p className="text-base font-bold text-gray-900">{selectedUser.soLuongListing ?? 0}</p>
                                </div>
                                <div className="bg-emerald-50 rounded-xl px-3 py-2.5 border border-emerald-100">
                                    <p className="text-[10px] font-semibold uppercase text-emerald-600">Số dư</p>
                                    <p className="text-base font-bold text-emerald-700">{formatVND(selectedUser.soDu)}</p>
                                </div>
                            </div>

                            <div className="rounded-xl border border-gray-100 overflow-hidden px-4 mb-1">
                                <DetailRowPair
                                    left={{ label: 'Họ tên', value: selectedUser.hoTen || `${selectedUser.ho || ''} ${selectedUser.ten || ''}`.trim() || '—' }}
                                    right={{ label: 'Ngày tham gia', value: formatDate(selectedUser.ngayTao, true) }}
                                />
                                <DetailRowPair
                                    left={{ label: 'Email', value: selectedUser.email || '—' }}
                                    right={{ label: 'Cập nhật lần cuối', value: formatDate(selectedUser.ngayCapNhat, true) }}
                                />
                                <DetailRowPair
                                    left={{ label: 'Số điện thoại', value: <AdminPhoneLink phone={selectedUser.soDienThoai} /> }}
                                    right={{
                                        label: 'Email xác nhận',
                                        value: selectedUser.emailDaXacNhan
                                            ? <StatusValue variant="success">Đã xác nhận</StatusValue>
                                            : <StatusValue variant="warning">Chưa xác nhận</StatusValue>,
                                    }}
                                />
                                <DetailRowPair
                                    left={{ label: 'Ngày sinh', value: formatDate(selectedUser.ngaySinh) }}
                                    right={{
                                        label: 'Cam kết cộng đồng',
                                        value: selectedUser.daChapNhanCamKetCongDong
                                            ? <StatusValue variant="success">Đã chấp nhận</StatusValue>
                                            : <StatusValue variant="warning">Chưa chấp nhận</StatusValue>,
                                    }}
                                />
                                <DetailRowPair
                                    left={{ label: 'Thành phố', value: selectedUser.thanhPhoSong || '—' }}
                                    right={{
                                        label: 'Tin nhắn tiếp thị',
                                        value: selectedUser.nhanTinNhanTiepThi
                                            ? <StatusValue variant="success">Đồng ý</StatusValue>
                                            : <StatusValue variant="error">Từ chối</StatusValue>,
                                    }}
                                />
                                <DetailRowPair
                                    left={{ label: 'Nghề nghiệp', value: selectedUser.congViec || '—' }}
                                    right={{
                                        label: selectedUser.laChuNha ? 'Đánh giá Host' : 'Xác minh KYC',
                                        value: selectedUser.laChuNha ? (
                                            selectedUser.diemDanhGiaHost != null && Number(selectedUser.diemDanhGiaHost) > 0
                                                ? `★ ${Number(selectedUser.diemDanhGiaHost).toFixed(1)} (${selectedUser.soLuongDanhGiaHost ?? 0} đánh giá)`
                                                : 'Chưa có đánh giá'
                                        ) : (
                                            selectedUser.xacMinhDanhTinh
                                                ? <StatusValue variant="success">{selectedUser.ngayXacMinh ? formatDate(selectedUser.ngayXacMinh, true) : 'Đã xác minh'}</StatusValue>
                                                : <StatusValue variant="warning">Chưa xác minh</StatusValue>
                                        ),
                                    }}
                                />
                                {selectedUser.laChuNha && selectedUser.xacMinhDanhTinh && selectedUser.ngayXacMinh && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 border-b admin-subtle-border last:border-0">
                                        <DetailCell
                                            label="Xác minh KYC"
                                            value={<StatusValue variant="success">{formatDate(selectedUser.ngayXacMinh, true)}</StatusValue>}
                                        />
                                        <div className="hidden sm:block" aria-hidden="true" />
                                    </div>
                                )}
                            </div>

                            {selectedUser.urlBangChungDanhTinh && (
                                <div className="mt-3">
                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">📸 Giấy tờ xác minh danh tính (CCCD):</p>
                                    <div className="rounded-xl overflow-hidden border admin-subtle-border bg-gray-50 dark:bg-white/[0.04]">
                                        <img
                                            src={selectedUser.urlBangChungDanhTinh}
                                            alt="CCCD"
                                            className="w-full max-h-64 object-contain cursor-zoom-in"
                                            onClick={() => setKycImageViewer({ isOpen: true, url: selectedUser.urlBangChungDanhTinh || '' })}
                                        />
                                    </div>
                                </div>
                            )}

                            {selectedUser.biKhoa && selectedUser.lyDoKhoa && (
                                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                                    <p className="text-[11px] font-bold text-red-700 uppercase">Lý do khóa</p>
                                    <p className="text-sm text-gray-900 mt-1">{selectedUser.lyDoKhoa}</p>
                                </div>
                            )}

                            {selectedUser.email !== 'admin@airbnb.com.vn' && (
                                <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setKycModal({ isOpen: true, user: selectedUser, verify: !selectedUser.xacMinhDanhTinh })}
                                        className={`flex-1 min-w-[120px] px-3 py-2.5 rounded-lg text-xs font-bold border ${
                                            selectedUser.xacMinhDanhTinh
                                                ? 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                                                : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                        }`}
                                    >
                                        {selectedUser.xacMinhDanhTinh ? 'Hủy KYC' : 'Xác minh KYC'}
                                    </button>
                                    {(selectedUser as any).coYeuCauHost && !selectedUser.laChuNha ? (
                                        <button
                                            onClick={() => handleOpenApproveHost(selectedUser)}
                                            className="flex-1 min-w-[120px] px-3 py-2.5 rounded-lg text-xs font-bold border bg-amber-400 hover:bg-amber-500 text-amber-900 border-amber-300 shadow-sm"
                                        >
                                            Duyệt Host
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setHostRoleModal({ isOpen: true, user: selectedUser, makeHost: !selectedUser.laChuNha })}
                                            className={`flex-1 min-w-[120px] px-3 py-2.5 rounded-lg text-xs font-bold border ${
                                                selectedUser.laChuNha
                                                    ? 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                                                    : 'bg-amber-50 text-amber-800 border-amber-100 hover:bg-amber-100'
                                            }`}
                                        >
                                            {selectedUser.laChuNha ? 'Chuyển Guest' : 'Duyệt Host'}
                                        </button>
                                    )}
                                    {selectedUser.biKhoa ? (
                                        <button onClick={() => handleUnlockUser(selectedUser)} className="flex-1 min-w-[120px] px-3 py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-bold">Mở khóa</button>
                                    ) : (
                                        <button onClick={() => handleOpenLockModal(selectedUser)} className="flex-1 min-w-[120px] px-3 py-2.5 bg-[#FF385C] text-white rounded-lg text-xs font-bold">Khóa tài khoản</button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </ModalPortal>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                isDangerous={confirmModal.isDangerous}
            />

            {kycModal.isOpen && kycModal.user && (
                <ModalPortal onClose={() => setKycModal({ isOpen: false, user: null, verify: false })} zIndexClass="z-[210]">
                    <div className="relative admin-modal-panel w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <ModalCloseButton onClick={() => setKycModal({ isOpen: false, user: null, verify: false })} />
                        <div className="p-5 pt-4 text-center">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{kycModal.verify ? 'Xác minh danh tính' : 'Hủy xác minh KYC'}</h3>
                            <p className="text-sm text-gray-500 mb-5">
                                {kycModal.verify
                                    ? <>Cấp tích xanh KYC cho <strong>{kycModal.user.hoTen}</strong>?</>
                                    : <>Hủy xác minh KYC của <strong>{kycModal.user.hoTen}</strong>?</>}
                            </p>
                            <div className="flex gap-2">
                                <button onClick={handleKycConfirm} className={`flex-1 py-2.5 rounded-lg text-sm font-bold text-white ${kycModal.verify ? 'bg-[#008489]' : 'bg-amber-500'}`}>Xác nhận</button>
                                <button onClick={() => setKycModal({ isOpen: false, user: null, verify: false })} className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-gray-200">Hủy</button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {kycImageViewer.isOpen && (
                <ModalPortal onClose={() => setKycImageViewer({ isOpen: false, url: '' })} zIndexClass="z-[220]">
                    <div className="w-full h-full flex items-center justify-center p-6" onClick={() => setKycImageViewer({ isOpen: false, url: '' })}>
                        <img
                            src={kycImageViewer.url}
                            alt="CCCD fullsize"
                            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        />
                    </div>
                </ModalPortal>
            )}

            {lockModal.isOpen && lockModal.user && (
                <ModalPortal onClose={() => setLockModal({ isOpen: false, user: null, reason: '', lockError: '' })} zIndexClass="z-[210]">
                    <div className="relative admin-modal-panel w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <ModalCloseButton onClick={() => setLockModal({ isOpen: false, user: null, reason: '', lockError: '' })} />
                        <div className="p-5 pt-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Khóa tài khoản</h3>
                            <p className="text-sm text-gray-500 mb-4">Khóa tài khoản <strong>{lockModal.user.hoTen}</strong>. Nhập lý do:</p>
                            <textarea
                                className={`w-full px-3 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#FF385C]/20 ${lockModal.lockError ? 'border-red-400' : 'border-gray-200'}`}
                                rows={3}
                                placeholder="Lý do khóa..."
                                value={lockModal.reason}
                                onChange={e => setLockModal(prev => ({ ...prev, reason: e.target.value, lockError: '' }))}
                            />
                            {lockModal.lockError && <p className="text-xs text-red-600 mt-1">{lockModal.lockError}</p>}
                            <div className="flex gap-2 mt-4">
                                <button onClick={handleLockConfirm} disabled={!lockModal.reason.trim()} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white bg-[#FF385C] disabled:bg-gray-200">Xác nhận khóa</button>
                                <button onClick={() => setLockModal({ isOpen: false, user: null, reason: '', lockError: '' })} className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-gray-200">Hủy</button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {hostRoleModal.isOpen && hostRoleModal.user && (
                <ModalPortal onClose={() => setHostRoleModal({ isOpen: false, user: null, makeHost: false })} zIndexClass="z-[210]">
                    <div className="relative admin-modal-panel w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <ModalCloseButton onClick={() => setHostRoleModal({ isOpen: false, user: null, makeHost: false })} />
                        <div className="p-5 pt-4 text-center">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{hostRoleModal.makeHost ? 'Duyệt làm Host' : 'Chuyển về Guest'}</h3>
                            <p className="text-sm text-gray-500 mb-5">
                                {hostRoleModal.makeHost
                                    ? <>Nâng cấp <strong>{hostRoleModal.user.hoTen}</strong> lên Host?</>
                                    : <>Hủy vai trò Host của <strong>{hostRoleModal.user.hoTen}</strong>?</>}
                            </p>
                            <div className="flex gap-2">
                                <button onClick={handleHostRoleConfirm} className={`flex-1 py-2.5 rounded-lg text-sm font-bold text-white ${hostRoleModal.makeHost ? 'bg-amber-500' : 'bg-gray-600'}`}>Xác nhận</button>
                                <button onClick={() => setHostRoleModal({ isOpen: false, user: null, makeHost: false })} className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-gray-200">Hủy</button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {approveHostModal.isOpen && approveHostModal.user && (
                <ModalPortal onClose={() => setApproveHostModal({ isOpen: false, user: null, notificationId: null, commitment: '', showRejectConfirm: false })} zIndexClass="z-[210]">
                    <div className="relative admin-modal-panel w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <ModalCloseButton onClick={() => setApproveHostModal({ isOpen: false, user: null, notificationId: null, commitment: '', showRejectConfirm: false })} />
                        <div className="p-5 pt-4">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Duyệt làm Host</h3>
                                    <p className="text-sm text-gray-500">Yêu cầu từ <strong>{approveHostModal.user.hoTen || approveHostModal.user.ten || 'Người dùng'}</strong></p>
                                </div>
                            </div>

                            {/* Guest info card with email */}
                            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <UserAvatar user={approveHostModal.user} size={40} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{approveHostModal.user.hoTen || approveHostModal.user.ten || 'Người dùng'}</p>
                                        <p className="text-xs text-gray-500 truncate">📧 {approveHostModal.user.email || 'Không có email'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Verification status */}
                            <div className="mb-4 flex flex-wrap gap-2">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold ${approveHostModal.user.emailDaXacNhan ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                                    {approveHostModal.user.emailDaXacNhan ? '✓ Email' : '✗ Email'}
                                </span>
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold ${approveHostModal.user.daChapNhanCamKetCongDong ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                                    {approveHostModal.user.daChapNhanCamKetCongDong ? '✓ Cam kết' : '✗ Cam kết'}
                                </span>
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold ${approveHostModal.user.xacMinhDanhTinh ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                                    {approveHostModal.user.xacMinhDanhTinh ? '✓ KYC' : '✗ KYC'}
                                </span>
                            </div>

                            {/* KYC Image */}
                            {approveHostModal.user.urlBangChungDanhTinh && (
                                <div className="mb-4">
                                    <p className="text-xs font-semibold text-gray-700 mb-2">📸 Giấy tờ xác minh danh tính:</p>
                                    <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                                        <img
                                            src={approveHostModal.user.urlBangChungDanhTinh}
                                            alt="KYC Document"
                                            className="w-full max-h-64 object-contain"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="mb-5 p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
                                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-2">Cam kết của người dùng:</p>
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{approveHostModal.commitment}</p>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleApproveHost}
                                    className="flex-1 py-2.5 rounded-lg text-xs font-bold border bg-amber-400 hover:bg-amber-500 text-amber-900 border-amber-300 shadow-sm transition-colors"
                                >
                                    Duyệt Host
                                </button>
                                {!approveHostModal.showRejectConfirm ? (
                                    <button
                                        onClick={() => setApproveHostModal(prev => ({ ...prev, showRejectConfirm: true }))}
                                        className="flex-1 py-2.5 rounded-lg text-xs font-bold border bg-red-50 hover:bg-red-100 text-red-700 border-red-200 transition-colors"
                                    >
                                        Từ chối
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleRejectHost}
                                        className="flex-1 py-2.5 rounded-lg text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-colors"
                                    >
                                        Xác nhận từ chối
                                    </button>
                                )}
                                <button
                                    onClick={() => setApproveHostModal({ isOpen: false, user: null, notificationId: null, commitment: '', showRejectConfirm: false })}
                                    className="flex-1 py-2.5 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50 transition-colors"
                                >
                                    Hủy
                                </button>
                            </div>

                            {approveHostModal.showRejectConfirm && (
                                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                                    <p className="text-xs text-red-700">⚠️ Bạn sắp từ chối yêu cầu trở thành Host của:</p>
                                    <p className="text-sm font-semibold text-gray-900 mt-1">{approveHostModal.user.hoTen || 'Người dùng'} — {approveHostModal.user.email || 'Không có email'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}

export default function AdminUsersPageWithSearchParams() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C]" />
                </div>
            }
        >
            <UserManagementPage />
        </Suspense>
    );
}
