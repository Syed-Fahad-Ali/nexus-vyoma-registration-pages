'use client';

import React, { useState } from 'react';
import type { SerializedPackage } from '@/lib/data/packagesData';

interface PackageTicketCardProps {
  pkg: SerializedPackage;
  isSubmitting?: boolean;
  anySubmitting?: boolean;
  onPayNow?: (pkg: SerializedPackage) => Promise<void> | void;
}

export default function PackageTicketCard({
  pkg,
  isSubmitting = false,
  anySubmitting = false,
  onPayNow,
}: PackageTicketCardProps) {
  const [hasClicked, setHasClicked] = useState(false);

  const isPurchased = Boolean(pkg.isPurchased);
  const isSoldOut = Boolean(pkg.isSoldOut);
  const fewRemaining = !isSoldOut && !isPurchased && Boolean(pkg.fewRemaining);
  const isRecommended = Boolean(pkg.isRecommended || pkg.isFlagship);
  const isTechBattle =
    pkg.title.trim().toUpperCase() === 'TECH BATTLES' ||
    pkg.title.trim().toUpperCase().includes('TECH BATTLE');

  const isBusy = isSubmitting || hasClicked;
  const isButtonDisabled = isPurchased || isSoldOut || isBusy || anySubmitting;

  const handleButtonClick = async () => {
    if (isButtonDisabled) return;
    setHasClicked(true);
    try {
      await onPayNow?.(pkg);
    } catch {
      // Unlock only if the request threw before redirecting/completing
      setHasClicked(false);
    }
  };

  return (
    <div
      className={`group relative isolate flex flex-col justify-between w-full max-w-[275px] sm:max-w-[285px] mx-auto aspect-[1/1.65] xs:aspect-[1/1.7] sm:aspect-[1/1.75] min-h-[395px] xs:min-h-[420px] sm:min-h-[450px] transition-all duration-300 filter drop-shadow-[0_12px_26px_rgba(0,0,0,0.85)] ${
        isSoldOut
          ? 'opacity-90'
          : 'hover:drop-shadow-[0_16px_32px_rgba(255,106,0,0.24)]'
      } ${pkg.mobileOrderClass ?? ''}`}
    >
      {/* 
        TALL SLENDER RECTANGULAR TICKET SVG OUTLINE & FILL:
        viewBox: 240 width x 420 height (Slender vertical aspect ratio 1 : 1.75)
      */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
        viewBox="0 0 240 420"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <linearGradient id={`pkg-grad-${pkg.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={
                isSoldOut
                  ? '#1a0c0e'
                  : isPurchased
                  ? '#0b1914'
                  : isRecommended
                  ? '#131526'
                  : '#0c0e18'
              }
            />
            <stop offset="65%" stopColor="#080a12" />
            <stop offset="100%" stopColor="#05060d" />
          </linearGradient>
        </defs>

        {/* Outer Ticket Fill & Outline Stroke */}
        <path
          d="
            M 18,0
            L 106,0
            A 14,14 0 0,0 134,0
            L 222,0
            A 18,18 0 0,1 240,18
            L 240,336
            A 12,12 0 0,0 240,360
            L 240,402
            A 18,18 0 0,1 222,420
            L 134,420
            A 14,14 0 0,0 106,420
            L 18,420
            A 18,18 0 0,1 0,402
            L 0,360
            A 12,12 0 0,0 0,336
            L 0,18
            A 18,18 0 0,1 18,0
            Z
          "
          fill={`url(#pkg-grad-${pkg.id})`}
          stroke={
            isSoldOut
              ? 'rgba(216, 24, 43, 0.45)'
              : isPurchased
              ? 'rgba(16, 185, 129, 0.45)'
              : isRecommended
              ? '#FF6A00'
              : 'rgba(255, 255, 255, 0.15)'
          }
          strokeWidth="1.25"
          vectorEffect="non-scaling-stroke"
          className={`transition-colors duration-200 ${
            !isSoldOut && !isPurchased ? 'group-hover:stroke-[#FF6A00]' : ''
          }`}
        />
      </svg>

      {/* ============================================================ */}
      {/* UPPER TICKET BODY (Vertically Tall & Spacious)              */}
      {/* ============================================================ */}
      <div className="p-3.5 xs:p-4 sm:p-5 pt-4.5 xs:pt-5 sm:pt-6 flex-1 flex flex-col justify-between gap-2.5 relative z-10">
        <div className="flex flex-col gap-1.5">
          {/* Top Tag Row: Pass Index & Status / Few Remaining Badge */}
          <div className="flex items-center justify-between gap-1.5 min-h-[22px]">
            <span className="font-mono text-[8.5px] xs:text-[9.5px] tracking-[0.2em] uppercase text-zinc-500 font-semibold">
              {pkg.indexPackage ? `PASS #0${pkg.indexPackage}` : 'PASS'}
            </span>

            {isPurchased ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[7.5px] xs:text-[8px] font-mono tracking-wider font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shrink-0">
                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                PURCHASED
              </span>
            ) : isSoldOut ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[7.5px] xs:text-[8px] font-mono tracking-wider font-bold uppercase bg-[#D8182B]/20 text-red-300 border border-[#D8182B]/50 shrink-0">
                <span className="w-1 h-1 rounded-full bg-[#D8182B]" />
                SOLD OUT
              </span>
            ) : fewRemaining ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[7.5px] xs:text-[8px] font-mono tracking-wider font-bold uppercase bg-amber-500/15 text-amber-300 border border-amber-500/40 shrink-0">
                <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                FEW REMAINING
              </span>
            ) : isRecommended ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[7.5px] xs:text-[8px] font-mono tracking-wider font-bold uppercase bg-[#FF6A00]/15 text-[#FFA040] border border-[#FF6A00]/40 shrink-0">
                <span className="w-1 h-1 rounded-full bg-[#FF6A00] animate-pulse" />
                {pkg.recommendationTag || 'FLAGSHIP'}
              </span>
            ) : null}
          </div>

          {/* Package Title (package.title) & Subtitle (event.title) */}
          <div className="flex flex-col gap-0.5 pt-0.5">
            <h3 className="font-mono text-sm xs:text-base sm:text-lg font-bold tracking-wide text-white uppercase group-hover:text-[#FFA040] transition-colors leading-snug break-words hyphens-none">
              {pkg.title}
            </h3>

            {/* Subtitle = event.title */}
            {pkg.subtitle && (
              <p className="font-mono text-[9.5px] xs:text-[10.5px] sm:text-xs text-[#FFA040]/90 font-semibold tracking-wide uppercase leading-tight line-clamp-2">
                {pkg.subtitle}
              </p>
            )}
          </div>

          {/* Faded Divider Line after Subtitle */}
          <div
            className="w-full h-px bg-gradient-to-r from-transparent via-white/15 to-transparent my-0.5 sm:my-1"
            aria-hidden="true"
          />

          {/* Inclusions List */}
          <ul className="flex flex-col gap-1 pt-0.5 font-mono text-[10px] xs:text-[11px] sm:text-[11.5px] text-zinc-300 leading-relaxed">
            {pkg.inclusions.map((item, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-[#FF6A00] font-bold select-none shrink-0 text-xs">-</span>
                <span className="break-words line-clamp-2">{item}</span>
              </li>
            ))}
          </ul>

          {/* Tech Battles Special Enrollment Note */}
          {isTechBattle && (
            <div className="mt-1 px-2.5 py-1.5 rounded-lg border border-[#FF6A00]/40 bg-[#FF6A00]/10 text-amber-200 font-mono text-[9px] xs:text-[9.5px] leading-relaxed text-left">
              <span className="font-bold text-[#FFA040] uppercase">Note: </span>
              After purchasing the event, enroll the event from event page.
            </div>
          )}

          {/* Few Remaining Banner Note */}
          {fewRemaining && (
            <div className="mt-1 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[9px] xs:text-[9.5px] font-semibold uppercase tracking-wide text-center">
              Only a few tickets remaining!
            </div>
          )}
        </div>

        {/* Pricing Strip: Sits right above the perforation line */}
        <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono">
          <span className="text-zinc-500 uppercase tracking-wider text-[9px] xs:text-[10px] font-medium">
            {pkg.isEntryTicket ? 'ENTRY + PASS' : 'PASS FEE'}
          </span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-zinc-400 font-mono text-[11px]">₹</span>
            <span className="text-white font-mono text-base xs:text-lg sm:text-xl font-black group-hover:text-[#FFA040] transition-colors">
              {pkg.price}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* DIVIDER: Softly Faded Orange Line Between Lateral Notches    */}
      {/* ============================================================ */}
      <div
        className="relative w-full h-3 flex items-center justify-center select-none overflow-hidden px-3 xs:px-4 z-10"
        aria-hidden="true"
      >
        <div
          className={`w-full h-[1.5px] bg-gradient-to-r from-transparent ${
            isSoldOut
              ? 'via-[#D8182B]'
              : isPurchased
              ? 'via-emerald-500'
              : 'via-[#FF6A00]'
          } to-transparent opacity-80 group-hover:opacity-100 transition-all duration-300 shadow-[0_0_6px_rgba(255,106,0,0.35)]`}
        />
      </div>

      {/* ============================================================ */}
      {/* LOWER TEAR-OFF STUB: Action Button                           */}
      {/* ============================================================ */}
      <div className="h-[56px] pb-3 px-3.5 xs:px-4 flex items-center justify-center relative z-10">
        {isPurchased ? (
          <button
            type="button"
            disabled
            className="w-full min-h-[36px] px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/60 text-emerald-300 font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider cursor-not-allowed flex items-center justify-center opacity-90"
          >
            Purchased
          </button>
        ) : isSoldOut ? (
          <button
            type="button"
            disabled
            className="w-full min-h-[36px] px-3 py-1.5 rounded-lg border border-[#D8182B] bg-[#D8182B] text-white font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider cursor-not-allowed flex items-center justify-center opacity-95 shadow-[0_0_12px_rgba(216,24,43,0.4)]"
          >
            Sold Out
          </button>
        ) : (
          <button
            type="button"
            disabled={isButtonDisabled}
            onClick={handleButtonClick}
            className="w-full min-h-[36px] px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-[#FF6A00] bg-[#141622] hover:bg-[#FF6A00] disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed text-zinc-200 hover:text-black font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00] cursor-pointer flex items-center justify-center shadow-xs"
          >
            {isBusy ? 'Processing...' : 'Pay Now'}
          </button>
        )}
      </div>
    </div>
  );
}
