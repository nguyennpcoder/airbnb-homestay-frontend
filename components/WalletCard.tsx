'use client';

import { useState, useRef, MouseEvent } from 'react';
import Image from 'next/image';

interface WalletCardProps {
    balance: number;
}

export default function WalletCard({ balance }: WalletCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [rotate, setRotate] = useState({ x: 0, y: 0 });
    const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
    const [isVisible, setIsVisible] = useState(false);

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;

        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Calculate rotation (max 15 degrees)
        const rotateX = ((y - centerY) / centerY) * -10;
        const rotateY = ((x - centerX) / centerX) * 10;

        setRotate({ x: rotateX, y: rotateY });

        // Calculate glare position
        const glareX = (x / rect.width) * 100;
        const glareY = (y / rect.height) * 100;

        setGlare({ x: glareX, y: glareY, opacity: 1 });
    };

    const handleMouseLeave = () => {
        setRotate({ x: 0, y: 0 });
        setGlare(prev => ({ ...prev, opacity: 0 }));
    };

    const toggleVisibility = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsVisible(!isVisible);
    };

    return (
        <div className="perspective-1000 w-full max-w-md mx-auto">
            <div
                ref={cardRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={toggleVisibility}
                style={{
                    transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
                }}
                className="relative bg-gradient-to-br from-[#FF385C] to-[#C00B36] rounded-2xl p-6 text-white shadow-xl transition-transform duration-100 ease-linear transform-style-3d overflow-hidden h-[220px] select-none cursor-pointer group"
            >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                </div>

                {/* Card Content */}
                <div className="relative z-10 flex flex-col justify-between h-full transform translate-z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-medium opacity-80 uppercase tracking-widest mb-1">Số dư khả dụng</p>
                            <h3 className="text-xl font-bold tracking-tight">Ví của tôi</h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center gap-3">
                            <p className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                                {isVisible
                                    ? `${balance.toLocaleString('vi-VN')} `
                                    : '••••••••••'
                                }
                                {isVisible && <span className="text-2xl opacity-80">đ</span>}
                            </p>
                            <button
                                onClick={toggleVisibility}
                                className="p-1.5 rounded-full hover:bg-white/20 transition-colors mb-2 focus:outline-none"
                            >
                                {isVisible ? (
                                    <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                ) : (
                                    <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                )}
                            </button>
                        </div>
                        <p className="text-xs opacity-75 font-light">
                            {isVisible ? 'Dùng để thanh toán cho các chuyến đi tiếp theo' : 'Chạm để hiện số dư'}
                        </p>
                    </div>

                    <div className="flex justify-between items-center opacity-75 text-xs">
                        <span className="font-mono tracking-wider">**** **** **** 8888</span>
                        <span>09/28</span>
                    </div>
                </div>

                {/* Glare Effect */}
                <div
                    className="absolute inset-0 pointer-events-none mix-blend-overlay transition-opacity duration-300"
                    style={{
                        background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 60%)`,
                        opacity: glare.opacity,
                    }}
                />
            </div>

            {/* Reflection/Shadow for extra 3D feel */}
            <div
                className="mt-4 mx-auto w-[90%] h-4 bg-black/20 blur-xl rounded-full transition-all duration-300"
                style={{
                    transform: `scale(${1 - Math.abs(rotate.x) / 90}) translateX(${-rotate.y}px)`,
                    opacity: 0.4 - Math.abs(rotate.x) / 50
                }}
            />

            <style jsx global>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .translate-z-10 {
           transform: translateZ(20px);
        }
      `}</style>
        </div>
    );
}
