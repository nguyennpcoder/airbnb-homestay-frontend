import Link from 'next/link';

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
      <p className="text-gray-500 mb-8">Trang này đang được xây dựng.</p>
      <Link href="/" className="px-6 py-3 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition">
        Quay về trang chủ
      </Link>
    </div>
  );
}
