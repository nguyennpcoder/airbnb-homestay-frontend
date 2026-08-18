'use client';

import { useState, useEffect, useRef } from 'react';

export type GuestCounts = {
    adults: number;
    children: number;
    infants: number;
    pets: number;
};

type GuestSelectorProps = {
    adults: number;
    childrenCount: number;
    infants: number;
    pets: number;
    onUpdate: (counts: GuestCounts) => void;
    maxGuests?: number;
    mode?: 'dropdown' | 'modal' | 'inline';
    showPets?: boolean;
};

export default function GuestSelector({
    adults,
    childrenCount,
    infants,
    pets,
    onUpdate,
    maxGuests,
    mode = 'dropdown',
    showPets = true,
}: GuestSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [localAdults, setLocalAdults] = useState(adults);
    const [localChildrenCount, setLocalChildrenCount] = useState(childrenCount);
    const [localInfants, setLocalInfants] = useState(infants);
    const [localPets, setLocalPets] = useState(pets);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Ref to always have latest local values (avoids stale closure in useEffect)
    const latestLocalRef = useRef({ localAdults, localChildrenCount, localInfants, localPets });
    useEffect(() => {
        latestLocalRef.current = { localAdults, localChildrenCount, localInfants, localPets };
    });

    useEffect(() => {
        setLocalAdults(adults);
        setLocalChildrenCount(childrenCount);
        setLocalInfants(infants);
        setLocalPets(pets);
    }, [adults, childrenCount, infants, pets]);

    // set lại số lượng khách & tổng tiền
    useEffect(() => {
        if (mode === 'inline') {
            onUpdate({
                adults: localAdults,
                children: localChildrenCount,
                infants: localInfants,
                pets: localPets,
            });
        }
    }, [localAdults, localChildrenCount, localInfants, localPets, mode, onUpdate]);

    // Close dropdown when clicking outside
    useEffect(() => {
        if (mode !== 'dropdown') return;

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                const v = latestLocalRef.current;
                onUpdate({ adults: v.localAdults, children: v.localChildrenCount, infants: v.localInfants, pets: v.localPets });
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, mode]);

    const totalGuests = localAdults + localChildrenCount;

    const handleIncrement = (type: 'adults' | 'children' | 'infants' | 'pets') => {
        setErrorMessage(null);

        if (type === 'adults' || type === 'children') {
            if (maxGuests && (localAdults + localChildrenCount + 1) > maxGuests) {
                setErrorMessage(`Chỗ ở này cho phép tối đa ${maxGuests} khách, không tính em bé.`);
                return;
            }
            if (type === 'adults') setLocalAdults((prev: number) => prev + 1);
            else setLocalChildrenCount((prev: number) => prev + 1);
        } else if (type === 'infants') {
            setLocalInfants(prev => prev + 1);
        } else if (type === 'pets') {
            setLocalPets(prev => prev + 1);
        }
    };

    const handleDecrement = (type: 'adults' | 'children' | 'infants' | 'pets') => {
        setErrorMessage(null);

        if (type === 'adults') {
            setLocalAdults(prev => Math.max(1, prev - 1));
        } else if (type === 'children') {
            setLocalChildrenCount((prev: number) => Math.max(0, prev - 1));
        } else if (type === 'infants') {
            setLocalInfants(prev => Math.max(0, prev - 1));
        } else if (type === 'pets') {
            setLocalPets(prev => Math.max(0, prev - 1));
        }
    };

    const handleClose = () => {
        onUpdate({
            adults: localAdults,
            children: localChildrenCount,
            infants: localInfants,
            pets: localPets,
        });
        setIsOpen(false);
    };

    const guestItems = [
        {
            type: 'adults' as const,
            label: 'Người lớn',
            description: 'Từ 13 tuổi trở lên',
            value: localAdults,
            min: 1,
        },
        {
            type: 'children' as const,
            label: 'Trẻ em',
            description: 'Độ tuổi 2–12',
            value: localChildrenCount,
            min: 0,
        },
        {
            type: 'infants' as const,
            label: 'Em bé',
            description: 'Dưới 2 tuổi',
            value: localInfants,
            min: 0,
        },
        ...(showPets ? [{
            type: 'pets' as const,
            label: 'Thú cưng',
            description: 'Bạn sẽ mang theo động vật phục vụ?',
            value: localPets,
            min: 0,
        }] : []),
    ];

    const canIncrement = (type: 'adults' | 'children' | 'infants' | 'pets') => {
        if (type === 'adults' || type === 'children') {
            if (!maxGuests) return true;
            return (localAdults + localChildrenCount) < maxGuests;
        }
        return true;
    };

    const renderGuestControls = () => (
        <div className="space-y-6">
            {guestItems.map((item, index) => (
                <div key={item.type} className="flex items-center justify-between py-1">
                    <div className="flex-1">
                        <div className="font-semibold text-[16px] text-gray-900">{item.label}</div>
                        <div className="text-sm text-gray-600">{item.description}</div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => handleDecrement(item.type)}
                            disabled={item.value <= item.min}
                            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${item.value <= item.min
                                ? 'border-gray-100 text-gray-200 cursor-not-allowed'
                                : 'border-gray-300 text-gray-500 hover:border-gray-800 hover:text-gray-800'
                                }`}
                        >
                            <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', fill: 'none', height: '12px', width: '12px', stroke: 'currentColor', strokeWidth: 5, overflow: 'visible' }}>
                                <path d="m2 16h28"></path>
                            </svg>
                        </button>
                        <span className="w-4 text-center text-base text-gray-900">{item.value}</span>
                        <button
                            type="button"
                            onClick={() => handleIncrement(item.type)}
                            disabled={!canIncrement(item.type)}
                            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${!canIncrement(item.type)
                                ? 'border-gray-100 text-gray-200 cursor-not-allowed'
                                : 'border-gray-300 text-gray-500 hover:border-gray-800 hover:text-gray-800'
                                }`}
                        >
                            <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', fill: 'none', height: '12px', width: '12px', stroke: 'currentColor', strokeWidth: 5, overflow: 'visible' }}>
                                <path d="m2 16h28m-14-14v28"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            ))}

            {maxGuests && (
                <div className="text-[12px] text-gray-600 mt-2">
                    Chỗ ở này cho phép tối đa {maxGuests} khách, không tính em bé. {showPets ? (localPets > 0 ? '' : 'Không được phép mang theo thú cưng.') : 'Không được phép mang theo thú cưng.'}
                </div>
            )}
        </div>
    );
    if (mode === 'inline') {
        return <div className="p-4">{renderGuestControls()}</div>;
    }

    if (mode === 'modal') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 animate-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900">Thay đổi khách</h2>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                        >
                            <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', fill: 'none', height: '16px', width: '16px', stroke: 'currentColor', strokeWidth: 3 }}>
                                <path d="m6 6 20 20M26 6 6 26"></path>
                            </svg>
                        </button>
                    </div>

                    <div className="p-6">
                        {maxGuests && (
                            <div className="mb-6 text-sm text-gray-600">
                                Chỗ ở này cho phép tối đa {maxGuests} người lớn. Trẻ em và em bé không bị giới hạn. {!showPets && 'Không được phép mang theo thú cưng.'}
                            </div>
                        )}
                        {renderGuestControls()}
                    </div>

                    <div className="flex items-center justify-between p-6 border-t border-gray-200">
                        <button
                            onClick={() => {
                                setLocalAdults(adults);
                                setLocalChildrenCount(childrenCount);
                                setLocalInfants(infants);
                                setLocalPets(pets);
                                setIsOpen(false);
                            }}
                            className="text-gray-900 font-semibold underline hover:text-gray-600 transition-colors"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleClose}
                            className="px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors"
                        >
                            Lưu
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Dropdown mode
    return (
        <div className="relative" ref={dropdownRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`p-3 transition cursor-pointer relative ${isOpen ? 'ring-2 ring-black' : ''}`}
            >
                <label className="block text-[10px] font-bold text-gray-800 mb-0.5">KHÁCH</label>
                <div className="flex items-center justify-between">
                    <span className="text-sm font-light text-gray-600">
                        {totalGuests} khách{localInfants > 0 && `, ${localInfants} em bé`}{localPets > 0 && `, ${localPets} thú cưng`}
                    </span>
                    <svg
                        viewBox="0 0 32 32"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{
                            display: 'block',
                            fill: 'none',
                            height: '16px',
                            width: '16px',
                            stroke: 'currentColor',
                            strokeWidth: 3,
                            overflow: 'visible',
                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                        }}
                    >
                        <path d="M28 12 16.7 23.3a1 1 0 0 1-1.4 0L4 12"></path>
                    </svg>
                </div>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-6 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {renderGuestControls()}
                    <div className="mt-8 flex justify-end">
                        <button
                            onClick={handleClose}
                            className="text-gray-900 font-bold underline hover:text-black transition-colors"
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
