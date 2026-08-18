import HomepageCarousels from "@/components/HomepageCarousels";

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="pt-24 md:pt-48 pb-8">
        <div className="container-custom mt-10 space-y-0 pb-10">
          <HomepageCarousels />
        </div>
      </div>
    </main >
  );
}
