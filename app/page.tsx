import HomepageCarousels from "@/components/HomepageCarousels";
import type { Phong } from "@/lib/api";

// Homepage data is public and changes slowly. Rendering it on the server and
// revalidating every minute means visitors get HTML with listings already in
// place instead of waiting ~3s for the Render API after hydration.
export const revalidate = 60;

function resolveApiBase(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL;

  if (raw && /^https?:\/\//.test(raw)) {
    const trimmed = raw.replace(/\/+$/, '');
    return /\/api$/.test(trimmed) ? trimmed : `${trimmed}/api`;
  }

  // Production fallback so the page still renders if an env var is missing.
  return 'https://airbnb-homestay-9ga1.onrender.com/api';
}

async function getHomepageRooms(): Promise<Phong[] | undefined> {
  const url = `${resolveApiBase()}/public/search?loaiPhong=noi_luu_tru&imageLimit=4`;
  // At build time a failure must not block the deploy, so we fall back to the
  // client-side fetch. During ISR revalidation we throw instead, which makes
  // Next keep serving the last good page rather than caching skeletons.
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

  try {
    const res = await fetch(url, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`[home] listing fetch failed: ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error(`[home] expected an array of rooms, got ${typeof data}`);
    }

    return data as Phong[];
  } catch (error) {
    // Render can be cold/asleep; never fail the build over it.
    if (isBuildPhase) {
      console.error('[home] listing fetch error:', (error as Error)?.message || error);
      return undefined;
    }
    throw error;
  }
}

export default async function Home() {
  const initialRooms = await getHomepageRooms();

  return (
    <main className="min-h-screen">
      <div className="pt-24 md:pt-48 pb-8">
        <div className="container-custom mt-10 space-y-0 pb-10">
          <HomepageCarousels initialRooms={initialRooms} />
        </div>
      </div>
    </main>
  );
}
