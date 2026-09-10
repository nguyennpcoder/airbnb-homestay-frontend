'use client';

import React, { useState, useEffect } from 'react';
import ListingCarousel from './ListingCarousel';

const DEFAULT_CITIES = [
    { title: "Nơi lưu trú được ưa chuộng tại Hà Nội", city: "Hà Nội" },
    { title: "Còn phòng tại Đà Lạt vào cuối tuần tới", city: "Đà Lạt" },
    { title: "Chỗ ở tại Vũng Tàu", city: "Vũng Tàu" },
    { title: "Còn phòng tại Seoul vào tháng tới", city: "Seoul" },
];

export default function HomepageCarousels() {
    const [extraCities, setExtraCities] = useState<{ city: string; count: number }[]>([]);

    useEffect(() => {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
        const url = `${apiBase}/public/search?loaiPhong=noi_luu_tru`;
        console.log('[HomepageCarousels] NEXT_PUBLIC_API_URL =', JSON.stringify(process.env.NEXT_PUBLIC_API_URL), '→ fetching', url);
        fetch(url)
            .then(async (r) => {
                if (!r.ok) {
                    const text = await r.text().catch(() => '');
                    throw new Error(`[HTTP ${r.status}] ${text.slice(0, 200)}`);
                }
                return r.json();
            })
            .then((data: any[]) => {
                if (!Array.isArray(data)) {
                    console.error('HomepageCarousels: expected array, got', typeof data, data);
                    return;
                }
                const counts: Record<string, number> = {};
                data.forEach((r: any) => {
                    const c = r.thanhPho;
                    if (c) counts[c] = (counts[c] || 0) + 1;
                });

                const defaultCitySet = new Set(DEFAULT_CITIES.map(d => d.city.toLowerCase()));
                const extras = Object.entries(counts)
                    .map(([city, count]) => ({ city, count }))
                    .filter(e => !defaultCitySet.has(e.city.toLowerCase()) && e.count > 0)
                    .sort((a, b) => b.count - a.count);

                setExtraCities(extras);
            })
            .catch((err) => {
                console.error(
                    'HomepageCarousels: failed to load listings from',
                    url,
                    '— make sure NEXT_PUBLIC_API_URL=/api and BACKEND_URL is set on Vercel. Error:',
                    err?.message || err
                );
            });
    }, []);

    return (
        <>
            {DEFAULT_CITIES.map((section) => (
                <ListingCarousel
                    key={section.city}
                    title={section.title}
                    itemType="noi_luu_tru"
                    city={section.city}
                    showMore
                />
            ))}
            {extraCities.map((ec) => (
                <ListingCarousel
                    key={ec.city}
                    title={`Chỗ ở tại ${ec.city}`}
                    itemType="noi_luu_tru"
                    city={ec.city}
                    showMore
                />
            ))}
        </>
    );
}
