import React from 'react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    /** Remove top margin when pagination sits inside a table footer */
    inline?: boolean;
    className?: string;
}

type PageSlot = number | 'ellipsis' | 'empty';

const SLOT_COUNT = 7;

function getPageSlots(currentPage: number, totalPages: number): PageSlot[] {
    if (totalPages <= SLOT_COUNT) {
        return Array.from({ length: SLOT_COUNT }, (_, index) =>
            index + 1 <= totalPages ? index + 1 : 'empty'
        );
    }

    if (currentPage <= 4) {
        return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
    }

    if (currentPage >= totalPages - 3) {
        return [
            1,
            'ellipsis',
            totalPages - 4,
            totalPages - 3,
            totalPages - 2,
            totalPages - 1,
            totalPages,
        ];
    }

    return [
        1,
        'ellipsis',
        currentPage - 1,
        currentPage,
        currentPage + 1,
        'ellipsis',
        totalPages,
    ];
}

export default function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    inline = false,
    className = '',
}: PaginationProps) {
    if (totalPages <= 1) return null;

    const slots = getPageSlots(currentPage, totalPages);

    const renderSlot = (slot: PageSlot, index: number) => {
        if (slot === 'empty') {
            return (
                <span
                    key={`empty-${index}`}
                    className="w-8 h-8 shrink-0"
                    aria-hidden="true"
                />
            );
        }

        if (slot === 'ellipsis') {
            return (
                <span
                    key={`ellipsis-${index}`}
                    className="w-8 h-8 shrink-0 flex items-center justify-center text-sm text-gray-400 select-none"
                    aria-hidden="true"
                >
                    ...
                </span>
            );
        }

        return (
            <button
                key={slot}
                type="button"
                onClick={() => onPageChange(slot)}
                aria-label={`Trang ${slot}`}
                aria-current={currentPage === slot ? 'page' : undefined}
                className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    currentPage === slot
                        ? 'bg-black text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
                {slot}
            </button>
        );
    };

    return (
        <nav
            aria-label="Phân trang"
            className={`flex items-center justify-center gap-2 ${
                inline ? '' : 'mt-8'
            } ${className}`}
        >
            <button
                type="button"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Trang trước"
                className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-colors ${
                    currentPage === 1
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            <div className="flex items-center gap-1 min-w-[15.5rem] justify-center">
                {slots.map(renderSlot)}
            </div>

            <button
                type="button"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="Trang sau"
                className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-colors ${
                    currentPage === totalPages
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>
        </nav>
    );
}
