'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationMapPickerProps {
    latitude: number | null;
    longitude: number | null;
    onChange: (lat: number, lng: number) => void;
    address?: string;
}

interface GeocodingResult {
    lat: string;
    lon: string;
    display_name: string;
}

const defaultCenter: [number, number] = [10.8231, 106.6297];

function DraggableMarker({ position, onPositionChange, address }: {
    position: L.LatLng | null;
    onPositionChange: (latlng: L.LatLng) => void;
    address?: string;
}) {
    const map = useMapEvents({
        click(e) {
            onPositionChange(e.latlng);
            map.flyTo(e.latlng, map.getZoom());
        },
    });

    const markerIcon = L.divIcon({
        className: 'host-location-marker',
        html: `
            <div style="
                background: #FF385C;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: grab;
                transition: transform 0.2s;
            ">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
            </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
    });

    return position ? (
        <Marker
            position={position}
            icon={markerIcon}
            draggable={true}
            eventHandlers={{
                dragend: (e) => {
                    const marker = e.target;
                    onPositionChange(marker.getLatLng());
                },
            }}
        >
            {address && (
                <Popup>
                    <div className="text-sm font-medium p-1">{address}</div>
                </Popup>
            )}
        </Marker>
    ) : null;
}

function MapBoundsUpdater({ position }: { position: L.LatLng | null }) {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.flyTo(position, Math.max(map.getZoom(), 14), { animate: true, duration: 1 });
        }
    }, [position, map]);
    return null;
}

function MapRefForwarder({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
    const map = useMap();
    useEffect(() => {
        mapRef.current = map;
    }, [map, mapRef]);
    return null;
}

export default function LocationMapPicker({ latitude, longitude, onChange, address }: LocationMapPickerProps) {
    const initialPos = (latitude != null && longitude != null)
        ? L.latLng(latitude, longitude)
        : null;

    const [position, setPosition] = useState<L.LatLng | null>(initialPos);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const mapRef = useRef<L.Map | null>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const handlePositionChange = useCallback((latlng: L.LatLng) => {
        setPosition(latlng);
        onChange(latlng.lat, latlng.lng);
    }, [onChange]);

    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (query.trim().length < 2) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        debounceRef.current = setTimeout(() => {
            setSearching(true);
            setShowResults(true);
            fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`, {
                headers: { 'Accept-Language': 'vi' },
            })
                .then(r => r.json())
                .then((data: GeocodingResult[]) => {
                    setSearchResults(data);
                })
                .catch(() => setSearchResults([]))
                .finally(() => setSearching(false));
        }, 400);
    }, []);

    const handleSelectResult = useCallback((result: GeocodingResult) => {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        const latlng = L.latLng(lat, lng);
        setPosition(latlng);
        onChange(lat, lng);
        setSearchQuery(result.display_name.split(',')[0]);
        setShowResults(false);
        setSearchResults([]);
        if (mapRef.current) {
            mapRef.current.flyTo(latlng, 15, { animate: true, duration: 1 });
        }
    }, [onChange]);

    const handleUseCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const latlng = L.latLng(pos.coords.latitude, pos.coords.longitude);
                    setPosition(latlng);
                    onChange(pos.coords.latitude, pos.coords.longitude);
                },
                (err) => {
                    console.error('Geolocation error:', err);
                },
                { enableHighAccuracy: true }
            );
        }
    };

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Vị trí trên bản đồ</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Tìm địa chỉ hoặc nhấp bản đồ để chọn vị trí</p>
                </div>
                <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 dark:text-blue-400 rounded-lg transition-colors"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Vị trí hiện tại
                </button>
            </div>

            {/* Search bar */}
            <div ref={searchRef} className="relative" style={{ zIndex: 500 }}>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={e => handleSearch(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowResults(true)}
                    placeholder="Tìm địa chỉ: Toyama, Nhật Bản..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-[#333] rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF385C]/30 focus:border-[#FF385C] transition-colors"
                />
                {showResults && (
                    <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#333] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {searching ? (
                            <div className="px-4 py-3 text-sm text-gray-400 flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-[#FF385C] border-t-transparent rounded-full animate-spin" />
                                Đang tìm kiếm...
                            </div>
                        ) : searchResults.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-gray-400">Không tìm thấy địa chỉ</div>
                        ) : (
                            searchResults.map((r, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors text-gray-700 dark:text-gray-300 border-b border-gray-50 dark:border-[#2a2a2a] last:border-0"
                                    onClick={() => handleSelectResult(r)}
                                >
                                    <div className="font-medium">{r.display_name.split(',').slice(0, 2).join(',')}</div>
                                    <div className="text-xs text-gray-400 mt-0.5">{r.display_name}</div>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>

            <div className="h-64 rounded-xl overflow-hidden border border-gray-200 dark:border-[#333] shadow-sm relative" style={{ zIndex: 1 }}>
                <style>{`.leaflet-control-zoom { z-index: 600 !important; }`}</style>
                <MapContainer
                    center={position || defaultCenter}
                    zoom={12}
                    scrollWheelZoom={true}
                    className="h-full w-full"
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapRefForwarder mapRef={mapRef} />
                    <DraggableMarker
                        position={position}
                        onPositionChange={handlePositionChange}
                        address={address}
                    />
                    <MapBoundsUpdater position={position} />
                </MapContainer>
            </div>

            {position && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-[#333]">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Vĩ độ</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 font-mono">{position.lat.toFixed(6)}</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-[#333]">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Kinh độ</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 font-mono">{position.lng.toFixed(6)}</p>
                    </div>
                </div>
            )}

            {!position && (
                <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                            Tìm địa chỉ trên thanh tìm kiếm hoặc nhấp vào bản đồ để chọn vị trí.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
