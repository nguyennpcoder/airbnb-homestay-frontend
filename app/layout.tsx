import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileNav from "@/components/MobileNav";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Toaster } from 'react-hot-toast';
import AdminGuard from "@/components/AdminGuard";
import PricingRulesInit from "@/components/PricingRulesInit";
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

