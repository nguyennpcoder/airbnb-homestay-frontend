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
        fetch('/api/public/search?loaiPhong=noi_luu_tru')
            .then(r => r.json())
            .then((data: any[]) => {
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
            .catch(() => {});
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
