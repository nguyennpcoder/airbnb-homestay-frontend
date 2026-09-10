import { useEffect, useState } from 'react';
import BackendImage from '@/components/BackendImage';
import Link from 'next/link';
import { phongAPI, Phong, getPhongId } from '@/lib/api';
import { getValidSrc } from '@/lib/image';

interface RoomDetailsPanelProps {
  /** Mã phòng cần hiển thị (đầy đủ từ API). */
  maPhong?: number;
  /** Dữ liệu tạm để render ngay trong lúc fetch (từ conversation). */
  fallback?: {
    tieuDe?: string;
    urlAnhChinh?: string;
    maPhong?: number;
    maSanPham?: number;
    giaMoiKhach?: number;
    phiVeSinh?: number;
    soKhachToiDa?: number;
    diemTrungBinh?: number;
    soLuongDanhGia?: number;
    tienNghi?: string;
  } | null;
  title?: string;
}

function getAmenityNames(room: any): string[] {
  const raw = room?.tienNghi;
  if (!raw) return [];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const names: string[] = [];
        const walk = (val: any) => {
          if (Array.isArray(val)) {
            val.forEach((v) => { if (typeof v === 'string' && v.trim()) names.push(v.trim()); });
          } else if (val && typeof val === 'object') {
            Object.values(val).forEach(walk);
          }
        };
        walk(parsed.amenities || parsed);
        const unique = [...new Set(names)];
        if (unique.length) return unique;
      }
    } catch { }
    return raw.split(',').map((s: string) => s.trim()).filter(Boolean);
  }
  return [];
}

export default function RoomDetailsPanel({ maPhong, fallback, title = 'Chi tiết phòng' }: RoomDetailsPanelProps) {
  const [room, setRoom] = useState<Phong | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!maPhong) return;
    let cancelled = false;
    setLoading(true);
    phongAPI.getById(maPhong)
      .then((data: any) => {
        if (!cancelled && data && !data.error) setRoom(data);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [maPhong]);

  const data = (room as any) || fallback || {};
  const roomId = (room ? getPhongId(room) : null) || fallback?.maPhong || fallback?.maSanPham || maPhong;
  const urlAnh = data.urlAnhChinh || fallback?.urlAnhChinh;
  const tieuDe = data.tieuDe || fallback?.tieuDe || 'Phòng';
  const gia = data.giaMoiKhach || fallback?.giaMoiKhach || 0;
  const phiVeSinh = data.phiVeSinh || fallback?.phiVeSinh || 0;
  const soKhachToiDa = data.soKhachToiDa || fallback?.soKhachToiDa || 0;
  const diemTrungBinh = data.diemTrungBinh || fallback?.diemTrungBinh || 0;
  const soLuongDanhGia = data.soLuongDanhGia || fallback?.soLuongDanhGia || 0;
  const tienNghi = data.tienNghi || fallback?.tienNghi;

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        {roomId && (
          <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
            #{roomId}
          </span>
        )}
      </div>

      {urlAnh && (
        <div className="rounded-2xl overflow-hidden mb-5 relative aspect-[16/10] bg-gray-100">
          <BackendImage
            src={getValidSrc(urlAnh)}
            alt={tieuDe}
            fill
            className="object-cover"
            sizes="300px"
          />
        </div>
      )}

      <h4 className="text-[17px] font-bold text-gray-900 leading-snug mb-1">{tieuDe}</h4>
      <p className="text-sm text-gray-500 mb-5">
        {data.loaiBatDongSan || data.loaiPhong || 'Phòng'}{data.thanhPho ? ` · ${data.thanhPho}` : ''}
      </p>

      <hr className="border-gray-100 mb-5" />

      {/* Price info */}
      <div className="space-y-3 mb-5">
        {gia > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Giá phòng / đêm</span>
            <span className="text-sm font-semibold text-gray-900">
              ₫{Number(gia).toLocaleString('vi-VN')}
            </span>
          </div>
        )}
        {phiVeSinh > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Phí vệ sinh</span>
            <span className="text-sm font-semibold text-gray-900">
              ₫{Number(phiVeSinh).toLocaleString('vi-VN')}
            </span>
          </div>
        )}
        {soKhachToiDa > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Số khách tối đa</span>
            <span className="text-sm font-semibold text-gray-900">{soKhachToiDa} khách</span>
          </div>
        )}
      </div>

      <hr className="border-gray-100 mb-5" />

      {/* Amenities */}
      {tienNghi && getAmenityNames({ tienNghi }).length > 0 && (
        <div className="mb-5">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Tiện nghi</p>
          <div className="flex flex-wrap gap-2">
            {getAmenityNames({ tienNghi }).slice(0, 6).map((tn: string, i: number) => (
              <span key={i} className="px-2 py-1 bg-gray-100 rounded-lg text-xs text-gray-600">{tn}</span>
            ))}
          </div>
        </div>
      )}

      {/* Rating */}
      {diemTrungBinh > 0 && (
        <div className="flex items-center gap-2 mb-5">
          <span className="text-yellow-500">★</span>
          <span className="text-sm font-semibold text-gray-900">{Number(diemTrungBinh).toFixed(1)}</span>
          <span className="text-xs text-gray-500">({soLuongDanhGia || 0} đánh giá)</span>
        </div>
      )}

      {/* Go to room button */}
      {roomId && (
        <Link
          href={`/phong/${roomId}`}
          className="block w-full text-center bg-[#FF385C] text-white font-bold py-3.5 rounded-xl hover:bg-[#E31C5F] transition-all active:scale-95 shadow-md"
        >
          Di chuyển đến phòng
        </Link>
      )}
    </div>
  );
}
