'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

const SEPAY_LOGO = 'https://sepay.vn/assets/img/logo/sepay-820x820-blue-icon.png';

export default function SepayTestPage() {
    const [code, setCode] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleTest = async () => {
        if (!code.trim()) { toast.error('Nhập mã code'); return; }
        if (!amount.trim()) { toast.error('Nhập số tiền'); return; }
        setLoading(true);
        setResult(null);
        try {
            const res = await fetch('/api/payment/sepay/webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: Math.floor(Math.random() * 999999),
                    gateway: 'Vietcombank',
                    transactionDate: new Date().toISOString().replace('T', ' ').slice(0, 19),
                    accountNumber: '1017588888',
                    subAccount: '',
                    code: code.trim(),
                    content: code.trim() + ' chuyen tien',
                    transferType: 'in',
                    description: 'TEST WEBHOOK chuyen tien',
                    transferAmount: Number(amount),
                    accumulated: 1000000,
                    referenceCode: 'FT' + Date.now()
                })
            });
            const data = await res.json();
            setResult(data);
            if (data.success) {
                toast.success('Webhook OK — payment đã xác nhận!');
            } else {
                toast.error(data.message || 'Webhook failed');
            }
        } catch (e: any) {
            toast.error('Lỗi: ' + e.message);
            setResult({ success: false, message: e.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50 pt-16 pb-4 px-4 overflow-y-auto">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-4">
                    <img src={SEPAY_LOGO} alt="SePay" className="w-12 h-12 mx-auto rounded-xl shadow-sm" />
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-5 space-y-4">
                    <div className="text-center">
                        <h1 className="text-lg font-bold text-gray-900">Test SePay Webhook</h1>
                        <p className="text-xs text-gray-400 mt-1">Mô phỏng SePay gửi xác nhận thanh toán</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mã code (từ QR page)</label>
                        <input value={code} onChange={e => setCode(e.target.value)}
                            placeholder="AIRBNB1028_1719612345678"
                            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền (VND)</label>
                        <input value={amount} onChange={e => setAmount(e.target.value)}
                            placeholder="799425"
                            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                    </div>

                    <button onClick={handleTest} disabled={loading}
                        className="w-full py-3 bg-[#0066FF] text-white rounded-xl text-sm font-bold hover:bg-[#0052CC] disabled:opacity-50 transition">
                        {loading ? 'Đang gửi...' : '🚀 Gửi Webhook Test'}
                    </button>

                    {result && (
                        <div className={`p-3 rounded-xl text-xs font-mono ${result.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
                        </div>
                    )}

                    <div className="text-xs text-gray-400 space-y-1 bg-gray-50 rounded-xl p-3">
                        <p className="font-medium text-gray-500">Cách dùng:</p>
                        <ol className="list-decimal ml-4 space-y-0.5">
                            <li>Mở trang QR payment (chọn SePay → thanh toán)</li>
                            <li>Copy mã code trên QR page</li>
                            <li>Paste vào ô trên + nhập đúng số tiền</li>
                            <li>Bấm "Gửi Webhook Test"</li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    );
}
