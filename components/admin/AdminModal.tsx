'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export function AdminModalPortal({
    children,
    onClose,
    zIndexClass = 'z-[200]',
}: {
    children: React.ReactNode;
    onClose: () => void;
    zIndexClass?: string;
}) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (!mounted) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [mounted]);

    if (!mounted) return null;

    return createPortal(
        <div
            className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-4 bg-black/55`}
            onClick={onClose}
        >
            {children}
        </div>,
        document.body
    );
}

export function AdminModalCloseButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="absolute top-2.5 right-2.5 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 z-10"
            aria-label="Đóng"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
    );
}

export function AdminModalShell({
    children,
    onClose,
    maxWidth = 'max-w-md',
    zIndexClass,
}: {
    children: React.ReactNode;
    onClose: () => void;
    maxWidth?: string;
    zIndexClass?: string;
}) {
    return (
        <AdminModalPortal onClose={onClose} zIndexClass={zIndexClass}>
            <div
                className={`relative admin-modal-panel w-full ${maxWidth}`}
                onClick={e => e.stopPropagation()}
            >
                <AdminModalCloseButton onClick={onClose} />
                {children}
            </div>
        </AdminModalPortal>
    );
}

export function AdminDetailRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex justify-between items-start gap-4 py-2.5 border-b admin-subtle-border last:border-0">
            <span className="text-sm admin-muted shrink-0">{label}</span>
            <span className="text-sm font-medium admin-heading text-right">{value}</span>
        </div>
    );
}

interface AdminConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message?: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    confirmClassName?: string;
    children?: React.ReactNode;
}

export function AdminConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    confirmClassName = 'bg-black hover:bg-gray-800',
    children,
}: AdminConfirmDialogProps) {
    if (!isOpen) return null;

    return (
        <AdminModalShell onClose={onClose}>
            <div className="p-5 pt-4">
                <h3 className="text-lg font-semibold admin-heading mb-2 pr-8">{title}</h3>
                {message && (
                    <div className="text-sm admin-muted mb-5">{message}</div>
                )}
                {children}
                <div className="flex gap-2 mt-4">
                    <button
                        type="button"
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold text-white transition-colors ${confirmClassName}`}
                    >
                        {confirmText}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                        {cancelText}
                    </button>
                </div>
            </div>
        </AdminModalShell>
    );
}
