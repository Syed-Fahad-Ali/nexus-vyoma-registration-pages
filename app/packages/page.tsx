import type { Metadata } from 'next';
import Navbar from '@/components/navbar/Navbar';
import PackagesExplorer from '@/components/packages/PackagesExplorer';
import FooterSection from '@/components/footer/FooterSection';
import { loadPackagesPageData } from '@/lib/data/packagesData';

export const metadata: Metadata = {
  title: 'Packages | Nexus Vyoma',
  description:
    'Explore official festival pass packages, entry tickets, and hands-on workshops at Nexus Vyoma 2026, ISL Engineering College, Hyderabad.',
  openGraph: {
    title: 'Packages | Nexus Vyoma',
    description:
      'Official festival packages, 3-day entry passes, and workshop bundles for Nexus Vyoma 2026 (10–12 Nov 2026) at ISL Engineering College, Hyderabad.',
    type: 'website',
  },
};

export default async function PackagesPage() {
  // Fetch real packages and workshops directly from existing database schemas (SSR)
  const { packages, workshops, entryTicketPrice } = await loadPackagesPageData();

  return (
    <div className="relative min-h-screen flex flex-col bg-black text-white selection:bg-[#FF6A00] selection:text-white">
      {/* 01 — Shared Nexus Vyoma Mirror-Glass Navbar */}
      <Navbar alwaysVisible />

      {/* 02 — Main Framed Packages Section Container */}
      <main
        suppressHydrationWarning
        className="flex-1 flex flex-col items-center justify-center w-full px-3 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-10 sm:pb-14 z-10"
      >
        <div className="w-full max-w-7xl mx-auto rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#050711]/80 backdrop-blur-xl p-4 xs:p-5 sm:p-8 lg:p-10 shadow-[0_25px_60px_rgba(0,0,0,0.95)]">
          <PackagesExplorer
            packages={packages}
            workshops={workshops}
            entryTicketPrice={entryTicketPrice}
          />
        </div>
      </main>

      {/* 03 — Shared Cinematic Text-Stroke Footer */}
      <FooterSection />
    </div>
  );
}
