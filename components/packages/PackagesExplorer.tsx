'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import PackagesTitleRolling from './PackagesTitleRolling';
import PackageTicketCard from './PackageTicketCard';
import {
  parseApiPackagesData,
  type PackageApiResponse,
  type SerializedPackage,
  type SerializedWorkshop,
} from '@/lib/data/packagesData';

interface PackagesExplorerProps {
  initialPackages: SerializedPackage[];
  initialWorkshops: SerializedWorkshop[];
  entryTicketPrice: number;
}

interface CashfreeCheckoutResult {
  error?: { message?: string; code?: string };
  redirect?: boolean;
  paymentDetails?: unknown;
}

interface CashfreeInstance {
  checkout: (options: {
    paymentSessionId: string;
    redirectTarget?: '_modal' | '_self' | '_top';
  }) => Promise<CashfreeCheckoutResult>;
}

declare global {
  interface Window {
    Cashfree?: (options: { mode: 'sandbox' | 'production' }) => CashfreeInstance;
  }
}

async function loadCashfreeSDK(): Promise<CashfreeInstance> {
  const mode =
    process.env.NEXT_PUBLIC_CASHFREE_MODE === 'production' ? 'production' : 'sandbox';

  if (typeof window !== 'undefined' && window.Cashfree) {
    return window.Cashfree({ mode });
  }

  await new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Window not available'));
    if (window.Cashfree) return resolve();

    const existing = document.querySelector('script[src*="cashfree.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Cashfree SDK')));
      if (window.Cashfree) resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
    document.body.appendChild(script);
  });

  if (!window.Cashfree) {
    throw new Error('Cashfree SDK is not available');
  }

  return window.Cashfree({ mode });
}

interface WorkshopVisualTheme {
  themeColor: string;
  glowColor: string;
  badgeText: string;
  badgeBorder: string;
  badgeBg: string;
  badgeTextColor: string;
  bulletDot: string;
  hoverBorder: string;
  selectedBorder: string;
  selectedBg: string;
  selectedTopBar: string;
  priceHover: string;
}

const WORKSHOP_THEMES: WorkshopVisualTheme[] = [
  {
    // Workshop 1: Kintsugi Art (Japanese Ancient Golden Joinery Art)
    themeColor: '#FBB03B',
    glowColor: 'rgba(251, 176, 59, 0.28)',
    badgeText: 'GOLDEN CRAFT',
    badgeBorder: 'border-amber-400/50',
    badgeBg: 'bg-amber-400/15',
    badgeTextColor: 'text-amber-300',
    bulletDot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,176,59,0.8)]',
    hoverBorder: 'hover:border-amber-400/60 hover:shadow-[0_0_30px_rgba(251,176,59,0.22)]',
    selectedBorder: 'border-2 border-amber-400 shadow-[0_0_35px_rgba(251,176,59,0.35)]',
    selectedBg: 'bg-gradient-to-b from-[#1c1508]/95 via-[#0e101c]/95 to-[#060812]',
    selectedTopBar: 'from-amber-500 via-[#FBB03B] to-amber-300',
    priceHover: 'group-hover:text-amber-300',
  },
  {
    // Workshop 2: Bouquet Making (Floral Artistry & Botanical Design)
    themeColor: '#FF207D',
    glowColor: 'rgba(255, 32, 125, 0.28)',
    badgeText: 'FLORAL ARTISTRY',
    badgeBorder: 'border-pink-500/50',
    badgeBg: 'bg-pink-500/15',
    badgeTextColor: 'text-pink-300',
    bulletDot: 'bg-pink-400 shadow-[0_0_8px_rgba(255,32,125,0.8)]',
    hoverBorder: 'hover:border-pink-500/60 hover:shadow-[0_0_30px_rgba(255,32,125,0.22)]',
    selectedBorder: 'border-2 border-pink-500 shadow-[0_0_35px_rgba(255,32,125,0.35)]',
    selectedBg: 'bg-gradient-to-b from-[#1e0a16]/95 via-[#0e101c]/95 to-[#060812]',
    selectedTopBar: 'from-pink-500 via-[#FF207D] to-rose-300',
    priceHover: 'group-hover:text-pink-300',
  },
  {
    // Workshop 3: Sand Wax Candle Making (Luminous Layered Wax & Flame Art)
    themeColor: '#00E5FF',
    glowColor: 'rgba(0, 229, 255, 0.28)',
    badgeText: 'LUMINOUS CRAFT',
    badgeBorder: 'border-cyan-400/50',
    badgeBg: 'bg-cyan-400/15',
    badgeTextColor: 'text-cyan-300',
    bulletDot: 'bg-cyan-400 shadow-[0_0_8px_rgba(0,229,255,0.8)]',
    hoverBorder: 'hover:border-cyan-400/60 hover:shadow-[0_0_30px_rgba(0,229,255,0.22)]',
    selectedBorder: 'border-2 border-cyan-400 shadow-[0_0_35px_rgba(0,229,255,0.35)]',
    selectedBg: 'bg-gradient-to-b from-[#071829]/95 via-[#0e101c]/95 to-[#060812]',
    selectedTopBar: 'from-cyan-500 via-[#00E5FF] to-sky-300',
    priceHover: 'group-hover:text-cyan-300',
  },
];

const DEFAULT_WORKSHOP_THEME: WorkshopVisualTheme = {
  themeColor: '#FF6A00',
  glowColor: 'rgba(255, 106, 0, 0.28)',
  badgeText: 'WORKSHOP',
  badgeBorder: 'border-[#FF6A00]/50',
  badgeBg: 'bg-[#FF6A00]/15',
  badgeTextColor: 'text-[#FFA040]',
  bulletDot: 'bg-[#FF6A00] shadow-[0_0_8px_rgba(255,106,0,0.8)]',
  hoverBorder: 'hover:border-[#FF6A00]/60 hover:shadow-[0_0_30px_rgba(255,106,0,0.22)]',
  selectedBorder: 'border-2 border-[#FF6A00] shadow-[0_0_35px_rgba(255,106,0,0.35)]',
  selectedBg: 'bg-gradient-to-b from-[#201008]/95 via-[#0e101c]/95 to-[#060812]',
  selectedTopBar: 'from-[#FF6A00] via-[#FFA040] to-amber-300',
  priceHover: 'group-hover:text-[#FFA040]',
};

function getWorkshopVisualTheme(ws: SerializedWorkshop, index: number): WorkshopVisualTheme {
  const titleLower = ws.title.toLowerCase();
  if (titleLower.includes('kintsugi')) return WORKSHOP_THEMES[0];
  if (titleLower.includes('bouquet') || titleLower.includes('flower')) return WORKSHOP_THEMES[1];
  if (titleLower.includes('candle') || titleLower.includes('wax') || titleLower.includes('sand')) return WORKSHOP_THEMES[2];
  return WORKSHOP_THEMES[index % WORKSHOP_THEMES.length] || DEFAULT_WORKSHOP_THEME;
}

export default function PackagesExplorer({
  initialPackages,
  initialWorkshops,
  entryTicketPrice,
}: PackagesExplorerProps) {
  const router = useRouter();

  const [packages, setPackages] = useState<SerializedPackage[]>(initialPackages);
  const [workshops, setWorkshops] = useState<SerializedWorkshop[]>(initialWorkshops);
  const [isLoading, setIsLoading] = useState<boolean>(
    initialPackages.length === 0 && initialWorkshops.length === 0
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Choose first available workshop by default, or first workshop
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string | null>(() => {
    const firstAvailable = initialWorkshops.find((w) => !w.isSoldOut && !w.isPurchased);
    return firstAvailable?.id ?? initialWorkshops[0]?.id ?? null;
  });

  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Single-click lock for "Pay Now" buttons
  const isSubmittingRef = useRef<boolean>(false);
  const [submittingPackageId, setSubmittingPackageId] = useState<string | null>(null);

  // Fetch latest packages & user purchase/sold-out status from GET /api/package
  useEffect(() => {
    let isCancelled = false;

    async function fetchPackagesFromApi() {
      try {
        const res = await fetch('/api/package', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });

        const resJson = (await res.json().catch(() => null)) as PackageApiResponse | null;
        if (isCancelled) return;

        if (resJson?.redirect && resJson?.redirectUrl) {
          router.push(resJson.redirectUrl);
          return;
        }

        if (resJson?.data && Array.isArray(resJson.data)) {
          const parsed = parseApiPackagesData(resJson.data);
          setPackages(parsed.packages);
          setWorkshops(parsed.workshops);

          setSelectedWorkshopId((prev) => {
            if (prev && parsed.workshops.some((w) => w.id === prev)) {
              return prev;
            }
            const firstAvailable = parsed.workshops.find((w) => !w.isSoldOut && !w.isPurchased);
            return firstAvailable?.id ?? parsed.workshops[0]?.id ?? null;
          });
        }
      } catch (err) {
        console.error('Error fetching /api/package:', err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchPackagesFromApi();

    return () => {
      isCancelled = true;
    };
  }, [router]);

  const handleSelectWorkshop = (id: string) => {
    setSelectedWorkshopId((prev) => (prev === id ? null : id));
  };

  /**
   * Initiates order creation by calling POST /api/payments/create-order with { packageId }
   * Immediately locks the button so no second click can occur.
   */
  const handlePayPackage = async (packageId: string) => {
    if (!packageId || isSubmittingRef.current) {
      return;
    }

    // Immediate synchronous lock to prevent second click
    isSubmittingRef.current = true;
    setSubmittingPackageId(packageId);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ packageId }),
      });

      const resData = await res.json().catch(() => null);

      if (resData?.redirect && resData?.redirectUrl) {
        router.push(resData.redirectUrl);
        return;
      }

      if (res.status === 401) {
        router.push(resData?.redirectUrl || '/register/check-email');
        return;
      }

      if (!res.ok) {
        throw new Error(resData?.message || 'Unable to initiate package payment. Please try again.');
      }

      // Direct payment URL fallback if returned by backend
      if (resData?.data?.paymentUrl || resData?.data?.paymentLink) {
        window.location.href = resData.data.paymentUrl || resData.data.paymentLink;
        return;
      }

      const orderId = resData?.data?.order_id as string | undefined;
      const paymentSessionId = resData?.data?.payment_session_id as string | undefined;

      if (!paymentSessionId) {
        throw new Error(resData?.message || 'Payment session could not be created.');
      }

      // Open Cashfree v3 Checkout Modal
      const cashfree = await loadCashfreeSDK();
      const checkoutResult = await cashfree.checkout({
        paymentSessionId,
        redirectTarget: '_modal',
      });

      if (checkoutResult?.error) {
        const cancelMsg = checkoutResult.error.message || 'Payment was cancelled or failed.';
        setErrorMessage(cancelMsg);
        isSubmittingRef.current = false;
        setSubmittingPackageId(null);
        return;
      }

      if (checkoutResult?.paymentDetails || orderId) {
        if (orderId) {
          try {
            const verifyRes = await fetch(
              `/api/payments/return?order_id=${encodeURIComponent(orderId)}`
            );
            const verifyData = await verifyRes.json().catch(() => null);
            if (verifyData?.redirectUrl) {
              const targetUrl = verifyData.redirectUrl.includes('?')
                ? `${verifyData.redirectUrl}&order_id=${encodeURIComponent(orderId)}`
                : `${verifyData.redirectUrl}?order_id=${encodeURIComponent(orderId)}`;
              router.push(targetUrl);
              return;
            }
          } catch {
            // fallback to payment success page
          }
          router.push(`/payment/success?order_id=${encodeURIComponent(orderId)}`);
          return;
        }
        router.push('/payment/success');
        return;
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unable to initiate payment. Please try again.';
      setErrorMessage(msg);
      isSubmittingRef.current = false;
      setSubmittingPackageId(null);
      throw err;
    }
  };

  const selectedWorkshop = workshops.find((w) => w.id === selectedWorkshopId) ?? null;
  const isSelectedWorkshopSubmitting =
    Boolean(selectedWorkshop && submittingPackageId === selectedWorkshop.packageId);

  // Check if user has purchased any package or workshop
  const hasPaidAnyEvent =
    packages.some((p) => p.isPurchased) || workshops.some((w) => w.isPurchased);

  return (
    <div className="w-full flex flex-col gap-8 sm:gap-10 lg:gap-12">
      {/* Error Alert Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="w-full max-w-4xl mx-auto rounded-xl border border-[#D8182B]/60 bg-[#D8182B]/15 px-4 py-3 text-xs sm:text-sm font-mono text-red-200 flex items-center justify-between gap-3"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-300 hover:text-white uppercase text-[11px] font-bold shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 01 — PACKAGES SECTION: Aligned by indexPackage               */}
      {/* ============================================================ */}
      <section aria-label="Festival Packages" className="w-full flex flex-col gap-4 sm:gap-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-1">
          <div className="flex flex-col gap-1">
            <PackagesTitleRolling />
            <p className="font-mono text-xs sm:text-sm font-bold tracking-[0.2em] text-zinc-300 uppercase mt-0.5">
              PACKAGES:
            </p>
          </div>

          {hasPaidAnyEvent && (
            <button
              type="button"
              onClick={() => router.push('/register/enroll-event')}
              className="inline-flex items-center gap-1.5 p-0 bg-transparent border-0 text-[#FF6A00] hover:text-[#FFA040] hover:underline font-mono text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer outline-none focus-visible:underline"
            >
              <span>Go to Enroll page</span>
              <span className="text-sm">&rarr;</span>
            </button>
          )}
        </div>

        {isLoading && packages.length === 0 ? (
          <div className="w-full py-16 flex flex-col items-center justify-center gap-3 text-zinc-400 font-mono text-xs">
            <div className="w-6 h-6 border-2 border-[#FF6A00] border-t-transparent rounded-full animate-spin" />
            <span>Loading Packages...</span>
          </div>
        ) : packages.length > 0 ? (
          <div className="w-full grid grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5 lg:gap-6 items-stretch justify-center max-w-4xl mx-auto">
            {packages.map((pkg) => (
              <PackageTicketCard
                key={pkg.id}
                pkg={pkg}
                isSubmitting={submittingPackageId === pkg.packageId}
                anySubmitting={submittingPackageId !== null}
                onPayNow={(selectedPkg) => handlePayPackage(selectedPkg.packageId)}
              />
            ))}
          </div>
        ) : (
          <div className="w-full max-w-4xl mx-auto rounded-2xl border border-zinc-800/80 bg-[#0b0d14] p-8 text-center font-mono text-xs sm:text-sm text-zinc-400">
            No festival packages available at the moment.
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/* 02 — WORKSHOPS CONTAINER ("WORKSHOP PASS" Packages)          */}
      {/* ============================================================ */}
      <section
        aria-label="Workshops Selection"
        className="relative w-full max-w-4xl mx-auto rounded-3xl overflow-hidden border border-white/[0.14] p-4 xs:p-5 sm:p-7 lg:p-8 flex flex-col gap-5 sm:gap-6 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.14)] bg-[#070914]"
      >
        {/* Visualatic Atmospheric Nebula & Brand Glow Background Layers */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background:
              'radial-gradient(750px circle at 85% -15%, rgba(255, 106, 0, 0.18), transparent 60%), radial-gradient(600px circle at 10% 115%, rgba(216, 24, 43, 0.14), transparent 60%), radial-gradient(500px circle at 50% 50%, rgba(0, 102, 255, 0.08), transparent 70%), linear-gradient(180deg, #0d1124 0%, #080a18 50%, #04050d 100%)',
          }}
          aria-hidden="true"
        />

        {/* Specular Tri-Color Brand Top Rim Highlight */}
        <div
          className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF6A00] via-[#FBB03B] to-transparent pointer-events-none z-10 opacity-90"
          aria-hidden="true"
        />

        {/* Ambient Grid Lines Pattern Texture */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none z-0 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:28px_28px]"
          aria-hidden="true"
        />

        {/* Workshops Section Header: Clarifies Single-Event Attendance */}
        <div className="relative z-10 flex flex-col gap-2 pb-3.5 border-b border-white/[0.1]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#FF6A00] shadow-[0_0_10px_rgba(255,106,0,0.9)] animate-pulse" />
              <h2 className="font-mono text-xs sm:text-sm font-bold tracking-[0.2em] text-white uppercase flex items-center gap-2">
                <span>WORKSHOPS</span>
                <span className="text-[10px] font-mono text-zinc-500 font-normal tracking-wider">
                  (CHOOSE 1 OF 3)
                </span>
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-mono tracking-wider text-amber-300 bg-amber-500/15 border border-amber-500/40 font-bold uppercase shadow-[0_0_14px_rgba(251,176,59,0.2)]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_rgba(251,176,59,0.9)]" />
              ONLY 1 WORKSHOP ACCESSIBLE
            </span>
          </div>

          <p className="text-[11.5px] sm:text-xs text-zinc-400 font-sans leading-relaxed">
            All workshops run <strong className="text-zinc-100 font-semibold">simultaneously at the exact same time</strong> — choose wisely, as you can <strong className="text-[#FFA040] font-semibold underline decoration-[#FF6A00]/40 underline-offset-2">only attend one</strong>.
          </p>
        </div>

        {/* 3 Workshop Cards with Craft-Specific Color Coding */}
        {isLoading && workshops.length === 0 ? (
          <div className="relative z-10 w-full py-12 flex flex-col items-center justify-center gap-3 text-zinc-400 font-mono text-xs">
            <div className="w-5 h-5 border-2 border-[#FF6A00] border-t-transparent rounded-full animate-spin" />
            <span>Loading Workshops...</span>
          </div>
        ) : workshops.length > 0 ? (
          <div className="relative z-10 w-full grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 items-stretch">
            {workshops.map((ws, wsIdx) => {
              const isSelected = selectedWorkshopId === ws.id;
              const hasPoster = Boolean(ws.imageUrl && !imageErrors[ws.id]);
              const theme = getWorkshopVisualTheme(ws, wsIdx);

              return (
                <div
                  key={ws.id}
                  onClick={() => handleSelectWorkshop(ws.id)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectWorkshop(ws.id);
                    }
                  }}
                  className={`group relative w-full rounded-2xl p-4 sm:p-5 flex flex-col justify-between text-left transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00] cursor-pointer overflow-hidden ${
                    isSelected
                      ? `${theme.selectedBorder} ${theme.selectedBg} scale-[1.015]`
                      : `bg-[#090c1b]/85 backdrop-blur-md border border-white/[0.09] ${theme.hoverBorder} hover:bg-[#0d1024]/90 shadow-[0_8px_24px_rgba(0,0,0,0.55)]`
                  }`}
                >
                  {/* Top glowing accent bar when card is selected */}
                  {isSelected && (
                    <div
                      className={`absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r ${theme.selectedTopBar} z-20 shadow-[0_0_12px_rgba(255,255,255,0.6)]`}
                      aria-hidden="true"
                    />
                  )}

                  {/* Upper: Package Title + Theme Badge + Radio Indicator */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span className="font-mono text-[10px] font-bold tracking-wider text-zinc-300 uppercase flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${theme.bulletDot}`} />
                          <span>{ws.packageTitle || 'WORKSHOP PASS'}</span>
                        </span>

                        {/* Distinct Theme / Craft Accent Badge */}
                        <span className={`text-[8.5px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border ${theme.badgeBorder} ${theme.badgeBg} ${theme.badgeTextColor}`}>
                          {theme.badgeText}
                        </span>

                        {ws.isPurchased ? (
                          <span className="text-[8.5px] font-mono font-bold tracking-widest text-emerald-300 uppercase bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/40">
                            PURCHASED
                          </span>
                        ) : ws.isSoldOut ? (
                          <span className="text-[8.5px] font-mono font-bold tracking-widest text-red-200 uppercase bg-[#D8182B]/25 px-2 py-0.5 rounded-full border border-[#D8182B]/60">
                            SOLD OUT
                          </span>
                        ) : ws.fewRemaining ? (
                          <span className="inline-flex items-center gap-1 text-[8.5px] font-mono font-bold tracking-widest text-amber-300 uppercase bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/40">
                            <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                            FEW REMAINING
                          </span>
                        ) : null}
                      </div>

                      {/* Custom Colorized Radio Button */}
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                          isSelected
                            ? 'border-white bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)]'
                            : 'border-zinc-600 bg-black/40 group-hover:border-zinc-400'
                        }`}
                      >
                        {isSelected && (
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: theme.themeColor }}
                          />
                        )}
                      </div>
                    </div>

                    {/* Poster Image Container with Ambient Glow & unoptimized direct S3 load */}
                    <div className="relative overflow-hidden w-full aspect-[16/10] sm:aspect-[4/3] rounded-xl bg-[#0c0e18] border border-white/[0.1] flex items-center justify-center shadow-inner group/poster">
                      {/* Ambient color halo inside poster box */}
                      <div
                        className="absolute inset-0 pointer-events-none opacity-40 blur-xl transition-opacity duration-300 group-hover:opacity-75"
                        style={{
                          background: `radial-gradient(circle at 50% 50%, ${theme.glowColor}, transparent 70%)`,
                        }}
                        aria-hidden="true"
                      />

                      {hasPoster ? (
                        <>
                          <Image
                            src={ws.imageUrl!}
                            alt=""
                            fill
                            unoptimized
                            className="object-cover blur-xl scale-125 opacity-40 select-none pointer-events-none"
                            aria-hidden="true"
                          />
                          <Image
                            src={ws.imageUrl!}
                            alt={ws.title}
                            fill
                            unoptimized
                            onError={() =>
                              setImageErrors((prev) => ({ ...prev, [ws.id]: true }))
                            }
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-contain relative z-10 transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                        </>
                      ) : (
                        <div className="relative z-10 flex flex-col items-center justify-center gap-1.5 text-center p-3 select-none">
                          <span
                            className="font-mono text-2xl font-black tracking-wider"
                            style={{ color: theme.themeColor }}
                          >
                            {ws.code}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08]">
                            {ws.category || 'WORKSHOP'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Workshop Event Title & Short Description */}
                    <div className="flex flex-col gap-1">
                      <h3 className={`font-subheading font-bold text-base sm:text-lg tracking-wide text-white uppercase leading-snug transition-colors ${theme.priceHover}`}>
                        {ws.title}
                      </h3>
                      {ws.shortDescription && (
                        <p className="text-zinc-400 text-xs leading-relaxed line-clamp-2">
                          {ws.shortDescription}
                        </p>
                      )}
                    </div>

                    {/* Few Remaining Alert on Workshop Card */}
                    {ws.fewRemaining && !ws.isSoldOut && !ws.isPurchased && (
                      <div className="px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-semibold uppercase tracking-wide text-center">
                        Only a few spots remaining!
                      </div>
                    )}

                    {/* Faded Divider Line */}
                    <div
                      className="w-full h-px bg-gradient-to-r from-transparent via-white/15 to-transparent my-0.5 sm:my-1"
                      aria-hidden="true"
                    />

                    {/* Colorized Inclusions List */}
                    <ul className="flex flex-col gap-1.5 pt-0.5 font-mono text-[10px] xs:text-[11px] sm:text-[11.5px] text-zinc-300 leading-relaxed">
                      <li className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${theme.bulletDot}`} />
                        <span className="text-zinc-200">3 Days Full Fest Entry</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${theme.bulletDot}`} />
                        <span className="text-zinc-200">9 Free Events Included</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${theme.bulletDot}`} />
                        <span className="break-words line-clamp-1 font-medium text-white">{ws.title} Access</span>
                      </li>
                    </ul>
                  </div>

                  {/* Clean Colorized Pricing Strip */}
                  <div className="pt-2.5 mt-2.5 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-400 uppercase tracking-wider text-[9px] xs:text-[10px] font-medium">
                      {ws.isEntryTicket ? 'ENTRY + WORKSHOP' : 'WORKSHOP PASS'}
                    </span>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-zinc-400 font-mono text-[11px]">₹</span>
                      <span className={`text-white font-mono text-base xs:text-lg sm:text-xl font-black transition-colors ${theme.priceHover}`}>
                        {ws.fee}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="relative z-10 w-full py-8 text-center font-mono text-xs sm:text-sm text-zinc-400">
            No workshop packages available at the moment.
          </div>
        )}

        {/* Bottom-Right Colorized Action Row */} 
        <div className="relative z-10 w-full flex items-center justify-between sm:justify-end gap-3 sm:gap-5 pt-3.5 border-t border-white/[0.1]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF6A00] shadow-[0_0_8px_rgba(255,106,0,0.8)]" />
            <span className="font-mono text-xs sm:text-sm font-semibold text-zinc-200 tracking-wide">
              {selectedWorkshop ? 'Selected (1 Workshop)' : 'Select (0)'}
            </span>
            <span className="hidden sm:inline font-mono text-[11px] text-zinc-400 uppercase">
              {selectedWorkshop
                ? `· ${selectedWorkshop.title}`
                : '· Choose your workshop above'}
            </span>
          </div>

          {selectedWorkshop?.isPurchased ? (
            <button
              type="button"
              disabled
              className="min-h-[44px] px-6 sm:px-8 py-2.5 rounded-xl border border-emerald-500/40 bg-emerald-950/60 text-emerald-300 font-mono text-xs font-bold uppercase tracking-widest cursor-not-allowed flex items-center justify-center gap-1.5 opacity-90 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
            >
              <span>Purchased</span>
            </button>
          ) : selectedWorkshop?.isSoldOut ? (
            <button
              type="button"
              disabled
              className="min-h-[44px] px-6 sm:px-8 py-2.5 rounded-xl border border-[#D8182B] bg-[#D8182B] text-white font-mono text-xs font-bold uppercase tracking-widest cursor-not-allowed flex items-center justify-center gap-1.5 opacity-95 shadow-[0_0_15px_rgba(216,24,43,0.4)]"
            >
              <span>Sold Out</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={!selectedWorkshop || submittingPackageId !== null}
              onClick={() => {
                if (selectedWorkshop) {
                  handlePayPackage(selectedWorkshop.packageId);
                }
              }}
              className="min-h-[44px] px-6 sm:px-9 py-2.5 rounded-xl border border-[#FF6A00]/60 hover:border-[#FFA040] bg-gradient-to-r from-[#FF6A00] via-[#FF3B2E] to-[#D8182B] hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed text-white font-mono text-xs font-bold uppercase tracking-widest transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00] cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(255,106,0,0.35)] hover:shadow-[0_0_36px_rgba(255,106,0,0.55)] group/cta"
            >
              <span>{isSelectedWorkshopSubmitting ? 'Processing...' : 'Pay Now'}</span>
              {!isSelectedWorkshopSubmitting && (
                <span className="text-sm transition-transform duration-200 group-hover/cta:translate-x-1">&rarr;</span>
              )}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
