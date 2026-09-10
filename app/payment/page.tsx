'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { paymentAPI, bookingAPI, userAPI, Booking, promotionAPI, KhuyenMai, pricingRulesAPI, chinhSachHuyAPI } from '@/lib/api';
import { calculateLuuTru, formatVND, getPricingRules } from '@/lib/priceCalc';
import GuestSelector from '@/components/GuestSelector';
import Image from 'next/image';
import ConfirmModal from '@/components/ConfirmModal';
import toast from 'react-hot-toast';
import { getValidSrc } from '@/lib/image';
import { webSocketService } from '@/lib/websocket';

function PaymentPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const bookingId = searchParams.get('bookingId');
    const bookingNum = bookingId ? Number(bookingId) : 0;

    const [selectedMethod, setSelectedMethod] = useState<'vnpay' | 'zalopay' | 'momo' | 'sepay'>('vnpay');
    const [loading, setLoading] = useState(false);
    const [booking, setBooking] = useState<Booking | any>(null);
    const [userBalance, setUserBalance] = useState<number>(0);
    const [useWallet, setUseWallet] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    const [showDateModal, setShowDateModal] = useState(false);
    const [showGuestModal, setShowGuestModal] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

    const [adults, setAdults] = useState<number>(1);
    const [children, setChildren] = useState<number>(0);
    const [infants, setInfants] = useState<number>(0);
    const [messageToHost, setMessageToHost] = useState('');
    const [isMessageAdded, setIsMessageAdded] = useState(false);
    const [listingDays, setListingDays] = useState<Array<{ ngay: string; conKhaDung: boolean }>>([]);
    const [availablePromotions, setAvailablePromotions] = useState<KhuyenMai[]>([]);
    const [selectedPromo, setSelectedPromo] = useState<KhuyenMai | null>(null);
    const [promoDiscount, setPromoDiscount] = useState<number>(0);
    const [promoError, setPromoError] = useState<string | null>(null);
    const [pricingRules, setPricingRules] = useState<{ tyLeNguoiLon: number; tyLeTreEm: number; tyLePhiDichVu: number } | null>(null);
    const [cancellationPolicies, setCancellationPolicies] = useState<import('@/lib/api').ChinhSachHoanTien[]>([]);

    // Fetch pricing rules from API
    useEffect(() => {
        pricingRulesAPI.get().then(data => {
            const rules = { tyLeNguoiLon: data.tyLeNguoiLon / 100, tyLeTreEm: data.tyLeTreEm / 100, tyLePhiDichVu: (data.tyLePhiDichVu ?? 10) / 100 };
            setPricingRules(rules);
            localStorage.setItem('quyDinhGia', JSON.stringify(data));
        }).catch(() => {});
    }, []);

    const refreshListingDays = (phongId: number) => {
        const today = new Date();
        const nextYear = new Date();
        nextYear.setFullYear(today.getFullYear() + 1);
        import('@/lib/api').then(({ availabilityAPI }) =>
            availabilityAPI.listingDays(
                phongId,
                today.toISOString().split('T')[0],
                nextYear.toISOString().split('T')[0]
            ).then(setListingDays).catch(console.error)
        );
    };

    const [initialGuests, setInitialGuests] = useState<{ adults: number; children: number; infants: number } | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                toast.error('Vui lòng đăng nhập để tiếp tục thanh toán');
                const callbackUrl = encodeURIComponent(window.location.pathname + window.location.search);
                router.push(`/login?callbackUrl=${callbackUrl}`);
                return;
            }
            try {
                const res = await userAPI.getProfile(Number(userId));
                setUserBalance(res.soDu || 0);
                setIsCheckingAuth(false);
            } catch (error: any) {
                if (error.response?.status === 401) {
                    localStorage.removeItem('userId');
                    localStorage.removeItem('token');
                    router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
                } else {
                    setIsCheckingAuth(false);
                }
            }
        };
        checkAuth();
        // Fetch available promotions
        promotionAPI.getAvailable().then(setAvailablePromotions).catch(console.error);
    }, []);

    // Realtime: admin ẩn/vô hiệu khuyến mãi đang được áp dụng → gỡ ngay trên form
    useEffect(() => {
        const uid = localStorage.getItem('userId');
        if (!uid) return;
        const userId = Number(uid);
        const onNotification = (notification: any) => {
            if (notification?.loaiThongBao === 'PROMO_INVALIDATED') {
                const message = notification.noiDung || 'Khuyến mãi không còn hiệu lực';
                setPromoError(message);
                toast.error(message);
                setSelectedPromo(null);
                setPromoDiscount(0);
                promotionAPI.getAvailable().then(setAvailablePromotions).catch(console.error);
            }
        };
        webSocketService.connect(userId, undefined, onNotification);
        return () => webSocketService.removeNotificationHandler(userId, onNotification);
    }, []);

    useEffect(() => {
        if (!bookingId && !isCheckingAuth) {
            toast.error('Thiếu mã đặt phòng');
            router.push('/profile?tab=chuyen-di');
        }
    }, [bookingId, isCheckingAuth]);

    useEffect(() => {
        if (bookingId) {
            bookingAPI.getById(bookingNum)
                .then(data => {
                    setBooking(data);

                    // Read guest data from URL params (passed from room page)
                    const urlAdults = searchParams.get('adults');
                    const urlChildren = searchParams.get('children');
                    const urlInfants = searchParams.get('infants');

                    if (urlAdults !== null || urlChildren !== null || urlInfants !== null) {
                        setAdults(Number(urlAdults) || 1);
                        setChildren(Number(urlChildren) || 0);
                        setInfants(Number(urlInfants) || 0);
                    } else {
                        // Fallback: try localStorage or use soLuongKhach
                        const storageKey = `booking_${bookingId}_guests`;
                        const savedGuests = localStorage.getItem(storageKey);
                        if (savedGuests) {
                            try {
                                const parsed = JSON.parse(savedGuests);
                                setAdults(parsed.adults || 1);
                                setChildren(parsed.children || 0);
                                setInfants(parsed.infants || 0);
                            } catch {
                                setAdults(data.soLuongKhach || 1);
                            }
                        } else if (data.soLuongKhach != null) {
                            setAdults(data.soLuongKhach as number);
                        }
                    }

                    const phongData = data.phong || data.sanPham;
                    const pid = phongData?.maPhong || phongData?.maSanPham;
                    if (pid) refreshListingDays(pid);
                })
                .catch(err => {
                    console.error(err);
                    toast.error('Không thể tải thông tin đặt phòng');
                });
        }
    }, [bookingId]);

    useEffect(() => {
        chinhSachHuyAPI.list()
            .then(policies => setCancellationPolicies(policies))
            .catch(() => console.error('Failed to fetch cancellation policies'));
    }, []);

    const phongData = booking?.phong || booking?.sanPham;
    const pricePerGuest = Math.round(phongData?.giaMoiKhach || 0);

    const nights = booking?.ngayNhanPhong && booking?.ngayTraPhong
        ? Math.max(1, Math.ceil((new Date(booking.ngayTraPhong).getTime() - new Date(booking.ngayNhanPhong).getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

    const soKhach = adults + children + infants;
    const priceResult = calculateLuuTru({
        giaMoiKhach: Math.round(phongData?.giaMoiKhach || 0),
        nights,
        soNguoiLon: adults,
        soTreEm: children,
        soEmBe: infants,
        phiVeSinh: Math.round(phongData?.phiVeSinh || booking?.phiVeSinh || 0),
    }, promoDiscount, pricingRules || undefined);
    const roomCost = priceResult.roomCost;
    const adultsCost = priceResult.adultsCost;
    const childrenCost = priceResult.childrenCost;
    const cleaningFee = priceResult.cleaningFee;
    const serviceFee = priceResult.serviceFee;
    const displayTotal = priceResult.tongTien;

    const handleSelectPromo = async (promo: KhuyenMai | null) => {
        setSelectedPromo(promo);
        setPromoError(null);
        if (!promo) {
            setPromoDiscount(0);
            return;
        }
        // Validate availability before applying
        try {
            const validation = await promotionAPI.validate(promo.maKhuyenMai);
            if (!validation.available) {
                setPromoError(validation.message);
                toast.error(validation.message);
                setSelectedPromo(null);
                setPromoDiscount(0);
                setAvailablePromotions(prev => prev.filter(p => p.maKhuyenMai !== promo.maKhuyenMai));
                return;
            }
        } catch {
            // Skip if validate endpoint unavailable — backend will catch it
        }
        try {
            const result = await promotionAPI.calculate({
                maKhuyenMai: promo.maKhuyenMai,
                soNguoiLon: adults,
                soTreEm: children,
                soEmBe: infants,
                roomCost,
                nights,
                adultsCost,
                childrenCost,
            });
            setPromoDiscount(result.tienGiamGia);
        } catch {
            setPromoDiscount(0);
            toast.error('Không thể áp dụng khuyến mãi');
        }
    };

    const handlePayment = async () => {
        if (!bookingId) {
            toast.error('Booking ID không hợp lệ');
            return;
        }
        setLoading(true);
        setPromoError(null);
        try {
            // Validate promo availability in real-time before proceeding
            if (selectedPromo) {
                try {
                    const validation = await promotionAPI.validate(selectedPromo.maKhuyenMai);
                    if (!validation.available) {
                        setPromoError(validation.message);
                        toast.error(validation.message);
                        setAvailablePromotions(prev => prev.filter(p => p.maKhuyenMai !== selectedPromo.maKhuyenMai));
                        setSelectedPromo(null);
                        setPromoDiscount(0);
                        setLoading(false);
                        return;
                    }
                } catch {
                    // If validate endpoint fails (e.g. 404), skip check — backend will handle
                }
            }
            if (messageToHost.trim()) {
                await bookingAPI.update(bookingNum, { yeuCauDacBiet: messageToHost });
            }
            // Apply promotion to booking
            if (selectedPromo) {
                await bookingAPI.update(bookingNum, {
                    maKhuyenMai: selectedPromo.maKhuyenMai,
                    tienGiamGia: promoDiscount,
                    tongTien: displayTotal,
                });
            }
            const totalAmount = displayTotal > 0 ? displayTotal : (booking?.tongTien || 0);
            let amountToPay = totalAmount;
            let walletAmount = 0;

            if (useWallet) {
                if (userBalance >= totalAmount) {
                    walletAmount = totalAmount;
                    amountToPay = 0;
                } else {
                    walletAmount = userBalance;
                    amountToPay = totalAmount - userBalance;
                }
            }

            if (useWallet && walletAmount > 0) {
                await paymentAPI.payWithBalance(bookingNum, walletAmount);
                if (amountToPay === 0) {
                    toast.success('Thanh toán thành công bằng ví!');
                    router.push('/profile?tab=chuyen-di');
                    return;
                }
            }

            if (amountToPay > 0) {
                let response;
                switch (selectedMethod) {
                    case 'vnpay':
                        response = await paymentAPI.createVnPayUrl(bookingNum, amountToPay);
                        break;
                    case 'zalopay':
                        response = await paymentAPI.createZaloPayUrl(bookingNum, amountToPay);
                        break;
                    case 'momo':
                        response = await paymentAPI.createMoMoUrl(bookingNum, amountToPay);
                        break;
                    case 'sepay':
                        response = await paymentAPI.createSePayPayment(bookingNum, amountToPay);
                        break;
                }
                if (selectedMethod === 'sepay' && response?.success) {
                    router.push(`/payment/sepay?bookingId=${bookingId}&paymentId=${response.paymentId}&code=${response.code}&amount=${amountToPay}&qrUrl=${encodeURIComponent(response.qrUrl)}&accountNumber=${response.accountNumber}&bankCode=${response.bankCode}&accountHolder=${encodeURIComponent(response.accountHolder)}`);
                } else if (response?.url) {
                    window.location.href = response.url;
                } else {
                    toast.error('Không thể tạo link thanh toán');
                }
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || 'Đã có lỗi xảy ra';
            toast.error(typeof errorMessage === 'string' ? errorMessage : 'Đã có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveGuests = async () => {
        try {
            const totalGuests = adults + children;
            const maxGuests = phongData?.soKhachToiDa;
            if (maxGuests && totalGuests > maxGuests) {
                toast.error(`Số khách tối đa cho chỗ ở này là ${maxGuests}`);
                return;
            }
            const updatePayload: any = { soLuongKhach: totalGuests, soNguoiLon: adults, soTreEm: children, soEmBe: infants };
            if (booking?.ngayNhanPhong) updatePayload.ngayNhanPhong = booking.ngayNhanPhong;
            if (booking?.ngayTraPhong) updatePayload.ngayTraPhong = booking.ngayTraPhong;
            const updated = await bookingAPI.update(bookingNum, updatePayload);
            const storageKey = `booking_${bookingId}_guests`;
            localStorage.setItem(storageKey, JSON.stringify({ adults, children, infants }));
            setBooking(updated);
            setShowGuestModal(false);
            toast.success('Đã cập nhật số khách');
            // Recalculate promo discount if a promo is selected
            if (selectedPromo) {
                handleSelectPromo(selectedPromo);
            }
            setBooking(updated);
            setInitialGuests(null);
            setShowGuestModal(false);
            toast.success('Đã cập nhật số lượng khách');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể cập nhật');
        }
    };

    const handleSaveDates = async (checkIn: string, checkOut: string) => {
        try {
            const updatePayload: any = { ngayNhanPhong: checkIn, ngayTraPhong: checkOut, soNguoiLon: adults, soTreEm: children };
            if (booking?.soLuongKhach) updatePayload.soLuongKhach = booking.soLuongKhach;
            const updated = await bookingAPI.update(bookingNum, updatePayload);
            setBooking(updated);
            const pid = updated.phong?.maPhong || updated.sanPham?.maSanPham;
            if (pid) refreshListingDays(pid);
            setShowDateModal(false);
            toast.success('Đã cập nhật ngày');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể cập nhật');
        }
    };

    const handleCancelAndBack = async () => {
        const userId = localStorage.getItem('userId');
        if (!bookingId || !userId) { router.back(); return; }
        try {
            setLoading(true);
            await bookingAPI.cancel(bookingNum, Number(userId));
            toast.success('Đã hủy yêu cầu đặt phòng');
            const phongId = booking?.phong?.maPhong || booking?.maSanPham;
            if (phongId) {
                // Save current guest/date state so room page can restore
                localStorage.setItem('roomBookingDraft', JSON.stringify({
                    roomId: phongId,
                    checkIn: booking?.ngayNhanPhong || '',
                    checkOut: booking?.ngayTraPhong || '',
                    adults, children, infants
                }));
            }
            router.push(phongId ? `/phong/${phongId}` : '/profile?tab=chuyen-di');
        } catch {
            toast.error('Không thể hủy yêu cầu đặt phòng');
        } finally {
            setLoading(false);
            setShowCancelConfirm(false);
        }
    };

    const fmt = (n: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0));

    const getCancellationText = () => {
        const chinhSachHuy = phongData?.chinhSachHuy;
        if (!booking?.ngayNhanPhong) return "Hủy trước 24 giờ để được hoàn tiền đầy đủ.";
        const checkIn = new Date(booking.ngayNhanPhong);
        const policy = cancellationPolicies.find(p => p.ma === chinhSachHuy);
        if (policy && policy.soNgayTruoc > 0) {
            const freeDate = new Date(checkIn.getTime() - policy.soNgayTruoc * 24 * 60 * 60 * 1000);
            if (policy.tyLeHoanTien >= 100) {
                return `Hủy trước ${freeDate.toLocaleDateString('vi-VN')} để được hoàn tiền đầy đủ.`;
            }
            return `Hủy trước ${freeDate.toLocaleDateString('vi-VN')} để được hoàn tiền ${policy.tyLeHoanTien}%. Sau thời gian này, bạn sẽ không được hoàn tiền.`;
        }
        switch (chinhSachHuy) {
            case 'LINH_HOAT':
                return `Hủy trước ${new Date(checkIn.getTime() - 24 * 60 * 60 * 1000).toLocaleDateString('vi-VN')} để được hoàn tiền đầy đủ.`;
            case 'TRUNG_BINH':
                return `Hủy trước ${new Date(checkIn.getTime() - 5 * 24 * 60 * 60 * 1000).toLocaleDateString('vi-VN')} để được hoàn tiền đầy đủ. Sau thời gian này, bạn sẽ được hoàn lại 50%.`;
            case 'NGHIEM_NGAT':
                return `Hủy trước ${new Date(checkIn.getTime() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('vi-VN')} để được hoàn tiền 50%. Sau thời gian này, bạn sẽ không được hoàn tiền.`;
            default:
                return 'Chính sách hủy linh hoạt.';
        }
    };

    if (isCheckingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-8">
            <div className="max-w-6xl mx-auto px-4">
                <div className="mb-8 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition"
                        onClick={() => setShowCancelConfirm(true)}>
                        <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', fill: 'none', height: '16px', width: '16px', stroke: 'currentcolor', strokeWidth: 3, overflow: 'visible' }}><path fill="none" d="M20 28 8.7 16.7a1 1 0 0 1 0-1.4L20 4"></path></svg>
                    </div>
                    <h1 className="text-3xl font-semibold text-gray-900">Yêu cầu đặt phòng/đặt chỗ</h1>
                </div>

                <div className="grid lg:grid-cols-2 gap-12">
                    <div>
                        <div className="mb-8">
                            <h2 className="text-xl font-semibold mb-4">Chuyến đi của bạn</h2>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="font-semibold text-base mb-1">Ngày</div>
                                    <div className="text-gray-600">
                                        {booking?.ngayNhanPhong && new Date(booking.ngayNhanPhong).toLocaleDateString('vi-VN')} – {booking?.ngayTraPhong && new Date(booking.ngayTraPhong).toLocaleDateString('vi-VN')}
                                    </div>
                                </div>
                                <button type="button" onClick={() => setShowDateModal(true)} className="font-semibold underline">Thay đổi</button>
                            </div>
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-semibold text-base mb-1">Khách</div>
                                    <div className="text-gray-600">{(adults + children) || 1} khách{infants > 0 ? `, ${infants} em bé` : ''}</div>
                                </div>
                                <button type="button" onClick={() => { setInitialGuests({ adults, children, infants }); setShowGuestModal(true); }} className="font-semibold underline">Thay đổi</button>
                            </div>
                        </div>

                        <hr className="my-8" />

                        <div className="mb-8">
                            <h2 className="text-xl font-semibold mb-4">Thanh toán bằng</h2>
                            <div className="mb-4 p-4 border rounded-xl bg-white">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <svg className="w-8 h-8 text-[#FF385C]" viewBox="0 0 24 24" fill="currentColor"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
                                        <div>
                                            <div className="font-medium">Số dư ví</div>
                                            <div className="text-gray-500 text-sm">Hiện có: ₫{fmt(userBalance)}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`font-semibold ${useWallet ? 'text-black' : 'text-gray-400'}`}>
                                            {useWallet ? `-₫${fmt(Math.min(userBalance, displayTotal))}` : '₫0'}
                                        </span>
                                        <div
                                            className={`w-6 h-6 rounded flex items-center justify-center cursor-pointer transition-colors ${useWallet ? 'bg-[#FF385C]' : 'border-2 border-gray-300'}`}
                                            onClick={() => userBalance > 0 && setUseWallet(!useWallet)}
                                        >
                                            {useWallet && <span className="text-white text-sm">✓</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {displayTotal - (useWallet ? Math.min(userBalance, displayTotal) : 0) > 0 && (
                                <div className="flex flex-col gap-4">
                                    {[
                                        { key: 'vnpay' as const, label: 'Thanh toán qua VNPay', icon: '/Icon-VNPAY-QR.webp' },
                                        { key: 'zalopay' as const, label: 'Thanh toán qua ZaloPay', icon: '/zalopay-logo.png' },
                                        { key: 'momo' as const, label: 'Thanh toán qua MoMo', icon: '/Logo-MoMo-Circle.webp' },
                                        { key: 'sepay' as const, label: 'Thanh toán qua SePay (VietQR)', icon: '/sepay-logo.png' },
                                    ].map(method => (
                                        <div
                                            key={method.key}
                                            className={`cursor-pointer border rounded-xl p-4 flex items-center justify-between transition-all ${selectedMethod === method.key ? 'border-2 border-black bg-gray-50' : 'border border-gray-200'}`}
                                            onClick={() => setSelectedMethod(method.key)}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 relative flex-shrink-0">
                                                    <Image src={method.icon} alt={method.label} fill className="object-contain" />
                                                </div>
                                                <span className="font-semibold text-gray-900 text-base">{method.label}</span>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === method.key ? 'border-black' : 'border-gray-300'}`}>
                                                {selectedMethod === method.key && <div className="w-3 h-3 rounded-full bg-black" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <hr className="my-8" />

                        <div className="mb-8">
                            <h2 className="text-xl font-semibold mb-4">Bắt buộc cho chuyến đi của bạn</h2>
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <div className="font-semibold text-base mb-1">Nhắn tin cho chủ nhà</div>
                                    <div className="text-gray-500 text-sm mb-3">Hãy chia sẻ lý do bạn đi du lịch và những điều bạn thích ở chỗ ở này.</div>
                                    {isMessageAdded ? (
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm italic">"{messageToHost}"</div>
                                    ) : (
                                        <textarea value={messageToHost} onChange={(e) => setMessageToHost(e.target.value)} placeholder="Nhập tin nhắn..." className="w-full p-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black outline-none h-24 text-sm" />
                                    )}
                                </div>
                                <button type="button" onClick={() => { if (messageToHost.trim()) setIsMessageAdded(!isMessageAdded); }} className="px-6 py-2 border border-black rounded-lg font-semibold hover:bg-gray-50 transition min-w-[100px]">
                                    {isMessageAdded ? 'Sửa' : 'Thêm'}
                                </button>
                            </div>
                        </div>

                        <hr className="my-8" />

                        <p className="text-[12px] text-gray-600 leading-normal mb-6">
                            Bằng cách chọn nút bên dưới, tôi đồng ý với <span className="underline font-semibold cursor-pointer">Nội quy nhà</span> của Chủ nhà, <span className="underline font-semibold cursor-pointer">Quy tắc cơ bản dành cho khách</span>, và <span className="underline font-semibold cursor-pointer">Chính sách đặt lại và hoàn tiền</span>.
                        </p>

                        <button type="button" disabled={loading} onClick={handlePayment} className="w-full bg-[#FF385C] hover:bg-[#E31C5F] text-white h-14 text-lg font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed">
                            {loading ? 'Đang xử lý...' : 'Yêu cầu đặt phòng'}
                        </button>
                    </div>

                    <div className="lg:pl-12">
                        <div className="sticky top-24">
                            <div className="border border-gray-200 rounded-xl p-6 shadow-sm bg-white">
                                <div className="flex gap-4 mb-6">
                                    <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 relative">
                                        <Image src={getValidSrc(phongData?.urlAnhChinh || '') || '/placeholder-house.jpg'} alt="Listing" fill className="object-cover" />
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <div className="text-[12px] text-gray-500 mb-0.5">Toàn bộ căn hộ cho thuê</div>
                                        <div className="text-sm font-medium line-clamp-2 leading-tight mb-1">{phongData?.tieuDe}</div>
                                        <div className="text-[12px] flex items-center gap-1">
                                            <span className="font-semibold">{phongData?.diemTrungBinh?.toFixed(1) || '0.0'}</span>
                                            <span className="text-gray-500">({phongData?.soLuongDanhGia || 0} đánh giá)</span>
                                        </div>
                                    </div>
                                </div>

                                <hr className="my-6" />

                                <div className="mb-6">
                                    <h3 className="font-semibold text-base mb-1">Chính sách hủy</h3>
                                    <p className="text-gray-600 text-[13px] leading-relaxed">{getCancellationText()}</p>
                                </div>

                                <hr className="my-6" />

                                <div>
                                    <h3 className="font-semibold text-lg mb-4 text-gray-900">Chi tiết giá</h3>
                                    <div className="space-y-3 mb-4">
                                        {adults > 0 && (() => {
                                            const { tyLeNguoiLon } = getPricingRules();
                                            return (
                                                <div className="flex justify-between items-start text-sm">
                                                    <div className="text-gray-700">₫{fmt(Math.round(pricePerGuest * tyLeNguoiLon))} × {adults} người lớn × {nights} đêm</div>
                                                    <div className="font-medium text-gray-900">₫{fmt(adultsCost)}</div>
                                                </div>
                                            );
                                        })()}
                                        {children > 0 && (() => {
                                            const { tyLeTreEm } = getPricingRules();
                                            const discountPercent = Math.round((1 - tyLeTreEm) * 100);
                                            return (
                                                <div className="flex justify-between items-start text-sm">
                                                    <div className="text-gray-700">₫{fmt(Math.round(pricePerGuest * tyLeTreEm))} × {children} trẻ em (giảm {discountPercent}%) × {nights} đêm</div>
                                                    <div className="font-medium text-gray-900">₫{fmt(childrenCost)}</div>
                                                </div>
                                            );
                                        })()}
                                        {infants > 0 && (
                                            <div className="flex justify-between items-start text-sm">
                                                <div className="text-gray-700">₫0 × {infants} em bé × {nights} đêm</div>
                                                <div className="text-gray-400">Miễn phí</div>
                                            </div>
                                        )}
                                        {cleaningFee > 0 && (
                                            <div className="flex justify-between items-start text-sm">
                                                <div className="text-gray-700">Phí vệ sinh</div>
                                                <div className="font-medium text-gray-900">₫{fmt(cleaningFee)}</div>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-start text-sm">
                                            <div className="text-gray-700">Phí dịch vụ</div>
                                            <div className="font-medium text-gray-900">₫{fmt(serviceFee)}</div>
                                        </div>
                                    </div>

                                    {/* Promotion Selector */}
                                    {availablePromotions.length > 0 && (
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Khuyến mãi</label>
                                            <div className="space-y-2">
                                                <button
                                                    onClick={() => handleSelectPromo(null)}
                                                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${!selectedPromo
                                                        ? 'border-gray-300 bg-gray-50 font-medium'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                                >
                                                    Không áp dụng
                                                </button>
                                                {availablePromotions.map(promo => (
                                                    <button
                                                        key={promo.maKhuyenMai}
                                                        onClick={() => handleSelectPromo(promo)}
                                                        className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${selectedPromo?.maKhuyenMai === promo.maKhuyenMai
                                                            ? 'border-[#FF385C] bg-[#FF385C]/5'
                                                            : 'border-gray-200 hover:border-gray-300'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-medium text-gray-900">{promo.tenKhuyenMai}</span>
                                                            <span className="text-[#FF385C] font-semibold text-xs">
                                                                {promo.loaiGiamGia === 'PHAN_TRAM' ? `-${promo.giaTri}%` : `-${fmt(promo.giaTri)}₫`}
                                                            </span>
                                                        </div>
                                                        {promo.moTa && (
                                                            <p className="text-xs text-gray-500 mt-1">{promo.moTa}</p>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Promo Error */}
                                    {promoError && (
                                        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            {promoError}
                                        </div>
                                    )}

                                    {/* Discount Display */}
                                    {promoDiscount > 0 && (
                                        <div className="flex justify-between items-center py-2 px-3 mb-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                                            <div className="flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                                                Giảm giá ({selectedPromo?.tenKhuyenMai})
                                            </div>
                                            <div className="font-semibold">-₫{fmt(promoDiscount)}</div>
                                        </div>
                                    )}

                                    {useWallet && userBalance > 0 && (
                                        <div className="flex justify-between items-center py-3 px-3.5 mb-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                                            <div className="flex items-center gap-2">Sử dụng số dư ví</div>
                                            <div className="font-semibold">-₫{fmt(Math.min(userBalance, displayTotal))}</div>
                                        </div>
                                    )}

                                    <hr className="my-4" />

                                    <div className="flex justify-between items-center py-1">
                                        <div className="text-base font-semibold">Tổng (VND)</div>
                                        <div className="text-base font-bold underline">₫{fmt(displayTotal)}</div>
                                    </div>

                                    {useWallet && userBalance > 0 && (
                                        <>
                                            <div className="flex justify-between items-center text-sm text-gray-500 mt-2 px-0.5">
                                                <div>Đã trừ từ ví</div>
                                                <div>-₫{fmt(Math.min(userBalance, displayTotal))}</div>
                                            </div>
                                            <div className="flex justify-between items-center mt-3 p-3.5 bg-red-50 rounded-lg border border-red-200">
                                                <div className="font-semibold text-red-600">Còn phải trả</div>
                                                <div className="text-lg font-bold text-red-600">₫{fmt(Math.max(0, displayTotal - userBalance))}</div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="mt-6 p-6 border border-red-100 rounded-xl bg-red-50 flex items-center gap-4">
                                <svg className="w-6 h-6 text-[#FF385C] shrink-0" viewBox="0 0 32 32" fill="currentColor"><path d="M16 28c7-4.73 14-10 14-17a7 7 0 0 0-14-3 7 7 0 0 0-14 3c0 7 7 12.27 14 17z"/></svg>
                                <div className="flex-1">
                                    <div className="font-bold text-sm">Hiếm khi còn phòng! <span className="font-normal text-gray-600">Chỗ ở này thường kín phòng.</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showDateModal && <DateEditModal booking={booking} listingDays={listingDays} onSave={handleSaveDates} onClose={() => setShowDateModal(false)} />}

            {showGuestModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowGuestModal(false)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-xl font-semibold">Thay đổi khách</h2>
                            <button onClick={() => setShowGuestModal(false)} className="text-2xl">&times;</button>
                        </div>
                        <div className="p-6">
                            <GuestSelector adults={adults} childrenCount={children} infants={infants} pets={0}
                                onUpdate={c => { setAdults(c.adults); setChildren(c.children); setInfants(c.infants); }}
                                maxGuests={phongData?.soKhachToiDa} mode="inline" showPets={false} />
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-between items-center">
                            <button onClick={() => setShowGuestModal(false)} className="underline font-semibold">Hủy</button>
                            <button onClick={handleSaveGuests} className="px-6 py-3 bg-black text-white rounded-lg font-semibold">Lưu</button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal isOpen={showCancelConfirm} onClose={() => setShowCancelConfirm(false)} onConfirm={handleCancelAndBack}
                title="Hủy yêu cầu đặt phòng?" message="Nếu bạn rời khỏi trang này, yêu cầu đặt phòng của bạn sẽ bị hủy."
                confirmText="Hủy đặt phòng & Thoát" cancelText="Tiếp tục thanh toán" isDangerous={true} />
        </div>
    );
}

function DateEditModal({ booking, listingDays, onSave, onClose }: { booking: any; listingDays: any[]; onSave: (ci: string, co: string) => void; onClose: () => void }) {
    const [checkIn, setCheckIn] = useState(booking?.ngayNhanPhong || '');
    const [checkOut, setCheckOut] = useState(booking?.ngayTraPhong || '');
    const [monthOffset, setMonthOffset] = useState(0);

    const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const parseDate = (v: string) => (v ? new Date(v + 'T00:00:00') : null);
    const leftMonth = new Date(new Date().getFullYear(), new Date().getMonth() + monthOffset, 1);
    const rightMonth = new Date(leftMonth.getFullYear(), leftMonth.getMonth() + 1, 1);

    const getMatrix = (base: Date) => {
        const start = new Date(base.getFullYear(), base.getMonth(), 1);
        const dow = (start.getDay() + 6) % 7;
        const days = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
        const res: (Date | null)[] = Array(dow).fill(null);
        for (let i = 1; i <= days; i++) res.push(new Date(base.getFullYear(), base.getMonth(), i));
        while (res.length < 42) res.push(null);
        return res;
    };

    const handlePick = (d: Date) => {
        const ci = parseDate(checkIn);
        const co = parseDate(checkOut);
        if (!ci || (ci && co)) { setCheckIn(toISO(d)); setCheckOut(''); }
        else if (d.getTime() <= ci.getTime()) { setCheckIn(toISO(d)); setCheckOut(''); }
        else setCheckOut(toISO(d));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b sticky top-0 bg-white z-10 flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Thay đổi ngày</h2>
                    <button onClick={onClose} className="text-2xl">&times;</button>
                </div>
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={() => setMonthOffset(v => v - 1)} className="w-10 h-10 border rounded-full">{'\u2039'}</button>
                        <div className="flex gap-16 font-semibold">
                            <div>Tháng {leftMonth.getMonth() + 1} {leftMonth.getFullYear()}</div>
                            <div>Tháng {rightMonth.getMonth() + 1} {rightMonth.getFullYear()}</div>
                        </div>
                        <button onClick={() => setMonthOffset(v => v + 1)} className="w-10 h-10 border rounded-full">{'\u203A'}</button>
                    </div>
                    <div className="grid grid-cols-2 gap-12">
                        {[leftMonth, rightMonth].map((m, mi) => (
                            <div key={mi}>
                                <div className="grid grid-cols-7 text-center text-xs font-bold text-gray-500 mb-2">
                                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(w => <div key={w}>{w}</div>)}
                                </div>
                                <div className="grid grid-cols-7 gap-y-1">
                                    {getMatrix(m).map((d, i) => {
                                        if (!d) return <div key={i} className="h-12" />;
                                        const ci = parseDate(checkIn); const co = parseDate(checkOut);
                                        const isStart = ci && d.getTime() === ci.getTime();
                                        const isEnd = co && d.getTime() === co.getTime();
                                        const inBetween = ci && co && d.getTime() > ci.getTime() && d.getTime() < co.getTime();
                                        const isBlocked = listingDays.some(ld => ld.ngay === toISO(d) && !ld.conKhaDung) || d.getTime() < new Date().setHours(0, 0, 0, 0);
                                        const isRangeStart = isStart && co;
                                        const isRangeEnd = isEnd && ci;

                                        let btnClass = "relative z-10 w-11 h-11 flex items-center justify-center rounded-full text-sm font-semibold transition-all";
                                        if (isBlocked) {
                                            btnClass += " text-gray-300 line-through cursor-not-allowed";
                                        } else if (isStart || isEnd) {
                                            btnClass += " bg-[#222222] text-white hover:bg-black";
                                        } else if (inBetween) {
                                            btnClass += " bg-gray-50 text-gray-900 !rounded-none w-full";
                                        } else {
                                            btnClass += " text-gray-900 hover:ring-2 hover:ring-black hover:ring-inset";
                                        }

                                        return (
                                            <div key={i} className="relative h-12 w-full flex items-center justify-center">
                                                {inBetween && <div className="absolute inset-0 bg-gray-50" />}
                                                {isRangeStart && <div className="absolute top-0 bottom-0 right-0 w-1/2 bg-gray-50" />}
                                                {isRangeEnd && <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-gray-50" />}
                                                <button
                                                    key={i}
                                                    disabled={isBlocked}
                                                    onClick={() => handlePick(d)}
                                                    className={btnClass}
                                                >
                                                    {d.getDate()}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-6 border-t flex justify-between items-center sticky bottom-0 bg-white">
                    <button onClick={() => { setCheckIn(''); setCheckOut(''); }} className="underline font-semibold text-red-500">Xóa ngày</button>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="underline font-semibold">Hủy</button>
                        <button onClick={() => checkIn && checkOut ? onSave(checkIn, checkOut) : toast.error('Chọn ngày')} className="px-6 py-3 bg-black text-white rounded-lg font-semibold">Lưu</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PaymentPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center">Đang tải...</div>}>
            <PaymentPageContent />
        </Suspense>
    );
}
