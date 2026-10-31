import { Suspense } from 'react';
import type { Metadata } from 'next';
import Script from 'next/script';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import Navbar from '@/components/navbar/Navbar';
import PackagesExplorer from '@/components/packages/PackagesExplorer';
import FooterSection from '@/components/footer/FooterSection';
import {
  parseApiPackagesData,
  type PackageApiResponse,
} from '@/lib/data/packagesData';

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

async function fetchPackagesFromEndpoint(): Promise<{
  redirect: boolean;
  redirectUrl: string | null;
  response: PackageApiResponse | null;
}> {
  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    const proto = h.get('x-forwarded-proto') ?? 'http';
    const cookie = h.get('cookie') ?? '';

    if (!host) {
      return { redirect: false, redirectUrl: null, response: null };
    }

    const res = await fetch(`${proto}://${host}/api/package`, {
      method: 'GET',
      headers: {
        cookie,
      },
      cache: 'no-store',
    });

    const json = (await res.json().catch(() => null)) as PackageApiResponse | null;

    return {
      redirect: Boolean(json?.redirect),
      redirectUrl: json?.redirectUrl ?? null,
      response: json,
    };
  } catch (err) {
    console.error('Error fetching /api/package on server:', err);
    return {
      redirect: false,
      redirectUrl: null,
      response: null,
    };
  }
}

async function PackagesContent() {
  await connection();

  const { redirect: shouldRedirect, redirectUrl, response } =
    await fetchPackagesFromEndpoint();

  if (shouldRedirect && redirectUrl) {
    redirect(redirectUrl);
  }

  const { packages, workshops, entryTicketPrice } = parseApiPackagesData(
    response?.data
  );

  return (
    <PackagesExplorer
      initialPackages={packages}
      initialWorkshops={workshops}
      entryTicketPrice={entryTicketPrice}
    />
  );
}

export default function PackagesPage() {
  return (
    <div className="relative min-h-screen flex flex-col bg-black text-white selection:bg-[#FF6A00] selection:text-white">
      {/* Cashfree v3 SDK for Package Order Checkout */}
      <Script src="https://sdk.cashfree.com/js/v3/cashfree.js" strategy="afterInteractive" />

      {/* 01 — Shared Nexus Vyoma Mirror-Glass Navbar */}
      <Navbar alwaysVisible />

      {/* 02 — Main Framed Section Container (Matching /events) */}
      <main
        suppressHydrationWarning
        className="flex-1 flex flex-col items-center justify-center w-full px-3 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-10 sm:pb-14 z-10"
      >
        <div className="w-full max-w-7xl mx-auto rounded-2xl sm:rounded-3xl border border-zinc-800/90 bg-black/70 p-4 xs:p-5 sm:p-8 lg:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
          <Suspense
            fallback={
              <div className="w-full py-20 flex flex-col items-center justify-center gap-3 text-zinc-500 font-mono text-xs">
                <div className="w-6 h-6 border-2 border-[#FF6A00] border-t-transparent rounded-full animate-spin" />
                <span>Loading Packages...</span>
              </div>
            }
          >
            <PackagesContent />
          </Suspense>
        </div>
      </main>

      {/* 03 — Shared Footer */}
      <FooterSection />
    </div>
  );
}
