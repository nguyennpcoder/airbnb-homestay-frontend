'use client';

import React from 'react';

export default function ListingSkeleton() {
    return (
        <div className="flex-shrink-0 animate-pulse w-[280px] md:w-[236px]">
            {/* Image Skeleton */}
            <div className="relative aspect-[4/3] rounded-xl bg-gray-200 mb-3"></div>

            {/* Title Skeleton */}
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>

            {/* Location Skeleton */}
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>

            {/* Row with Price and Rating */}
            <div className="flex justify-between items-center">
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
        </div>
    );
}
