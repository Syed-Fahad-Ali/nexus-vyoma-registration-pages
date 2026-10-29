'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, Ticket, Flame } from 'lucide-react';
import { Spark } from '@/components/brand/Spark';
import VaporCountdown from '@/components/ui/countdown-vapor-digits';
import nexusWordmarkTexture from '@/public/brand/nexus-wordmark-texture.png';

// Target date: October 31, 2026, 18:00:00 IST (UTC+05:30)
const TARGET_TIME = new Date('2026-10-31T18:00:00+05:30').getTime();

export default function EventCountdown() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-7xl mx-auto my-auto space-y-6 sm:space-y-10 px-2 xs:px-4 sm:px-6 text-center select-none z-10">
      {/* 02 — Main Poster Heading: NEXUS VYOMA + Layered GRAND COUNTDOWN */}
      <div className="relative flex flex-col items-center justify-center w-full max-w-3xl mx-auto pt-2">
        {/* Dominant Artwork Core */}
        <div className="w-full max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl flex items-center justify-center">
          <Image
            src={nexusWordmarkTexture}
            alt="Nexus Vyoma"
            priority
            unoptimized
            className="w-full h-auto object-contain select-none filter drop-shadow-[0_4px_25px_rgba(0,0,0,0.85)]"
          />
        </div>

        {/* Layered Bold Italic Display Title */}
        <div className="relative z-20 mt-3 sm:mt-5 md:mt-6 flex items-center justify-center gap-2 sm:gap-4 transform -rotate-1">
          <Spark size={18} color="#FF6A00" className="hidden sm:inline-block" />
          <span
            className="font-display font-black italic tracking-wide text-white uppercase text-2xl sm:text-4xl md:text-5xl lg:text-6xl"
            style={{
              textShadow:
                '0 4px 18px rgba(0, 0, 0, 0.95), 0 0 25px rgba(255, 106, 0, 0.45)',
            }}
          >
            The Countdown Begins. The Excitement Builds. 
          </span>
          <Spark size={18} color="#FBB03B" className="hidden sm:inline-block" />
        </div>
      </div>

      {/* 03 — Concise Supporting Text */}
      <p className="font-sans text-sm sm:text-base md:text-lg text-zinc-300 tracking-normal leading-relaxed max-w-2xl mx-auto px-3 my-2 sm:my-3">
        Registrations and event enrolments go live on{' '}
        <span className="whitespace-nowrap text-[#FF6A00] font-semibold">31 October 2026, 6:00 PM</span>. Get ready for three days of technology, culture and unforgettable experiences.
      </p>

      {/* 04 — Countdown Display: Exact Vapor Countdown Matching Reference */}
      <div className="relative w-full flex flex-col items-center justify-center py-5 sm:py-8 md:py-10 my-1 sm:my-2 overflow-x-clip">

        {mounted ? (
          <VaporCountdown
            targetDate={TARGET_TIME}
            labels={['DAYS', 'HOURS', 'MINUTES', 'SECONDS']}
          />
        ) : (
          <div className="inline-grid grid-cols-4 gap-x-4 sm:gap-x-10 text-center text-3xl sm:text-5xl md:text-6xl font-sans font-semibold text-zinc-400 opacity-40">
            <div>00</div>
            <div>00</div>
            <div>00</div>
            <div>00</div>
          </div>
        )}
      </div>

      {/* 04b — Tagline Beneath the Timer */}
      <div className="font-condensed font-bold text-xs sm:text-sm md:text-base uppercase tracking-wider text-white flex items-center justify-center gap-2 pt-2 pb-1 sm:py-2">
        <Flame className="w-4 h-4 text-[#FF6A00] fill-[#FF6A00] shrink-0" />
        <span>10 Days. Exclusive Offers. Unforgettable Experiences!
</span>
      </div>

      {/* 05 — Promotional Highlight: Distinctive Bordered Banner */}
      <div className="w-full max-w-3xl rounded-xl border border-[#FF6A00]/70 bg-gradient-to-r from-[#FF6A00]/15 via-[#D8182B]/15 to-[#FF6A00]/15 px-4 sm:px-6 py-4 sm:py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 my-2 sm:my-4 shadow-[0_0_20px_rgba(255,106,0,0.15)]">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="w-8 h-8 rounded-lg border border-[#FF6A00]/40 bg-[#FF6A00]/15 flex items-center justify-center shrink-0 mx-auto sm:mx-0">
            <Ticket className="w-4 h-4 text-[#FFA040]" />
          </div>
          <div>
            <span className="block font-condensed font-bold text-xs sm:text-sm uppercase tracking-wider text-[#FFA040]">
              OFFER LAUNCH
            </span>
            <span className="font-condensed text-xs text-zinc-300 uppercase">
              Online Registrations &bull; Arena Passes &bull; Flagship Battles
            </span>
          </div>
        </div>
        <div className="w-full sm:w-auto font-condensed font-black text-base sm:text-xl text-white uppercase whitespace-nowrap tracking-tight border-t sm:border-t-0 sm:border-l border-white/20 pt-2.5 sm:pt-0 sm:pl-5 text-center sm:text-right">
          31 OCTOBER 2026 &bull; 6:00 PM
        </div>
      </div>
        
      {/* 06 — Compact Event Details with Geometric Diamond Separator */}
      <div className="w-full max-w-3xl flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-6 font-condensed text-xs sm:text-sm text-zinc-300 my-2 sm:my-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
            <Calendar className="w-3.5 h-3.5 text-[#FF6A00]" />
          </div>
          <span className="text-zinc-500 font-medium uppercase">DATES:</span>
          <span className="font-bold text-white uppercase tracking-wider">10–12 NOV 2026</span>
        </div>

        <span className="hidden sm:inline text-zinc-600 font-bold text-[10px]">◆</span>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
            <MapPin className="w-3.5 h-3.5 text-[#FF6A00]" />
          </div>
          <span className="text-zinc-500 font-medium uppercase">VENUE:</span>
          <span className="font-bold text-white uppercase tracking-wider whitespace-nowrap">
            ISL Engineering College, Hyderabad
          </span>
        </div>
      </div>

      {/* 07 — Navigation Actions & Support Contact */}
      <div className="pt-2 sm:pt-3 flex flex-col items-center gap-3.5 w-full">
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5">
          <Link
            href="/"
            className="min-h-[44px] inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-xs sm:text-sm font-condensed font-bold tracking-wider text-zinc-300 hover:text-white transition-colors uppercase outline-none focus-visible:ring-1 focus-visible:ring-white touch-manipulation"
          >
            <span>&larr;</span> Back to Home
          </Link>
          <Link
            href="/organizers"
            className="min-h-[44px] inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-xs sm:text-sm font-condensed font-bold tracking-wider text-zinc-300 hover:text-white transition-colors uppercase outline-none focus-visible:ring-1 focus-visible:ring-white touch-manipulation"
          >
            Meet Organizers
          </Link>
          <Link
            href="/contact"
            className="min-h-[44px] inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-full border border-[#FF6A00]/60 bg-[#FF6A00]/20 hover:bg-[#FF6A00]/30 text-xs sm:text-sm font-condensed font-bold tracking-wider text-[#FFA040] hover:text-white transition-colors uppercase outline-none focus-visible:ring-1 focus-visible:ring-[#FF6A00] shadow-[0_0_15px_rgba(255,106,0,0.2)] touch-manipulation"
          >
            Contact Us <span>&rarr;</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
