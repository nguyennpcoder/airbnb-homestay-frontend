'use client';

import React from 'react';

export function ProfileSkeleton() {
    return (
        <div className="min-h-screen bg-white">
            <div className="pt-20 pb-12 animate-pulse">
                <div className="container-custom">
                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Left Sidebar Skeleton */}
                        <div className="w-full md:w-64 flex-shrink-0">
                            <div className="h-10 bg-gray-200 rounded w-1/2 mb-6"></div>
                            <div className="space-y-4">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="h-12 bg-gray-100 rounded-lg w-full"></div>
                                ))}
                            </div>
                        </div>

                        {/* Main Content Skeleton */}
                        <div className="flex-1">
                            <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
                                <div className="flex justify-between mb-6">
                                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="w-24 h-24 rounded-full bg-gray-200"></div>
                                    <div className="space-y-2 flex-1">
                                        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                                        <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 h-48"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function TripsSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Tabs Skeleton */}
            <div className="flex border-b border-gray-200">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="pb-3 px-4 h-5 w-24 bg-gray-100 mx-2"></div>
                ))}
            </div>

            {/* List Skeleton */}
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex flex-col md:flex-row border border-gray-200 rounded-xl overflow-hidden h-48">
                        <div className="md:w-56 bg-gray-200 h-full"></div>
                        <div className="p-4 flex-grow space-y-4">
                            <div className="flex justify-between">
                                <div className="space-y-2 flex-1">
                                    <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                                    <div className="h-5 bg-gray-200 rounded w-1/2"></div>
                                </div>
                                <div className="h-5 bg-gray-100 rounded w-20"></div>
                            </div>
                            <div className="h-3 bg-gray-100 rounded w-1/3"></div>
                            <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                                <div className="h-8 bg-gray-50 rounded"></div>
                                <div className="h-8 bg-gray-50 rounded"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
export function FavoritesSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex items-center justify-between mb-6">
                <div className="space-y-2">
                    <div className="h-6 bg-gray-200 rounded w-32"></div>
                    <div className="h-4 bg-gray-100 rounded w-48"></div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="space-y-3">
                        <div className="aspect-[4/3] rounded-2xl bg-gray-200"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                        <div className="flex justify-between items-center pt-2">
                            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function HostListingSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex justify-between items-center mb-6">
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                <div className="h-10 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                        <div className="h-48 bg-gray-200"></div>
                        <div className="p-4 space-y-3">
                            <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                            <div className="pt-4 border-t flex justify-between">
                                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
