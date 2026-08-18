'use client';

import { Modal, Slider, Checkbox, Button, InputNumber } from 'antd';
import { useState, useEffect } from 'react';

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onChange: (filters: FilterState) => void;
    initialFilters: FilterState;
}

export interface FilterState {
    priceRange: [number, number];
    amenities: string[];
    propertyTypes: string[];
    guestCount: number;
    bedrooms: number;
    bathrooms: number;
}

const AMENITIES_OPTIONS = [
    { label: 'Wifi', value: 'Wifi' },
    { label: 'Máy lạnh', value: 'Máy lạnh' },
    { label: 'Bếp', value: 'Bếp' },
    { label: 'Máy giặt', value: 'Máy giặt' },
    { label: 'TV', value: 'TV' },
    { label: 'Hồ bơi', value: 'Hồ bơi' },
    { label: 'Chỗ đậu xe', value: 'Chỗ đậu xe' },
    { label: 'Lò vi sóng', value: 'Lò vi sóng' },
    { label: 'Tủ lạnh', value: 'Tủ lạnh' },
    { label: 'Ban công', value: 'Ban công' },
];

const PROPERTY_TYPES = [
    { label: 'Nhà riêng', value: 'Nhà riêng' },
    { label: 'Căn hộ', value: 'Căn hộ' },
    { label: 'Nhà khách', value: 'Nhà khách' },
    { label: 'Khách sạn', value: 'Khách sạn' },
    { label: 'Biệt thự', value: 'Biệt thự' },
    { label: 'Resort', value: 'Resort' },
];

export default function FilterModal({ isOpen, onClose, onChange, initialFilters }: FilterModalProps) {
    const [filters, setFilters] = useState<FilterState>(initialFilters);

    useEffect(() => {
        setFilters(initialFilters);
    }, [initialFilters]);

    // Apply filters in real-time
    const updateFilters = (newFilters: FilterState) => {
        setFilters(newFilters);
        onChange(newFilters);
    };

    const handleClear = () => {
        const clearedFilters = {
            priceRange: [0, 10000000] as [number, number],
            amenities: [],
            propertyTypes: [],
            guestCount: 1,
            bedrooms: 0,
            bathrooms: 0,
        };
        setFilters(clearedFilters);
        onChange(clearedFilters);
    };

    return (
        <Modal
            title="Bộ lọc"
            open={isOpen}
            onCancel={onClose}
            width={700}
            footer={[
                <div key="footer" className="flex justify-between items-center w-full px-2">
                    <Button type="text" onClick={handleClear} className="underline font-semibold text-gray-800 hover:bg-gray-100">
                        Xóa tất cả
                    </Button>
                    <Button
                        type="primary"
                        onClick={onClose}
                        className="bg-black hover:bg-gray-800 h-12 px-8 text-lg rounded-lg"
                    >
                        Đóng
                    </Button>
                </div>
            ]}
        >
            <div className="py-6 space-y-8 h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                {/* Price Range */}
                <section>
                    <h3 className="text-xl font-semibold mb-4">Khoảng giá</h3>
                    <p className="text-gray-500 mb-6">Giá mỗi đêm chưa bao gồm phí và thuế</p>
                    <div className="px-4">
                        <Slider
                            range
                            min={0}
                            max={10000000}
                            step={100000}
                            value={filters.priceRange}
                            onChange={(val) => updateFilters({ ...filters, priceRange: val as [number, number] })}
                            tooltip={{ formatter: (value) => `${value?.toLocaleString()}đ` }}
                        />
                    </div>
                    <div className="flex justify-between items-center mt-6 gap-4">
                        <div className="border rounded-xl p-3 w-full">
                            <div className="text-xs text-gray-500 mb-1">Tối thiểu</div>
                            <div className="font-medium">₫ {filters.priceRange[0].toLocaleString()}</div>
                        </div>
                        <div className="text-gray-400">-</div>
                        <div className="border rounded-xl p-3 w-full">
                            <div className="text-xs text-gray-500 mb-1">Tối đa</div>
                            <div className="font-medium">₫ {filters.priceRange[1].toLocaleString()} +</div>
                        </div>
                    </div>
                </section>

                <div className="border-t" />

                {/* Rooms and Beds */}
                <section>
                    <h3 className="text-xl font-semibold mb-4">Phòng và phòng ngủ</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-700">Phòng ngủ</span>
                            <div className="flex items-center gap-3">
                                <Button
                                    shape="circle"
                                    onClick={() => updateFilters({ ...filters, bedrooms: Math.max(0, filters.bedrooms - 1) })}
                                    disabled={filters.bedrooms <= 0}
                                >-</Button>
                                <span className="w-4 text-center">{filters.bedrooms || 'Bất kỳ'}</span>
                                <Button
                                    shape="circle"
                                    onClick={() => updateFilters({ ...filters, bedrooms: filters.bedrooms + 1 })}
                                >+</Button>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-700">Phòng tắm</span>
                            <div className="flex items-center gap-3">
                                <Button
                                    shape="circle"
                                    onClick={() => updateFilters({ ...filters, bathrooms: Math.max(0, filters.bathrooms - 1) })}
                                    disabled={filters.bathrooms <= 0}
                                >-</Button>
                                <span className="w-4 text-center">{filters.bathrooms || 'Bất kỳ'}</span>
                                <Button
                                    shape="circle"
                                    onClick={() => updateFilters({ ...filters, bathrooms: filters.bathrooms + 1 })}
                                >+</Button>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="border-t" />

                {/* Property Type */}
                <section>
                    <h3 className="text-xl font-semibold mb-4">Loại nhà/phòng</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {PROPERTY_TYPES.map(opt => (
                            <Checkbox
                                key={opt.value}
                                checked={filters.propertyTypes.includes(opt.value)}
                                onChange={(e) => {
                                    const newPropertyTypes = e.target.checked
                                        ? [...filters.propertyTypes, opt.value]
                                        : filters.propertyTypes.filter(t => t !== opt.value);
                                    updateFilters({ ...filters, propertyTypes: newPropertyTypes });
                                }}
                                className="text-base"
                            >
                                {opt.label}
                            </Checkbox>
                        ))}
                    </div>
                </section>

                <div className="border-t" />

                {/* Amenities */}
                <section>
                    <h3 className="text-xl font-semibold mb-4">Tiện nghi</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {AMENITIES_OPTIONS.map(opt => (
                            <Checkbox
                                key={opt.value}
                                checked={filters.amenities.includes(opt.value)}
                                onChange={(e) => {
                                    const newAmenities = e.target.checked
                                        ? [...filters.amenities, opt.value]
                                        : filters.amenities.filter(a => a !== opt.value);
                                    updateFilters({ ...filters, amenities: newAmenities });
                                }}
                                className="text-base"
                            >
                                {opt.label}
                            </Checkbox>
                        ))}
                    </div>
                </section>
            </div>
        </Modal>
    );
}
