import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileNav from "@/components/MobileNav";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Toaster } from 'react-hot-toast';
import AdminGuard from "@/components/AdminGuard";
import PricingRulesInit from "@/components/PricingRulesInit";

// Warm up the image CDN and API TLS connections before React needs them.
// Supabase serves every uploaded photo; Render serves all API calls.
const SUPABASE_ORIGIN = 'https://ksjzpphvbpkayfmarpeb.supabase.co';
const BACKEND_ORIGIN = (() => {
  const raw =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'https://airbnb-homestay-9ga1.onrender.com/api';
  try {
    return new URL(raw).origin;
  } catch {
    return 'https://airbnb-homestay-9ga1.onrender.com';
  }
})();

export const metadata: Metadata = {
  title: "Airbnb Homestay - Nơi lưu trú và Trải nghiệm",
  description: "Khám phá nơi lưu trú, trải nghiệm và dịch vụ độc đáo trên toàn thế giới",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href={SUPABASE_ORIGIN} />
        <link rel="dns-prefetch" href={SUPABASE_ORIGIN} />
        <link rel="preconnect" href={BACKEND_ORIGIN} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={BACKEND_ORIGIN} />
      </head>
      <body suppressHydrationWarning>
        <PricingRulesInit />
        <AdminGuard />
        <Header />
        {children}
        <MobileNav />
        <Footer />
        <Toaster position="bottom-left" />
      </body>
    </html>
  );
}

