'use client';

import BackendImage from '@/components/BackendImage';
import { getValidSrc } from '@/lib/image';

export interface AdminAvatarPerson {
    hoTen?: string | null;
    ho?: string | null;
    ten?: string | null;
    urlAnhDaiDien?: string | null;
    xacMinhDanhTinh?: boolean | null;
}

export function resolvePersonName(person?: AdminAvatarPerson | null, fallback = '—') {
    if (!person) return fallback;
    const hoTen = person.hoTen?.trim();
    if (hoTen) return hoTen;
    const combined = `${person.ho ?? ''} ${person.ten ?? ''}`.trim();
    return combined || fallback;
}

export default function AdminUserAvatar({
    person,
    size = 36,
    className = '',
}: {
    person?: AdminAvatarPerson | null;
    size?: number;
    className?: string;
}) {
    const name = resolvePersonName(person, 'U');
    const initial = name.charAt(0).toUpperCase();
    const boxClass = `rounded-full bg-gray-200 overflow-hidden relative shrink-0 flex items-center justify-center text-xs font-bold text-gray-500 border border-gray-100 ${className}`;

    if (person?.urlAnhDaiDien) {
        return (
            <div className={boxClass} style={{ width: size, height: size }}>
                <BackendImage
                    src={getValidSrc(person.urlAnhDaiDien)}
                    alt={name}
                    fill
                    className="object-cover"
                    sizes={`${size}px`}
                />
            </div>
        );
    }

    return (
        <div className={boxClass} style={{ width: size, height: size }}>
            {initial}
        </div>
    );
}
