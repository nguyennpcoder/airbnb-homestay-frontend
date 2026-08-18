'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { phongAPI } from '@/lib/api';

// Icons
const FiSearch = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const FiPlus = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);
const FiMinus = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
  </svg>
);

type ActivePanel = 'location' | 'dates' | 'guests' | null;

const FALLBACK_LOCATIONS = [
  'Hà Nội',
  'Hồ Chí Minh',
  'Đà Lạt',
  'Vũng Tàu',
  'Nha Trang',
  'Phú Quốc',
];

export default function SearchBar({ className = '' }: { className?: string }) {
  const [active, setActive] = useState<ActivePanel>(null);
  const [location, setLocation] = useState('');
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [adults, setAdults] = useState(0);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [hasAutoSuggested, setHasAutoSuggested] = useState(false);
  const [locations, setLocations] = useState<string[]>(FALLBACK_LOCATIONS);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    phongAPI.getLocations().then(data => {
      if (Array.isArray(data) && data.length > 0) setLocations(data);
    }).catch(() => {});
  }, []);

  const todayLocal = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const addDays = (date: Date, days: number) => {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  };

  // Auto-suggest today→tomorrow when opening date panel
  useEffect(() => {
    if (active === 'dates' && !hasAutoSuggested && !checkIn && !checkOut) {
      setCheckIn(todayLocal);
      setCheckOut(addDays(todayLocal, 1));
      setHasAutoSuggested(true);
    }
  }, [active, hasAutoSuggested, checkIn, checkOut]);

  // Close on outside click / ESC
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setActive(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive(null);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const totalGuests = adults + children;
  const dateLabel = useMemo(() => {
    if (checkIn && checkOut) {
      const to = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
      return `${to(checkIn)} - ${to(checkOut)}`;
    }
    return 'Thêm ngày';
  }, [checkIn, checkOut]);

  const toLocalISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location) params.set('thanhPho', location);
    if (checkIn) params.set('ngayNhan', toLocalISO(checkIn));
    if (checkOut) params.set('ngayTra', toLocalISO(checkOut));
    if (totalGuests > 0) {
      params.set('soKhach', totalGuests.toString());
      if (adults > 0) params.set('nguoiLon', adults.toString());
      if (children > 0) params.set('treEm', children.toString());
      if (infants > 0) params.set('emBe', infants.toString());
    }

    router.push(`/search?${params.toString()}`);
    setActive(null);
  };

  // Very lightweight calendar for visual parity
  const buildMonth = (monthOffset = 0) => {
    const base = new Date();
    base.setDate(1);
    base.setMonth(base.getMonth() + monthOffset);
    const month = base.getMonth();
    const year = base.getFullYear();
    const startDay = new Date(year, month, 1).getDay(); // 0-6
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = Array(startDay === 0 ? 6 : startDay - 1).fill(null); // align Mon-Sun
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return { year, month, cells };
  };

  const m0 = buildMonth(0);
  const m1 = buildMonth(1);

  const selectDate = (d: number | null, month: number, year: number) => {
    if (!d) return;
    const selected = new Date(year, month, d);
    selected.setHours(0, 0, 0, 0);
    // Block past dates
    if (selected.getTime() < todayLocal.getTime()) return;
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(selected);
      setCheckOut(null);
    } else if (checkIn && !checkOut) {
      if (selected >= checkIn) setCheckOut(selected);
      else {
        setCheckOut(checkIn);
        setCheckIn(selected);
      }
    }
  };

  return (
    <div className={`w-full ${className}`} ref={containerRef}>
      <div className="max-w-[850px] mx-auto relative z-[60]">
        <div
          className={[
            'relative bg-white rounded-3xl md:rounded-full border border-gray-200',
            'flex flex-col md:flex-row items-stretch md:items-center p-1 md:divide-x divide-gray-200 shadow-lg',
            'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
            active ? 'ring-2 ring-black/5 shadow-xl scale-[1.01]' : 'hover:shadow-xl',
          ].join(' ')}
        >
          {/* Location */}
          <button
            onClick={() => setActive(active === 'location' ? null : 'location')}
            className={[
              'group flex-1 px-6 py-3 rounded-full text-left transition-colors duration-200 ease-out',
              active === 'location' ? 'bg-gray-100' : 'hover:bg-gray-50',
            ].join(' ')}
          >
            <div className="text-[11px] font-semibold text-gray-900">Địa điểm</div>
            <div className="text-gray-500 group-hover:text-gray-700 truncate transition-colors duration-200">
              {location || 'Tìm kiếm điểm đến'}
            </div>
          </button>

          {/* Dates */}
          <button
            onClick={() => setActive(active === 'dates' ? null : 'dates')}
            className={[
              'group flex-1 px-6 py-3 rounded-full text-left transition-colors duration-200 ease-out',
              active === 'dates' ? 'bg-gray-100' : 'hover:bg-gray-50',
            ].join(' ')}
          >
            <div className="text-[11px] font-semibold text-gray-900">Thời gian</div>
            <div className="text-gray-500 group-hover:text-gray-700 truncate transition-colors duration-200">
              {dateLabel}
            </div>
          </button>

          {/* Guests */}
          <button
            onClick={() => setActive(active === 'guests' ? null : 'guests')}
            className={[
              'group flex-1 px-6 py-3 rounded-full text-left transition-colors duration-200 ease-out',
              active === 'guests' ? 'bg-gray-100' : 'hover:bg-gray-50',
            ].join(' ')}
          >
            <div className="text-[11px] font-semibold text-gray-900">Khách</div>
            <div className="text-gray-500 group-hover:text-gray-700 truncate transition-colors duration-200">
              {totalGuests > 0 ? `${totalGuests} khách` : 'Thêm khách'}{infants > 0 ? `, ${infants} em bé` : ''}
            </div>
          </button>

          {/* Search */}
          <button
            onClick={handleSearch}
            className="hidden md:flex ml-2 mr-2 w-12 h-12 bg-airbnb-red rounded-full items-center justify-center text-white hover:bg-[#E61E4D] transition-all duration-200 active:scale-95 hover:shadow-md flex-shrink-0"
          >
            <FiSearch className="w-4 h-4 stroke-[4px]" />
          </button>

          {/* Mobile Search Button */}
          <div className="p-2 md:hidden">
            <button
              onClick={handleSearch}
              className="w-full py-3 bg-airbnb-red rounded-xl flex items-center justify-center text-white font-bold hover:bg-[#E61E4D] transition-all duration-200 active:scale-95 shadow-md"
            >
              <FiSearch className="w-5 h-5 stroke-[3px] mr-2" />
              Tìm kiếm
            </button>
          </div>

          {/* Panels */}
          <div
            className={[
              'absolute left-0 right-0 top-full mt-3 z-[100]',
              'transition-[opacity,transform] duration-200 ease-out',
              active ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-1 scale-95 pointer-events-none',
            ].join(' ')}
          >
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
              {active === 'location' && (
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-fadeIn">
                  {locations.map((loc) => (
                    <button
                      key={loc}
                      onClick={() => {
                        setLocation(loc);
                        setActive('dates');
                      }}
                      className="text-left px-4 py-3 rounded-2xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 active:scale-[0.98]"
                    >
                      <div className="font-semibold text-gray-900">{loc}</div>
                      <div className="text-sm text-gray-500">Khám phá {loc}</div>
                    </button>
                  ))}
                </div>
              )}

              {active === 'dates' && (
                <div className="p-6 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[m0, m1].map((m, idx) => (
                      <div key={idx}>
                        <div className="text-sm font-semibold mb-2">
                          Tháng {m.month + 1} năm {m.year}
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
                          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
                            <div key={d} className="py-1">{d}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {m.cells.map((day, i) => {
                            const date = day ? new Date(m.year, m.month, day) : null;
                            if (date) date.setHours(0, 0, 0, 0);
                            const isPast = !!date && date.getTime() < todayLocal.getTime();
                            const isSelected =
                              (checkIn && day && new Date(m.year, m.month, day).toDateString() === checkIn.toDateString()) ||
                              (checkOut && day && new Date(m.year, m.month, day).toDateString() === checkOut.toDateString());
                            const inRange =
                              checkIn &&
                              checkOut &&
                              day &&
                              new Date(m.year, m.month, day) > checkIn &&
                              new Date(m.year, m.month, day) < checkOut;
                            return (
                              <button
                                key={i}
                                disabled={!day || isPast}
                                onClick={() => selectDate(day, m.month, m.year)}
                                className={[
                                  'h-9 rounded-lg text-sm transition-all duration-200 ease-out',
                                  day && !isPast ? 'hover:bg-gray-100 active:scale-90' : '',
                                  isPast ? 'text-gray-200 line-through cursor-not-allowed' : '',
                                  isSelected ? 'bg-black text-white hover:bg-black ring-2 ring-black ring-offset-0' : '',
                                  inRange ? 'bg-gray-200' : '',
                                ].join(' ')}
                              >
                                {day || ''}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-between items-center">
                    <button
                      onClick={() => {
                        setCheckIn(todayLocal);
                        setCheckOut(addDays(todayLocal, 1));
                      }}
                      className="text-sm font-semibold underline text-gray-900 hover:text-black transition-all duration-200"
                    >
                      Hôm nay → Ngày mai
                    </button>
                    <button
                      onClick={() => setActive('guests')}
                      className="px-4 py-2 rounded-full bg-black text-white text-sm font-semibold hover:bg-black/90 transition-all duration-200 active:scale-95"
                    >
                      Tiếp tục
                    </button>
                  </div>
                </div>
              )}

              {active === 'guests' && (
                <div className="p-6 animate-fadeIn">
                  {[
                    { key: 'adults', label: 'Người lớn', desc: 'Từ 13 tuổi trở lên' },
                    { key: 'children', label: 'Trẻ em', desc: 'Độ tuổi 2 – 12' },
                    { key: 'infants', label: 'Em bé', desc: 'Dưới 2 tuổi' },
                  ].map((row) => {
                    const value =
                      row.key === 'adults' ? adults : row.key === 'children' ? children : infants;
                    const setValue =
                      row.key === 'adults' ? setAdults : row.key === 'children' ? setChildren : setInfants;
                    return (
                      <div key={row.key} className="flex items-center justify-between py-3 border-b last:border-b-0">
                        <div>
                          <div className="font-semibold">{row.label}</div>
                          <div className="text-sm text-gray-500">{row.desc}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setValue(Math.max(0, value - 1))}
                            className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition-all duration-150 active:scale-90"
                            disabled={value === 0}
                          >
                            <FiMinus className="w-4 h-4" />
                          </button>
                          <div key={`${row.key}-${value}`} className="w-6 text-center font-semibold transition-transform duration-200 ease-out scale-100">
                            {value}
                          </div>
                          <button
                            onClick={() => setValue(value + 1)}
                            className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-50 transition-all duration-150 active:scale-90"
                          >
                            <FiPlus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => setActive(null)}
                      className="px-4 py-2 rounded-full border text-sm font-semibold hover:bg-gray-50 transition-all duration-200 active:scale-95"
                    >
                      Đóng
                    </button>
                    <button
                      onClick={handleSearch}
                      className="px-4 py-2 rounded-full bg-airbnb-red text-white text-sm font-semibold hover:bg-[#E61E4D] transition-all duration-200 active:scale-95 hover:shadow-md"
                    >
                      Tìm kiếm
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
