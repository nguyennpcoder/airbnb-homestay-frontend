'use client';

import BackendImage from '@/components/BackendImage';
import Link from 'next/link';
import { getValidSrc } from '@/lib/image';
import { getServiceFeeRate } from '@/lib/priceCalc';

const calcNights = (checkIn?: string, checkOut?: string) => {
  if (!checkIn || !checkOut) return 1;
  try {
    const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const n = Math.round(ms / 86400000);
    return n > 0 ? n : 1;
  } catch {
    return 1;
  }
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '--/--/----';
  try {
    return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const formatCurrency = (amount: number) => {
  return Math.round(Number(amount) || 0).toLocaleString('vi-VN');
};

export default function BookingDetailsPanel({ booking }: { booking: any }) {
  const phong = booking?.phong || booking?.sanPham || {};
  const maPhong = phong?.maPhong || phong?.maSanPham;
  const anhPhong = phong?.urlAnhChinh && phong.urlAnhChinh !== 'FILE_SELECTED' ? phong.urlAnhChinh : (phong?.hinhAnhs?.[0]?.urlHinhAnh || '');
  const tieuDe = phong?.tieuDe || 'Nhà nghỉ';
  const loaiPhong = typeof phong?.loaiPhong === 'string' ? phong.loaiPhong : (phong?.loaiPhong?.tenLoai || 'Phòng riêng');
  const diaDiem = phong?.thanhPho || phong?.diaChiDayDu || phong?.diaChi || 'Hà Nội';

  const ngayNhan = booking?.ngayNhanPhong;
  const ngayTra = booking?.ngayTraPhong;
  const nights = calcNights(ngayNhan, ngayTra);
  const soLuongKhach = booking?.soKhach || booking?.soLuongKhach || 0;
  const soNguoiLon = Number(booking?.soNguoiLon) || 0;
  const soTreEm = Number(booking?.soTreEm) || 0;
  const soEmBe = Number(booking?.soEmBe) || 0;

  const guestDetailParts = [
    soNguoiLon > 0 ? `${soNguoiLon} người lớn` : '',
    soTreEm > 0 ? `${soTreEm} trẻ em` : '',
    soEmBe > 0 ? `${soEmBe} em bé` : '',
  ].filter(Boolean);
  const guestDetail = guestDetailParts.length > 0 ? guestDetailParts.join(', ') : (soLuongKhach > 0 ? `${soLuongKhach} khách` : '');

  const giaMoiKhach = Number(booking?.giaMoiKhach || phong?.giaMoiKhach) || 0;
  const phiVeSinh = Number(booking?.phiVeSinh || phong?.phiVeSinh) || 0;
  const phiDichVu = Number(booking?.phiDichVu) || 0;
  const roomCost = Math.round(giaMoiKhach * nights);

  const payments = Array.isArray(booking?.payments) ? booking.payments : [];
  const confirmedPayments = payments.filter((p: any) => {
    const s = String(p?.status || '').toUpperCase();
    return ['DA_XAC_NHAN', 'THANH_CONG', 'ACCEPTED', 'DA_THANH_TOAN'].includes(s);
  });
  const totalFromPayment = confirmedPayments.reduce((sum: number, p: any) => sum + Math.abs(Number(p?.amount) || 0), 0);
  const svcFromPayment = confirmedPayments.reduce((sum: number, p: any) => sum + Math.abs(Number(p?.serviceFee) || 0), 0);

  const tongTien = Math.round(totalFromPayment || Number(booking?.tongTien) || 0);
  const svcFee = Math.round(svcFromPayment || phiDichVu || (roomCost + phiVeSinh) * getServiceFeeRate());

  return (
    <div className="p-5">
      <h3 className="text-lg font-bold text-gray-900 mb-5">Chi tiết đặt chỗ</h3>

      {anhPhong ? (
        <div className="rounded-2xl overflow-hidden mb-5 relative aspect-[16/10] bg-gray-100">
          <BackendImage
            src={getValidSrc(anhPhong)}
            alt={tieuDe}
            fill
            className="object-cover"
            sizes="300px"
          />
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden mb-5 relative aspect-[16/10] bg-gray-100 flex items-center justify-center">
          <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
        </div>
      )}

      <h4 className="text-[17px] font-bold text-gray-900 leading-snug mb-1">{tieuDe}</h4>
      <p className="text-sm text-gray-500 mb-5">{loaiPhong} · {diaDiem}</p>

      <hr className="border-gray-100 mb-5" />

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Nhận phòng</p>
          <p className="text-base font-bold text-gray-900">{formatDate(ngayNhan)}</p>
          <p className="text-xs text-gray-500">Sau 14:00</p>
        </div>
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Trả phòng</p>
          <p className="text-base font-bold text-gray-900">{formatDate(ngayTra)}</p>
          <p className="text-xs text-gray-500">Trước 11:00</p>
        </div>
      </div>

      <hr className="border-gray-100 mb-5" />

      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-900">{guestDetail || `${soLuongKhach} khách`}</p>
          <p className="text-xs text-gray-500">{nights} đêm</p>
        </div>
        <svg className="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      <hr className="border-gray-100 mb-5" />

      <div className="space-y-3 mb-5">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Giá phòng ({nights} đêm)</span>
          <span className="text-sm font-semibold text-gray-900">₫{formatCurrency(roomCost)}</span>
        </div>
        {phiVeSinh > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Phí vệ sinh</span>
            <span className="text-sm font-semibold text-gray-900">₫{formatCurrency(phiVeSinh)}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Phí dịch vụ</span>
          <span className="text-sm font-semibold text-gray-900">₫{formatCurrency(svcFee)}</span>
        </div>
        <hr className="border-gray-100" />
        <div className="flex justify-between items-center">
          <span className="text-base font-bold text-gray-900">Tổng cộng (VND)</span>
          <span className="text-base font-bold text-gray-900">₫{formatCurrency(tongTien || roomCost + phiVeSinh + svcFee)}</span>
        </div>
      </div>

      {maPhong ? (
        <Link
          href={`/phong/${maPhong}`}
          className="block w-full text-center bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition-all active:scale-95 shadow-md"
        >
          Xem toàn bộ chi tiết
        </Link>
      ) : null}
    </div>
  );
}