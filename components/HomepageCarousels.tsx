'use client';

import React, { useMemo, useState, useEffect } from 'react';
import ListingCarousel from './ListingCarousel';
import ListingSkeleton from './ListingSkeleton';
import type { Phong } from '@/lib/api';

const DEFAULT_CITIES = [
    { title: "Nơi lưu trú được ưa chuộng tại Hà Nội", city: "Hà Nội" },
    { title: "Còn phòng tại Đà Lạt vào cuối tuần tới", city: "Đà Lạt" },
    { title: "Chỗ ở tại Vũng Tàu", city: "Vũng Tàu" },
    { title: "Còn phòng tại Seoul vào tháng tới", city: "Seoul" },
];

const EMPTY_ROOMS: Phong[] = [];

// Cache the homepage payload for the lifetime of the tab. Navigating away and
// back (or clicking a logo) would otherwise refetch all 35 rooms every time.
let homepageCache: Record<string, Phong[]> | null = null;

export default function HomepageCarousels() {
    // One request feeds every carousel. Before this, the page fired 8 search
    // requests (4 fixed cities + 1 per extra city) against a free Render
    // instance, so the requests queued and the page took ~20s to settle.
    const [roomsByCity, setRoomsByCity] = useState<Record<string, Phong[]> | null>(homepageCache);

    useEffect(() => {
        if (homepageCache) return;

        const rawApi = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '/api';
        const apiBase = rawApi.replace(/\/+$/, '').replace(/\/api$/, '') + '/api';
        const url = `${apiBase}/public/search?loaiPhong=noi_luu_tru&imageLimit=4`;
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
                const grouped: Record<string, Phong[]> = {};
                data.forEach((room: any) => {
                    const city = room.thanhPho;
                    if (!city) return;
                    if (!grouped[city]) grouped[city] = [];
                    grouped[city].push(room);
                });
                homepageCache = grouped;
                setRoomsByCity(grouped);
            })
            .catch((err) => {
                console.error(
                    'HomepageCarousels: failed to load listings from',
                    url,
                    '— make sure NEXT_PUBLIC_API_URL points to the backend. Error:',
                    err?.message || err
                );
                setRoomsByCity({});
            });
    }, []);

    const sections = useMemo(() => {
        if (!roomsByCity) return [];
        const defaultCitySet = new Set(DEFAULT_CITIES.map((d) => d.city.toLowerCase()));
        const extras = Object.entries(roomsByCity)
            .filter(([city]) => !defaultCitySet.has(city.toLowerCase()))
            .map(([city, rooms]) => ({ city, title: `Chỗ ở tại ${city}`, rooms }))
            .sort((a, b) => b.rooms.length - a.rooms.length);

        return [
            ...DEFAULT_CITIES.map((section) => ({
                city: section.city,
                title: section.title,
                rooms: roomsByCity[section.city] || EMPTY_ROOMS,
            })),
            ...extras,
        ];
    }, [roomsByCity]);

    if (!roomsByCity) {
        return (
            <>
                {DEFAULT_CITIES.map((section) => (
                    <div key={section.city} className="py-8">
                        <div className="max-w-[1476px] mx-auto px-2 mb-6">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-1">{section.title}</h2>
                        </div>
                        <div className="max-w-[1476px] mx-auto">
                            <div className="flex space-x-3 overflow-hidden">
                                {[...Array(6)].map((_, i) => (
                                    <ListingSkeleton key={i} />
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </>
        );
    }

    return (
        <>
            {sections.map((section) => (
                <ListingCarousel
                    key={section.city}
                    title={section.title}
                    itemType="noi_luu_tru"
                    city={section.city}
                    initialItems={section.rooms}
                    showMore
                />
            ))}
        </>
    );
}
