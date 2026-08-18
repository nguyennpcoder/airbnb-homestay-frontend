'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface CountryCityPickerProps {
    country: string;
    city: string;
    onCountryChange: (country: string) => void;
    onCityChange: (city: string) => void;
    required?: boolean;
}

interface CountryData {
    country: string;
    iso2: string;
    cities: string[];
}

interface NominatimResult {
    display_name: string;
    address?: { city?: string; town?: string; village?: string; state?: string; country?: string };
    type?: string;
}

const DATA_API = 'https://countriesnow.space/api/v0.1/countries';

export default function CountryCityPicker({
    country,
    city,
    onCountryChange,
    onCityChange,
    required = false,
}: CountryCityPickerProps) {
    const [countryList, setCountryList] = useState<CountryData[]>([]);
    const [loading, setLoading] = useState(false);

    const [countrySearch, setCountrySearch] = useState(country);
    const [cityInput, setCityInput] = useState(city);
    const [openCountry, setOpenCountry] = useState(false);
    const [openCity, setOpenCity] = useState(false);

    const [nominatimResults, setNominatimResults] = useState<string[]>([]);
    const [searchingCities, setSearchingCities] = useState(false);

    const countryRef = useRef<HTMLDivElement>(null);
    const cityRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => { setCountrySearch(country); }, [country]);
    useEffect(() => { setCityInput(city); }, [city]);

    useEffect(() => {
        if (countryList.length > 0) return;
        setLoading(true);
        fetch(DATA_API)
            .then(r => r.json())
            .then((data: any) => {
                const list: CountryData[] = (data?.data || [])
                    .map((c: any) => ({
                        country: c.country,
                        iso2: c.iso2,
                        cities: (c.cities || []).sort((a: string, b: string) => a.localeCompare(b)),
                    }))
                    .sort((a: CountryData, b: CountryData) => a.country.localeCompare(b.country));
                setCountryList(list);
            })
            .catch(() => {
                setCountryList([
                    { country: 'Vietnam', iso2: 'VN', cities: ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Nha Trang', 'Đà Lạt', 'Vũng Tàu', 'Hội An', 'Huế', 'Phú Quốc', 'Quy Nhơn', 'Sapa', 'Hải Phòng', 'Cần Thơ'] },
                    { country: 'Thailand', iso2: 'TH', cities: ['Bangkok', 'Chiang Mai', 'Phuket', 'Pattaya', 'Krabi', 'Koh Samui'] },
                    { country: 'Japan', iso2: 'JP', cities: ['Tokyo', 'Osaka', 'Kyoto', 'Sapporo', 'Fukuoka', 'Nagoya'] },
                    { country: 'South Korea', iso2: 'KR', cities: ['Seoul', 'Busan', 'Incheon', 'Jeju'] },
                    { country: 'Singapore', iso2: 'SG', cities: ['Singapore'] },
                    { country: 'Malaysia', iso2: 'MY', cities: ['Kuala Lumpur', 'George Town', 'Johor Bahru'] },
                    { country: 'Indonesia', iso2: 'ID', cities: ['Bali', 'Jakarta', 'Yogyakarta'] },
                    { country: 'France', iso2: 'FR', cities: ['Paris', 'Lyon', 'Nice', 'Marseille'] },
                    { country: 'United States', iso2: 'US', cities: ['New York', 'Los Angeles', 'San Francisco', 'Las Vegas', 'Miami'] },
                ]);
            })
            .finally(() => setLoading(false));
    }, []);

    const countryData = countryList.find(c => c.country === country);
    const apiCities = countryData?.cities || [];
    const iso2 = countryData?.iso2 || '';

    const searchNominatim = useCallback((query: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (query.trim().length < 2) {
            setNominatimResults([]);
            setSearchingCities(false);
            return;
        }
        debounceRef.current = setTimeout(() => {
            setSearchingCities(true);
            const countryCode = iso2.toLowerCase();
            fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=8&addressdetails=1&countrycodes=${countryCode}`, {
                headers: { 'Accept-Language': 'vi' },
            })
                .then(r => r.json())
                .then((data: NominatimResult[]) => {
                    const names = data.map(r => {
                        const a = r.address;
                        return a?.city || a?.town || a?.village || a?.state || r.display_name.split(',')[0];
                    }).filter((v, i, arr) => arr.indexOf(v) === i);
                    setNominatimResults(names);
                })
                .catch(() => setNominatimResults([]))
                .finally(() => setSearchingCities(false));
        }, 500);
    }, [iso2]);

    const filteredApiCities = cityInput
        ? apiCities.filter(c => c.toLowerCase().includes(cityInput.toLowerCase()))
        : apiCities;

    const nomNotInApi = nominatimResults.filter(
        n => !apiCities.some(a => a.toLowerCase() === n.toLowerCase()) && n.toLowerCase() !== cityInput.toLowerCase()
    );

    const showCityDropdown = openCity && country;

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (countryRef.current && !countryRef.current.contains(e.target as Node)) setOpenCountry(false);
            if (cityRef.current && !cityRef.current.contains(e.target as Node)) setOpenCity(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Country */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Quốc gia {required && '*'}
                </label>
                <div ref={countryRef} className="relative">
                    <input
                        type="text"
                        value={countrySearch}
                        onChange={e => { setCountrySearch(e.target.value); setOpenCountry(true); }}
                        onFocus={() => setOpenCountry(true)}
                        placeholder="Tìm quốc gia..."
                        className="admin-field w-full px-4 py-3 pr-8"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">▼</div>
                    {openCountry && (
                        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#333] rounded-lg shadow-lg">
                            {loading ? (
                                <div className="px-4 py-3 text-sm text-gray-400">Đang tải...</div>
                            ) : filteredApiCities.length === 0 && !countrySearch ? (
                                <div className="px-4 py-3 text-sm text-gray-400">Không tìm thấy</div>
                            ) : (
                                (countrySearch ? countryList.filter(c => c.country.toLowerCase().includes(countrySearch.toLowerCase())) : countryList).slice(0, 30).map(c => (
                                    <button
                                        key={c.country}
                                        type="button"
                                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors ${
                                            c.country === country
                                                ? 'bg-gray-100 dark:bg-[#2a2a2a] font-semibold text-[#FF385C]'
                                                : 'text-gray-700 dark:text-gray-300'
                                        }`}
                                        onClick={() => {
                                            onCountryChange(c.country);
                                            setCountrySearch(c.country);
                                            onCityChange('');
                                            setCityInput('');
                                            setOpenCountry(false);
                                        }}
                                    >
                                        {c.country}
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* City: combo box with Nominatim fallback */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Thành phố / Tỉnh {required && '*'}
                </label>
                {country ? (
                    <div ref={cityRef} className="relative">
                        <input
                            type="text"
                            value={cityInput}
                            onChange={e => {
                                const val = e.target.value;
                                setCityInput(val);
                                onCityChange(val);
                                setOpenCity(true);
                                if (val.length >= 2) searchNominatim(val);
                            }}
                            onFocus={() => setOpenCity(true)}
                            placeholder="Nhập tên thành phố (VD: Toyama, Nha Trang...)"
                            className="admin-field w-full px-4 py-3 pr-8"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">▼</div>
                        {showCityDropdown && (
                            <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#333] rounded-lg shadow-lg">
                                {searchingCities && (
                                    <div className="px-4 py-2 text-xs text-gray-400 flex items-center gap-2">
                                        <div className="w-3 h-3 border-2 border-[#FF385C] border-t-transparent rounded-full animate-spin" />
                                        Đang tìm trên bản đồ...
                                    </div>
                                )}

                                {filteredApiCities.length > 0 && (
                                    <>
                                        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-[#1a1a1a]">
                                            Từ cơ sở dữ liệu
                                        </div>
                                        {filteredApiCities.slice(0, 20).map(c => (
                                            <button
                                                key={c}
                                                type="button"
                                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors ${
                                                    c.toLowerCase() === city.toLowerCase()
                                                        ? 'bg-gray-100 dark:bg-[#2a2a2a] font-semibold text-[#FF385C]'
                                                        : 'text-gray-700 dark:text-gray-300'
                                                }`}
                                                onClick={() => {
                                                    onCityChange(c);
                                                    setCityInput(c);
                                                    setOpenCity(false);
                                                }}
                                            >
                                                {c}
                                            </button>
                                        ))}
                                    </>
                                )}

                                {nomNotInApi.length > 0 && (
                                    <>
                                        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-[#1a1a1a] border-t border-gray-100 dark:border-[#333]">
                                            Từ OpenStreetMap
                                        </div>
                                        {nomNotInApi.map(c => (
                                            <button
                                                key={c}
                                                type="button"
                                                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors"
                                                onClick={() => {
                                                    onCityChange(c);
                                                    setCityInput(c);
                                                    setOpenCity(false);
                                                    setNominatimResults([]);
                                                }}
                                            >
                                                {c}
                                            </button>
                                        ))}
                                    </>
                                )}

                                {cityInput && filteredApiCities.length === 0 && nomNotInApi.length === 0 && !searchingCities && (
                                    <button
                                        type="button"
                                        className="w-full text-left px-4 py-2.5 text-sm text-[#FF385C] hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors border-t border-gray-100 dark:border-[#333]"
                                        onClick={() => {
                                            onCityChange(cityInput);
                                            setOpenCity(false);
                                        }}
                                    >
                                        Nhập &quot;{cityInput}&quot; (tên tùy chỉnh)
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <input
                        type="text"
                        disabled
                        placeholder="Chọn quốc gia trước"
                        className="admin-field w-full px-4 py-3 opacity-50 cursor-not-allowed"
                    />
                )}
            </div>
        </div>
    );
}
