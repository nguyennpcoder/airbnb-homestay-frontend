'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

import ListingCard from './ListingCard';

// Fix for default marker icons in Next.js
if (typeof window !== 'undefined') {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
}

interface MapProps {
    items: any[];
    highlightedItemId: number | null;
    onItemHover: (id: number | null) => void;
    onBoundsChange?: (bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) => void;
}

function MapEvents({ onBoundsChange }: { onBoundsChange?: MapProps['onBoundsChange'] }) {
    const map = useMap();
    useEffect(() => {
        if (!onBoundsChange) return;
        const onMoveEnd = () => {
            const b = map.getBounds();
            onBoundsChange({
                minLat: b.getSouth(),
                maxLat: b.getNorth(),
                minLng: b.getWest(),
                maxLng: b.getEast(),
            });
        };
        map.on('moveend', onMoveEnd);
        return () => {
            map.off('moveend', onMoveEnd);
        };
    }, [map, onBoundsChange]);
    return null;
}

function MapUpdater({ items }: { items: any[] }) {
    const map = useMap();

    useEffect(() => {
        if (items.length > 0) {
            const bounds = L.latLngBounds(items.map(item => [item.viDo, item.kinhDo]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [items, map]);

    return null;
}

// Custom Marker component that updates smoothly using DOM manipulation
function SmoothMarker({
    item,
    isHighlighted,
    onMouseOver,
    onMouseOut
}: {
    item: any;
    isHighlighted: boolean;
    onMouseOver: () => void;
    onMouseOut: () => void;
}) {
    const formattedPrice = useMemo(() => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(item.giaMoiKhach);
    }, [item.giaMoiKhach]);

    const icon = useMemo(() => {
        const html = `
            <div class="custom-marker-content" data-item-id="${item.maPhong ?? item.maSanPham}">
                ${formattedPrice}
            </div>
        `;
        return L.divIcon({
            className: 'custom-marker',
            html: html,
            iconSize: [100, 30],
            iconAnchor: [50, 15],
        });
    }, [formattedPrice, item.maPhong ?? item.maSanPham]);

    // Update marker DOM element directly when highlight state changes
    useEffect(() => {
        let retryCount = 0;
        const maxRetries = 10;

        const updateMarker = () => {
            const markerElement = document.querySelector(`[data-item-id="${item.maPhong ?? item.maSanPham}"]`) as HTMLElement;
            if (markerElement) {
                // Use requestAnimationFrame for smooth updates
                requestAnimationFrame(() => {
                    if (isHighlighted) {
                        markerElement.classList.add('custom-marker-highlighted');
                    } else {
                        markerElement.classList.remove('custom-marker-highlighted');
                    }
                });
                return true;
            }
            return false;
        };

        // Try immediately
        if (updateMarker()) return;

        // Retry with requestAnimationFrame for better timing
        const tryUpdate = () => {
            if (updateMarker() || retryCount >= maxRetries) {
                return;
            }
            retryCount++;
            requestAnimationFrame(tryUpdate);
        };

        requestAnimationFrame(tryUpdate);
    }, [isHighlighted, item.maPhong ?? item.maSanPham]);

    return (
        <Marker
            position={[item.viDo, item.kinhDo]}
            icon={icon}
            eventHandlers={{
                mouseover: onMouseOver,
                mouseout: onMouseOut,
            }}
        >
            <Popup className="custom-popup" closeButton={false} maxWidth={300} minWidth={280}>
                <div className="relative w-full rounded-xl overflow-hidden bg-white shadow-lg group cursor-pointer" style={{ width: '280px' }}>
                    <ListingCard
                        item={item}
                        showHostAvatar={false}
                        className="w-full shadow-none border-none"
                        compact={true}
                    />
                </div>
            </Popup>
        </Marker>
    );
}

// Component to handle scroll wheel zoom only when hovering
function ScrollWheelZoomController({ enabled }: { enabled: boolean }) {
    const map = useMap();

    useEffect(() => {
        if (enabled) {
            map.scrollWheelZoom.enable();
        } else {
            map.scrollWheelZoom.disable();
        }
    }, [enabled, map]);

    return null;
}

export default function Map({ items, highlightedItemId, onItemHover, onBoundsChange }: MapProps) {
    // Filter items with valid coordinates
    const validItems = items.filter(item => item.viDo != null && item.kinhDo != null);
    const defaultCenter: [number, number] = [21.0285, 105.8542]; // Hanoi center
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isMapHovered, setIsMapHovered] = useState(false);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, []);

    // Optimized hover handler with requestAnimationFrame for smoother updates
    const handleMouseOver = (itemId: number) => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        // Use requestAnimationFrame for immediate but smooth update
        requestAnimationFrame(() => {
            onItemHover(itemId);
        });
    };

    const handleMouseOut = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        // Small delay on mouseout for smoother transition
        hoverTimeoutRef.current = setTimeout(() => {
            onItemHover(null);
            hoverTimeoutRef.current = null;
        }, 150);
    };

    return (
        <div
            onMouseEnter={() => setIsMapHovered(true)}
            onMouseLeave={() => setIsMapHovered(false)}
            className="h-full w-full"
        >
            <MapContainer
                center={defaultCenter}
                zoom={13}
                scrollWheelZoom={false}
                className="h-full w-full z-0"
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ScrollWheelZoomController enabled={isMapHovered} />
                <MapUpdater items={validItems} />
                <MapEvents onBoundsChange={onBoundsChange} />
                {validItems.map((item) => (
                    <SmoothMarker
                        key={item.maPhong ?? item.maSanPham}
                        item={item}
                        isHighlighted={highlightedItemId === (item.maPhong ?? item.maSanPham)}
                        onMouseOver={() => handleMouseOver(item.maPhong ?? item.maSanPham)}
                        onMouseOut={handleMouseOut}
                    />
                ))}
                <style jsx global>{`
                .custom-marker {
                    background: transparent !important;
                    border: none !important;
                }
                
                .custom-marker-content {
                    background-color: white;
                    color: black;
                    padding: 4px 8px;
                    border-radius: 9999px;
                    font-weight: bold;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    border: 1px solid #e5e7eb;
                    font-size: 14px;
                    white-space: nowrap;
                    transform: scale(1);
                    transition: background-color 0.35s cubic-bezier(0.4, 0, 0.2, 1),
                                color 0.35s cubic-bezier(0.4, 0, 0.2, 1),
                                transform 0.35s cubic-bezier(0.4, 0, 0.2, 1),
                                box-shadow 0.35s cubic-bezier(0.4, 0, 0.2, 1);
                    text-align: center;
                    will-change: transform, background-color, color, box-shadow;
                    backface-visibility: hidden;
                    -webkit-font-smoothing: antialiased;
                    transform-origin: center;
                }
                
                .custom-marker-highlighted {
                    background-color: black !important;
                    color: white !important;
                    transform: scale(1.15) !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
                }
                
                .custom-popup .leaflet-popup-content-wrapper {
                    padding: 0;
                    overflow: hidden;
                    background: transparent;
                    box-shadow: none;
                    border-radius: 24px;
                    transition: transform 0.2s ease;
                }
                .custom-popup .leaflet-popup-content {
                    margin: 0;
                    width: 100% !important;
                    line-height: 0;
                }
                .custom-popup .leaflet-popup-content > div {
                    line-height: 1.5;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }
                .custom-popup .leaflet-popup-tip {
                    background: white;
                }
                .custom-popup .leaflet-popup-close-button {
                    display: none;
                }
            `}</style>
            </MapContainer>
        </div>
    );
}
