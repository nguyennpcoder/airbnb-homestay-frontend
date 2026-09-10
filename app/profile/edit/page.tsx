'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { userAPI, authAPI, User } from '@/lib/api';
import toast from 'react-hot-toast';
import BackendImage from '@/components/BackendImage';
import { getValidSrc } from '@/lib/image';

export default function EditProfilePage() {
  const [profile, setProfile] = useState<User | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [form, setForm] = useState({
    ho: '',
    ten: '',
    ngaySinh: '',
    email: '',
    soDienThoai: '',
    laChuNha: false,
    nhanTinNhanTiepThi: true,
    thanhPhoSong: '',
    congViec: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const [showKycModal, setShowKycModal] = useState(false);
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [kycPreview, setKycPreview] = useState<string | null>(null);
  const [uploadingKyc, setUploadingKyc] = useState(false);
  const kycInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const id = localStorage.getItem('userId');
    if (!id) return;
    userAPI.getProfile(Number(id)).then((data) => {
      setProfile(data);
      setForm({
        ho: data.ho || '',
        ten: data.ten || '',
        ngaySinh: data.ngaySinh || '',
        email: data.email || '',
        soDienThoai: data.soDienThoai || '',
        laChuNha: !!data.laChuNha,
        nhanTinNhanTiepThi: data.nhanTinNhanTiepThi ?? true,
        thanhPhoSong: data.thanhPhoSong || '',
        congViec: data.congViec || '',
      });
    }).catch(() => { });
  }, []);

  const handleSave = async () => {
    if (!profile) { window.location.href = '/profile'; return; }
    setUploading(true);
    try {
      if (selectedFile) {
        const data = await userAPI.uploadAvatar(profile.maNguoiDung, selectedFile);
        if (data?.url) {
          setProfile({ ...profile, urlAnhDaiDien: `${data.url}?t=${Date.now()}` });
        }
      }
      await userAPI.updateProfile(profile.maNguoiDung, {
        ho: form.ho,
        ten: form.ten,
        hoTen: `${form.ho} ${form.ten}`.trim(),
        ngaySinh: form.ngaySinh || null,
        soDienThoai: form.soDienThoai,
        laChuNha: form.laChuNha,
        nhanTinNhanTiepThi: form.nhanTinNhanTiepThi,
        thanhPhoSong: form.thanhPhoSong,
        congViec: form.congViec,
      } as any);
      toast.success('Cập nhật thành công');
      window.location.href = '/profile';
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error('Lưu thất bại. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!profile) return;
    if (!passwordForm.oldPassword) { toast.error('Vui lòng nhập mật khẩu hiện tại'); return; }
    if (!passwordForm.newPassword) { toast.error('Vui lòng nhập mật khẩu mới'); return; }
    if (passwordForm.newPassword.length < 8) { toast.error('Mật khẩu mới phải có ít nhất 8 ký tự'); return; }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error('Mật khẩu xác nhận không khớp'); return; }
    setChangingPassword(true);
    try {
      await authAPI.changePassword(profile.maNguoiDung, passwordForm.oldPassword, passwordForm.newPassword);
      toast.success('Đổi mật khẩu thành công');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleKycFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setKycFile(file);
    setKycPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleKycUpload = async () => {
    if (!profile || !kycFile) { toast.error('Vui lòng chọn ảnh CCCD'); return; }
    setUploadingKyc(true);
    try {
      const data = await userAPI.uploadKyc(profile.maNguoiDung, kycFile);
      setProfile({ ...profile, xacMinhDanhTinh: true, urlBangChungDanhTinh: data.url });
      toast.success('Xác minh danh tính thành công!');
      setShowKycModal(false);
      setKycFile(null);
      setKycPreview(null);
    } catch (err) {
      console.error('KYC upload error:', err);
      toast.error('Xác minh thất bại. Vui lòng thử lại.');
    } finally {
      setUploadingKyc(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="pt-24 pb-20">
        <div className="container-custom max-w-5xl">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/profile" className="p-2 hover:bg-gray-100 rounded-full transition-colors lg:hidden">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Chi tiết hồ sơ</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
            <div className="bg-white border border-gray-200 rounded-3xl p-6 lg:p-8 shadow-sm space-y-8 order-2 lg:order-1">
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Thông tin cá nhân</h2>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field label="Họ">
                      <input value={form.ho} onChange={(e) => setForm({ ...form, ho: e.target.value })} className="w-full bg-gray-50 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition-all" />
                    </Field>
                    <Field label="Tên">
                      <input value={form.ten} onChange={(e) => setForm({ ...form, ten: e.target.value })} className="w-full bg-gray-50 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition-all" />
                    </Field>
                  </div>
                  <Field label="Ngày sinh">
                    <input type="date" value={form.ngaySinh || ''} onChange={(e) => setForm({ ...form, ngaySinh: e.target.value })} className="w-full bg-gray-50 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition-all" />
                  </Field>
                  <Field label="Email (Không thể thay đổi)">
                    <input value={form.email} disabled className="w-full bg-gray-100 border-gray-200 rounded-xl px-4 py-3 text-gray-400 cursor-not-allowed" />
                  </Field>
                  <Field label="Số điện thoại">
                    <input value={form.soDienThoai} onChange={(e) => setForm({ ...form, soDienThoai: e.target.value })} className="w-full bg-gray-50 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition-all" />
                  </Field>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field label="Thành phố đang sống">
                      <input value={form.thanhPhoSong} onChange={(e) => setForm({ ...form, thanhPhoSong: e.target.value })} placeholder="VD: Hà Nội" className="w-full bg-gray-50 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition-all" />
                    </Field>
                    <Field label="Nghề nghiệp">
                      <input value={form.congViec} onChange={(e) => setForm({ ...form, congViec: e.target.value })} placeholder="VD: Kỹ sư phần mềm" className="w-full bg-gray-50 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition-all" />
                    </Field>
                  </div>
                </div>
              </section>

              <hr className="border-gray-100" />

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Tùy chọn & Bảo mật</h2>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                      <h3 className="font-bold text-gray-900">Tiếp thị qua email</h3>
                      <p className="text-sm text-gray-500">Nhận các ưu đãi và cập nhật mới nhất</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={form.nhanTinNhanTiepThi} onChange={(e) => setForm({ ...form, nhanTinNhanTiepThi: e.target.checked })} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* XÁC NHẬN EMAIL */}
                    <div className={`relative p-5 rounded-2xl border-2 transition-all ${
                      profile?.emailDaXacNhan
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-amber-50 border-amber-200'
                    }`}>
                      <div className="flex items-start gap-2 mb-3">
                        {profile?.emailDaXacNhan ? (
                          <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        ) : (
                          <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-amber-400">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v4m0 4h.01" />
                            </svg>
                          </span>
                        )}
                        <span className={`text-[11px] font-bold uppercase tracking-widest ${
                          profile?.emailDaXacNhan ? 'text-emerald-700' : 'text-amber-700'
                        }`}>Xác nhận email</span>
                      </div>
                      <p className={`text-sm font-semibold ${
                        profile?.emailDaXacNhan ? 'text-emerald-800' : 'text-amber-800'
                      }`}>
                        {profile?.emailDaXacNhan ? 'Đã xác nhận' : 'Chưa xác nhận'}
                      </p>
                    </div>

                    {/* CAM KẾT CỘNG ĐỒNG */}
                    <div className={`relative p-5 rounded-2xl border-2 transition-all ${
                      profile?.daChapNhanCamKetCongDong
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-start gap-2 mb-3">
                        {profile?.daChapNhanCamKetCongDong ? (
                          <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        ) : (
                          <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-gray-300">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </span>
                        )}
                        <span className={`text-[11px] font-bold uppercase tracking-widest ${
                          profile?.daChapNhanCamKetCongDong ? 'text-emerald-700' : 'text-gray-500'
                        }`}>Cam kết cộng đồng</span>
                      </div>
                      <p className={`text-sm font-semibold ${
                        profile?.daChapNhanCamKetCongDong ? 'text-emerald-800' : 'text-gray-500'
                      }`}>
                        {profile?.daChapNhanCamKetCongDong ? 'Đã chấp nhận' : 'Chưa chấp nhận'}
                      </p>
                    </div>

                    {/* XÁC MINH DANH TÍNH KYC */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => { if (!profile?.xacMinhDanhTinh) setShowKycModal(true); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !profile?.xacMinhDanhTinh) setShowKycModal(true); }}
                      className={`relative p-5 rounded-2xl border-2 transition-all ${
                        profile?.xacMinhDanhTinh
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-gray-50 border-gray-200 cursor-pointer hover:border-blue-300 hover:bg-blue-50/40'
                      }`}>
                      <div className="flex items-start gap-2 mb-3">
                        {profile?.xacMinhDanhTinh ? (
                          <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-blue-500">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 1L3 5v6c0 5.25 3.75 10.15 9 11.25C17.25 21.15 21 16.25 21 11V5l-9-4zm-2 14l-4-4 1.41-1.41L10 12.17l6.59-6.59L18 7l-8 8z"/>
                            </svg>
                          </span>
                        ) : (
                          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-300">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </span>
                        )}
                        <span className={`text-[11px] font-bold uppercase tracking-widest ${
                          profile?.xacMinhDanhTinh ? 'text-blue-700' : 'text-gray-500'
                        }`}>Xác minh danh tính</span>
                      </div>
                      <p className={`text-sm font-semibold ${
                        profile?.xacMinhDanhTinh ? 'text-blue-800' : 'text-gray-500'
                      }`}>
                        {profile?.xacMinhDanhTinh ? 'Đã xác minh (KYC)' : 'Chưa xác minh'}
                      </p>
                      {!profile?.xacMinhDanhTinh && (
                        <p className="mt-2 text-xs font-bold text-blue-600 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                          Tải lên CCCD để xác minh ngay
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <hr className="border-gray-100" />

              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Đổi mật khẩu</h2>
                  <button
                    type="button"
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                    className="text-sm text-[#FF385C] hover:underline font-semibold"
                  >
                    {showPasswordForm ? 'Huỷ' : 'Thay đổi'}
                  </button>
                </div>
                {showPasswordForm && (
                  <div className="space-y-4">
                    <Field label="Mật khẩu hiện tại">
                      <input
                        type="password"
                        value={passwordForm.oldPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                        className="w-full bg-gray-50 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition-all"
                        placeholder="Nhập mật khẩu hiện tại"
                      />
                    </Field>
                    <Field label="Mật khẩu mới">
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className="w-full bg-gray-50 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition-all"
                        placeholder="Ít nhất 8 ký tự"
                      />
                    </Field>
                    <Field label="Xác nhận mật khẩu mới">
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        className="w-full bg-gray-50 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition-all"
                        placeholder="Nhập lại mật khẩu mới"
                      />
                    </Field>
                    <button
                      onClick={handleChangePassword}
                      disabled={changingPassword}
                      className="w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {changingPassword ? 'Đang đổi...' : 'Đổi mật khẩu'}
                    </button>
                  </div>
                )}
                {!showPasswordForm && (
                  <p className="text-sm text-gray-500">Cập nhật mật khẩu định kỳ để tài khoản được bảo mật hơn.</p>
                )}
              </section>

              <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleSave}
                  disabled={uploading}
                  className="flex-1 bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50"
                >
                  {uploading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
                <Link href="/profile" className="flex-1 text-center py-4 border border-gray-900 font-bold rounded-xl hover:bg-gray-50 transition-all active:scale-95">
                  Hủy bỏ
                </Link>
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-6 lg:sticky lg:top-24 lg:h-fit">
              <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm text-center lg:text-left">
                <div className="relative w-32 h-32 mx-auto lg:mx-0 mb-6 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-full h-full rounded-full overflow-hidden border-4 border-white shadow-lg relative">
                    {previewUrl ? (
                      <BackendImage src={previewUrl} alt="preview" fill className="object-cover" />
                    ) : (
                      <BackendImage src={getValidSrc(profile?.urlAnhDaiDien)} alt="P" fill className="object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                  </div>
                  <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md border border-gray-100 lg:hidden">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  </button>
                </div>
                <h3 className="font-bold text-gray-900 mb-1">Ảnh đại diện</h3>
                <p className="text-xs text-gray-500 leading-relaxed">Sử dụng tệp JPG hoặc PNG, tối đa 2MB.</p>
                <input
                  key={fileInputKey}
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setSelectedFile(file);
                    setPreviewUrl(file ? URL.createObjectURL(file) : null);
                  }}
                />
              </div>

              <div className="bg-gray-900 text-white rounded-3xl p-6 shadow-lg">
                <h3 className="font-bold text-lg mb-3">Tài khoản bảo mật</h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">Chúng tôi luôn bảo vệ thông tin của bạn ở chế độ riêng tư nhất.</p>
                <div className="flex items-center gap-2 text-green-400 text-xs font-bold uppercase tracking-widest">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  Đã mã hóa
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ──── Modal Xác minh danh tính (KYC) ──── */}
      {showKycModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => { if (!uploadingKyc) { setShowKycModal(false); setKycFile(null); setKycPreview(null); } }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Xác minh danh tính</h3>
              <button onClick={() => { setShowKycModal(false); setKycFile(null); setKycPreview(null); }} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-3 mb-5 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1L3 5v6c0 5.25 3.75 10.15 9 11.25C17.25 21.15 21 16.25 21 11V5l-9-4zm-2 14l-4-4 1.41-1.41L10 12.17l6.59-6.59L18 7l-8 8z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-blue-800">Tải lên CCCD để xác minh ngay</p>
                  <p className="text-xs text-blue-600 mt-0.5">Tự động xác minh, không cần chờ quản trị viên duyệt.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => kycInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 rounded-2xl p-6 transition-all flex flex-col items-center gap-2"
              >
                {kycPreview ? (
                  <div className="relative w-full max-h-64 overflow-hidden rounded-xl">
                    <BackendImage src={kycPreview} alt="CCCD" width={400} height={250} className="w-full h-auto object-contain" />
                  </div>
                ) : (
                  <>
                    <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" /></svg>
                    <span className="text-sm font-bold text-gray-700">Chọn ảnh CCCD (mặt trước)</span>
                    <span className="text-xs text-gray-400">JPG hoặc PNG, tối đa 5MB</span>
                  </>
                )}
              </button>
              <input
                ref={kycInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleKycFileSelect}
              />

              <button
                type="button"
                onClick={handleKycUpload}
                disabled={!kycFile || uploadingKyc}
                className="w-full mt-4 bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-40 disabled:scale-100 flex items-center justify-center gap-2"
              >
                {uploadingKyc ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Đang xác minh...
                  </>
                ) : (
                  'Xác minh ngay'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-700 ml-1">{label}</label>
      {children}
    </div>
  );
}

function formatDateTime(d?: string | null) {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleString('vi-VN');
}
