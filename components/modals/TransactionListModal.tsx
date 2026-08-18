import { Modal, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface Transaction {
  id: string;
  type: 'payment' | 'refund' | 'topup';
  title: string;
  date: string;
  amount: number;
  provider?: string;
}

interface TransactionListModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
}

const PROVIDER_LABELS: Record<string, string> = {
  VNPAY: 'VNPay',
  MOMO: 'MoMo',
  ZALOPAY: 'ZaloPay',
  STRIPE: 'Stripe',
  PAYPAL: 'PayPal',
  WALLET: 'Ví nội bộ',
  SEPAY: 'SePay',
};

const STATUS_LABELS: Record<string, string> = {
  payment: 'Thanh toán',
  refund: 'Hoàn tiền',
  topup: 'Nạp tiền',
};

export default function TransactionListModal({ isOpen, onClose, transactions }: TransactionListModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    if (!searchTerm) return transactions;
    const lower = searchTerm.toLowerCase();
    return transactions.filter(t =>
      t.title?.toLowerCase().includes(lower) ||
      t.provider?.toLowerCase().includes(lower) ||
      STATUS_LABELS[t.type]?.toLowerCase().includes(lower)
    );
  }, [transactions, searchTerm]);

  const totalPaid = useMemo(() =>
    transactions.filter(t => t.type === 'payment').reduce((s, t) => s + t.amount, 0),
    [transactions]
  );

  const totalRefund = useMemo(() =>
    transactions.filter(t => t.type === 'refund' || t.type === 'topup').reduce((s, t) => s + t.amount, 0),
    [transactions]
  );

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={800}
      centered
      className="transaction-list-modal"
      styles={{ body: { height: '80vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' } }}
      closeIcon={<div className="p-2 rounded-full hover:bg-gray-100 transition"><svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', fill: 'none', height: '16px', width: '16px', stroke: 'currentColor', strokeWidth: 3, overflow: 'visible' }}><path d="m6 6 20 20m0-20-20 20"></path></svg></div>}
    >
      <div className="flex h-full">
        {/* Left: Stats */}
        <div className="w-[280px] hidden md:flex flex-col h-full p-8 border-r border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Tổng quan</h3>

          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Tổng giao dịch</p>
              <p className="text-2xl font-bold text-gray-900">{transactions.length}</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Tổng đã thanh toán</p>
              <p className="text-xl font-bold text-[#FF385C]">-{totalPaid.toLocaleString('vi-VN')} ₫</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Tổng hoàn tiền</p>
              <p className="text-xl font-bold text-green-600">+{totalRefund.toLocaleString('vi-VN')} ₫</p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-400">Hiển thị {filtered.length} / {transactions.length} giao dịch</p>
          </div>
        </div>

        {/* Right: List */}
        <div className="flex-1 h-full overflow-y-auto p-4 md:p-6">
          <div className="max-w-[500px] mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 md:hidden">Lịch sử giao dịch</h2>
            <Input
              prefix={<SearchOutlined className="text-gray-400" />}
              placeholder="Tìm kiếm giao dịch..."
              className="rounded-full py-2 px-4 bg-gray-100 border-transparent hover:bg-gray-100 focus:bg-white focus:border-black focus:ring-0"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            {filtered.length > 0 ? (
              filtered.map((tx) => (
                <div key={tx.id} className="flex items-center gap-4 py-4 border-b border-gray-100 last:border-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    tx.type === 'payment' ? 'bg-red-50 text-[#FF385C]' : 'bg-green-50 text-green-600'
                  }`}>
                    {tx.type === 'payment' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{tx.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">
                        {tx.date ? format(new Date(tx.date), 'dd/MM/yyyy HH:mm', { locale: vi }) : ''}
                      </span>
                      {tx.provider && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                          {PROVIDER_LABELS[tx.provider] || tx.provider}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-sm font-bold ${
                      tx.type === 'payment' ? 'text-[#FF385C]' : 'text-green-600'
                    }`}>
                      {tx.type === 'payment' ? '-' : '+'}{tx.amount.toLocaleString('vi-VN')} ₫
                    </span>
                    <p className="text-[10px] text-gray-400 mt-0.5">{STATUS_LABELS[tx.type]}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-500 pt-8 text-center">
                Không tìm thấy giao dịch nào phù hợp.
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
