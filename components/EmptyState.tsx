'use client';

import React from 'react';
import Link from 'next/link';

interface EmptyStateProps {
    title: string;
    subtitle: string;
    icon?: React.ReactNode;
    showReset?: boolean;
    resetLabel?: string;
    resetHref?: string;
    onClick?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
    title,
    subtitle,
    icon,
    showReset,
    resetLabel = 'Quay lại trang chủ',
    resetHref = '/',
    onClick
}) => {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-fadeIn min-h-[400px]">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-100">
                {icon ? (
                    <div className="text-gray-400">
                        {icon}
                    </div>
                ) : (
                    <svg
                        viewBox="0 0 32 32"
                        className="w-10 h-10 text-gray-400"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                        role="presentation"
                        focusable="false"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path d="M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2zm0 26a12 12 0 1 1 12-12 12 12 0 0 1-12 12z" />
                        <path d="M16 8v8h8" />
                    </svg>
                )}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {title}
            </h3>
            <p className="text-gray-500 mb-8 max-w-sm whitespace-pre-line">
                {subtitle}
            </p>
            {showReset && (
                onClick ? (
                    <button
                        onClick={onClick}
                        className="inline-block bg-black hover:bg-gray-800 text-white font-semibold px-8 py-3 rounded-lg transition-all shadow-md active:scale-95"
                    >
                        {resetLabel}
                    </button>
                ) : (
                    <Link
                        href={resetHref}
                        className="inline-block bg-black hover:bg-gray-800 text-white font-semibold px-8 py-3 rounded-lg transition-all shadow-md active:scale-95"
                    >
                        {resetLabel}
                    </Link>
                )
            )}
        </div>
    );
};

export default EmptyState;
