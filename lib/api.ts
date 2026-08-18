import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
// Add token to requests (no longer needed as cookies are sent automatically)
// Add token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Add response interceptor to handle 401/403 and global error notifications
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;
    let message = error.response?.data?.message || error.message || 'Có lỗi xảy ra';
    const isLocked = error.response?.data?.locked === true;

    if (status === 401 || status === 403) {
      if (typeof window !== 'undefined') {
        if (isLocked) {
          // Account is locked — clear auth data
          localStorage.removeItem('userId');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('isAdmin');
          localStorage.removeItem('token');
          const lockMsg = error.response?.data?.message || 'Tài khoản đã bị khóa. Vui lòng liên hệ admin@airbnb.com.vn để được hỗ trợ mở lại.';
          if (window.location.pathname.startsWith('/login')) {
            // On login page — show specific locked message via toast
            toast.error(lockMsg, { duration: 6000 });
          } else {
            // On other pages — redirect to login with message
            sessionStorage.setItem('authMessage', lockMsg);
            window.location.href = '/login';
          }
        } else if (!window.location.pathname.startsWith('/login')) {
          if (status === 401) {
            localStorage.removeItem('userId');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('isAdmin');
            localStorage.removeItem('token');
            toast.error('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại');
            const currentPath = window.location.pathname + window.location.search;
            sessionStorage.setItem('authRedirect', currentPath);
            window.location.href = '/login';
          }
          // 403 không phải locked → KHÔNG toast chung chung, caller tự xử lý
        }
      }
    } else if (status === 404) {
      message = error.response?.data?.message || 'Không tìm thấy tài nguyên yêu cầu';
      if (error.config && !error.config.suppressToast) toast.error(message);
    } else if (status >= 500) {
      message = 'Lỗi hệ thống, vui lòng thử lại sau';
      if (error.config && !error.config.suppressToast) toast.error(message);
    } else {
      if (error.config && !error.config.suppressToast) {
        toast.error(message);
      }
    }

    return Promise.reject(error);
  }
);

// Extend AxiosRequestConfig to include suppressToast
declare module 'axios' {
  export interface AxiosRequestConfig {
    suppressToast?: boolean;
  }
}

export default api;

// --- Types ---
export interface User {
  maNguoiDung: number;
  tenDangNhap?: string;
  email?: string;
  hoTen?: string;
  ho?: string;
  ten?: string;
  ngaySinh?: string;
  soDienThoai?: string;
  urlAnhDaiDien?: string;
  laChuNha?: boolean;
  laAdmin?: boolean;
  emailDaXacNhan?: boolean;
  daChapNhanCamKetCongDong?: boolean;
  nhanTinNhanTiepThi?: boolean;
  ngayTao?: string;
  ngayCapNhat?: string;
  soDu?: number;
  thanhPho?: string;
  trangThai?: string;
  avatarUrl?: string;
  congViec?: string;
  diemDanhGia?: number;
  soNamKinhNghiem?: number;
  soLuongDanhGia?: number;
  xacMinhDanhTinh?: boolean;
  urlBangChungDanhTinh?: string;
  ngayXacMinh?: string;
  lyDoKhoa?: string;
  thanhPhoSong?: string;
  biKhoa?: boolean;
  soLuongDatCho?: number;
  soLuongListing?: number;
  soLuongDanhGiaHost?: number;
  diemDanhGiaHost?: number;
  coYeuCauHost?: boolean; // Whether user has a pending HOST_REQUEST
}

/** Listing / room (maps to DB table `phong`) */
export interface Phong {
  maPhong: number;
  /** @deprecated use maPhong — kept for API backward compatibility */
  maSanPham?: number;
  tieuDe: string;
  moTa?: string;
  diaChi?: string;
  thanhPho?: string;
  quocGia?: string;
  giaMoiKhach: number;
  soLuongKhach?: number;
  soKhachToiDa?: number;
  soPhongNgu?: number;
  soGiuong?: number;
  soPhongTam?: number;
  urlAnhChinh: string;
  loaiPhong?: string;
  /** @deprecated use loaiPhong */
  loaiSanPham?: string;
  diemTrungBinh?: number;
  soLuongDanhGia?: number;
  chuNha?: User;
  hostInfo?: User;
  trangThai?: string;
  duocKhachYeuThich?: boolean;
  laOriginal?: boolean;
  laPhoBien?: boolean;
  biKhoa?: boolean;
  soDemToiThieu?: number;
  phiVeSinh?: number;
  giaDatToiThieu?: number;
  quanHuyen?: string;
  phuongXa?: string;
  diaChiDayDu?: string;
  hinhAnhs?: ListingImage[];
  tienNghiItems?: { nhom: string; ten: string; duocCungCap?: boolean; moTa?: string }[];
  viDo?: number | null;
  kinhDo?: number | null;
  chinhSachHuy?: 'LINH_HOAT' | 'TRUNG_BINH' | 'NGHIEM_NGAT';
  loaiBatDongSan?: string;
  passPhong?: string;
  tienNghi?: string;
}

/** @deprecated use Phong */
export type SanPham = Phong;

export function getPhongId(phong: Pick<Phong, 'maPhong' | 'maSanPham'>): number {
  return phong.maPhong ?? phong.maSanPham!;
}

export interface Booking {
  maDatCho: number;
  maKhach: number;
  maPhong?: number;
  maSanPham?: number;
  ngayDat?: string;
  ngayTao?: string;
  ngayNhanPhong: string;
  ngayTraPhong: string;
  soKhach?: number;
  soLuongKhach?: number;
  tongTien: number;
  trangThaiDatCho: string;
  yeuCauDacBiet?: string;
  lyDoHuy?: string;
  tienHoanLai?: number;
  phong?: Phong;
  /** @deprecated use phong */
  sanPham?: Phong;
  khach?: User;
  nguoiDung?: User;
  nguoiDat?: User;
  payments?: any[];
  lastMessage?: string;
  lastMessageTime?: string;
  hasUnread?: boolean;
}

export interface Review {
  maDanhGia: number;
  maDatCho?: number;
  maNguoiDung?: number;
  maSanPham?: number;
  binhLuan: string;
  phanHoi?: string;
  diemSo: number;
  ngayTao: string;
  nguoiDung?: User;
  khach?: User;
  chuNha?: User;
  diemSachSe?: number;
  diemChinhXac?: number;
  diemNhanPhong?: number;
  diemGiaoTiep?: number;
  diemViTri?: number;
  diemGiaTri?: number;
  ngayNhanPhong?: string;
  ngayTraPhong?: string;
  tieuDePhong?: string;
  urlAnhPhong?: string;
  soLuotHuuIch?: number;
  isHuuIchByCurrentUser?: boolean;
}

export interface Message {
  maTinNhan?: number;
  noiDung: string;
  ngayTao?: string;
  daDoc?: boolean;
  fileUrl?: string;
  fileType?: string;
  nguoiGui?: { maNguoiDung?: number; hoTen?: string; urlAnhDaiDien?: string };
  nguoiNhan?: { maNguoiDung?: number; hoTen?: string };
  maDatCho?: number;
  maPhong?: number;
  tieuDePhong?: string;
  urlAnhChinh?: string;
  yeuCauDacBiet?: string;
  isInquiry?: boolean;
  isAutoReply?: boolean;
}

export interface ThongBao {
  id: number;
  loaiThongBao: string;
  noiDung: string;
  trangThai: string;
  daDoc: boolean;
  ngayTao: string;
  nguoiGui?: { maNguoiDung?: number; hoTen?: string; urlAnhDaiDien?: string };
}

export interface AuthResponse extends Partial<User> {
  user?: User;
  token?: string;
  laAdmin?: boolean;
  message?: string;
  userId?: number;
}

export const authAPI = {
  register: async (data: { tenDangNhap: string; email: string; matKhau: string; hoTen?: string; soDienThoai?: string; laChuNha?: boolean }): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  login: async (email: string, matKhau: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', { email, matKhau });
    return response.data;
  },

  socialLogin: async (data: {
    email: string;
    displayName: string;
    avatarUrl: string;
    provider: string;
    providerUid: string;
    phoneNumber?: string;
  }): Promise<AuthResponse> => {
    const response = await api.post('/auth/social-login', data);
    return response.data;
  },

  validateEmailPhone: async (email: string, soDienThoai: string): Promise<any> => {
    const response = await api.post('/auth/validate-email-phone', { email, soDienThoai });
    return response.data;
  },

  sendOtp: async (email: string, soDienThoai: string, countryCode?: string): Promise<any> => {
    const response = await api.post('/auth/otp/send', { email, soDienThoai, countryCode });
    return response.data;
  },

  verifyOtp: async (email: string, soDienThoai: string, otpCode: string): Promise<any> => {
    const response = await api.post('/auth/otp/verify', { email, soDienThoai, otpCode });
    return response.data;
  },
  getLatestOtp: async (email: string): Promise<{ otp: string }> => {
    const res = await api.get('/auth/otp/latest', { params: { email } });
    return res.data;
  },

  completeRegistration: async (soDienThoai: string, payload: { email: string; matKhau: string; hoTen?: string; laChuNha?: boolean }): Promise<AuthResponse> => {
    const response = await api.post(`/auth/complete-registration?soDienThoai=${encodeURIComponent(soDienThoai)}`, payload);
    return response.data;
  },

  verifyEmailToken: async (token: string): Promise<any> => {
    const response = await api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);
    return response.data;
  },

  changePassword: async (userId: number, oldPassword: string, newPassword: string): Promise<any> => {
    const response = await api.post(`/auth/change-password?userId=${userId}&oldPassword=${encodeURIComponent(oldPassword)}&newPassword=${encodeURIComponent(newPassword)}`);
    return response.data;
  },

  forgotPassword: async (email: string): Promise<any> => {
    const response = await api.post(`/auth/forgot-password?email=${encodeURIComponent(email)}`);
    return response.data;
  },

  resetPassword: async (email: string, tempPassword: string, newPassword: string): Promise<any> => {
    const response = await api.post('/auth/reset-password', { email, tempPassword, newPassword });
    return response.data;
  },

  logout: async (): Promise<any> => {
    const response = await api.post('/auth/logout');
    return response.data;
  }
};

export const userAPI = {
  getProfile: async (id: number): Promise<User> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  updateProfile: async (id: number, data: Partial<User>): Promise<User> => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },
  uploadAvatar: async (id: number, file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/users/${id}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  uploadKyc: async (id: number, file: File): Promise<{ url: string; xacMinhDanhTinh: boolean }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/users/${id}/kyc`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export const wishlistAPI = {
  list: async (userId: number): Promise<any[]> => {
    const res = await api.get('/yeu-thich', { params: { userId } });
    return res.data;
  },
  toggle: async (userId: number, phongId: number): Promise<{ liked: boolean }> => {
    const res = await api.post(`/yeu-thich/toggle?userId=${userId}&phongId=${phongId}`);
    return res.data;
  },
  remove: async (userId: number, phongId: number): Promise<any> => {
    const res = await api.delete(`/yeu-thich?userId=${userId}&phongId=${phongId}`);
    return res.data;
  },
  check: async (userId: number, phongId: number): Promise<{ liked: boolean }> => {
    const res = await api.get('/yeu-thich/check', { params: { userId, phongId } });
    return res.data;
  },
  getCount: async (userId: number): Promise<number> => {
    const res = await api.get('/yeu-thich/count', { params: { userId } });
    return res.data.count;
  },
};

export const bookingAPI = {
  create: async (data: any): Promise<Booking> => {
    const res = await api.post('/dat-cho', data);
    return res.data;
  },
  cancel: async (bookingId: number, userId: number): Promise<any> => {
    const res = await api.post(`/dat-cho/${bookingId}/cancel`, null, { params: { userId } });
    return res.data;
  },
  byUser: async (userId: number): Promise<Booking[]> => {
    const res = await api.get(`/dat-cho/user/${userId}`);
    return res.data;
  },
  getById: async (id: number): Promise<Booking> => {
    const res = await api.get(`/dat-cho/${id}`);
    return res.data;
  },
  update: async (id: number, data: any): Promise<Booking> => {
    const res = await api.put(`/dat-cho/${id}`, data);
    return res.data;
  },
  previewRefund: async (id: number): Promise<{ refundAmount: number }> => {
    const res = await api.get(`/dat-cho/${id}/preview-refund`);
    return res.data;
  },
};

export const reviewsAPI = {
  listByProduct: async (phongId: number, userId?: number): Promise<Review[]> => {
    const params = userId ? { userId } : {};
    const res = await api.get(`/danh-gia/phong/${phongId}`, { params });
    return res.data;
  },
  getCategoryAverages: async (phongId: number): Promise<any> => {
    const res = await api.get(`/danh-gia/phong/${phongId}/category-averages`);
    return res.data;
  },
  listByHost: async (hostId: number, userId?: number): Promise<Review[]> => {
    const res = await api.get(`/danh-gia/host/${hostId}`, { params: userId ? { userId } : {} });
    return res.data;
  },
  listByUser: async (userId: number): Promise<Review[]> => {
    const res = await api.get(`/danh-gia/user/${userId}`);
    return res.data;
  },
  create: async (payload: any): Promise<Review> => {
    const res = await api.post('/danh-gia', payload, { suppressToast: true });
    return res.data;
  },
  reply: async (reviewId: number, content: string, userId?: number): Promise<any> => {
    const res = await api.post(`/danh-gia/${reviewId}/reply`, { noiDung: content }, { params: userId ? { userId } : {} });
    return res.data;
  },
  updateReply: async (reviewId: number, content: string, userId?: number): Promise<any> => {
    const res = await api.put(`/danh-gia/${reviewId}/reply`, { noiDung: content }, { params: userId ? { userId } : {} });
    return res.data;
  },
  deleteReply: async (reviewId: number, userId?: number): Promise<any> => {
    const res = await api.delete(`/danh-gia/${reviewId}/reply`, { params: userId ? { userId } : {} });
    return res.data;
  },
  markHuuIch: async (reviewId: number, userId?: number): Promise<any> => {
    const params = userId ? { userId } : {};
    const res = await api.post(`/danh-gia/${reviewId}/huu-ich`, null, { params });
    return res.data;
  },
};

export const availabilityAPI = {
  listingDays: async (phongId: number, fromISO: string, toISO: string): Promise<any> => {
    const res = await api.get(`/lich-trinh`, { params: { phongId, tuNgay: fromISO, denNgay: toISO } });
    return res.data;
  },
  slots: async (phongId: number, ngayISO: string): Promise<any> => {
    const res = await api.get(`/lich-trinh/slots`, { params: { phongId, ngay: ngayISO } });
    return res.data;
  },
};

export const hostAPI = {
  profile: async (id: number): Promise<User> => {
    const res = await api.get(`/host/${id}`);
    return res.data;
  },
  listings: async (id: number): Promise<Phong[]> => {
    const res = await api.get(`/host/${id}/phong`);
    return res.data;
  },
  allListings: async (id: number): Promise<Phong[]> => {
    const res = await api.get(`/host/${id}/phong/all`, { params: { _t: Date.now() } });
    return res.data;
  },
  getStats: async (id: number): Promise<Stats> => {
    const res = await api.get(`/host/stats`, { params: { hostId: id } });
    return res.data;
  },
  getRevenueChart: async (id: number, year: number): Promise<any> => {
    const res = await api.get(`/host/revenue-chart`, { params: { hostId: id, year } });
    return res.data;
  },
  getServiceFeeChart: async (id: number, year: number): Promise<any> => {
    const res = await api.get(`/host/service-fee-chart`, { params: { hostId: id, year } });
    return res.data;
  },
  getRefundsChart: async (id: number, year: number): Promise<any> => {
    const res = await api.get(`/host/refunds-chart`, { params: { hostId: id, year } });
    return res.data;
  },
  getCancelledFailedChart: async (id: number, year: number): Promise<any> => {
    const res = await api.get(`/host/cancelled-failed-chart`, { params: { hostId: id, year } });
    return res.data;
  },
  getBookings: async (id: number): Promise<Booking[]> => {
    const res = await api.get(`/host/bookings`, { params: { hostId: id } });
    return res.data;
  },
  getPayments: async (id: number): Promise<any[]> => {
    const res = await api.get(`/host/payments`, { params: { hostId: id } });
    return res.data;
  },
  incrementListingView: async (listingId: number): Promise<any> => {
    const res = await api.post(`/host/listing/${listingId}/view`);
    return res.data;
  },
  hideListing: async (listingId: number): Promise<any> => {
    const res = await api.post(`/host/listings/${listingId}/hide`);
    return res.data;
  },
  unhideListing: async (listingId: number): Promise<any> => {
    const res = await api.post(`/host/listings/${listingId}/unhide`);
    return res.data;
  },
  getListingById: async (listingId: number, maChuNha: number): Promise<Phong> => {
    const res = await api.get(`/host/listings/${listingId}`, { params: { maChuNha } });
    return res.data;
  },
  blockDates: async (listingId: number, startDate: string, endDate: string): Promise<any> => {
    const res = await api.post(`/availability/range`, {
      phongId: listingId,
      tuNgay: startDate,
      denNgay: endDate,
      conKhaDung: false,
    });
    return res.data;
  },
  unblockDates: async (listingId: number, startDate: string, endDate: string): Promise<any> => {
    const res = await api.post(`/availability/range`, {
      phongId: listingId,
      tuNgay: startDate,
      denNgay: endDate,
      conKhaDung: true,
    });
    return res.data;
  },
  getAvailability: async (listingId: number, startDate: string, endDate: string): Promise<any> => {
    const res = await api.get(`/lich-trinh`, {
      params: { phongId: listingId, tuNgay: startDate, denNgay: endDate },
    });
    return res.data;
  },
  createListing: async (data: any): Promise<Phong> => {
    const res = await api.post('/host/listings', data);
    return res.data;
  },
  updateListing: async (id: number, data: any): Promise<Phong> => {
    const res = await api.put(`/host/listings/${id}`, data);
    return res.data;
  },
  updatePrice: async (listingId: number, startDate: string, endDate: string, price: number): Promise<any> => {
    const res = await api.post(`/availability/range`, {
      phongId: listingId,
      tuNgay: startDate,
      denNgay: endDate,
      giaGhiDe: price,
    });
    return res.data;
  },
  uploadImage: async (listingId: number, file: File, thuTu?: number, laAnhChinh?: boolean, phanLoaiAnh?: string): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    if (thuTu !== undefined) formData.append('thuTu', String(thuTu));
    if (laAnhChinh !== undefined) formData.append('laAnhChinh', String(laAnhChinh));
    if (phanLoaiAnh !== undefined) formData.append('phanLoaiAnh', phanLoaiAnh);
    const hostId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    if (hostId) formData.append('hostId', hostId);
    const res = await api.post(`/images/phong/${listingId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  deleteImage: async (imageId: number): Promise<any> => {
    const hostId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    const res = await api.delete(`/images/${imageId}${hostId ? `?hostId=${hostId}` : ''}`);
    return res.data;
  },
  setMainImage: async (imageId: number): Promise<any> => {
    const hostId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    const res = await api.put(`/images/${imageId}/set-main${hostId ? `?hostId=${hostId}` : ''}`);
    return res.data;
  },
  getImages: async (listingId: number): Promise<ListingImage[]> => {
    const res = await api.get(`/images/phong/${listingId}`);
    return res.data;
  },
};

export const messageAPI = {
  listByBooking: async (maDatCho: number): Promise<Message[]> => {
    const res = await api.get(`/tin-nhan/dat-cho/${maDatCho}`);
    return res.data;
  },
  send: async (payload: { maNguoiGui: number; maNguoiNhan: number; maDatCho?: number; maPhong?: number; noiDung: string; fileUrl?: string; fileType?: string }): Promise<Message | Message[]> => {
    const res = await api.post('/tin-nhan', payload);
    return res.data;
  },
  markRead: async (maTinNhan: number): Promise<any> => {
    const res = await api.post(`/tin-nhan/${maTinNhan}/read`);
    return res.data;
  },
  readAll: async (bookingId: number, userId: number): Promise<any> => {
    return await api.post(`/tin-nhan/read-all?bookingId=${bookingId}&userId=${userId}`);
  },
  upload: async (formData: FormData): Promise<any> => {
    const res = await api.post('/tin-nhan/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  unreadCount: async (userId: number, role?: 'guest' | 'host'): Promise<{ unreadMessages: number }> => {
    const res = await api.get(`/tin-nhan/unread-count?userId=${userId}${role ? `&role=${role}` : ''}`);
    return res.data;
  },
  /** Hội thoại liên hệ trước đặt chỗ (tin_nhan.ma_phong — KHÔNG tạo dat_cho). */
  listInquiries: async (userId: number): Promise<any[]> => {
    const res = await api.get('/tin-nhan/hoi-thoai', { params: { userId } });
    return res.data;
  },
  listByPhong: async (maPhong: number, userId: number, partnerId: number): Promise<Message[]> => {
    const res = await api.get(`/tin-nhan/phong/${maPhong}`, { params: { userId, partnerId } });
    return res.data;
  },
  readAllByPhong: async (phongId: number, userId: number): Promise<any> => {
    return await api.post(`/tin-nhan/phong/${phongId}/read-all`, null, { params: { userId } });
  },
  /** Thông tin tài khoản admin để chủ nhà liên hệ hỗ trợ. */
  getAdminInfo: async (): Promise<{ maNguoiDung: number; hoTen: string; urlAnhDaiDien?: string }> => {
    const res = await api.get('/tin-nhan/admin-info');
    return res.data;
  },
  /** Danh sách hội thoại admin (chủ nhà ↔ admin), lưu trong tin_nhan không gắn phòng/đặt chỗ. */
  listAdminThreads: async (userId: number): Promise<any[]> => {
    const res = await api.get('/tin-nhan/admin/hoi-thoai', { params: { userId } });
    return res.data;
  },
  listAdminThread: async (userId: number, partnerId: number): Promise<Message[]> => {
    const res = await api.get(`/tin-nhan/admin/thread/${partnerId}`, { params: { userId } });
    return res.data;
  },
  sendAdminThread: async (payload: { maNguoiGui: number; maNguoiNhan: number; noiDung: string; fileUrl?: string; fileType?: string }): Promise<Message> => {
    const res = await api.post('/tin-nhan/admin/send', payload);
    return res.data;
  },
  readAllAdminThread: async (userId: number, partnerId: number): Promise<any> => {
    return await api.post('/tin-nhan/admin/read-all', null, { params: { userId, partnerId } });
  },
};

export interface QuickReply {
  id: number;
  phimTat: string;
  noiDung: string;
}

export const quickReplyAPI = {
  listByHost: async (hostId: number): Promise<QuickReply[]> => {
    const res = await api.get(`/tra-loi-nhanh/chu-nha/${hostId}`);
    return res.data;
  },
  create: async (data: { maChuNha: number; phimTat: string; noiDung: string }): Promise<QuickReply> => {
    const res = await api.post('/tra-loi-nhanh', data);
    return res.data;
  },
  update: async (id: number, data: { phimTat?: string; noiDung?: string }): Promise<QuickReply> => {
    const res = await api.put(`/tra-loi-nhanh/${id}`, data);
    return res.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/tra-loi-nhanh/${id}`);
  },
};

export const paymentAPI = {
  createVnPayUrl: async (bookingId: number, amount?: number): Promise<{ url: string }> => {
    const payload: any = { bookingId };
    if (amount !== undefined) payload.amount = amount;
    const res = await api.post('/payment/vnpay/create-url', payload);
    return res.data;
  },
  createZaloPayUrl: async (bookingId: number, amount?: number): Promise<{ url: string }> => {
    const payload: any = { bookingId };
    if (amount !== undefined) payload.amount = amount;
    const res = await api.post('/payment/zalopay/create-url', payload);
    return res.data;
  },
  createMoMoUrl: async (bookingId: number, amount?: number): Promise<{ url: string }> => {
    const payload: any = { bookingId };
    if (amount !== undefined) payload.amount = amount;
    const res = await api.post('/payment/momo/create-url', payload);
    return res.data;
  },
  requestRefundToBalance: async (bookingId: number, reason?: string): Promise<any> => {
    const res = await api.post(`/payment/request-refund-to-balance/${bookingId}`, { reason });
    return res.data;
  },
  payWithBalance: async (bookingId: number, amount: number): Promise<any> => {
    const res = await api.post('/payment/pay-with-balance', { bookingId, amount });
    return res.data;
  },
  createSePayPayment: async (bookingId: number, amount: number): Promise<any> => {
    const res = await api.post('/payment/sepay/create', { bookingId, amount });
    return res.data;
  },
  checkSePayStatus: async (paymentId: number): Promise<any> => {
    const res = await api.get(`/payment/sepay/status/${paymentId}`);
    return res.data;
  },
  getByUser: async (userId: number): Promise<any[]> => {
    const res = await api.get(`/payment/user/${userId}`);
    return res.data;
  },
};

export interface ListingImage {
  maHinhAnh: number;
  urlHinhAnh: string;
  laAnhChinh: boolean;
  thuTu?: number;
  phanLoaiAnh?: string;
}

export interface Stats {
  totalUsers?: number;
  totalListings?: number;
  totalBookings?: number;
  totalRevenue?: number;
  activeHosts?: number;
  // Host specific stats
  revenue?: number;
  bookings?: number;
  rating?: number;
  views?: number;
  occupancy?: number;
  pendingBookings?: number;
}

export const thongBaoAPI = {
  getNotifications: async (userId: number): Promise<ThongBao[]> => {
    const res = await api.get(`/thong-bao/user/${userId}`);
    return res.data;
  },
  getCounts: async (userId: number): Promise<{ pendingRequests: number; hostRequests: number; unreadMessages: number; total: number }> => {
    const res = await api.get(`/thong-bao/user/${userId}/counts`);
    return res.data;
  },
  accept: async (id: number): Promise<ThongBao> => {
    const res = await api.post(`/thong-bao/${id}/accept`);
    return res.data;
  },
  reject: async (id: number): Promise<ThongBao> => {
    const res = await api.post(`/thong-bao/${id}/reject`);
    return res.data;
  },
  requestHostRole: async (userId: number, reason?: string): Promise<{ message: string; notification: ThongBao }> => {
    const res = await api.post('/thong-bao/request-host', { userId, reason });
    return res.data;
  },
};

export const phongAPI = {
  getAll: async (params?: {
    loaiPhong?: string;
    loaiSanPham?: string;
    thanhPho?: string;
    soKhach?: number;
    ngayNhan?: string;
    ngayTra?: string;
    minPrice?: number;
    maxPrice?: number;
    tienNghi?: string[];
    minLat?: number;
    maxLat?: number;
    minLng?: number;
    maxLng?: number;
    loaiHinh?: string[];
  }): Promise<Phong[]> => {
    const urlParams = new URLSearchParams();
    if (params) {
      const normalized = {
        ...params,
        loaiPhong: params.loaiPhong ?? params.loaiSanPham,
      };
      Object.entries(normalized).forEach(([key, value]) => {
        if (key === 'loaiSanPham') return;
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((v) => urlParams.append(key, String(v)));
          } else {
            urlParams.set(key, String(value));
          }
        }
      });
    }
    const response = await api.get(`/public/search?${urlParams.toString()}`);
    return response.data;
  },

  getById: async (id: number): Promise<Phong> => {
    const response = await api.get(`/public/phong/${id}`);
    return response.data;
  },

  getLovedByGuests: async (): Promise<Phong[]> => {
    const response = await api.get('/public/phong/yeu-thich');
    return response.data;
  },
  getLocations: async (): Promise<string[]> => {
    const res = await api.get('/public/search/locations');
    return res.data;
  },
};

/** @deprecated use phongAPI */
export const sanPhamAPI = phongAPI;

export const adminAPI = {
  getStats: async (): Promise<Stats> => {
    const res = await api.get('/admin/stats');
    return res.data;
  },
  getRevenueChart: async (year: number): Promise<any> => {
    const res = await api.get(`/admin/analytics/revenue?year=${year}`);
    return res.data;
  },
  getServiceFeeChart: async (year: number): Promise<any> => {
    const res = await api.get(`/admin/analytics/service-fee?year=${year}`);
    return res.data;
  },
  getRefundsChart: async (year: number): Promise<any> => {
    const res = await api.get(`/admin/analytics/refunds?year=${year}`);
    return res.data;
  },
  getCancelledFailedChart: async (year: number): Promise<any> => {
    const res = await api.get(`/admin/analytics/cancelled-failed?year=${year}`);
    return res.data;
  },
  getUserGrowth: async (year: number): Promise<any> => {
    const res = await api.get(`/admin/analytics/user-growth?year=${year}`);
    return res.data;
  },
  getCategoryDistribution: async (): Promise<any> => {
    const res = await api.get('/admin/analytics/category-distribution');
    return res.data;
  },
  getRecentActivities: async (): Promise<any[]> => {
    const res = await api.get('/admin/analytics/recent-activities');
    return res.data;
  },
  getOccupancyRate: async (year: number): Promise<any[]> => {
    const res = await api.get(`/admin/analytics/occupancy?year=${year}`);
    return res.data;
  },
  getCancellationRates: async (year: number): Promise<any[]> => {
    const res = await api.get(`/admin/analytics/cancellation-rates?year=${year}`);
    return res.data;
  },
  getBookingsByStatus: async (): Promise<any[]> => {
    const res = await api.get('/admin/analytics/bookings-by-status');
    return res.data;
  },
  getMonthlyBookings: async (year: number): Promise<any[]> => {
    const res = await api.get(`/admin/analytics/bookings-monthly?year=${year}`);
    return res.data;
  },
  getPaymentStatusDistribution: async (): Promise<any[]> => {
    const res = await api.get('/admin/analytics/payment-status-distribution');
    return res.data;
  },
  getAllReviews: async (): Promise<any[]> => {
    const res = await api.get('/admin/analytics/reviews');
    return res.data;
  },
  getUsers: async (): Promise<User[]> => {
    const res = await api.get('/admin/users');
    return res.data;
  },
  getBookings: async (): Promise<Booking[]> => {
    const res = await api.get('/admin/bookings');
    return res.data;
  },
  cancelBookingAdmin: async (id: number): Promise<any> => {
    const res = await api.post(`/admin/bookings/${id}/cancel`);
    return res.data;
  },
  lockUser: async (id: number): Promise<any> => {
    const res = await api.post(`/admin/users/${id}/lock`);
    return res.data;
  },
  unlockUser: async (id: number): Promise<any> => {
    const res = await api.post(`/admin/users/${id}/unlock`);
    return res.data;
  },
  toggleHostRole: async (id: number): Promise<any> => {
    const res = await api.post(`/admin/users/${id}/toggle-host`);
    return res.data;
  },
  verifyUserIdentity: async (id: number, verify: boolean): Promise<any> => {
    const res = await api.post(`/admin/users/${id}/verify-identity?verify=${verify}`);
    return res.data;
  },
  lockUserWithReason: async (id: number, reason: string): Promise<any> => {
    const res = await api.post(`/admin/users/${id}/lock-with-reason`, { reason });
    return res.data;
  },
  getListings: async (): Promise<any[]> => {
    const res = await api.get('/admin/phong');
    return res.data;
  },
  setStatus: async (id: number, trangThai: string, reason?: string): Promise<any> => {
    let url = `/admin/phong/${id}/status?trangThai=${encodeURIComponent(trangThai)}`;
    if (reason) url += `&reason=${encodeURIComponent(reason)}`;
    const res = await api.post(url);
    return res.data;
  },
  batchUpdateListingStatus: async (ids: number[], trangThai: string): Promise<any> => {
    const res = await api.post('/admin/phong/batch-status', { ids, trangThai });
    return res.data;
  },
  batchLockListings: async (ids: number[]): Promise<any> => {
    const res = await api.post('/admin/phong/batch-lock', { ids, lock: true });
    return res.data;
  },
  batchUnlockListings: async (ids: number[]): Promise<any> => {
    const res = await api.post('/admin/phong/batch-lock', { ids, lock: false });
    return res.data;
  },
  lockListing: async (id: number): Promise<any> => {
    const res = await api.post(`/admin/phong/${id}/lock`);
    return res.data;
  },
  unlockListing: async (id: number): Promise<any> => {
    const res = await api.post(`/admin/phong/${id}/unlock`);
    return res.data;
  },
  setFlags: async (id: number, payload: { duocKhachYeuThich?: boolean; laPhoBien?: boolean }): Promise<any> => {
    const params = new URLSearchParams();
    if (payload.duocKhachYeuThich !== undefined) params.set('duocKhachYeuThich', String(payload.duocKhachYeuThich));
    if (payload.laPhoBien !== undefined) params.set('laPhoBien', String(payload.laPhoBien));
    const res = await api.post(`/admin/phong/${id}/flags?${params.toString()}`);
    return res.data;
  },
  createListing: async (data: any): Promise<any> => {
    const res = await api.post('/admin/phong', data);
    return res.data;
  },
  updateListing: async (id: number, data: any): Promise<any> => {
    const res = await api.put(`/admin/phong/${id}`, data);
    return res.data;
  },
  getListingDetails: async (id: number): Promise<any> => {
    const res = await api.get(`/admin/phong/${id}`);
    return res.data;
  },
  uploadImage: async (listingId: number, file: File, thuTu?: number, laAnhChinh?: boolean): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    if (thuTu !== undefined) formData.append('thuTu', String(thuTu));
    if (laAnhChinh !== undefined) formData.append('laAnhChinh', String(laAnhChinh));

    const res = await api.post(`/images/phong/${listingId}`, formData);
    return res.data;
  },
  deleteImage: async (imageId: number): Promise<any> => {
    const res = await api.delete(`/images/${imageId}`);
    return res.data;
  },
  getPayments: async (): Promise<any[]> => {
    const res = await api.get('/admin/payments');
    return res.data;
  },
  confirmPayment: async (id: number, transactionId?: string): Promise<any> => {
    const res = await api.post(`/payment/admin/${id}/confirm`, transactionId ? { transactionId } : {});
    return res.data;
  },
  refundPayment: async (id: number): Promise<any> => {
    const res = await api.post(`/payment/admin/${id}/refund`);
    return res.data;
  },
  approveRefundToBalance: async (paymentId: number): Promise<any> => {
    const res = await api.post(`/payment/admin/${paymentId}/approve-refund-to-balance`);
    return res.data;
  },
};

// --- Amenity Types ---
export interface NhomTienNghi {
  maNhomTienNghi: number;
  tenNhom: string;
  thuTu: number;
  hoatDong: boolean;
}

export interface DanhMucTienNghi {
  maTienNghi: number;
  maNhomTienNghi?: number;
  nhom?: NhomTienNghi;
  ten: string;
  bieuTuong?: string;
  moTa?: string;
  hoatDong: boolean;
}

// --- Amenity API ---
export const adminAmenityAPI = {
  // Groups
  getGroups: async (hostId: number): Promise<NhomTienNghi[]> => {
    const res = await api.get(`/host/amenities/groups?hostId=${hostId}`);
    return res.data;
  },
  createGroup: async (data: { tenNhom: string; thuTu?: number; hostId: number }): Promise<NhomTienNghi> => {
    const res = await api.post('/host/amenities/groups', data);
    return res.data;
  },
  updateGroup: async (id: number, data: { tenNhom?: string; thuTu?: number }): Promise<NhomTienNghi> => {
    const res = await api.put(`/host/amenities/groups/${id}`, data);
    return res.data;
  },
  deleteGroup: async (id: number): Promise<void> => {
    await api.delete(`/host/amenities/groups/${id}`);
  },
  toggleGroup: async (id: number): Promise<{ hoatDong: boolean }> => {
    const res = await api.put(`/host/amenities/groups/${id}/toggle`);
    return res.data;
  },

  // Catalog
  getCatalogs: async (hostId: number, groupId?: number): Promise<DanhMucTienNghi[]> => {
    const params = groupId ? `?hostId=${hostId}&groupId=${groupId}` : `?hostId=${hostId}`;
    const res = await api.get(`/host/amenities/catalog${params}`);
    return res.data;
  },
  getActiveCatalogs: async (hostId: number, groupId?: number): Promise<DanhMucTienNghi[]> => {
    const params = groupId ? `?hostId=${hostId}&groupId=${groupId}` : `?hostId=${hostId}`;
    const res = await api.get(`/host/amenities/catalog/active${params}`);
    return res.data;
  },
  createCatalog: async (data: { maNhomTienNghi: number; ten: string; bieuTuong?: string; moTa?: string; hostId: number }): Promise<DanhMucTienNghi> => {
    const res = await api.post('/host/amenities/catalog', data);
    return res.data;
  },
  updateCatalog: async (id: number, data: { maNhomTienNghi?: number; ten?: string; bieuTuong?: string; moTa?: string }): Promise<DanhMucTienNghi> => {
    const res = await api.put(`/host/amenities/catalog/${id}`, data);
    return res.data;
  },
  toggleCatalog: async (id: number): Promise<{ hoatDong: boolean }> => {
    const res = await api.put(`/host/amenities/catalog/${id}/toggle`);
    return res.data;
  },
  deleteCatalog: async (id: number): Promise<void> => {
    await api.delete(`/host/amenities/catalog/${id}`);
  },
};

// ==================== KHUYẾN MÃI ====================

export interface KhuyenMai {
  maKhuyenMai: number;
  tenKhuyenMai: string;
  moTa?: string;
  loaiGiamGia: 'PHAN_TRAM' | 'SO_TIEN';
  giaTri: number;
  apCho: 'NGUOI_LON' | 'TRE_EM' | 'DON_HANG';
  dieuKienApDung?: 'KHONG' | 'CO_TRE_EM' | 'CO_NGUOI_LON';
  dieuKienNgayBatDau?: string;
  dieuKienNgayKetThuc?: string;
  soLuongToiDa: number;
  soLuongDaDung: number;
  hoatDong: boolean;
  ngayTao: string;
}

export const promotionAPI = {
  getAll: async (): Promise<KhuyenMai[]> => {
    const res = await api.get('/admin/khuyen-mai');
    return res.data;
  },
  getAvailable: async (): Promise<KhuyenMai[]> => {
    const res = await api.get('/admin/khuyen-mai/available');
    return res.data;
  },
  getById: async (id: number): Promise<KhuyenMai> => {
    const res = await api.get(`/admin/khuyen-mai/${id}`);
    return res.data;
  },
  create: async (data: Partial<KhuyenMai>): Promise<KhuyenMai> => {
    const res = await api.post('/admin/khuyen-mai', data);
    return res.data;
  },
  update: async (id: number, data: Partial<KhuyenMai>): Promise<KhuyenMai> => {
    const res = await api.put(`/admin/khuyen-mai/${id}`, data);
    return res.data;
  },
  toggle: async (id: number): Promise<KhuyenMai> => {
    const res = await api.put(`/admin/khuyen-mai/${id}/toggle`);
    return res.data;
  },
  calculate: async (data: {
    maKhuyenMai?: number | null;
    soNguoiLon: number;
    soTreEm: number;
    soEmBe: number;
    roomCost: number;
    nights: number;
    adultsCost?: number;
    childrenCost?: number;
  }): Promise<{ tienGiamGia: number; tongTienSauGiam: number }> => {
    const res = await api.post('/admin/khuyen-mai/calculate', data);
    return res.data;
  },
  validate: async (id: number): Promise<{ available: boolean; soLuongToiDa: number; soLuongDaDung: number; message: string }> => {
    const res = await api.get(`/admin/khuyen-mai/${id}/validate`);
    return res.data;
  },
};

// ==================== QUY ĐỊNH GIÁ ====================

export interface QuyDinhGia {
  maQuyDinh: number;
  tyLeNguoiLon: number;
  tyLeTreEm: number;
  tyLeEmBe: number;
  tyLePhiDichVu: number;
  ngayTao: string;
  ngayCapNhat: string;
}

export const pricingRulesAPI = {
  get: async (): Promise<QuyDinhGia> => {
    const res = await api.get('/admin/quy-dinh-gia');
    return res.data;
  },
  update: async (data: { tyLeNguoiLon?: number; tyLeTreEm?: number; tyLePhiDichVu?: number }): Promise<QuyDinhGia> => {
    const res = await api.put('/admin/quy-dinh-gia', data);
    return res.data;
  },
};

export interface AdminWallet {
  soDu: number;
  totalServiceFee: number;
  email: string;
  hoTen: string;
}

// ==================== CHÍNH SÁCH HỦY / HOÀN TIỀN ====================

export interface ChinhSachHoanTien {
  maChinhSach: number;
  ma: string;
  ten: string;
  moTa?: string;
  tyLeHoanTien: number;
  soNgayTruoc: number;
  thuTu: number;
  ngayTao?: string;
  ngayCapNhat?: string;
}

export const chinhSachHuyAPI = {
  list: async (): Promise<ChinhSachHoanTien[]> => {
    const res = await api.get('/chinh-sach-huy');
    return res.data;
  },
  getByMa: async (ma: string): Promise<ChinhSachHoanTien> => {
    const res = await api.get(`/chinh-sach-huy/${ma}`);
    return res.data;
  },
  adminList: async (): Promise<ChinhSachHoanTien[]> => {
    const res = await api.get('/admin/chinh-sach-huy');
    return res.data;
  },
  adminCreate: async (data: Partial<ChinhSachHoanTien>): Promise<ChinhSachHoanTien> => {
    const res = await api.post('/admin/chinh-sach-huy', data);
    return res.data;
  },
  adminUpdate: async (id: number, data: Partial<ChinhSachHoanTien>): Promise<ChinhSachHoanTien> => {
    const res = await api.put(`/admin/chinh-sach-huy/${id}`, data);
    return res.data;
  },
  adminDelete: async (id: number): Promise<any> => {
    const res = await api.delete(`/admin/chinh-sach-huy/${id}`);
    return res.data;
  },
};

// ==================== QUY ĐỊNH NỀN TẢNG ====================

export interface QuyDinh {
  maQuyDinh: number;
  ma: string;
  tieuDe: string;
  noiDung?: string;
  doiTuong: string;
  nhom: string;
  thuTu: number;
  active: boolean;
  ngayTao?: string;
  ngayCapNhat?: string;
}

export const quyDinhAPI = {
  list: async (params?: { nhom?: string; doiTuong?: string }): Promise<QuyDinh[]> => {
    const res = await api.get('/quy-dinh', { params });
    return res.data;
  },
  adminList: async (): Promise<QuyDinh[]> => {
    const res = await api.get('/admin/quy-dinh');
    return res.data;
  },
  adminCreate: async (data: Partial<QuyDinh>): Promise<QuyDinh> => {
    const res = await api.post('/admin/quy-dinh', data);
    return res.data;
  },
  adminUpdate: async (id: number, data: Partial<QuyDinh>): Promise<QuyDinh> => {
    const res = await api.put(`/admin/quy-dinh/${id}`, data);
    return res.data;
  },
  adminDelete: async (id: number): Promise<any> => {
    const res = await api.delete(`/admin/quy-dinh/${id}`);
    return res.data;
  },
};

export const adminWalletAPI = {
  get: async (): Promise<AdminWallet> => {
    const res = await api.get('/admin/wallet');
    return res.data;
  },
};

