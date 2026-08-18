'use client';

import React from 'react';
import { AdminConfirmDialog } from '@/components/admin/AdminModal';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
    children?: React.ReactNode;
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    isDangerous = false,
    children,
}: ConfirmModalProps) {
    return (
        <AdminConfirmDialog
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={onConfirm}
            title={title}
            message={message}
            confirmText={confirmText}
            cancelText={cancelText}
            confirmClassName={
                isDangerous
                    ? 'bg-[#FF385C] hover:bg-[#E31C5F]'
                    : 'bg-black hover:bg-gray-800'
            }
        >
            {children}
        </AdminConfirmDialog>
    );
}
