'use client';

export default function VerifiedBadge({ className = 'w-4 h-4' }: { className?: string }) {
    return (
        <svg
            className={`${className} text-blue-500 shrink-0`}
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-label="Đã xác minh danh tính (KYC)"
        >
            <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
            />
        </svg>
    );
}

export function VerifiedName({
    name,
    verified,
    className = 'font-medium text-gray-900 truncate',
    badgeClassName = 'w-3.5 h-3.5',
}: {
    name: string;
    verified?: boolean | null;
    className?: string;
    badgeClassName?: string;
}) {
    return (
        <span className={`inline-flex items-center gap-1 min-w-0 max-w-full ${className}`}>
            <span className="truncate">{name}</span>
            {verified && <VerifiedBadge className={badgeClassName} />}
        </span>
    );
}
