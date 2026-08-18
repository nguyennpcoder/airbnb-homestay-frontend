'use client';

export default function AdminPhoneLink({
    phone,
    className = '',
}: {
    phone?: string | null;
    className?: string;
}) {
    const raw = phone?.trim();
    if (!raw || raw === '—') {
        return <span className={className}>—</span>;
    }
    const tel = raw.replace(/[^\d+]/g, '');
    return (
        <a
            href={`tel:${tel || raw}`}
            className={`hover:text-[#FF385C] transition-colors ${className}`}
        >
            {raw}
        </a>
    );
}
