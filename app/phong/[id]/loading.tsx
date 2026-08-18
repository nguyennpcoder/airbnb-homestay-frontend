export default function ProductLoading() {
    return (
        <div className="min-h-screen bg-white">
            {/* Header Skeleton Placeholder */}
            <div className="h-20 border-b border-gray-100 animate-pulse bg-gray-50" />

            <div className="pt-20 pb-24">
                <div className="container mx-auto px-4 max-w-7xl">
                    {/* Title and Share/Save Skeleton */}
                    <div className="flex items-center justify-between mb-4 mt-4">
                        <div className="h-8 w-1/3 bg-gray-200 rounded-lg animate-pulse" />
                        <div className="flex gap-4">
                            <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
                            <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
                        </div>
                    </div>

                    {/* Photo Grid Skeleton */}
                    <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[450px] md:h-[560px] rounded-xl overflow-hidden mb-8">
                        <div className="col-span-2 row-span-2 bg-gray-200 animate-pulse" />
                        <div className="col-span-1 row-span-1 bg-gray-200 animate-pulse" />
                        <div className="col-span-1 row-span-1 bg-gray-200 animate-pulse" />
                        <div className="col-span-1 row-span-1 bg-gray-200 animate-pulse" />
                        <div className="col-span-1 row-span-1 bg-gray-200 animate-pulse" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            {/* Host Info Skeleton */}
                            <div className="h-6 w-1/2 bg-gray-200 rounded-lg mb-2 animate-pulse" />
                            <div className="h-4 w-1/3 bg-gray-100 rounded mb-6 animate-pulse" />

                            <div className="h-24 w-full bg-gray-50 border border-gray-100 rounded-2xl mb-8 animate-pulse" />

                            {/* Description Skeleton */}
                            <div className="space-y-4 mb-8">
                                <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                                <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                                <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
                            </div>

                            {/* Amenities Skeleton */}
                            <div className="pt-6 border-t">
                                <div className="h-6 w-1/4 bg-gray-200 rounded mb-4 animate-pulse" />
                                <div className="grid grid-cols-2 gap-4">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className="h-4 w-4 bg-gray-100 rounded-full animate-pulse" />
                                            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Skeleton (Booking Card) */}
                        <div className="hidden lg:block">
                            <div className="sticky top-28 p-6 border rounded-2xl shadow-xl space-y-4 animate-pulse">
                                <div className="h-6 w-1/3 bg-gray-200 rounded" />
                                <div className="h-16 w-full border rounded-xl bg-gray-50" />
                                <div className="h-12 w-full bg-[#FF385C]/20 rounded-xl" />
                                <div className="h-4 w-full bg-gray-100 rounded" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
