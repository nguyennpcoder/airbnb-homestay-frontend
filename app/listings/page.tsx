import ListingsView from '@/components/ListingsView';
import type { Phong } from '@/lib/api';

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

  return 'https://airbnb-homestay-9ga1.onrender.com/api';
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value || undefined;
}

async function getListings(
  loaiPhong: string | undefined,
  thanhPho: string | undefined
): Promise<Phong[] | undefined> {
  const params = new URLSearchParams();
  if (loaiPhong) params.set('loaiPhong', loaiPhong);
  if (thanhPho) params.set('thanhPho', thanhPho);
  // Cards only need a handful of photos; the full gallery lives on the room page.
  params.set('imageLimit', '6');

  const url = `${resolveApiBase()}/public/search?${params.toString()}`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`[listings] search failed: ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error(`[listings] expected an array, got ${typeof data}`);
    }

    return data as Phong[];
  } catch (error) {
    // Let the client-side fallback retry instead of failing the whole page.
    console.error('[listings] search error:', (error as Error)?.message || error);
    return undefined;
  }
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const loaiPhong =
    first(searchParams?.loaiSanPham) ||
    first(searchParams?.loaiPhong) ||
    first(searchParams?.itemType);
  const thanhPho = first(searchParams?.thanhPho);
  const laOriginal = first(searchParams?.laOriginal) === 'true';

  let initialProducts = await getListings(loaiPhong, thanhPho);
  if (initialProducts && laOriginal) {
    initialProducts = initialProducts.filter((item: any) => item?.laOriginal === true);
  }

  return (
    <ListingsView
      key={`${loaiPhong ?? ''}|${thanhPho ?? ''}|${laOriginal}`}
      initialProducts={initialProducts}
      thanhPho={thanhPho}
      loaiPhong={loaiPhong}
      laOriginal={laOriginal}
    />
  );
}
