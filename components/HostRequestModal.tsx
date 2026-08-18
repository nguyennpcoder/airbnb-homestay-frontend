'use client';

import { useState, useEffect } from 'react';
import { thongBaoAPI, userAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface HostRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number | string;
  userName?: string;
}

export default function HostRequestModal({ isOpen, onClose, userId, userName }: HostRequestModalProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [kycPreview, setKycPreview] = useState<string>('');
  const [submittingKyc, setSubmittingKyc] = useState(false);

  const [emailVerified, setEmailVerified] = useState(false);
  const [communityAccepted, setCommunityAccepted] = useState(false);
  const [kycVerified, setKycVerified] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      userAPI.getProfile(Number(userId)).then((u: any) => {
        setEmailVerified(!!u.emailDaXacNhan);
        setCommunityAccepted(!!u.daChapNhanCamKetCongDong);
        setKycVerified(!!u.xacMinhDanhTinh);
      }).catch(() => {});
    }
  }, [isOpen, userId]);

  useEffect(() => {
    if (isOpen) {
      setSubmitted(false);
      setReason('');
      setAgreed(false);
      setKycFile(null);
      setKycPreview('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const allConditionsMet = emailVerified && communityAccepted && kycVerified;
  const missingItems: string[] = [];
  if (!emailVerified) missingItems.push('Xác minh email');
  if (!communityAccepted) missingItems.push('Cam kết cộng đồng');
  if (!kycVerified) missingItems.push('Xác minh danh tính (KYC)');

  const handleSubmit = async () => {
    if (submitting || !agreed) return;
    setSubmitting(true);
    try {
      const res = await thongBaoAPI.requestHostRole(Number(userId), reason);
      toast.success(res.message || 'Yêu cầu đã được gửi!');
      setSubmitted(true);
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitKyc = async () => {
    if (!kycFile) { toast.error('Vui lòng chọn ảnh CCCD/CCCD'); return; }
    setSubmittingKyc(true);
    try {
      await userAPI.uploadKyc(Number(userId), kycFile);
      setKycVerified(true);
      toast.success('Đã tải lên giấy tờ xác minh danh tính!');
      setKycFile(null);
      setKycPreview('');
    } catch {
      toast.error('Không thể tải lên giấy tờ');
    } finally {
      setSubmittingKyc(false);
    }
  };

  const handleAcceptCommunity = async () => {
    try {
      await userAPI.updateProfile(Number(userId), { daChapNhanCamKetCongDong: true });
      setCommunityAccepted(true);
      toast.success('Đã cam kết cộng đồng!');
    } catch {
      toast.error('Không thể cập nhật');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {submitted ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {allConditionsMet ? 'Chúc mừng! Bạn đã là chủ nhà!' : 'Yêu cầu đã được gửi!'}
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                {allConditionsMet
                  ? 'Bạn đã đáp ứng đủ 3 điều kiện và được duyệt tự động.'
                  : 'Yêu cầu của bạn đã được gửi đến quản trị viên. Vui lòng chờ xét duyệt.'}
              </p>
              <button onClick={onClose} className="px-6 py-2.5 bg-black text-white rounded-full text-sm font-semibold hover:bg-gray-800 transition-colors">
                Đã hiểu
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Trở thành chủ nhà</h3>
                  <p className="text-sm text-gray-500">
                    {allConditionsMet ? 'Bạn đủ điều kiện - nhấn Gửi để duyệt tự động' : 'Hoàn thành 3 điều kiện bên dưới'}
                  </p>
                </div>
              </div>

              {/* Verification Checklist */}
              <div className="mb-5 space-y-3">
                <h4 className="text-sm font-bold text-gray-900">Điều kiện bắt buộc</h4>

                {/* Email */}
                <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${emailVerified ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${emailVerified ? 'bg-green-500' : 'bg-gray-300'}`}>
                    {emailVerified ? (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <span className="text-white text-xs font-bold">1</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">Xác minh email</p>
                    <p className="text-xs text-gray-500">{emailVerified ? 'Đã xác minh' : 'Vui lòng xác minh email trong phần cài đặt'}</p>
                  </div>
                  {emailVerified && <span className="text-xs font-bold text-green-600">✓</span>}
                </div>

                {/* Community */}
                <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${communityAccepted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${communityAccepted ? 'bg-green-500' : 'bg-gray-300'}`}>
                    {communityAccepted ? (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <span className="text-white text-xs font-bold">2</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">Cam kết cộng đồng</p>
                    <p className="text-xs text-gray-500">{communityAccepted ? 'Đã cam kết' : 'Đồng ý với các quy tắc cộng đồng'}</p>
                  </div>
                  {!communityAccepted && (
                    <button onClick={handleAcceptCommunity} className="text-xs font-bold text-[#FF385C] hover:underline shrink-0">
                      Cam kết ngay
                    </button>
                  )}
                  {communityAccepted && <span className="text-xs font-bold text-green-600">✓</span>}
                </div>

                {/* KYC */}
                <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${kycVerified ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${kycVerified ? 'bg-green-500' : 'bg-gray-300'}`}>
                    {kycVerified ? (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <span className="text-white text-xs font-bold">3</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">Xác minh danh tính (KYC)</p>
                    <p className="text-xs text-gray-500">{kycVerified ? 'Đã xác minh' : 'Cung cấp giấy tờ tùy thân'}</p>
                  </div>
                  {kycVerified && <span className="text-xs font-bold text-green-600">✓</span>}
                </div>

                {!kycVerified && (
                  <div className="mt-2 space-y-2">
                    <label className="block">
                      <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-amber-400 hover:bg-amber-50/50 transition-all">
                        {kycPreview ? (
                          <img src={kycPreview} alt="KYC Preview" className="w-full h-full object-contain rounded-xl" />
                        ) : (
                          <div className="flex flex-col items-center justify-center pt-4 pb-4">
                            <svg className="w-8 h-8 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p className="text-xs text-gray-500 font-medium">Chọn ảnh CCCD/Passport</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">JPG, PNG (tối đa 5MB)</p>
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) { toast.error('Ảnh tối đa 5MB'); return; }
                            setKycFile(file);
                            setKycPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                    {kycFile && (
                      <button
                        onClick={handleSubmitKyc}
                        disabled={submittingKyc}
                        className="w-full py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {submittingKyc ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        ) : null}
                        {submittingKyc ? 'Đang tải lên...' : 'Tải lên & Xác minh'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Reason */}
              {!allConditionsMet && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs text-amber-700 font-medium">
                    Bạn cần hoàn thành {missingItems.length} điều kiện còn thiếu trước khi gửi yêu cầu: {missingItems.join(', ')}.
                  </p>
                </div>
              )}

              {allConditionsMet && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Lý do (không bắt buộc)</label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Ví dụ: Tôi có một căn nhà đẹp và muốn đón tiếp khách..."
                      rows={3}
                      maxLength={500}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#FF385C]/20 focus:border-[#FF385C] transition-all"
                    />
                    <div className="text-right text-xs text-gray-400 mt-1">{reason.length}/500</div>
                  </div>

                  <div className="mb-5 p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-xs text-gray-700 leading-relaxed">
                        <p className="font-semibold text-amber-800 mb-1">Cam kết khi trở thành chủ nhà:</p>
                        <ul className="space-y-1 list-disc pl-4">
                          <li>Cung cấp thông tin chính xác về chỗ ở</li>
                          <li>Đảm bảo chỗ ở an toàn, sạch sẽ cho khách</li>
                          <li>Phản hồi tin nhắn và yêu cầu của khách</li>
                          <li>Tôn trọng quyền riêng tư của khách</li>
                          <li>Tuân thủ quy định và chính sách cộng đồng</li>
                        </ul>
                      </div>
                    </div>
                    <label className="flex items-start gap-3 mt-3 pt-3 border-t border-amber-200/60 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#FF385C] focus:ring-[#FF385C] cursor-pointer"
                      />
                      <span className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors">
                        Tôi đã đọc và <strong>đồng ý</strong> với các điều khoản và cam kết trên
                      </span>
                    </label>
                  </div>
                </>
              )}

              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-full border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                  Hủy
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !agreed || !allConditionsMet}
                  className="flex-1 py-2.5 rounded-full bg-[#FF385C] text-white text-sm font-bold hover:bg-[#E31C5F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Đang gửi...
                    </>
                  ) : 'Gửi yêu cầu'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
