'use client';

import React from 'react';

export default function ProductDetailSkeleton() {
    return (
        <div className="min-h-screen bg-white pt-0 md:pt-20 pb-24 md:pb-12 animate-pulse">
            <div className="container mx-auto px-4 max-w-7xl">
                {/* Title and Share/Save */}
                <div className="flex items-center justify-between mb-3">
                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                    <div className="flex gap-4">
                        <div className="h-4 bg-gray-200 rounded w-12"></div>
                        <div className="h-4 bg-gray-200 rounded w-12"></div>
                    </div>
                </div>

                {/* Photo Grid Skeleton */}
                <div className="mb-8 relative -mx-4 md:mx-0">
                    <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2 rounded-xl overflow-hidden h-[560px]">
                        <div className="col-span-2 row-span-2 bg-gray-200"></div>
                        <div className="col-span-1 row-span-1 bg-gray-200"></div>
                        <div className="col-span-1 row-span-1 bg-gray-200"></div>
                        <div className="col-span-1 row-span-1 bg-gray-200"></div>
                        <div className="col-span-1 row-span-1 bg-gray-200"></div>
                    </div>
                    {/* Mobile Placeholder */}
                    <div className="md:hidden h-[300px] bg-gray-200 w-full"></div>
                </div>

                {/* Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        {/* Header info */}
                        <div className="h-6 bg-gray-200 rounded w-2/3 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>

                        {/* Favorite Banner */}
                        <div className="mb-8 border rounded-2xl p-5 h-32 bg-gray-50/50"></div>

                        {/* Host Section */}
                        <div className="mb-6 flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gray-200"></div>
                            <div className="space-y-2 flex-1">
                                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/5"></div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2 mb-8 border-t pt-8">
                            <div className="h-4 bg-gray-200 rounded w-full"></div>
                            <div className="h-4 bg-gray-200 rounded w-full"></div>
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        </div>

                        {/* Amenities preview */}
                        <div className="border-t pt-8">
                            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                            <div className="grid grid-cols-2 gap-4">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="h-4 bg-gray-200 rounded w-1/2"></div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar / Booking Card Placeholder */}
                    <div className="hidden lg:block">
                        <div className="sticky top-24 border rounded-2xl p-6 h-[400px] shadow-sm bg-gray-50/30">
                            <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                            <div className="h-12 bg-gray-200 rounded w-full mb-4"></div>
                            <div className="h-10 bg-gray-200 rounded w-full mb-4"></div>
                            <div className="h-12 bg-gray-200 rounded w-full mt-auto"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
