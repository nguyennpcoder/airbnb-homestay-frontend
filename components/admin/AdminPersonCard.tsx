'use client';

import Link from 'next/link';
import AdminUserAvatar, { AdminAvatarPerson, resolvePersonName } from '@/components/admin/AdminUserAvatar';
import { VerifiedName } from '@/components/admin/VerifiedBadge';
import { adminUserProfileHref } from '@/lib/admin-navigation';

export default function AdminPersonCard({
    title,
    person,
    fallbackName,
    userId,
    phone,
    email,
    footer,
}: {
    title: string;
    person?: AdminAvatarPerson | null;
    fallbackName?: string;
    userId?: number;
    phone?: string | null;
    email?: string | null;
    footer?: React.ReactNode;
}) {
    const name = resolvePersonName(person, fallbackName ?? '—');

    return (
        <div className="flex gap-3 py-3 border-b border-gray-100 last:border-0">
            <AdminUserAvatar person={person} size={48} />
            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{title}</p>
                <VerifiedName
                    name={name}
                    verified={person?.xacMinhDanhTinh}
                    className="font-semibold text-gray-900 mt-0.5"
                    badgeClassName="w-4 h-4"
                />
                {phone && (
                    <p className="text-xs text-gray-600 mt-1">
                        <span className="text-gray-400">ĐT:</span>{' '}
                        <a href={`tel:${phone}`} className="hover:text-[#FF385C]">{phone}</a>
                    </p>
                )}
                {email && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                        <span className="text-gray-400">Email:</span> {email}
                    </p>
                )}
                {userId && (
                    <Link
                        href={adminUserProfileHref(userId)}
                        className="text-xs font-semibold text-[#FF385C] hover:underline mt-1 inline-block"
                    >
                        Hồ sơ #{userId} →
                    </Link>
                )}
                {footer}
            </div>
        </div>
    );
}
