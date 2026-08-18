export type BookingStatus = 'cho_xac_nhan' | 'da_xac_nhan' | 'hoan_thanh' | 'da_huy' | string;

export interface AdminBookingRecord {
    maDatCho: number;
    maKhach: number;
    loaiPhong?: string;
    ngayNhanPhong?: string;
    ngayTraPhong?: string;
    ngayDat?: string;
    gioBatDau?: string;
    gioKetThuc?: string;
    soLuongKhach?: number;
    giaMoiKhach?: number;
    tongTien?: number;
    phiVeSinh?: number;
    phiDichVu?: number;
    tienTe?: string;
    trangThaiDatCho?: BookingStatus;
    yeuCauDacBiet?: string;
    tienHoanLai?: number;
    lyDoHuy?: string;
    chinhSachHuy?: string;
    ngayTao?: string;
    ngayCapNhat?: string;
    phong?: {
        maPhong?: number;
        tieuDe?: string;
        urlAnhChinh?: string;
        thanhPho?: string;
        quocGia?: string;
        giaMoiKhach?: number;
        soKhachToiDa?: number;
        chuNha?: {
            maNguoiDung?: number;
            ho?: string;
            ten?: string;
            hoTen?: string;
            email?: string;
            soDienThoai?: string;
            urlAnhDaiDien?: string;
            xacMinhDanhTinh?: boolean;
        };
    };
    nguoiDat?: {
        maNguoiDung?: number;
        ho?: string;
        ten?: string;
        hoTen?: string;
        email?: string;
        soDienThoai?: string;
        urlAnhDaiDien?: string;
        xacMinhDanhTinh?: boolean;
    };
    payments?: {
        id?: number;
        amount?: number;
        currency?: string;
        provider?: string;
        status?: string;
        transactionId?: string;
    }[];
}

export const STATUS_OPTIONS = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'cho_xac_nhan', label: 'Chờ xác nhận' },
    { value: 'da_xac_nhan', label: 'Đã xác nhận' },
    { value: 'hoan_thanh', label: 'Hoàn thành' },
    { value: 'da_huy', label: 'Đã hủy' },
] as const;

const STATUS_META: Record<string, { label: string; className: string; dot: string; cal: string }> = {
    cho_xac_nhan: {
        label: 'Chờ xác nhận',
        className: 'bg-amber-50 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
        cal: 'bg-amber-400 border-amber-500',
    },
    da_xac_nhan: {
        label: 'Đã xác nhận',
        className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dot: 'bg-emerald-500',
        cal: 'bg-emerald-400 border-emerald-600',
    },
    hoan_thanh: {
        label: 'Hoàn thành',
        className: 'bg-blue-50 text-blue-800 border-blue-200',
        dot: 'bg-blue-500',
        cal: 'bg-blue-400 border-blue-600',
    },
    da_huy: {
        label: 'Đã hủy',
        className: 'bg-gray-100 text-gray-600 border-gray-200',
        dot: 'bg-gray-400',
        cal: 'bg-gray-300 border-gray-400 line-through opacity-70',
    },
};

export function getStatusMeta(status?: string) {
    if (!status) return { label: '—', className: 'bg-gray-50 text-gray-600 border-gray-200', dot: 'bg-gray-300', cal: 'bg-gray-200' };
    return STATUS_META[status] ?? {
        label: status.replace(/_/g, ' '),
        className: 'bg-gray-50 text-gray-700 border-gray-200',
        dot: 'bg-gray-400',
        cal: 'bg-gray-300',
    };
}

export function normalizeAdminBooking(raw: Record<string, unknown>): AdminBookingRecord {
    const phong = (raw.phong ?? raw.sanPham) as AdminBookingRecord['phong'];
    const nguoiDat = (raw.nguoiDat ?? raw.khach) as AdminBookingRecord['nguoiDat'];
    return {
        ...(raw as unknown as AdminBookingRecord),
        phong,
        nguoiDat,
        payments: (raw.payments as AdminBookingRecord['payments']) ?? [],
    };
}

export function formatVND(amount?: number | null) {
    if (amount == null) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(value?: string, withTime = false) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('vi-VN', withTime
        ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
        : { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatTime(value?: string) {
    if (!value) return '—';
    const parts = value.split(':');
    if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
    return value;
}

export function parseDay(value?: string): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

export function getNightCount(checkIn?: string, checkOut?: string) {
    const start = parseDay(checkIn);
    const end = parseDay(checkOut);
    if (!start || !end) return null;
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : null;
}

export function bookingOverlapsMonth(b: AdminBookingRecord, monthStart: Date, monthEnd: Date) {
    const inDate = parseDay(b.ngayNhanPhong);
    const outDate = parseDay(b.ngayTraPhong);
    if (!inDate) return false;
    const end = outDate ?? inDate;
    return inDate <= monthEnd && end >= monthStart;
}

export function isDayInStay(day: Date, b: AdminBookingRecord) {
    const inDate = parseDay(b.ngayNhanPhong);
    const outDate = parseDay(b.ngayTraPhong);
    if (!inDate) return false;
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const checkIn = new Date(inDate.getFullYear(), inDate.getMonth(), inDate.getDate());
    const checkOut = outDate
        ? new Date(outDate.getFullYear(), outDate.getMonth(), outDate.getDate())
        : checkIn;
    return dayStart >= checkIn && dayStart < checkOut;
}

const LOAI_PHONG_LABEL: Record<string, string> = {
    noi_luu_tru: 'Lưu trú',
    trai_nghiem: 'Trải nghiệm',
    dich_vu: 'Dịch vụ',
};

export function getLoaiPhongLabel(loai?: string) {
    if (!loai) return '—';
    return LOAI_PHONG_LABEL[loai] ?? loai.replace(/_/g, ' ');
}

const PAYMENT_STATUS_LABEL: Record<string, string> = {
    CHO_XAC_NHAN: 'Chờ xác nhận',
    DA_XAC_NHAN: 'Đã xác nhận',
    YEU_CAU_HOAN_TIEN: 'Yêu cầu hoàn',
    HOAN_TIEN: 'Đã hoàn',
    DA_HUY: 'Đã hủy',
    THAT_BAI: 'Thất bại',
    CHUA_THANH_TOAN: 'Chưa thanh toán',
};

export function getPaymentStatusLabel(status?: string) {
    if (!status) return '—';
    return PAYMENT_STATUS_LABEL[status] ?? status;
}

export interface GuestBreakdownItem {
    label: string;
    count: number;
}

const GUEST_TYPE_KEYS: { keys: string[]; label: string }[] = [
    { keys: ['nguoiLon', 'nguoi_lon', 'adults', 'adult'], label: 'Người lớn' },
    { keys: ['treEm', 'tre_em', 'children', 'child'], label: 'Trẻ em' },
    { keys: ['emBe', 'em_be', 'infants', 'infant'], label: 'Em bé' },
    { keys: ['thuCung', 'pets', 'pet'], label: 'Thú cưng' },
];

/** Parse guest types from yeu_cau_dac_biet JSON if present; else total from so_luong_khach (SQL dat_cho). */
export function parseGuestBreakdown(
    booking: Pick<AdminBookingRecord, 'soLuongKhach' | 'yeuCauDacBiet'>
): GuestBreakdownItem[] {
    const raw = booking.yeuCauDacBiet?.trim();
    if (raw?.startsWith('{')) {
        try {
            const parsed = JSON.parse(raw) as Record<string, unknown>;
            const items: GuestBreakdownItem[] = [];
            for (const { keys, label } of GUEST_TYPE_KEYS) {
                for (const k of keys) {
                    const v = parsed[k];
                    if (typeof v === 'number' && v > 0) {
                        items.push({ label, count: v });
                        break;
                    }
                }
            }
            if (items.length > 0) return items;
        } catch {
            /* plain text special request */
        }
    }

    if (booking.soLuongKhach != null && booking.soLuongKhach > 0) {
        return [{ label: 'Tổng khách', count: booking.soLuongKhach }];
    }
    return [];
}

export function formatGuestBreakdownShort(
    booking: Pick<AdminBookingRecord, 'soLuongKhach' | 'yeuCauDacBiet'>
): string {
    const items = parseGuestBreakdown(booking);
    if (items.length === 0) return '—';
    if (items.length === 1 && items[0].label === 'Tổng khách') {
        return `${items[0].count} khách`;
    }
    return items.map(i => `${i.count} ${i.label.toLowerCase()}`).join(' · ');
}
