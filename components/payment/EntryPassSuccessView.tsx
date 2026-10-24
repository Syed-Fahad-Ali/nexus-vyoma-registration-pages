'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import {
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Clock,
  MapPin,
} from 'lucide-react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export interface PaidEventSummary {
  id: string;
  slug: string;
  title: string;
  category: string;
  date: string;
  time: string;
  venue: string;
  price: number;
  priceFormatted: string;
  shortDescription: string;
  imageUrl?: string;
  accentColor?: string;
}

export interface EntryPassSuccessViewProps {
  transactionId?: string;
  orderId?: string;
  teamName?: string;
  teamMembers?: string;
  events: PaidEventSummary[];
}

export default function EntryPassSuccessView({
  transactionId,
  orderId,
  teamName,
  teamMembers,
  events,
}: EntryPassSuccessViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const paymentSectionRef = useRef<HTMLDivElement>(null);
  const headingSectionRef = useRef<HTMLDivElement>(null);
  const gridSectionRef = useRef<HTMLDivElement>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // GSAP Animations scoped to this view
  useGSAP(
    () => {
      const container = containerRef.current;
      const paymentSection = paymentSectionRef.current;
      const headingSection = headingSectionRef.current;
      const gridSection = gridSectionRef.current;

      if (!container) return;

      const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (isReduced) {
        if (paymentSection) gsap.set(paymentSection, { opacity: 1, y: 0 });
        if (headingSection) {
          gsap.set(headingSection, { opacity: 1, y: 0 });
          const words = headingSection.querySelectorAll('.headline-word');
          if (words.length > 0) gsap.set(words, { opacity: 1, y: 0 });
        }
        const cards = container.querySelectorAll('.paid-event-card');
        cards.forEach((card) => {
          gsap.set(card, { opacity: 1, y: 0, scale: 1 });
          const items = card.querySelectorAll(
            '.event-poster-image, .category-badge, .event-title, .event-meta, .event-desc, .event-footer'
          );
          if (items.length > 0) gsap.set(items, { opacity: 1, y: 0, scale: 1 });
        });
        return;
      }

      // 1. Payment Confirmation: recedes subtly as the user scrolls into discovery section
      if (paymentSection && gridSection) {
        gsap.to(paymentSection, {
          opacity: 0.7,
          y: -12,
          scrollTrigger: {
            trigger: headingSection || gridSection,
            start: 'top 70%',
            end: 'top 20%',
            scrub: true,
          },
        });
      }

      // 2. Heading Section reveal: word-by-word reveal followed by highlight sweep
      if (headingSection) {
        const words = headingSection.querySelectorAll<HTMLElement>('.headline-word');
        const mainWord = headingSection.querySelector<HTMLElement>('.main-word');
        const characterWord = headingSection.querySelector<HTMLElement>('.character-word');
        const subtitle = headingSection.querySelector('.heading-subtitle');

        const headingTl = gsap.timeline({
          scrollTrigger: {
            trigger: headingSection,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        });

        // Word-by-word staggered reveal
        if (words.length > 0) {
          headingTl.fromTo(
            words,
            { opacity: 0, y: 18 },
            {
              opacity: 1,
              y: 0,
              stagger: 0.07,
              duration: 0.45,
              ease: 'power3.out',
            }
          );
        }

        // Highlight sweep across "MAIN" then "CHARACTER."
        if (mainWord && characterWord) {
          headingTl
            .to(
              mainWord,
              {
                color: '#FFE2CC',
                textShadow:
                  '0 0 32px rgba(255, 140, 40, 0.95), 0 0 50px rgba(255, 106, 0, 0.6)',
                duration: 0.28,
                ease: 'power2.out',
              },
              '+=0.05'
            )
            .to(mainWord, {
              color: '#FF6A00',
              textShadow: '0 0 24px rgba(255, 106, 0, 0.45)',
              duration: 0.4,
              ease: 'power2.in',
            })
            .to(
              characterWord,
              {
                color: '#FFE2CC',
                textShadow:
                  '0 0 32px rgba(255, 140, 40, 0.95), 0 0 50px rgba(255, 106, 0, 0.6)',
                duration: 0.32,
                ease: 'power2.out',
              },
              '<+=0.1'
            )
            .to(characterWord, {
              color: '#FF6A00',
              textShadow: '0 0 24px rgba(255, 106, 0, 0.45)',
              duration: 0.45,
              ease: 'power2.in',
            });
        }

        // Subtitle smooth fade-in
        if (subtitle) {
          headingTl.fromTo(
            subtitle,
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
            '-=0.3'
          );
        }
      }

      // 3. Reveal each card and its internal elements progressively on scroll
      const cards = container.querySelectorAll('.paid-event-card');
      if (cards.length > 0) {
        cards.forEach((card) => {
          const poster = card.querySelector('.event-poster-image');
          const badge = card.querySelector('.category-badge');
          const title = card.querySelector('.event-title');
          const meta = card.querySelector('.event-meta');
          const desc = card.querySelector('.event-desc');
          const footer = card.querySelector('.event-footer');
          const cardItems = [badge, title, meta, desc, footer].filter(Boolean);

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: card,
              start: 'top 88%',
              toggleActions: 'play none none reverse',
            },
          });

          // Card container slide up and fade
          tl.fromTo(
            card,
            { opacity: 0, y: 40 },
            { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
          );

          // Poster scale-down reveal
          if (poster) {
            tl.fromTo(
              poster,
              { scale: 1.08, opacity: 0.85 },
              { scale: 1, opacity: 1, duration: 0.55, ease: 'power2.out' },
              '<0.05'
            );
          }

          // Card elements progressive reveal (badge, title, meta, desc, footer)
          if (cardItems.length > 0) {
            tl.fromTo(
              cardItems,
              { opacity: 0, y: 14 },
              { opacity: 1, y: 0, stagger: 0.05, duration: 0.38, ease: 'power2.out' },
              '<0.08'
            );
          }
        });
      }
    },
    { scope: containerRef, dependencies: [events.length] }
  );

  return (
    <div ref={containerRef} className="w-full flex flex-col items-center">
      {/* =========================================================================
          SECTION 1: COMPACT PAYMENT STATUS (~30% Desktop Viewport)
          ========================================================================= */}
      <section
        ref={paymentSectionRef}
        aria-label="Payment Confirmation"
        className="w-full max-w-3xl mx-auto flex flex-col items-center text-center pt-2 sm:pt-4 pb-8 sm:pb-10 px-4"
      >
        {/* Compact Emerald Glow Icon */}
        <div className="relative mb-3 sm:mb-4 flex items-center justify-center">
          <div
            className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full blur-2xl pointer-events-none bg-emerald-500/20 shadow-[0_0_60px_20px_rgba(16,185,129,0.2)]"
            aria-hidden="true"
          />
          <div className="relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-emerald-500/40 bg-black/60 backdrop-blur-md shadow-[0_0_20px_rgba(16,185,129,0.25)]">
            <CheckCircle2 className="w-8 h-8 sm:w-9 sm:h-9 stroke-[2.25] text-emerald-400" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="font-display uppercase text-2xl sm:text-3xl md:text-4xl tracking-wider text-white mb-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
          Payment Successful
        </h1>

        {/* Confirmation Message */}
        <p className="text-xs sm:text-sm text-zinc-300 max-w-lg mb-3 leading-relaxed">
          Your Nexus Vyoma Entry Pass is confirmed!
        </p>

        {/* Transaction & Order IDs (Compact Inline / Flex Row) */}
        {(transactionId || orderId || teamName || teamMembers) && (
          <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-1.5 mb-3 font-mono text-xs sm:text-sm">
            {transactionId && (
              <div className="flex items-center gap-1.5 text-zinc-300">
                <span className="text-zinc-500 uppercase tracking-wider text-[11px] sm:text-xs">Txn ID:</span>
                <span className="text-white font-medium tracking-wide">{transactionId}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(transactionId, 'txn')}
                  className="ml-0.5 text-zinc-500 hover:text-white transition-colors p-1"
                  title="Copy Transaction ID"
                  aria-label="Copy Transaction ID"
                >
                  {copiedField === 'txn' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            )}

            {orderId && (
              <div className="flex items-center gap-1.5 text-zinc-300">
                <span className="text-zinc-500 uppercase tracking-wider text-[11px] sm:text-xs">Order ID:</span>
                <span className="text-white font-medium tracking-wide">{orderId}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(orderId, 'ord')}
                  className="ml-0.5 text-zinc-500 hover:text-white transition-colors p-1"
                  title="Copy Order ID"
                  aria-label="Copy Order ID"
                >
                  {copiedField === 'ord' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            )}

            {teamName && (
              <div className="flex items-center gap-1.5 text-zinc-300">
                <span className="text-zinc-500 uppercase tracking-wider text-[11px] sm:text-xs">Team:</span>
                <span className="text-white font-medium">{teamName}</span>
              </div>
            )}
            {teamMembers && (
              <div className="flex items-center gap-1.5 text-zinc-300">
                <span className="text-zinc-500 uppercase tracking-wider text-[11px] sm:text-xs">Members:</span>
                <span className="text-white font-medium">{teamMembers}</span>
              </div>
            )}
          </div>
        )}

        {/* Note */}
        <p className="text-[11px] sm:text-xs font-mono text-emerald-400 tracking-wide mb-1">
          <span className="font-bold text-white">NOTE: </span>
          The QR code will be sent to your email soon
        </p>
      </section>

      {/* Decorative Divider */}
      <div className="w-full max-w-4xl mx-auto h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent my-2" />

      {/* =========================================================================
          SECTION 2: PREMIUM PAID EVENTS DISCOVERY (~70% Desktop Viewport)
          ========================================================================= */}
      <section
        id="premium-events"
        aria-label="Premium Experiences"
        className="w-full max-w-6xl mx-auto pt-6 sm:pt-10 pb-16 px-4"
      >
        {/* Section Heading & Supporting Text */}
        <div ref={headingSectionRef} className="text-center mb-8 sm:mb-12">
          <h2 className="font-display uppercase text-2xl sm:text-3xl md:text-5xl tracking-wide leading-tight mb-3">
            <span className="text-white">
              <span className="headline-word inline-block mr-[0.28em]">YOUR</span>
              <span className="headline-word inline-block mr-[0.28em]">ENTRY</span>
              <span className="headline-word inline-block mr-[0.28em]">PASS</span>
              <span className="headline-word inline-block mr-[0.28em]">ISN&apos;T</span>
              <span className="headline-word inline-block mr-[0.28em]">THE</span>
            </span>
            <span className="inline-block text-[1.08em] align-baseline">
              <span
                className="headline-word main-word inline-block text-[#FF6A00] mr-[0.26em]"
                style={{ textShadow: '0 0 24px rgba(255, 106, 0, 0.45)' }}
              >
                MAIN
              </span>
              <span
                className="headline-word character-word inline-block text-[#FF6A00]"
                style={{ textShadow: '0 0 24px rgba(255, 106, 0, 0.45)' }}
              >
                CHARACTER.
              </span>
            </span>
          </h2>

          <p className="heading-subtitle font-sans text-sm sm:text-base md:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Your Entry Pass gets you into the fest. Discover the premium experiences waiting beyond it.
          </p>
        </div>

        {/* 2-Column Grid (2 cards per row on mobile & desktop) */}
        <div
          ref={gridSectionRef}
          className="grid grid-cols-2 gap-2.5 xs:gap-3.5 sm:gap-6 lg:gap-8 w-full"
        >
          {events.map((event, index) => (
            <EventCardItem key={event.id} event={event} index={index} />
          ))}
        </div>

        {/* Bottom Catalog Link */}
        <div className="mt-10 sm:mt-12 text-center">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-mono tracking-wider text-zinc-400 hover:text-[#FF6A00] underline underline-offset-8 transition-colors"
          >
            <span>Looking for technical workshops or free competitions? Browse the full catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function EventCardItem({ event, index }: { event: PaidEventSummary; index: number }) {
  const [hasImageError, setHasImageError] = useState(false);
  const showImage = Boolean(event.imageUrl && !hasImageError);

  return (
    <article className="paid-event-card relative rounded-xl sm:rounded-2xl bg-[#0c0d13]/90 border border-zinc-800/90 hover:border-zinc-700 transition-all duration-300 p-2.5 xs:p-3.5 sm:p-5 md:p-6 flex flex-col justify-between overflow-hidden group shadow-[0_10px_35px_rgba(0,0,0,0.6)] text-left">
      {/* Ambient hover glow */}
      <div
        className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[#FF6A00]/15"
        aria-hidden="true"
      />

      {/* Top Part: Artwork + Header info */}
      <div>
        {/* Full Uncropped Artwork Container (1:1 Aspect Ratio with ambient backdrop) */}
        <Link
          href="/register/enroll-event"
          className="relative block w-full aspect-square rounded-lg sm:rounded-xl overflow-hidden bg-[#10121b] border border-white/[0.08] mb-2 sm:mb-4 outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]"
          title={`Enroll in ${event.title}`}
        >
          {showImage ? (
            <>
              {/* CSS Ambient colored backdrop — high performance, zero image pipeline overhead */}
              <div
                className="absolute inset-0 opacity-25 blur-2xl pointer-events-none select-none transition-opacity duration-500 group-hover:opacity-40"
                style={{
                  background: `radial-gradient(circle at center, ${event.accentColor || '#FF6A00'}99 0%, transparent 75%)`,
                }}
                aria-hidden="true"
              />
              {/* 100% Uncropped sharp poster */}
              <Image
                src={event.imageUrl!}
                alt={event.title}
                fill
                priority={index < 2}
                onError={() => setHasImageError(true)}
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 50vw, 560px"
                className="event-poster-image object-contain relative z-10 transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </>
          ) : (
            <div className="relative w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#161824] via-[#0d0e15] to-[#06070b]">
              <Image
                src="/brand/nexus-emblem-watermark.png"
                alt="Nexus Vyoma Emblem"
                width={70}
                height={70}
                className="opacity-30 object-contain select-none pointer-events-none"
              />
              <span className="font-mono text-[10px] sm:text-xs text-zinc-500 uppercase tracking-widest mt-2">
                Nexus Vyoma Arena
              </span>
            </div>
          )}

          {/* Category Tag Overlay */}
          <div className="category-badge absolute top-2 left-2 sm:top-3 sm:left-3 z-20">
            <span className="inline-block px-1.5 xs:px-2 sm:px-2.5 py-0.5 sm:py-1 rounded bg-black/85 backdrop-blur-md border border-[#FF6A00]/40 font-mono text-[8px] xs:text-[9px] sm:text-xs font-bold uppercase tracking-wider text-[#FF6A00]">
              {event.category}
            </span>
          </div>
        </Link>

        {/* Title */}
        <Link
          href="/register/enroll-event"
          className="block group/title focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00] rounded"
        >
          <h3 className="event-title font-subheading font-bold text-xs xs:text-sm sm:text-xl md:text-2xl text-white uppercase group-hover/title:text-[#FF6A00] transition-colors leading-snug sm:leading-tight line-clamp-2 min-h-[2rem] sm:min-h-0">
            {event.title}
          </h3>
        </Link>

        {/* Schedule & Venue Meta */}
        <div className="event-meta flex flex-wrap items-center gap-x-2 sm:gap-x-4 gap-y-1 text-[10px] xs:text-[11px] sm:text-xs text-zinc-300 font-sans mt-1.5 sm:mt-2.5">
          {event.date && (
            <span className="inline-flex items-center gap-1 text-[#FF6A00] font-medium">
              <Calendar className="w-3 h-3 text-[#FF6A00] shrink-0" />
              <span>{event.date}</span>
            </span>
          )}
          {event.time && (
            <span className="inline-flex items-center gap-1 text-zinc-400">
              <Clock className="w-3 h-3 text-zinc-500 shrink-0" />
              <span>{event.time}</span>
            </span>
          )}
          {event.venue && (
            <span className="inline-flex items-center gap-1 text-zinc-400">
              <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
              <span className="truncate max-w-[110px] sm:max-w-[200px]">{event.venue}</span>
            </span>
          )}
        </div>

        {/* Description */}
        <p className="event-desc text-zinc-400 text-[10px] xs:text-xs sm:text-sm leading-relaxed mt-1.5 sm:mt-3 line-clamp-2">
          {event.shortDescription}
        </p>
      </div>

      {/* Bottom Part: Price & CTA Button */}
      <div className="event-footer border-t border-zinc-800/80 pt-2.5 sm:pt-4 mt-3 sm:mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        <div className="flex flex-row sm:flex-col items-baseline sm:items-start justify-between sm:justify-start">
          <span className="text-[9px] xs:text-[10px] sm:text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
            Price
          </span>
          <span className="font-mono font-bold text-sm xs:text-base sm:text-xl text-white">
            {event.priceFormatted}
          </span>
        </div>

        <Link
          href="/register/enroll-event"
          className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-3 py-1.5 xs:px-3.5 xs:py-2 sm:px-5 sm:py-2.5 rounded-full font-semibold text-[10px] xs:text-xs sm:text-sm text-black bg-[#FF6A00] hover:bg-[#ff7b1a] shadow-[0_0_15px_rgba(255,106,0,0.35)] transition-all duration-200 active:scale-[0.98] w-full sm:w-auto text-center cursor-pointer whitespace-nowrap"
        >
          <span>GET TICKETS</span>
          <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.25]" />
        </Link>
      </div>
    </article>
  );
}
