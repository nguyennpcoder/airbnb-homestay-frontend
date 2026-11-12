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

function groupRoomsByCity(rooms: Phong[]): Record<string, Phong[]> {
    const grouped: Record<string, Phong[]> = {};
    rooms.forEach((room: any) => {
        const city = room?.thanhPho;
        if (!city) return;
        if (!grouped[city]) grouped[city] = [];
        grouped[city].push(room);
    });
    return grouped;
}

interface HomepageCarouselsProps {
    /**
     * Rooms pre-fetched by the server component (app/page.tsx). When present
     * the carousels are part of the server-rendered HTML, so there is no
     * skeleton-then-fetch flash on first load.
     */
    initialRooms?: Phong[];
}

export default function HomepageCarousels({ initialRooms }: HomepageCarouselsProps) {
    // One request feeds every carousel. Before this, the page fired 8 search
    // requests (4 fixed cities + 1 per extra city) against a free Render
    // instance, so the requests queued and the page took ~20s to settle.
    const [roomsByCity, setRoomsByCity] = useState<Record<string, Phong[]> | null>(() => {
        if (initialRooms && initialRooms.length > 0) {
            const grouped = groupRoomsByCity(initialRooms);
            homepageCache = grouped;
            return grouped;
        }
        return homepageCache;
    });

    useEffect(() => {
        // Server already provided data (or a previous visit cached it).
        if (homepageCache || (initialRooms && initialRooms.length > 0)) return;

        const rawApi = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '/api';
        const apiBase = rawApi.replace(/\/+$/, '').replace(/\/api$/, '') + '/api';
        const url = `${apiBase}/public/search?loaiPhong=noi_luu_tru&imageLimit=4`;
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
                const grouped = groupRoomsByCity(data);
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
    }, [initialRooms]);

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
            {sections.map((section, index) => (
                <ListingCarousel
                    key={section.city}
                    title={section.title}
                    itemType="noi_luu_tru"
                    city={section.city}
                    initialItems={section.rooms}
                    showMore
                    // Only the first above-the-fold carousel loads its first
                    // photos eagerly; the rest stay lazy.
                    priority={index === 0}
                />
            ))}
        </>
    );
}
