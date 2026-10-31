'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import UserGreetingRolling from './UserGreetingRolling';

export interface SerializedEvent {
  _id: string;
  title: string;
  short_description?: string;
  long_description?: string;
  venue?: string;
  date_time?: string;
  image_url?: string;
  entry_fee?: number;
  participants_type?: 'individual' | 'team';
  team_size?: number;
  min_team_size?: number;
  max_team_size?: number;
  category?: string;
  isTechEvent?: boolean;
  isSoldOut?: boolean;
}

export interface TeamMemberInfo {
  name?: string;
  email: string;
  phone?: string;
}

export interface SerializedEnrolledEvent {
  _id: string;
  event_title: string;
  event_id: string;
  participation_type: 'individual' | 'team';
  team_name?: string | null;
  team_leader_name?: string | null;
  team_leader_email?: string | null;
  team_leader_phone?: string | null;
  team_size?: number | null;
  team_members?: string[];
  team_member_details?: TeamMemberInfo[];
  event_details?: SerializedEvent | null;
}

export interface VerifiedMember {
  email: string;
  name?: string;
  phone?: string;
}

interface EventEnrollmentViewProps {
  userName: string;
  userEmail: string;
  initialPurchasedEvents: SerializedEnrolledEvent[];
  initialFreeEvents: SerializedEvent[];
  initialTechEvents: SerializedEvent[];
}

// ---------------------------------------------------------------------------
// Reusable Sub-Component: EnrollableEventSection
// Architectural, dark-mode festival section with mobile-first card carousels
// ---------------------------------------------------------------------------

interface EnrollableEventSectionProps {
  title: string;
  subtitle: string;
  accent: 'purple' | 'navy';
  events: SerializedEvent[];
  enrollingId: string | null;
  onEnroll: (event: SerializedEvent) => void;
}

const EnrollableEventSection = React.memo(function EnrollableEventSection({
  title,
  subtitle,
  accent,
  events,
  enrollingId,
  onEnroll,
}: EnrollableEventSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const isRose = accent === 'purple';

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = 340;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -amount : amount,
        behavior: 'smooth',
      });
      setTimeout(checkScroll, 350);
    }
  };

  useEffect(() => {
    const timer = setTimeout(checkScroll, 150);
    const handleResize = () => checkScroll();
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, events.length, checkScroll]);

  // Luxe Palette: Hot Magenta Rose (#FF207D) vs Electric Azure (#0066FF) on Obsidian Noir
  const sectionBorder = isRose ? 'border-[#FF207D]/25' : 'border-[#0066FF]/25';
  const sectionBg = isRose ? 'bg-[#0B0508]' : 'bg-[#050811]';
  const dotColor = isRose
    ? 'bg-[#FF207D] shadow-[0_0_8px_rgba(255,32,125,0.7)]'
    : 'bg-[#0066FF] shadow-[0_0_8px_rgba(0,102,255,0.7)]';
  const cardBg = isRose
    ? 'bg-[#10070B] hover:bg-[#150A10]'
    : 'bg-[#070B16] hover:bg-[#0B101E]';
  const cardBorder = isRose
    ? 'border-[#38111E] hover:border-[#6B1B38]'
    : 'border-[#122240] hover:border-[#1F3D73]';
  const cardTopStripe = isRose
    ? 'bg-gradient-to-r from-transparent via-[#FF207D] to-transparent'
    : 'bg-gradient-to-r from-transparent via-[#0066FF] to-transparent';
  const btnStyle = isRose
    ? 'bg-[#200B14] hover:bg-[#2D0F1C] text-[#FFD6E5] hover:text-white border border-[#6B1B38] hover:border-[#FF207D]/80 shadow-[0_0_15px_rgba(255,32,125,0.12)]'
    : 'bg-[#0B152A] hover:bg-[#101F3D] text-[#D8E6FF] hover:text-white border border-[#1E4380] hover:border-[#0066FF]/80 shadow-[0_0_15px_rgba(0,102,255,0.12)]';

  return (
    <section className="flex flex-col gap-4">
      <div className={`rounded-xl border ${sectionBorder} ${sectionBg} transition-colors overflow-hidden shadow-xl`}>
        {/* Section Header Bar */}
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 cursor-pointer select-none"
        >
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-sm shrink-0 ${dotColor}`} />
                <h3 className="font-subheading font-bold text-base sm:text-lg text-white uppercase tracking-wider">
                  {title}
                </h3>
              </div>
              <span className={`text-[11px] font-mono tracking-wider font-semibold ${isRose ? 'text-[#FF70A5]' : 'text-[#5295FF]'}`}>
                {events.length} {events.length === 1 ? 'EVENT' : 'EVENTS'} AVAILABLE
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-sans line-clamp-1">
              {subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {events.length > 0 && (
              <div className="hidden sm:flex items-center gap-1 mr-2 border-r border-white/[0.08] pr-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleScroll('left');
                  }}
                  disabled={!canScrollLeft}
                  aria-label="Scroll left"
                  className="w-7 h-7 rounded border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-zinc-300 hover:text-white flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleScroll('right');
                  }}
                  disabled={!canScrollRight}
                  aria-label="Scroll right"
                  className="w-7 h-7 rounded border border-white/[0.18] bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
              aria-label={isOpen ? 'Collapse section' : 'Expand section'}
              className="w-8 h-8 rounded border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Expandable Carousel Content */}
        <div
          className={`grid transition-all duration-300 ease-in-out ${
            isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden">
            <div className="p-4 sm:p-5 pt-3 border-t border-white/[0.06] flex flex-col gap-4 bg-white/[0.01]">
              {events.length === 0 ? (
                <div className="w-full p-6 sm:p-8 rounded-lg border border-white/[0.08] bg-white/[0.02] text-zinc-400 font-mono text-xs text-center flex flex-col items-center justify-center gap-1.5">
                  <span className="font-bold text-white uppercase tracking-wider">
                    ALL {title} ENROLLED
                  </span>
                  <span className="text-zinc-500">
                    You have secured registration in every competition in this category. View your credentials in Purchased Events above.
                  </span>
                </div>
              ) : (
                <div className="relative group/scroll">
                  <div
                    ref={scrollRef}
                    onScroll={checkScroll}
                    className="flex flex-row items-stretch gap-4 overflow-x-auto scroll-smooth pb-4 pt-1 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 scrollbar-track-white/[0.02]"
                  >
                    {events.map((ev) => {
                      const isTeam = ev.participants_type === 'team';
                      const isSoldOut = Boolean(ev.isSoldOut);
                      const isEnrollingThis = enrollingId === ev._id;

                      return (
                        <div
                          key={ev._id}
                          className={`relative w-[84vw] max-w-[320px] sm:w-[330px] shrink-0 rounded-lg border ${cardBorder} ${cardBg} transition-all duration-200 p-4 sm:p-5 flex flex-col justify-between gap-4 group overflow-hidden shadow-lg`}
                        >
                          {/* Top 1.5px Hairline */}
                          <div
                            className={`absolute inset-x-0 top-0 h-[1.5px] ${cardTopStripe}`}
                            aria-hidden="true"
                          />

                          {/* Card Upper: Technical Header */}
                          <div className="flex flex-col gap-2.5">
                            <div className="flex items-center justify-between text-[10px] font-mono border-b border-white/[0.06] pb-2">
                              <span className={`font-bold uppercase tracking-wider ${isRose ? 'text-[#FF8CB4]' : 'text-[#70A8FF]'}`}>
                                {isTeam ? 'SQUAD ARENA' : 'SOLO COMPETITION'}
                              </span>
                              <span className="text-zinc-400 font-medium tracking-wider">
                                INCLUDED WITH PASS
                              </span>
                            </div>

                            {/* Event Title */}
                            <div className="flex flex-col gap-1 min-w-0">
                              <h4 className="font-subheading font-bold text-base sm:text-lg text-white uppercase tracking-wide leading-snug line-clamp-2 break-words group-hover:text-zinc-100 transition-colors">
                                {ev.title}
                              </h4>
                              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                                {ev.short_description || 'Official college fest competition. Certificates and accolades awarded to participants.'}
                              </p>
                            </div>

                            {/* Practical Metadata */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-zinc-400 pt-1">
                              {ev.venue && (
                                <span className="text-zinc-300 truncate max-w-[130px]">
                                  📍 {ev.venue}
                                </span>
                              )}
                              {ev.date_time && (
                                <span className="text-zinc-400">
                                  📅 {ev.date_time}
                                </span>
                              )}
                              {isTeam && (
                                <span className="text-zinc-400">
                                  👥 {ev.min_team_size && ev.max_team_size ? `${ev.min_team_size}–${ev.max_team_size}` : ev.team_size || 2} members
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action CTA Button */}
                          <div className="pt-2 border-t border-white/[0.06]">
                            <button
                              type="button"
                              disabled={isEnrollingThis || isSoldOut}
                              onClick={() => onEnroll(ev)}
                              className={`w-full py-2.5 px-4 rounded font-mono text-xs font-bold uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md min-h-[44px] ${btnStyle}`}
                            >
                              {isEnrollingThis ? (
                                <>
                                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                  <span>Enrolling...</span>
                                </>
                              ) : isSoldOut ? (
                                <span>SOLD OUT</span>
                              ) : isTeam ? (
                                <span className="flex items-center gap-1.5">
                                  <span>REGISTER SQUAD</span>
                                  <span className="text-sm">&rarr;</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5">
                                  <span>ENROLL SOLO</span>
                                  <span className="text-sm">&rarr;</span>
                                </span>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

// ---------------------------------------------------------------------------
// Main View: EventEnrollmentView
// ---------------------------------------------------------------------------

export default function EventEnrollmentView({
  userName,
  userEmail,
  initialPurchasedEvents,
  initialFreeEvents,
  initialTechEvents,
}: EventEnrollmentViewProps) {
  const router = useRouter();

  // Primary State
  const [purchasedEvents, setPurchasedEvents] = useState<SerializedEnrolledEvent[]>(initialPurchasedEvents);
  const [freeEvents, setFreeEvents] = useState<SerializedEvent[]>(initialFreeEvents);
  const [techEvents, setTechEvents] = useState<SerializedEvent[]>(initialTechEvents);

  // Status & UI States
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [enrollingEventId, setEnrollingEventId] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Modals
  const [viewSquadTeamEvent, setViewSquadTeamEvent] = useState<SerializedEnrolledEvent | null>(null);
  const [freeTeamModalEvent, setFreeTeamModalEvent] = useState<SerializedEvent | null>(null);
  const [modalTeamName, setModalTeamName] = useState('');
  const [modalPendingEmail, setModalPendingEmail] = useState('');
  const [modalVerifiedMembers, setModalVerifiedMembers] = useState<VerifiedMember[]>([]);
  const [modalVerifying, setModalVerifying] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Horizontal scroll controls for Purchased Events
  const paidScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeftPaid, setCanScrollLeftPaid] = useState(false);
  const [canScrollRightPaid, setCanScrollRightPaid] = useState(false);

  const checkPaidScroll = useCallback(() => {
    if (paidScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = paidScrollRef.current;
      setCanScrollLeftPaid(scrollLeft > 10);
      setCanScrollRightPaid(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  const scrollPaid = (direction: 'left' | 'right') => {
    if (paidScrollRef.current) {
      const amount = 340;
      paidScrollRef.current.scrollBy({
        left: direction === 'left' ? -amount : amount,
        behavior: 'smooth',
      });
      setTimeout(checkPaidScroll, 350);
    }
  };

  useEffect(() => {
    const timer = setTimeout(checkPaidScroll, 150);
    const handleResize = () => checkPaidScroll();
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [purchasedEvents.length, checkPaidScroll]);

  // Modal Handlers
  const openFreeTeamModal = (event: SerializedEvent) => {
    setFreeTeamModalEvent(event);
    setModalTeamName('');
    setModalPendingEmail('');
    setModalVerifiedMembers([]);
    setModalError(null);
  };

  const closeFreeTeamModal = () => {
    setFreeTeamModalEvent(null);
    setModalTeamName('');
    setModalPendingEmail('');
    setModalVerifiedMembers([]);
    setModalError(null);
  };

  // Teammate verification via POST /api/enrollement/check-team-email
  const handleVerifyModalMember = async () => {
    if (!freeTeamModalEvent) return;
    const email = modalPendingEmail.trim().toLowerCase();
    setModalError(null);

    if (!email) {
      setModalError('Please enter a teammate email.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setModalError('Please enter a valid email format.');
      return;
    }
    if (email === userEmail.toLowerCase()) {
      setModalError('You are already registered as Team Leader. Enter your teammate’s email.');
      return;
    }
    if (modalVerifiedMembers.some((m) => m.email.toLowerCase() === email)) {
      setModalError('This teammate is already added.');
      return;
    }
    const maxTeammates = Math.max(
      0,
      (freeTeamModalEvent.max_team_size ?? freeTeamModalEvent.team_size ?? 2) - 1
    );
    if (modalVerifiedMembers.length >= maxTeammates) {
      setModalError(`Maximum squad size reached (${maxTeammates + 1} members total).`);
      return;
    }

    setModalVerifying(true);
    try {
      const res = await fetch('/api/enrollement/check-team-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const result = await res.json().catch(() => null);
      if (res.ok && res.status === 200) {
        setModalVerifiedMembers((prev) => [
          ...prev,
          {
            email,
            name: result?.data?.name || email.split('@')[0],
            phone: result?.data?.phone || '',
          },
        ]);
        setModalPendingEmail('');
      } else {
        setModalError(
          result?.message || 'Teammate email not found or has not purchased an Entry Pass yet.'
        );
      }
    } catch {
      setModalError('Network error checking teammate email. Please try again.');
    } finally {
      setModalVerifying(false);
    }
  };

  const handleRemoveModalMember = (email: string) => {
    setModalVerifiedMembers((prev) => prev.filter((m) => m.email !== email));
  };

  // Team Enrolment submission via POST /api/enrollement/enrolled-event
  const handleConfirmFreeTeamEnrollment = async () => {
    if (!freeTeamModalEvent) return;
    const trimmedName = modalTeamName.trim();
    if (!trimmedName) {
      setModalError('Please enter a team name.');
      return;
    }
    const minTeammates = Math.max(0, (freeTeamModalEvent.min_team_size ?? 2) - 1);
    if (modalVerifiedMembers.length < minTeammates) {
      setModalError(
        `This competition requires at least ${minTeammates} teammate(s). Currently added: ${modalVerifiedMembers.length}.`
      );
      return;
    }

    setModalError(null);
    setEnrollingEventId(freeTeamModalEvent._id);

    try {
      const res = await fetch('/api/enrollement/enrolled-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: freeTeamModalEvent._id,
          teamName: trimmedName,
          teamEmails: modalVerifiedMembers.map((m) => m.email),
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setModalError(json?.message || 'Failed to enroll squad in this event.');
        return;
      }

      const enrolledDoc = json?.data;
      const newFreeTeam: SerializedEnrolledEvent = {
        _id: String(enrolledDoc?._id || `team-${freeTeamModalEvent._id}-${Date.now()}`),
        event_id: freeTeamModalEvent._id,
        event_title: freeTeamModalEvent.title,
        participation_type: 'team',
        team_name: trimmedName,
        team_leader_name: userName,
        team_leader_email: userEmail,
        team_size: modalVerifiedMembers.length + 1,
        team_members: modalVerifiedMembers.map((m) => m.email),
        team_member_details: modalVerifiedMembers,
        event_details: freeTeamModalEvent,
      };

      // Update state: Add to purchased, remove from available sections
      setPurchasedEvents((prev) => [
        ...prev.filter((e) => e.event_id !== freeTeamModalEvent._id),
        newFreeTeam,
      ]);
      setFreeEvents((prev) => prev.filter((e) => e._id !== freeTeamModalEvent._id));
      setTechEvents((prev) => prev.filter((e) => e._id !== freeTeamModalEvent._id));

      setFeedbackSuccess(`Squad "${trimmedName}" successfully enrolled in ${freeTeamModalEvent.title}!`);
      closeFreeTeamModal();
    } catch {
      setModalError('Network error while enrolling team. Please try again.');
    } finally {
      setEnrollingEventId(null);
    }
  };

  // Individual Enrolment submission via POST /api/enrollement/enrolled-event
  const handleEnrollEvent = async (event: SerializedEvent) => {
    const isTeam = event.participants_type === 'team';

    if (isTeam) {
      openFreeTeamModal(event);
    } else {
      setEnrollingEventId(event._id);
      setFeedbackError(null);

      try {
        const res = await fetch('/api/enrollement/enrolled-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: event._id,
          }),
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          setFeedbackError(json?.message || `Failed to enroll in ${event.title}.`);
          return;
        }

        const enrolledDoc = json?.data;
        const newEnrolled: SerializedEnrolledEvent = {
          _id: String(enrolledDoc?._id || `ind-${event._id}-${Date.now()}`),
          event_id: event._id,
          event_title: event.title,
          participation_type: 'individual',
          event_details: event,
        };

        // Update state: Add to purchased, remove from available sections
        setPurchasedEvents((prev) => [
          ...prev.filter((e) => e.event_id !== event._id),
          newEnrolled,
        ]);
        setFreeEvents((prev) => prev.filter((e) => e._id !== event._id));
        setTechEvents((prev) => prev.filter((e) => e._id !== event._id));

        setFeedbackSuccess(`Successfully enrolled in ${event.title}!`);
      } catch {
        setFeedbackError(`Network error while enrolling in ${event.title}.`);
      } finally {
        setEnrollingEventId(null);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/registration/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    document.cookie = 'nv-session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'nv-session-temp=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    router.push('/register/check-email');
    router.refresh();
  };

  const totalPurchasedCount = purchasedEvents.length;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-10 text-white pb-20">
      {/* 01 — Top Greeting & Navigation */}
      <div className="flex flex-col gap-3 pt-2">
        <div>
          <Link
            href="/packages"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-mono text-zinc-400 hover:text-white transition-colors group cursor-pointer"
          >
            <svg
              className="w-4 h-4 transition-transform group-hover:-translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Packages</span>
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <UserGreetingRolling userName={userName} />

          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-subheading font-medium tracking-wider uppercase text-red-400 hover:text-red-300 transition-colors cursor-pointer shrink-0 min-h-[44px] py-1"
          >
            <span>Log out</span>
            <svg
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-current"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-white/[0.12] bg-[#090C16] p-6 flex flex-col gap-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1.5 text-center">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-400 mx-auto flex items-center justify-center mb-1 border border-red-500/20">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 id="logout-dialog-title" className="font-subheading font-medium text-lg text-white">
                Log Out Confirmation
              </h3>
              <p className="text-xs text-zinc-400">
                Are you sure you want to log out of your festival session?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="py-2.5 px-4 rounded-lg text-xs font-mono font-medium uppercase tracking-wider text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="py-2.5 px-4 rounded-lg text-xs font-mono font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-500 transition-all cursor-pointer shadow-md"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Squad Enrollment Modal */}
      {freeTeamModalEvent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="free-team-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={closeFreeTeamModal}
        >
          <div
            className="w-full max-w-md rounded-xl border border-white/[0.12] bg-[#0A0A0E] p-5 sm:p-6 flex flex-col gap-5 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-mono text-zinc-300 uppercase tracking-widest font-bold">
                  SQUAD REGISTRATION
                </span>
                <h3 id="free-team-dialog-title" className="font-subheading font-medium text-base sm:text-lg text-white">
                  {freeTeamModalEvent.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeFreeTeamModal}
                className="w-8 h-8 rounded border border-white/[0.1] bg-white/[0.03] text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                &times;
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-300 mb-1.5">
                  Squad / Team Name <span className="text-[#FF207D]">*</span>
                </label>
                <input
                  type="text"
                  value={modalTeamName}
                  onChange={(e) => setModalTeamName(e.target.value)}
                  placeholder="e.g. Cyber Dragons"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#111116] border border-white/[0.12] text-white text-xs font-mono focus:border-[#FF207D] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-300 mb-1.5">
                  Leader (You)
                </label>
                <div className="px-3.5 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-xs font-mono text-zinc-400 flex items-center justify-between">
                  <span>{userName} ({userEmail})</span>
                  <span className="text-[10px] font-mono text-zinc-300 uppercase tracking-wider font-bold">Leader</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-300">
                    Add Teammates
                  </label>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Need {Math.max(0, (freeTeamModalEvent.min_team_size ?? 2) - 1)} to{' '}
                    {Math.max(0, (freeTeamModalEvent.max_team_size ?? freeTeamModalEvent.team_size ?? 2) - 1)} teammates
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="email"
                    value={modalPendingEmail}
                    onChange={(e) => setModalPendingEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleVerifyModalMember();
                      }
                    }}
                    placeholder="Teammate's pass email"
                    className="flex-1 px-3.5 py-2 rounded-lg bg-[#111116] border border-white/[0.12] text-white text-xs font-mono focus:border-[#FF207D] focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    disabled={modalVerifying || !modalPendingEmail.trim()}
                    onClick={handleVerifyModalMember}
                    className="px-4 py-2 rounded-lg bg-[#200B14] hover:bg-[#2D0F1C] text-[#FFD6E5] border border-[#6B1B38] text-xs font-mono font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    {modalVerifying ? (
                      <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>+ Verify</span>
                    )}
                  </button>
                </div>

                {modalError && (
                  <p className="text-[11px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                    {modalError}
                  </p>
                )}

                {modalVerifiedMembers.length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-1">
                    <span className="text-[10px] font-mono uppercase text-zinc-400">
                      Verified Squad Members ({modalVerifiedMembers.length}):
                    </span>
                    {modalVerifiedMembers.map((m) => (
                      <div
                        key={m.email}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#14080F] border border-[#38111E] text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-sm bg-[#FF207D]" />
                          <span className="text-white font-medium">{m.name}</span>
                          <span className="text-zinc-400 text-[11px]">({m.email})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveModalMember(m.email)}
                          className="text-zinc-400 hover:text-red-400 transition-colors cursor-pointer text-sm"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={closeFreeTeamModal}
                className="py-2.5 px-4 rounded-lg text-xs font-mono font-medium uppercase tracking-wider text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={enrollingEventId !== null}
                onClick={handleConfirmFreeTeamEnrollment}
                className="py-2.5 px-4 rounded-lg text-xs font-mono font-bold uppercase tracking-wider text-white bg-gradient-to-r from-[#FF207D] to-[#D8182B] hover:opacity-95 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(255,32,125,0.3)]"
              >
                {enrollingEventId ? 'Enrolling...' : 'Confirm Squad'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Squad Modal (Inspecting Purchased Team Event) */}
      {viewSquadTeamEvent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-squad-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setViewSquadTeamEvent(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-white/[0.12] bg-[#0A0A0E] p-6 flex flex-col gap-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-mono text-zinc-300 uppercase tracking-widest font-bold">
                  REGISTERED SQUAD
                </span>
                <h3 id="view-squad-title" className="font-subheading font-medium text-lg text-white">
                  {viewSquadTeamEvent.team_name || 'Team Squad'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewSquadTeamEvent(null)}
                className="w-8 h-8 rounded border border-white/[0.1] bg-white/[0.03] text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                &times;
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="text-xs font-mono text-zinc-400">
                Event: <span className="text-white font-medium">{viewSquadTeamEvent.event_title}</span>
              </div>
              <div className="text-xs font-mono text-zinc-400">
                Team Leader:{' '}
                <span className="text-white font-medium">
                  {viewSquadTeamEvent.team_leader_name || userName} ({viewSquadTeamEvent.team_leader_email || userEmail})
                </span>
              </div>

              {Array.isArray(viewSquadTeamEvent.team_members) &&
                viewSquadTeamEvent.team_members.length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                      Teammates ({viewSquadTeamEvent.team_members.length}):
                    </span>
                    {viewSquadTeamEvent.team_members.map((email, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs font-mono text-zinc-300"
                      >
                        <span className="w-1.5 h-1.5 rounded-sm bg-white" />
                        <span>{email}</span>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            <button
              type="button"
              onClick={() => setViewSquadTeamEvent(null)}
              className="w-full py-2.5 rounded-lg text-xs font-mono font-medium uppercase tracking-wider text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Global Toast Feedback Banners */}
      {feedbackError && (
        <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-800/40 text-red-300 font-mono text-xs flex items-center justify-between">
          <span>{feedbackError}</span>
          <button
            type="button"
            onClick={() => setFeedbackError(null)}
            className="text-red-400 hover:text-white cursor-pointer ml-3 font-bold"
          >
            &times;
          </button>
        </div>
      )}
      {feedbackSuccess && (
        <div className="p-3.5 rounded-lg bg-[#08101E] border border-[#1E4380] text-[#DCE8FF] font-mono text-xs flex items-center justify-between shadow-[0_0_15px_rgba(0,102,255,0.1)]">
          <span>{feedbackSuccess}</span>
          <button
            type="button"
            onClick={() => setFeedbackSuccess(null)}
            className="text-[#70A8FF] hover:text-white cursor-pointer ml-3 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* 02 — Purchased Events Section (Platinum Noir & Smoked Titanium) */}
      <section className="w-full flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-sm bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            <h2 className="text-base sm:text-lg font-subheading font-bold uppercase tracking-wider text-white">
              Purchased Events
            </h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {(canScrollLeftPaid || canScrollRightPaid) && (
              <div className="hidden sm:flex items-center gap-1 pr-2 border-r border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => scrollPaid('left')}
                  disabled={!canScrollLeftPaid}
                  aria-label="Scroll left"
                  className="w-7 h-7 rounded border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-zinc-300 hover:text-white flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => scrollPaid('right')}
                  disabled={!canScrollRightPaid}
                  aria-label="Scroll right"
                  className="w-7 h-7 rounded border border-white/[0.18] bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
            <span className="text-xs font-mono text-zinc-300 font-bold px-3 py-1 rounded border border-white/[0.12] bg-white/[0.04] uppercase tracking-wider whitespace-nowrap">
              {totalPurchasedCount} {totalPurchasedCount === 1 ? 'PASS ACTIVE' : 'PASSES ACTIVE'}
            </span>
          </div>
        </div>

        {totalPurchasedCount === 0 ? (
          <div className="w-full p-8 rounded-lg border border-white/[0.1] bg-[#0A0A0E] text-zinc-400 font-mono text-xs sm:text-sm text-center">
            No active event credentials yet. Browse and enroll in available events below.
          </div>
        ) : (
          <div className="relative group/paidscroll">
            <div
              ref={paidScrollRef}
              onScroll={checkPaidScroll}
              className="flex flex-row items-stretch gap-4 overflow-x-auto scroll-smooth pb-4 pt-1 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 scrollbar-track-white/[0.02]"
            >
              {purchasedEvents.map((enrolled) => {
                const isTeam = enrolled.participation_type === 'team';
                const details = enrolled.event_details;

                return (
                  <div
                    key={enrolled._id}
                    className="relative w-[84vw] max-w-[320px] sm:w-[330px] shrink-0 rounded-lg border border-white/[0.12] bg-[#0C0C10] hover:border-white/[0.25] hover:bg-[#111116] transition-all duration-200 p-4 sm:p-5 flex flex-col justify-between gap-4 group overflow-hidden shadow-xl"
                  >
                    {/* Top Specular Platinum Hairline */}
                    <div
                      className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent"
                      aria-hidden="true"
                    />

                    {/* Card Upper: Pass Status & Pricing (NO location, date, or time) */}
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between text-[10px] font-mono border-b border-white/[0.06] pb-2">
                        <span className="tracking-widest uppercase text-zinc-200 font-semibold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-sm bg-white shadow-[0_0_6px_rgba(255,255,255,0.7)]" />
                          PASS ACTIVE
                        </span>

                        <span className="font-semibold text-white tracking-wider">
                          {details?.entry_fee && details.entry_fee > 0 ? `₹${details.entry_fee}` : 'INCLUDED'}
                        </span>
                      </div>

                      {/* Event Title */}
                      <div className="flex flex-col gap-1 min-w-0">
                        <h3 className="font-subheading font-bold text-base sm:text-lg text-white uppercase tracking-wide leading-snug line-clamp-2 break-words group-hover:text-zinc-100">
                          {enrolled.event_title}
                        </h3>

                        {isTeam ? (
                          <span className="text-[10px] font-mono tracking-wider uppercase text-zinc-400 truncate">
                            Squad: <strong className="text-zinc-200 font-semibold">{enrolled.team_name || 'Team Squad'}</strong>
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono tracking-wider uppercase text-zinc-400">
                            SOLO PARTICIPANT
                          </span>
                        )}

                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed pt-0.5">
                          {details?.short_description || 'Official Nexus Vyoma registration verified and active.'}
                        </p>
                      </div>
                    </div>

                    {/* Card Footer: Official Purchased Status */}
                    <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-white/[0.06] text-[11px] font-mono">
                      {isTeam ? (
                        <>
                          <span className="flex items-center gap-1.5 font-bold tracking-wider text-emerald-400 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
                            PAID SQUAD
                          </span>

                          <button
                            type="button"
                            onClick={() => setViewSquadTeamEvent(enrolled)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/[0.18] bg-white/[0.06] hover:bg-white/[0.12] text-zinc-100 text-[10.5px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 shadow-sm min-h-[36px]"
                          >
                            <span>View Squad ({enrolled.team_size || (enrolled.team_members?.length ? enrolled.team_members.length + 1 : 2)})</span>
                            <span className="text-xs">&rarr;</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="flex items-center gap-1.5 font-bold tracking-wider text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
                            PURCHASED
                          </span>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                            OFFICIAL ENTRY
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* 03 — Cultural Events Enrollment Section (Hot Magenta Rose Theme) */}
      <EnrollableEventSection
        title="CULTURAL & CREATIVE EVENTS"
        subtitle="Included with your fest entry pass. Select events to secure your individual or squad spot."
        accent="purple"
        events={freeEvents}
        enrollingId={enrollingEventId}
        onEnroll={handleEnrollEvent}
      />

      {/* 04 — Tech Events Enrollment Section (Electric Azure Theme) */}
      <EnrollableEventSection
        title="TECH EVENTS & BATTLES"
        subtitle="Competitive technical arenas, tournaments, and hackathons. Lock in your participation."
        accent="navy"
        events={techEvents}
        enrollingId={enrollingEventId}
        onEnroll={handleEnrollEvent}
      />
    </div>
  );
}
