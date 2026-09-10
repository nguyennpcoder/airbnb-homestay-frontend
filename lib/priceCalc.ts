/**
 * Shared price calculation for booking flow.
 * Single source of truth — all price displays use this.
 */

import { pricingRulesAPI } from './api';

const DEFAULT_CHILDREN_RATE = 0.6; // 60% = 40% off for children
const DEFAULT_SERVICE_FEE_RATE = 0.10; // 10% service fee (admin cấu hình trong quy_dinh_gia)

/**
 * Fetch pricing rules from API and sync to localStorage.
 * Call this once on app init.
 */
export async function initPricingRules(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const data = await pricingRulesAPI.get();
    localStorage.setItem('quyDinhGia', JSON.stringify(data));
  } catch {
    // API not available, keep localStorage or use defaults
  }
}

/**
 * Đọc quy định giá từ localStorage (được admin đồng bộ từ backend).
 * Nếu không có → trả về giá trị mặc định.
 */
export function getPricingRules(): { tyLeNguoiLon: number; tyLeTreEm: number; tyLePhiDichVu: number } {
  if (typeof window === 'undefined') {
    return { tyLeNguoiLon: 1.0, tyLeTreEm: DEFAULT_CHILDREN_RATE, tyLePhiDichVu: DEFAULT_SERVICE_FEE_RATE };
  }
  try {
    const raw = localStorage.getItem('quyDinhGia');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        tyLeNguoiLon: (parsed.tyLeNguoiLon ?? 100) / 100,
        tyLeTreEm: (parsed.tyLeTreEm ?? 60) / 100,
        tyLePhiDichVu: (parsed.tyLePhiDichVu ?? 10) / 100,
      };
    }
  } catch {}
  return { tyLeNguoiLon: 1.0, tyLeTreEm: DEFAULT_CHILDREN_RATE, tyLePhiDichVu: DEFAULT_SERVICE_FEE_RATE };
}

export function getServiceFeeRate(): number {
  return getPricingRules().tyLePhiDichVu;
}

export interface PriceInput {
  giaMoiKhach: number;
  nights: number;
  soNguoiLon: number;
  soTreEm: number;
  soEmBe: number;
  phiVeSinh: number;
}

export interface PriceResult {
  nights: number;
  adultsCost: number;
  childrenCost: number;
  infantsCost: number;
  roomCost: number;
  cleaningFee: number;
  serviceFee: number;
  tienGiamGia: number;
  tongTien: number;
}

/**
 * Tính giá cho nơi lưu trú (theo đêm, theo người).
 * accept optional pricingRules to avoid localStorage race condition.
 */
export function calculateLuuTru(input: PriceInput, discount: number = 0, pricingRules?: { tyLeNguoiLon: number; tyLeTreEm: number; tyLePhiDichVu: number }): PriceResult {
  const { giaMoiKhach, nights, soNguoiLon, soTreEm, soEmBe, phiVeSinh } = input;
  const rules = pricingRules || getPricingRules();
  const { tyLeNguoiLon, tyLeTreEm, tyLePhiDichVu } = rules;

  const n = Math.max(1, nights);

  const adultsCost = Math.round(giaMoiKhach * tyLeNguoiLon) * soNguoiLon * n;
  const childrenCost = Math.round(giaMoiKhach * tyLeTreEm) * soTreEm * n;
  const infantsCost = 0;
  const roomCost = adultsCost + childrenCost + infantsCost;

  const cleaningFee = Math.round(phiVeSinh || 0);
  const serviceFee = Math.round((roomCost + cleaningFee) * tyLePhiDichVu);
  const tongTien = roomCost + cleaningFee + serviceFee - discount;

  return {
    nights: n,
    adultsCost,
    childrenCost,
    infantsCost,
    roomCost,
    cleaningFee,
    serviceFee,
    tienGiamGia: discount,
    tongTien: Math.max(0, tongTien),
  };
}

/**
 * Tính giá cho dịch vụ/trải nghiệm (theo người, không theo đêm).
 */
export function calculateDichVu(giaMoiKhach: number, soLuongKhach: number): PriceResult {
  const roomCost = giaMoiKhach * soLuongKhach;
  const serviceFee = Math.round(roomCost * getServiceFeeRate());

  return {
    nights: 1,
    adultsCost: roomCost,
    childrenCost: 0,
    infantsCost: 0,
    roomCost,
    cleaningFee: 0,
    serviceFee,
    tienGiamGia: 0,
    tongTien: roomCost + serviceFee,
  };
}

/**
 * Format number to VND currency string.
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}
