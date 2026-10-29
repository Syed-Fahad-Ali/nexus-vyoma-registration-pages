import type { Metadata } from 'next';
import Navbar from '@/components/navbar/Navbar';
import FooterSection from '@/components/footer/FooterSection';
import PosterEdgeRibbons from '@/components/countdown/PosterEdgeRibbons';
import EventCountdown from '@/components/countdown/EventCountdown';

export const metadata: Metadata = {
  title: 'Countdown to Nexus Vyoma 2026 | Official Registration Launch',
  description:
    'Official launch countdown for Nexus Vyoma 2026 at ISL Engineering College, Hyderabad. Online registrations and passes go live 31 October 2026, 6:00 PM.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function CountdownPage() {
  return (
    <div className="relative min-h-screen flex flex-col bg-[#000000] text-white selection:bg-[#FF6A00] selection:text-white overflow-x-hidden">
      {/* 01 — Subtle Static Dotted Pattern (Clean Black Ground) */}
      <div
        className="fixed inset-0 pointer-events-none select-none z-0 opacity-[0.035] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]"
        aria-hidden="true"
      />

      {/* 02 — Flowing Neon Edge Ribbons (Poster Reference) */}
      <PosterEdgeRibbons />

      {/* 03 — Nexus Vyoma Fixed Navbar (z-50) */}
      <Navbar alwaysVisible />

      {/* 04 — Centered Countdown Section */}
      <main
        suppressHydrationWarning
        className="flex-1 min-h-screen flex flex-col items-center justify-center w-full px-2 sm:px-6 z-10 text-center select-none pt-24 sm:pt-28 pb-16 overflow-x-hidden"
      >
        <EventCountdown />
      </main>

      {/* 05 — Nexus Vyoma Text-Stroke Footer (z-20) */}
      <FooterSection />
    </div>
  );
}
