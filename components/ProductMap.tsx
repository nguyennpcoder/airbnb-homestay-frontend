'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';


// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface ProductMapProps {
    viDo: number | string | null;
    kinhDo: number | string | null;
    title?: string;
    address?: string;
}

function MapCenter({ viDo, kinhDo }: { viDo: number; kinhDo: number }) {
    const map = useMap();

    useEffect(() => {
        if (viDo != null && kinhDo != null) {
            map.setView([viDo, kinhDo], 15, { animate: true });
        }
    }, [viDo, kinhDo, map]);

    return null;
}

export default function ProductMap({ viDo, kinhDo, title, address }: ProductMapProps) {
    // Normalize to numbers in case backend sends strings
    const lat = typeof viDo === 'string' ? parseFloat(viDo) : viDo;
    const lng = typeof kinhDo === 'string' ? parseFloat(kinhDo) : kinhDo;

    // Check if coordinates are valid
    const hasValidCoordinates =
        lat != null &&
        lng != null &&
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180;

    if (!hasValidCoordinates) {
        return (
            <div className="w-full h-[480px] overflow-hidden rounded-xl border bg-gray-100 flex items-center justify-center">
                <div className="text-gray-500 text-sm text-center px-4">
                    <p className="mb-2">Bản đồ sẽ được tích hợp theo tọa độ thật trong bản sau.</p>
                    <p className="text-xs text-gray-400">Chưa có thông tin tọa độ cho địa điểm này.</p>
                </div>
            </div>
        );
    }

    const position: [number, number] = [lat as number, lng as number];

    // Create custom icon for product location
    const customIcon = L.divIcon({
        className: 'product-location-marker',
        html: `
            <div style="
                background-color: #FF385C;
                width: 32px;
                height: 32px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <div style="
                    transform: rotate(45deg);
                    color: white;
                    font-size: 16px;
                    font-weight: bold;
                ">📍</div>
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
    });

    return (
        <div className="w-full h-[480px] overflow-hidden rounded-xl border">
            <MapContainer
                center={position}
                zoom={15}
                scrollWheelZoom={false}
                zoomControl={false}
                doubleClickZoom={false}
                boxZoom={false}
                keyboard={false}
                dragging={true}
                touchZoom={false}
                className="h-full w-full"
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapCenter viDo={position[0]} kinhDo={position[1]} />
                <Marker position={position} icon={customIcon}>
                    {title && (
                        <Popup>
                            <div className="p-2">
                                <div className="font-semibold text-sm mb-1">{title}</div>
                                {address && (
                                    <div className="text-xs text-gray-600">{address}</div>
                                )}
                            </div>
                        </Popup>
                    )}
                </Marker>
            </MapContainer>
        </div>
    );
}

