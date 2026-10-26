'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

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
  participation_type?: 'individual' | 'team';
  team_name?: string | null;
  team_leader_name?: string | null;
  team_leader_email?: string | null;
  team_leader_phone?: string | null;
  team_size?: number | null;
  team_members?: string[];
  team_member_details?: TeamMemberInfo[];
  event_details?: SerializedEvent | null;
}

interface EventEnrollmentViewProps {
  userName: string;
  userEmail: string;
  availableEvents: SerializedEvent[];
  initialIndividualEnrolled: SerializedEnrolledEvent[];
  initialTeamEnrolled: SerializedEnrolledEvent[];
  initialIndividualPending?: SerializedEnrolledEvent[];
  initialTeamPending?: SerializedEnrolledEvent[];
}

export interface VerifiedMember {
  email: string;
  name?: string;
  phone?: string;
  college?: string;
}

export interface SelectedTeamEventState {
  eventId: string;
  teamName: string;
  teamMembers: string[];
  verifiedDetails?: VerifiedMember[];
}

export default function EventEnrollmentView({
  userName,
  userEmail,
  availableEvents,
  initialIndividualEnrolled,
  initialTeamEnrolled,
  initialIndividualPending,
  initialTeamPending,
}: EventEnrollmentViewProps) {
  const router = useRouter();

  // Active Tab: 'individual' | 'team'
  const [activeTab, setActiveTab] = useState<'individual' | 'team'>('individual');

  // Accordion open states for event rows (keyed by unique row id)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Selected Pending Events for Checkout
  const [selectedIndividualIds, setSelectedIndividualIds] = useState<string[]>([]);
  const [selectedTeamEvents, setSelectedTeamEvents] = useState<SelectedTeamEventState[]>([]);

  // Progressive Teammate Verification States
  const [pendingMemberEmail, setPendingMemberEmail] = useState<Record<string, string>>({});
  const [verifyingMember, setVerifyingMember] = useState<Record<string, boolean>>({});
  const [memberError, setMemberError] = useState<Record<string, string | null>>({});
  const [memberStatus, setMemberStatus] = useState<Record<string, 'idle' | 'checking' | 'success' | 'error'>>({});

  // Submission & feedback states
  const [submitting, setSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  // Catalog & Enrolled States (Hydrated with server props, refreshed via sequential client API calls)
  const [eventsList, setEventsList] = useState<SerializedEvent[]>(availableEvents);
  const [individualPaid, setIndividualPaid] = useState<SerializedEnrolledEvent[]>(initialIndividualEnrolled);
  const [teamPaid, setTeamPaid] = useState<SerializedEnrolledEvent[]>(initialTeamEnrolled);
  const [pendingIndividual, setPendingIndividual] = useState<SerializedEnrolledEvent[]>(initialIndividualPending || []);
  const [pendingTeam, setPendingTeam] = useState<SerializedEnrolledEvent[]>(initialTeamPending || []);

  // Action loading states
  const [deletingEnrollId, setDeletingEnrollId] = useState<string | null>(null);
  const [enrollingEventId, setEnrollingEventId] = useState<string | null>(null);

  // Refresh trigger for synchronizing after manual user actions
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Logout confirmation state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Sequential API calls & Master Catalog Sync:
  // Fetches /api/event to maintain full metadata for all events, preventing any enrolled events from losing their details.
  // 1. Call GET /api/enrollement/enrolled-event (paid events)
  // 2. Call GET /api/enrollement/enroll-event (available & unpaid reservations)
  useEffect(() => {
    let active = true;

    async function syncEnrollmentData() {
      try {
        // Fetch all events from /api/event to maintain a master catalog with complete details
        const allEventsRes = await fetch('/api/event', {
          method: 'GET',
          cache: 'no-store',
        });
        const allEventsJson = await allEventsRes.json().catch(() => null);

        let masterCatalog: SerializedEvent[] = availableEvents;
        if (allEventsRes.ok && Array.isArray(allEventsJson?.data) && allEventsJson.data.length > 0) {
          masterCatalog = (allEventsJson.data as Record<string, unknown>[]).map((e) => ({
            _id: String(e._id),
            title: String(e.title || ''),
            short_description: e.short_description ? String(e.short_description) : undefined,
            long_description: e.long_description ? String(e.long_description) : undefined,
            venue: e.venue ? String(e.venue) : undefined,
            date_time: e.date_time ? String(e.date_time) : undefined,
            image_url: e.image_url ? String(e.image_url) : undefined,
            entry_fee: typeof e.entry_fee === 'number' ? e.entry_fee : undefined,
            participants_type: (e.participants_type as 'individual' | 'team') ?? undefined,
            team_size: typeof e.team_size === 'number' ? e.team_size : undefined,
            min_team_size: typeof e.min_team_size === 'number' ? e.min_team_size : undefined,
            max_team_size: typeof e.max_team_size === 'number' ? e.max_team_size : undefined,
            category: e.category ? String(e.category) : undefined,
          }));
          if (active) {
            setEventsList(masterCatalog);
          }
        }

        // --- Call 1: GET /api/enrollement/enrolled-event (paid events & user) ---
        const paidRes = await fetch('/api/enrollement/enrolled-event', {
          method: 'GET',
          cache: 'no-store',
        });
        const paidJson = await paidRes.json().catch(() => null);

        if (paidJson?.redirect && paidJson?.redirectUrl) {
          router.push(paidJson.redirectUrl);
          return;
        }

        if (paidRes.ok && paidJson?.data?.paidEvents && active) {
          const rawPaidInd = (paidJson.data.paidEvents.individualEvents || []) as Record<string, unknown>[];
          const rawPaidTm = (paidJson.data.paidEvents.teamEvents || []) as Record<string, unknown>[];

          // Read stored free events from localStorage so API re-sync doesn't erase them
          let storedFreeInd: SerializedEnrolledEvent[] = [];
          let storedFreeTm: SerializedEnrolledEvent[] = [];
          try {
            const stored = localStorage.getItem(`nv_free_enrolled_${userEmail || 'attendee'}`);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed?.individual)) storedFreeInd = parsed.individual;
              if (Array.isArray(parsed?.team)) storedFreeTm = parsed.team;
            }
          } catch {
            // ignore
          }

          const serverInd = rawPaidInd.map((doc) => {
            const eventId = String(doc.event_id);
            const matched = masterCatalog.find((m) => m._id === eventId);
            return {
              _id: String(doc._id),
              event_id: eventId,
              event_title: matched?.title || (doc.event_title ? String(doc.event_title) : 'Enrolled Event'),
              participation_type: 'individual' as const,
              event_details: matched || (doc.event_details as SerializedEvent | undefined) || null,
            };
          });
          const serverIndIds = new Set(serverInd.map((s) => s.event_id));
          setIndividualPaid([...serverInd, ...storedFreeInd.filter((f) => !serverIndIds.has(f.event_id))]);

          const serverTm = rawPaidTm.map((doc) => {
            const eventId = String(doc.event_id);
            const matched = masterCatalog.find((m) => m._id === eventId);
            const teamEmails = Array.isArray(doc.team_emails) ? (doc.team_emails as string[]) : [];
            return {
              _id: String(doc._id),
              event_id: eventId,
              event_title: matched?.title || (doc.event_title ? String(doc.event_title) : 'Team Competition'),
              participation_type: 'team' as const,
              team_name: doc.team_name ? String(doc.team_name) : null,
              team_leader_email: userEmail,
              team_size: typeof doc.team_length === 'number' ? doc.team_length : teamEmails.length + 1,
              team_members: teamEmails,
              event_details: matched || (doc.event_details as SerializedEvent | undefined) || null,
            };
          });
          const serverTmIds = new Set(serverTm.map((s) => s.event_id));
          setTeamPaid([...serverTm, ...storedFreeTm.filter((f) => !serverTmIds.has(f.event_id))]);
        }

        // --- Call 2: GET /api/enrollement/enroll-event (available & pending reservations) ---
        const enrollRes = await fetch('/api/enrollement/enroll-event', {
          method: 'GET',
          cache: 'no-store',
        });
        const enrollJson = await enrollRes.json().catch(() => null);

        if (enrollJson?.redirect && enrollJson?.redirectUrl) {
          router.push(enrollJson.redirectUrl);
          return;
        }

        if (enrollRes.ok && enrollJson?.data?.enrollUserEvents && active) {
          const rawPendingInd = (enrollJson.data.enrollUserEvents.individualEvents || []) as Record<string, unknown>[];
          const rawPendingTm = (enrollJson.data.enrollUserEvents.teamEvents || []) as Record<string, unknown>[];

          setPendingIndividual(
            rawPendingInd.map((doc) => {
              const eventId = String(doc.event_id);
              const matched = masterCatalog.find((m) => m._id === eventId);
              return {
                _id: String(doc._id),
                event_id: eventId,
                event_title: matched?.title || 'Reserved Event',
                participation_type: 'individual' as const,
                event_details: matched || null,
              };
            })
          );

          setPendingTeam(
            rawPendingTm.map((doc) => {
              const eventId = String(doc.event_id);
              const matched = masterCatalog.find((m) => m._id === eventId);
              const teamEmails = Array.isArray(doc.team_emails) ? (doc.team_emails as string[]) : [];
              return {
                _id: String(doc._id),
                event_id: eventId,
                event_title: matched?.title || 'Reserved Team Event',
                participation_type: 'team' as const,
                team_name: doc.team_name ? String(doc.team_name) : null,
                team_leader_email: userEmail,
                team_size: typeof doc.team_length === 'number' ? doc.team_length : teamEmails.length + 1,
                team_members: teamEmails,
                event_details: matched || null,
              };
            })
          );
        }
      } catch (err) {
        console.warn('Sequential enrollment data load warning:', err);
      }
    }

    syncEnrollmentData();

    return () => {
      active = false;
    };
  }, [availableEvents, refreshTrigger, router, userEmail]);

  // Horizontal scroll & drag controls for Individual Enrolled Events
  const individualScrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);

  const scrollIndividual = (direction: 'left' | 'right') => {
    if (individualScrollRef.current) {
      const scrollAmount = 320;
      individualScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!individualScrollRef.current) return;
    setIsDragging(true);
    setDragStartX(e.pageX - individualScrollRef.current.offsetLeft);
    setDragScrollLeft(individualScrollRef.current.scrollLeft);
  };

  const handleMouseLeaveOrUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !individualScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - individualScrollRef.current.offsetLeft;
    const walk = (x - dragStartX) * 1.5;
    individualScrollRef.current.scrollLeft = dragScrollLeft - walk;
  };

  // Trackpad / cursor wheel horizontal scroll for Individual Enrolled Events
  useEffect(() => {
    const el = individualScrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // If user scrolls vertically with trackpad or mouse wheel (deltaY) without shift key
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && !e.shiftKey) {
        const maxScrollLeft = el.scrollWidth - el.clientWidth;
        if (maxScrollLeft > 0) {
          const atStart = el.scrollLeft <= 0 && e.deltaY < 0;
          const atEnd = el.scrollLeft >= maxScrollLeft - 1 && e.deltaY > 0;
          if (!atStart && !atEnd) {
            e.preventDefault();
            el.scrollLeft += e.deltaY;
          }
        }
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, []);


  // Filter available events excluding already enrolled (paid OR pending) & already selected
  const alreadyEnrolledIds = new Set([
    ...individualPaid.map((e) => e.event_id),
    ...teamPaid.map((e) => e.event_id),
    ...pendingIndividual.map((e) => e.event_id),
    ...pendingTeam.map((e) => e.event_id),
  ]);

  const eligibleIndividualEvents = eventsList.filter(
    (ev) =>
      ev.participants_type === 'individual' &&
      (ev.entry_fee || 0) > 0 &&
      !alreadyEnrolledIds.has(ev._id) &&
      !selectedIndividualIds.includes(ev._id)
  );

  const eligibleTeamEvents = eventsList.filter(
    (ev) =>
      ev.participants_type === 'team' &&
      (ev.entry_fee || 0) > 0 &&
      !alreadyEnrolledIds.has(ev._id) &&
      !selectedTeamEvents.some((t) => t.eventId === ev._id)
  );

  // Local storage persistence helper for free events
  const freeEventsStorageKey = `nv_free_enrolled_${userEmail || 'attendee'}`;

  const isFreeEventObj = (evId: string, details?: SerializedEvent | null) => {
    if (details && (details.entry_fee === 0 || !details.entry_fee)) return true;
    const inMaster = eventsList.find((m) => m._id === evId);
    if (inMaster && (!inMaster.entry_fee || inMaster.entry_fee === 0)) return true;
    return false;
  };

  const saveFreeEventsToStorage = (indEvents: SerializedEnrolledEvent[], tmEvents: SerializedEnrolledEvent[]) => {
    if (typeof window === 'undefined') return;
    try {
      const freeInd = indEvents.filter((e) => isFreeEventObj(e.event_id, e.event_details));
      const freeTm = tmEvents.filter((e) => isFreeEventObj(e.event_id, e.event_details));
      localStorage.setItem(freeEventsStorageKey, JSON.stringify({ individual: freeInd, team: freeTm }));
    } catch {
      // ignore
    }
  };

  // Restore free enrolled events from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(freeEventsStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed?.individual) && parsed.individual.length > 0) {
          setIndividualPaid((prev) => {
            const existing = new Set(prev.map((e) => e.event_id));
            const toAdd = parsed.individual.filter((e: SerializedEnrolledEvent) => !existing.has(e.event_id));
            return [...prev, ...toAdd];
          });
        }
        if (Array.isArray(parsed?.team) && parsed.team.length > 0) {
          setTeamPaid((prev) => {
            const existing = new Set(prev.map((e) => e.event_id));
            const toAdd = parsed.team.filter((e: SerializedEnrolledEvent) => !existing.has(e.event_id));
            return [...prev, ...toAdd];
          });
        }
      }
    } catch {
      // ignore
    }
  }, [freeEventsStorageKey]);

  // Free events dropdown effect & enrollment states
  const [isFreeEventsOpen, setIsFreeEventsOpen] = useState(true);
  const freeEvents = eventsList.filter((e) => !e.entry_fee || e.entry_fee === 0);

  // Horizontal scroll controls for Free Events Catalog
  const freeEventsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeftFree, setCanScrollLeftFree] = useState(false);
  const [canScrollRightFree, setCanScrollRightFree] = useState(true);

  const checkFreeScroll = useCallback(() => {
    if (freeEventsScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = freeEventsScrollRef.current;
      setCanScrollLeftFree(scrollLeft > 10);
      setCanScrollRightFree(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  const scrollFreeEvents = (direction: 'left' | 'right') => {
    if (freeEventsScrollRef.current) {
      const scrollAmount = 330;
      freeEventsScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkFreeScroll, 350);
    }
  };

  useEffect(() => {
    const timer = setTimeout(checkFreeScroll, 150);
    const handleResize = () => checkFreeScroll();
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [isFreeEventsOpen, checkFreeScroll]);

  // Horizontal scroll controls for Paid Events
  const paidEventsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeftPaid, setCanScrollLeftPaid] = useState(false);
  const [canScrollRightPaid, setCanScrollRightPaid] = useState(false);

  const checkPaidScroll = useCallback(() => {
    if (paidEventsScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = paidEventsScrollRef.current;
      setCanScrollLeftPaid(scrollLeft > 10);
      setCanScrollRightPaid(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  const scrollPaidEvents = (direction: 'left' | 'right') => {
    if (paidEventsScrollRef.current) {
      const scrollAmount = 330;
      paidEventsScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
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
  }, [individualPaid.length, teamPaid.length, checkPaidScroll]);

  // Paid Team Squad Inspection Modal State
  const [viewSquadTeamEvent, setViewSquadTeamEvent] = useState<SerializedEnrolledEvent | null>(null);

  // Free Team Squad Modal State
  const [freeTeamModalEvent, setFreeTeamModalEvent] = useState<SerializedEvent | null>(null);
  const [modalTeamName, setModalTeamName] = useState('');
  const [modalPendingEmail, setModalPendingEmail] = useState('');
  const [modalVerifiedMembers, setModalVerifiedMembers] = useState<VerifiedMember[]>([]);
  const [modalVerifying, setModalVerifying] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

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
    const maxTeammates = Math.max(0, (freeTeamModalEvent.max_team_size ?? freeTeamModalEvent.team_size ?? 2) - 1);
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

  const handleConfirmFreeTeamEnrollment = () => {
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

    const newFreeTeam: SerializedEnrolledEvent = {
      _id: `free-team-${freeTeamModalEvent._id}-${Date.now()}`,
      event_id: freeTeamModalEvent._id,
      event_title: freeTeamModalEvent.title,
      participation_type: 'team',
      team_name: trimmedName,
      team_leader_name: userName,
      team_leader_email: userEmail,
      team_members: modalVerifiedMembers.map((m) => m.email),
      team_member_details: modalVerifiedMembers,
      event_details: freeTeamModalEvent,
    };

    setTeamPaid((prev) => {
      const updated = [...prev, newFreeTeam];
      saveFreeEventsToStorage(individualPaid, updated);
      return updated;
    });

    setFeedbackSuccess(`Squad "${trimmedName}" successfully enrolled in ${freeTeamModalEvent.title}!`);
    closeFreeTeamModal();
  };

  const handleUnenrollFreeEvent = (event: SerializedEvent) => {
    const isTeam = event.participants_type === 'team';
    if (isTeam) {
      setTeamPaid((prev) => {
        const updated = prev.filter((e) => e.event_id !== event._id);
        saveFreeEventsToStorage(individualPaid, updated);
        return updated;
      });
    } else {
      setIndividualPaid((prev) => {
        const updated = prev.filter((e) => e.event_id !== event._id);
        saveFreeEventsToStorage(updated, teamPaid);
        return updated;
      });
    }
    setFeedbackSuccess(`Unenrolled from ${event.title}`);
  };

  const handleToggleFreeEnrollment = (event: SerializedEvent) => {
    const isTeam = event.participants_type === 'team';
    const isEnrolled = isTeam
      ? teamPaid.some((e) => e.event_id === event._id)
      : individualPaid.some((e) => e.event_id === event._id);

    if (isEnrolled) {
      handleUnenrollFreeEvent(event);
      return;
    }

    if (isTeam) {
      openFreeTeamModal(event);
    } else {
      // Individual Free Event: Instantly enroll & display in Selected & Enrolled Events
      const newFreeInd: SerializedEnrolledEvent = {
        _id: `free-ind-${event._id}-${Date.now()}`,
        event_id: event._id,
        event_title: event.title,
        participation_type: 'individual',
        event_details: event,
      };
      setIndividualPaid((prev) => {
        const updated = [...prev, newFreeInd];
        saveFreeEventsToStorage(updated, teamPaid);
        return updated;
      });
      setSelectedIndividualIds((prev) => prev.filter((id) => id !== event._id));
      setFeedbackSuccess(`Successfully enrolled in ${event.title}! Saved to your Enrolled Events.`);
    }
  };

  // Add individual event to pending selection
  const handleSelectIndividualEvent = (eventId: string) => {
    if (!eventId || selectedIndividualIds.includes(eventId)) return;
    setSelectedIndividualIds((prev) => [...prev, eventId]);
    setFeedbackError(null);
  };

  const handleRemoveIndividual = (eventId: string) => {
    setSelectedIndividualIds((prev) => prev.filter((id) => id !== eventId));
  };

  // Add team event to pending selection
  const handleSelectTeamEvent = (eventId: string) => {
    if (!eventId || selectedTeamEvents.some((t) => t.eventId === eventId)) return;
    setSelectedTeamEvents((prev) => [
      ...prev,
      { eventId, teamName: '', teamMembers: [], verifiedDetails: [] },
    ]);
    setPendingMemberEmail((prev) => ({ ...prev, [eventId]: '' }));
    setMemberError((prev) => ({ ...prev, [eventId]: null }));
    setFeedbackError(null);
  };

  const handleRemoveTeam = (eventId: string) => {
    setSelectedTeamEvents((prev) => prev.filter((t) => t.eventId !== eventId));
    setPendingMemberEmail((prev) => {
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
    setMemberError((prev) => {
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
  };

  const updateTeamName = (eventId: string, name: string) => {
    setSelectedTeamEvents((prev) =>
      prev.map((t) => (t.eventId === eventId ? { ...t, teamName: name } : t))
    );
  };

  // Progressive Teammate Verification: Verify email & add to squad
  const handleVerifyAndAddMember = async (eventId: string) => {
    const rawEmail = pendingMemberEmail[eventId] || '';
    const email = rawEmail.trim().toLowerCase();
    setMemberError((prev) => ({ ...prev, [eventId]: null }));

    if (!email) {
      setMemberError((prev) => ({ ...prev, [eventId]: 'Please enter a teammate email.' }));
      setMemberStatus((prev) => ({ ...prev, [eventId]: 'error' }));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMemberError((prev) => ({ ...prev, [eventId]: 'Please enter a valid email format.' }));
      setMemberStatus((prev) => ({ ...prev, [eventId]: 'error' }));
      return;
    }

    if (email === userEmail.toLowerCase()) {
      setMemberError((prev) => ({
        ...prev,
        [eventId]: 'You are already registered as Team Leader. Enter your teammate’s email.',
      }));
      setMemberStatus((prev) => ({ ...prev, [eventId]: 'error' }));
      return;
    }

    const currentTeam = selectedTeamEvents.find((t) => t.eventId === eventId);
    if (currentTeam?.teamMembers.includes(email)) {
      setMemberError((prev) => ({
        ...prev,
        [eventId]: 'This teammate is already added to this squad.',
      }));
      setMemberStatus((prev) => ({ ...prev, [eventId]: 'error' }));
      return;
    }

    const ev = eventsList.find((e) => e._id === eventId);
    const maxTeammates = Math.max(0, (ev?.max_team_size ?? ev?.team_size ?? 1) - 1);
    if (maxTeammates === 0) {
      setMemberError((prev) => ({
        ...prev,
        [eventId]: 'This is a solo team event. The team leader is the only squad member.',
      }));
      setMemberStatus((prev) => ({ ...prev, [eventId]: 'error' }));
      return;
    }

    if ((currentTeam?.teamMembers.length || 0) >= maxTeammates) {
      setMemberError((prev) => ({
        ...prev,
        [eventId]: `Maximum squad limit (${ev?.max_team_size || ev?.team_size || 1} members including leader) reached.`,
      }));
      setMemberStatus((prev) => ({ ...prev, [eventId]: 'error' }));
      return;
    }

    setVerifyingMember((prev) => ({ ...prev, [eventId]: true }));
    setMemberStatus((prev) => ({ ...prev, [eventId]: 'checking' }));

    try {
      const res = await fetch('/api/enrollement/check-team-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = await res.json().catch(() => null);

      if (res.ok && res.status === 200) {
        const verifiedInfo: VerifiedMember = {
          email,
          name: result?.data?.name || email.split('@')[0],
          phone: result?.data?.phone || '',
        };

        setMemberStatus((prev) => ({ ...prev, [eventId]: 'success' }));
        setSelectedTeamEvents((prev) =>
          prev.map((t) => {
            if (t.eventId !== eventId) return t;
            return {
              ...t,
              teamMembers: [...t.teamMembers, verifiedInfo.email],
              verifiedDetails: [...(t.verifiedDetails || []), verifiedInfo],
            };
          })
        );

        // Clear input for the next member and reset status after a moment
        setPendingMemberEmail((prev) => ({ ...prev, [eventId]: '' }));
        setMemberError((prev) => ({ ...prev, [eventId]: null }));
        setTimeout(() => {
          setMemberStatus((prev) => ({ ...prev, [eventId]: 'idle' }));
        }, 1200);
      } else {
        setMemberStatus((prev) => ({ ...prev, [eventId]: 'error' }));
        if (result?.redirect && result?.redirectUrl) {
          router.push(result.redirectUrl);
          return;
        }
        setMemberError((prev) => ({
          ...prev,
          [eventId]:
            result?.message ||
            result?.error ||
            'User has not registered yet or has not paid for the event entry ticket.',
        }));
      }
    } catch {
      setMemberStatus((prev) => ({ ...prev, [eventId]: 'error' }));
      setMemberError((prev) => ({
        ...prev,
        [eventId]: 'Failed to verify member. Please check your connection.',
      }));
    } finally {
      setVerifyingMember((prev) => ({ ...prev, [eventId]: false }));
    }
  };

  const handleRemoveVerifiedMember = (eventId: string, memberEmail: string) => {
    setSelectedTeamEvents((prev) =>
      prev.map((t) => {
        if (t.eventId !== eventId) return t;
        return {
          ...t,
          teamMembers: t.teamMembers.filter((em) => em !== memberEmail),
          verifiedDetails: (t.verifiedDetails || []).filter((m) => m.email !== memberEmail),
        };
      })
    );
    setMemberError((prev) => ({ ...prev, [eventId]: null }));
  };

  // Fee calculation
  const selectedIndividualEventObjects = selectedIndividualIds
    .map((id) => eventsList.find((e) => e._id === id))
    .filter(Boolean) as SerializedEvent[];

  const selectedTeamEventObjects = selectedTeamEvents
    .map((t) => ({
      ...t,
      event: eventsList.find((e) => e._id === t.eventId),
    }))
    .filter((item) => Boolean(item.event));

  const pendingIndividualFee = pendingIndividual.reduce(
    (acc, item) => acc + (item.event_details?.entry_fee || 0),
    0
  );
  const pendingTeamFee = pendingTeam.reduce(
    (acc, item) => acc + (item.event_details?.entry_fee || 0),
    0
  );
  const stagedIndividualFee = selectedIndividualEventObjects.reduce(
    (acc, e) => acc + (e.entry_fee || 0),
    0
  );
  const stagedTeamFee = selectedTeamEventObjects.reduce(
    (acc, t) => acc + (t.event?.entry_fee || 0),
    0
  );

  const totalFee =
    pendingIndividualFee + pendingTeamFee + stagedIndividualFee + stagedTeamFee;
  const totalSelectedCount =
    pendingIndividual.length +
    pendingTeam.length +
    selectedIndividualIds.length +
    selectedTeamEvents.length;

  // Delete an existing unpaid enrolled reservation
  const handleDeleteEnrolled = async (
    enrolledEventId: string,
    eventId: string,
    type: 'individual' | 'team',
  ) => {
    setDeletingEnrollId(enrolledEventId);
    setFeedbackError(null);
    setFeedbackSuccess(null);
    try {
      const res = await fetch('/api/enrollement/enroll-event', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrolledEventId, eventId }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        if (type === 'individual') {
          setPendingIndividual((prev) => prev.filter((e) => e._id !== enrolledEventId));
        } else {
          setPendingTeam((prev) => prev.filter((e) => e._id !== enrolledEventId));
        }
        setFeedbackSuccess('Event reservation cancelled. Available again in catalogue.');
      } else {
        if (data?.redirect && data?.redirectUrl) {
          router.push(data.redirectUrl);
          return;
        }
        setFeedbackError(data?.message || data?.error || 'Failed to cancel reservation.');
      }
    } catch {
      setFeedbackError('Network error while cancelling reservation.');
    } finally {
      setDeletingEnrollId(null);
    }
  };

  // Enroll single individual event immediately
  const handleEnrollSingleIndividual = async (eventId: string) => {
    setEnrollingEventId(eventId);
    setFeedbackError(null);
    setFeedbackSuccess(null);
    try {
      const res = await fetch('/api/enrollement/enroll-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setSelectedIndividualIds((prev) => prev.filter((id) => id !== eventId));
        setFeedbackSuccess('Individual event reserved! Added to Selected Events (not paid).');
        setRefreshTrigger((v) => v + 1);
      } else {
        if (data?.redirect && data?.redirectUrl) {
          router.push(data.redirectUrl);
          return;
        }
        setFeedbackError(data?.message || data?.error || 'Failed to enroll in event.');
      }
    } catch {
      setFeedbackError('Network error while enrolling.');
    } finally {
      setEnrollingEventId(null);
    }
  };

  // Enroll single team event immediately
  const handleEnrollSingleTeam = async (eventId: string) => {
    const teamItem = selectedTeamEvents.find((t) => t.eventId === eventId);
    if (!teamItem) return;

    const eventObj = eventsList.find((e) => e._id === eventId);
    if (!teamItem.teamName.trim()) {
      setFeedbackError(`Please specify a team name for "${eventObj?.title || 'the team event'}".`);
      return;
    }
    const maxMembers = Math.max(0, (eventObj?.max_team_size ?? eventObj?.team_size ?? 1) - 1);
    const minMembers = Math.max(0, (eventObj?.min_team_size ?? 1) - 1);
    if (maxMembers > 0 && teamItem.teamMembers.length < minMembers) {
      setFeedbackError(
        `"${eventObj?.title || 'Team event'}" requires at least ${minMembers} registered teammate(s). Currently added: ${teamItem.teamMembers.length}.`
      );
      return;
    }

    setEnrollingEventId(eventId);
    setFeedbackError(null);
    setFeedbackSuccess(null);
    try {
      const teamEmails = teamItem.teamMembers.filter((m) => m.trim() !== '');
      const res = await fetch('/api/enrollement/enroll-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          teamName: teamItem.teamName.trim(),
          teamEmails,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        handleRemoveTeam(eventId);
        setFeedbackSuccess('Team event reserved! Added to Selected Events (not paid).');
        setRefreshTrigger((v) => v + 1);
      } else {
        if (data?.redirect && data?.redirectUrl) {
          router.push(data.redirectUrl);
          return;
        }
        setFeedbackError(data?.message || data?.error || 'Failed to enroll team in event.');
      }
    } catch {
      setFeedbackError('Network error while enrolling team.');
    } finally {
      setEnrollingEventId(null);
    }
  };

  // Checkout submission
  // Handles free events directly in state and paid events via the sequential backend route
  const handleProceedToCheckout = async () => {
    setFeedbackError(null);
    setFeedbackSuccess(null);

    // Filter staged items by fee
    const stagedPaidIndividual = selectedIndividualIds.filter((id) => {
      const ev = eventsList.find((e) => e._id === id);
      return (ev?.entry_fee || 0) > 0;
    });
    const stagedFreeIndividual = selectedIndividualIds.filter((id) => {
      const ev = eventsList.find((e) => e._id === id);
      return !ev?.entry_fee || ev.entry_fee === 0;
    });

    const stagedPaidTeam = selectedTeamEvents.filter((t) => {
      const ev = eventsList.find((e) => e._id === t.eventId);
      return (ev?.entry_fee || 0) > 0;
    });
    const stagedFreeTeam = selectedTeamEvents.filter((t) => {
      const ev = eventsList.find((e) => e._id === t.eventId);
      return !ev?.entry_fee || ev.entry_fee === 0;
    });

    const hasStaged = selectedIndividualIds.length > 0 || selectedTeamEvents.length > 0;
    const hasPendingReservations = pendingIndividual.length > 0 || pendingTeam.length > 0;

    if (!hasStaged && !hasPendingReservations) {
      setFeedbackError('Please select at least one event from the catalog.');
      return;
    }

    // Validate team selections before hitting the network
    for (const teamItem of selectedTeamEvents) {
      const eventObj = eventsList.find((e) => e._id === teamItem.eventId);
      if (!teamItem.teamName.trim()) {
        setFeedbackError(`Please specify a team name for "${eventObj?.title || 'the team event'}".`);
        return;
      }
      const maxMembers = Math.max(0, (eventObj?.max_team_size ?? eventObj?.team_size ?? 1) - 1);
      const minMembers = Math.max(0, (eventObj?.min_team_size ?? 1) - 1);
      if (maxMembers > 0 && teamItem.teamMembers.length < minMembers) {
        setFeedbackError(
          `"${eventObj?.title || 'Team event'}" requires at least ${minMembers} registered teammate(s). Currently added: ${teamItem.teamMembers.length}.`
        );
        return;
      }
    }

    setSubmitting(true);

    try {
      // 1. Process free events directly into enrolled state
      if (stagedFreeIndividual.length > 0) {
        const newFreeInd = stagedFreeIndividual.map((id) => {
          const ev = eventsList.find((e) => e._id === id);
          return {
            _id: `free-ind-${id}-${Date.now()}`,
            event_id: id,
            event_title: ev?.title || 'Free Competition',
            participation_type: 'individual' as const,
            event_details: ev,
          };
        });
        setIndividualPaid((prev) => {
          const updated = [...prev, ...newFreeInd];
          saveFreeEventsToStorage(updated, teamPaid);
          return updated;
        });
        setSelectedIndividualIds((prev) => prev.filter((id) => !stagedFreeIndividual.includes(id)));
      }

      if (stagedFreeTeam.length > 0) {
        const newFreeTeam = stagedFreeTeam.map((tItem) => {
          const ev = eventsList.find((e) => e._id === tItem.eventId);
          return {
            _id: `free-team-${tItem.eventId}-${Date.now()}`,
            event_id: tItem.eventId,
            event_title: ev?.title || 'Free Team Event',
            participation_type: 'team' as const,
            team_name: tItem.teamName.trim(),
            team_leader_name: userName,
            team_leader_email: userEmail,
            team_members: tItem.teamMembers,
            team_member_details: tItem.verifiedDetails,
            event_details: ev,
          };
        });
        setTeamPaid((prev) => {
          const updated = [...prev, ...newFreeTeam];
          saveFreeEventsToStorage(individualPaid, updated);
          return updated;
        });
        setSelectedTeamEvents((prev) =>
          prev.filter((t) => !stagedFreeTeam.some((f) => f.eventId === t.eventId))
        );
      }

      // 2. If there are NO paid events to purchase, complete right away
      const hasPaidItems =
        stagedPaidIndividual.length > 0 || stagedPaidTeam.length > 0 || hasPendingReservations;
      if (!hasPaidItems) {
        setFeedbackSuccess('Successfully enrolled in your free events! View your squad details in Enrolled Events.');
        setSubmitting(false);
        return;
      }

      // 3. Paid Individual events: one POST per event
      for (const eventId of stagedPaidIndividual) {
        const res = await fetch('/api/enrollement/enroll-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok && res.status !== 200) {
          if (data?.redirect && data?.redirectUrl) {
            router.push(data.redirectUrl);
            return;
          }
          setFeedbackError(data?.message || data?.error || 'Failed to enroll in an individual event.');
          setSubmitting(false);
          return;
        }
      }

      // 4. Paid Team events: one POST per event
      for (const teamItem of stagedPaidTeam) {
        const teamEmails = teamItem.teamMembers.filter((m) => m.trim() !== '');
        const res = await fetch('/api/enrollement/enroll-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: teamItem.eventId,
            teamName: teamItem.teamName.trim(),
            teamEmails,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok && res.status !== 200) {
          if (data?.redirect && data?.redirectUrl) {
            router.push(data.redirectUrl);
            return;
          }
          setFeedbackError(data?.message || data?.error || 'Failed to enroll your team in an event.');
          setSubmitting(false);
          return;
        }
      }

      setFeedbackSuccess('Enrolment recorded successfully! Redirecting to checkout...');
      setTimeout(() => {
        router.push('/register/checkout-event');
      }, 700);
    } catch {
      setFeedbackError('A network error occurred. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    document.cookie = 'nv-session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'nv-session-temp=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    window.location.href = '/register/check-email';
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-10 text-white pb-20">
      {/* 01 — Top Personalized Greeting */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-wider text-white">
          Hi,{' '}
          <span className="text-[#FF6A00] drop-shadow-[0_0_20px_rgba(255,106,0,0.4)]">
            {userName}
          </span>{' '}
          :)
        </h1>

        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-subheading font-medium tracking-wider uppercase text-red-500 hover:text-red-400 transition-colors cursor-pointer shrink-0"
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

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/[0.12] bg-[#07090E] p-6 flex flex-col gap-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1.5 text-center">
              <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 mx-auto flex items-center justify-center mb-1 border border-red-500/20">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 id="logout-dialog-title" className="font-subheading font-medium text-lg text-white">
                Log Out Confirmation
              </h3>
              <p className="text-xs text-zinc-400">
                Are you sure you want to log out of your session?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="py-2.5 px-4 rounded-xl text-xs font-mono font-medium uppercase tracking-wider text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="py-2.5 px-4 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Free Team Squad Enrollment Modal */}
      {freeTeamModalEvent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="free-team-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={closeFreeTeamModal}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-emerald-500/40 bg-[#07090E] p-5 sm:p-6 flex flex-col gap-5 shadow-[0_0_50px_rgba(16,185,129,0.15)] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 uppercase tracking-wider self-start">
                  FREE TEAM ENROLLMENT
                </span>
                <h3 id="free-team-dialog-title" className="font-subheading font-medium text-base sm:text-lg text-white">
                  {freeTeamModalEvent.title}
                </h3>
                <span className="text-xs font-mono text-zinc-400">
                  Squad Size: Min {freeTeamModalEvent.min_team_size || 2} – Max {freeTeamModalEvent.max_team_size || freeTeamModalEvent.team_size || 2} members
                </span>
              </div>
              <button
                type="button"
                onClick={closeFreeTeamModal}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex flex-col gap-4 text-xs">
              {/* Team Name */}
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[11px] uppercase tracking-wider text-zinc-300">
                  Team Name <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  value={modalTeamName}
                  onChange={(e) => {
                    setModalTeamName(e.target.value);
                    if (modalError) setModalError(null);
                  }}
                  placeholder="e.g. Apex Predators"
                  className="w-full bg-black/60 text-white font-sans text-xs px-3.5 py-2.5 rounded-xl border border-white/[0.12] focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Team Leader (Read-only) */}
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                  Team Leader (You)
                </label>
                <input
                  type="text"
                  value={`${userName} (${userEmail})`}
                  readOnly
                  className="w-full bg-white/[0.03] text-zinc-400 font-mono text-xs px-3.5 py-2.5 rounded-xl border border-white/[0.08] cursor-not-allowed"
                />
              </div>

              {/* Teammates List & Verification */}
              {(() => {
                const maxTeammates = Math.max(0, (freeTeamModalEvent.max_team_size ?? freeTeamModalEvent.team_size ?? 2) - 1);
                const minTeammates = Math.max(0, (freeTeamModalEvent.min_team_size ?? 2) - 1);

                return (
                  <div className="flex flex-col gap-2.5 pt-1">
                    <label className="font-mono text-[11px] uppercase tracking-wider text-zinc-300">
                      Teammates ({modalVerifiedMembers.length}/{maxTeammates} added • Min {minTeammates} required)
                    </label>

                    {/* Verified Teammates Pills */}
                    {modalVerifiedMembers.map((m, idx) => (
                      <div
                        key={m.email}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                            ✓
                          </span>
                          <span className="text-white font-medium truncate">{m.name || `Member ${idx + 1}`}</span>
                          <span className="text-zinc-400 truncate text-[11px]">({m.email})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveModalMember(m.email)}
                          className="p-1 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer shrink-0"
                          title="Remove teammate"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}

                    {/* Teammate Input Row */}
                    {modalVerifiedMembers.length < maxTeammates ? (
                      <div className="flex flex-col gap-1.5 pt-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="email"
                            value={modalPendingEmail}
                            onChange={(e) => {
                              setModalPendingEmail(e.target.value);
                              if (modalError) setModalError(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleVerifyModalMember();
                              }
                            }}
                            disabled={modalVerifying}
                            placeholder={`Enter teammate ${modalVerifiedMembers.length + 1} registered email`}
                            className="flex-1 bg-black/60 text-white font-mono text-xs px-3.5 py-2.5 rounded-xl border border-white/[0.12] focus:border-emerald-500 focus:outline-none disabled:opacity-50"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyModalMember}
                            disabled={modalVerifying || !modalPendingEmail.trim()}
                            title="Add & verify teammate"
                            aria-label="Add and verify teammate"
                            className="w-10 h-10 rounded-xl font-mono text-sm font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500 hover:text-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center justify-center"
                          >
                            {modalVerifying ? (
                              <svg className="animate-spin w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                              </svg>
                            ) : (
                              <span className="font-bold text-base leading-none">+</span>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11px] font-mono text-zinc-400 text-center">
                        Maximum squad size reached for this competition.
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Error Message */}
              {modalError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-400 flex items-start gap-2">
                  <span className="shrink-0">⚠️</span>
                  <span>{modalError}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={closeFreeTeamModal}
                className="py-2.5 px-4 rounded-xl text-xs font-mono font-medium uppercase tracking-wider text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmFreeTeamEnrollment}
                className="py-2.5 px-4 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-black bg-emerald-400 hover:bg-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.35)] transition-all cursor-pointer"
              >
                Confirm & Enroll
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paid Team Squad Inspection Modal */}
      {viewSquadTeamEvent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="paid-squad-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setViewSquadTeamEvent(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/[0.15] bg-[#07090E] p-5 sm:p-6 flex flex-col gap-4 shadow-[0_0_50px_rgba(255,106,0,0.12)] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-3">
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[#FF8833] font-semibold px-2 py-0.5 rounded bg-[#FF6A00]/10 border border-[#FF6A00]/20 uppercase">
                    TEAM COMPETITION
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    PAID ✓
                  </span>
                </div>
                <h3 id="paid-squad-dialog-title" className="font-subheading font-medium text-base sm:text-lg text-white truncate">
                  {viewSquadTeamEvent.event_title}
                </h3>
                <p className="text-xs font-mono text-zinc-400">
                  Team: <span className="text-white font-medium">{viewSquadTeamEvent.team_name || 'Squad'}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewSquadTeamEvent(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0"
                aria-label="Close squad details"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Squad Content */}
            <div className="flex flex-col gap-4 text-xs font-mono">
              {/* Leader Details Card */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-[#FF8833] font-semibold">
                    Squad Leader
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#FF6A00]/10 text-[#FF8833] border border-[#FF6A00]/20 uppercase">
                    LEADER
                  </span>
                </div>
                <span className="text-white font-medium text-sm">
                  {viewSquadTeamEvent.team_leader_name || userName}
                </span>
                <span className="text-zinc-400 text-xs">
                  {viewSquadTeamEvent.team_leader_email || userEmail}
                </span>
                {viewSquadTeamEvent.team_leader_phone && (
                  <span className="text-zinc-500 text-[11px]">
                    Phone: {viewSquadTeamEvent.team_leader_phone}
                  </span>
                )}
              </div>

              {/* Teammates List */}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-zinc-400 uppercase tracking-wider">
                  Teammates ({viewSquadTeamEvent.team_member_details?.length || viewSquadTeamEvent.team_members?.length || 0})
                </span>

                {(!viewSquadTeamEvent.team_member_details || viewSquadTeamEvent.team_member_details.length === 0) &&
                (!viewSquadTeamEvent.team_members || viewSquadTeamEvent.team_members.length === 0) ? (
                  <p className="text-xs text-zinc-500 italic p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-center">
                    No additional teammates recorded for this squad.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(viewSquadTeamEvent.team_member_details && viewSquadTeamEvent.team_member_details.length > 0
                      ? viewSquadTeamEvent.team_member_details
                      : (viewSquadTeamEvent.team_members || []).map((email) => ({
                          name: 'Registered Attendee',
                          email,
                          phone: 'N/A',
                        }))
                    ).map((member, mIdx) => (
                      <div
                        key={mIdx}
                        className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-white text-sm truncate">
                            {member.name || `Member ${mIdx + 1}`}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                            MEMBER
                          </span>
                        </div>
                        <div className="font-mono text-zinc-400 text-[11px] flex flex-col gap-0.5 pt-1">
                          <span className="text-zinc-300 truncate">{member.email}</span>
                          {member.phone && member.phone !== 'N/A' && (
                            <span className="text-zinc-500">{member.phone}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-white/[0.08] flex justify-end">
              <button
                type="button"
                onClick={() => setViewSquadTeamEvent(null)}
                className="py-2 px-5 rounded-xl text-xs font-mono font-medium uppercase tracking-wider text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 02 — Unified Paid Events Container (Side-by-Side Cards with Horizontal Scroll) */}
      <section className="w-full flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-subheading font-medium uppercase tracking-wider text-zinc-200 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
            Paid Events
          </h2>
          <div className="flex items-center gap-3">
            {(canScrollLeftPaid || canScrollRightPaid) && (
              <div className="hidden sm:flex items-center gap-1 pr-2 border-r border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => scrollPaidEvents('left')}
                  disabled={!canScrollLeftPaid}
                  aria-label="Scroll left"
                  className="w-7 h-7 rounded-lg border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 hover:text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => scrollPaidEvents('right')}
                  disabled={!canScrollRightPaid}
                  aria-label="Scroll right"
                  className="w-7 h-7 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
            <span className="text-xs font-mono text-emerald-400 font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              {individualPaid.length + teamPaid.length} PAID
            </span>
          </div>
        </div>

        {individualPaid.length === 0 && teamPaid.length === 0 ? (
          <div className="w-full p-6 sm:p-8 rounded-2xl border border-white/[0.08] bg-[#07090E] text-zinc-500 font-mono text-xs sm:text-sm text-center">
            No paid events yet. Browse and add events below.
          </div>
        ) : (
          <div className="relative group/paidscroll">
            <div
              ref={paidEventsScrollRef}
              onScroll={checkPaidScroll}
              className="flex flex-row items-stretch gap-3.5 overflow-x-auto scroll-smooth pb-3.5 pt-1 scrollbar-thin scrollbar-thumb-emerald-500/30 hover:scrollbar-thumb-emerald-500/60 scrollbar-track-white/[0.02]"
            >
              {/* Paid Individual Events */}
              {individualPaid.map((enrolled) => {
                const details = enrolled.event_details;
                return (
                  <div
                    key={enrolled._id}
                    className="w-[290px] sm:w-[320px] shrink-0 rounded-2xl border border-white/[0.1] bg-[#07090E] hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.06)] transition-all p-4 flex flex-col justify-between gap-3.5 group"
                  >
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            INDIVIDUAL
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            PAID
                          </span>
                        </div>
                        <span className="text-xs font-sans font-semibold text-emerald-400">
                          {details?.entry_fee ? `₹${details.entry_fee}` : 'FREE'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 min-w-0">
                        <h3 className="font-subheading font-medium text-sm sm:text-base text-white tracking-wide line-clamp-1 group-hover:text-emerald-300 transition-colors">
                          {enrolled.event_title}
                        </h3>
                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                          {details?.short_description || 'Individual Competition'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-white/[0.06] text-[11px] font-mono text-zinc-400">
                      <span className="text-zinc-400 truncate text-[11px]">
                        Solo Entry
                      </span>
                      <span className="text-xs font-mono text-emerald-400 font-medium flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        CONFIRMED
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Paid Team Events */}
              {teamPaid.map((teamEvent) => {
                const details = teamEvent.event_details;
                const membersCount =
                  (teamEvent.team_member_details?.length || teamEvent.team_members?.length || 0) + 1;

                return (
                  <div
                    key={teamEvent._id}
                    className="w-[290px] sm:w-[320px] shrink-0 rounded-2xl border border-white/[0.1] bg-[#07090E] hover:border-[#FF6A00]/40 hover:shadow-[0_0_20px_rgba(255,106,0,0.06)] transition-all p-4 flex flex-col justify-between gap-3.5 group"
                  >
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase tracking-wider bg-[#FF6A00]/10 text-[#FF8833] border border-[#FF6A00]/20">
                            TEAM
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            PAID
                          </span>
                        </div>
                        <span className="text-xs font-sans font-semibold text-emerald-400">
                          {details?.entry_fee ? `₹${details.entry_fee}` : 'FREE'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 min-w-0">
                        <h3 className="font-subheading font-medium text-sm sm:text-base text-white tracking-wide line-clamp-1 group-hover:text-[#FF8833] transition-colors">
                          {teamEvent.event_title}
                        </h3>
                        <p className="text-xs font-mono text-zinc-300 truncate">
                          Team: <span className="text-white font-medium">{teamEvent.team_name || 'Squad'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-white/[0.06] text-[11px] font-mono text-zinc-400">
                      <span className="text-zinc-400 truncate text-[11px]">
                        {membersCount} {membersCount === 1 ? 'Member' : 'Members'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setViewSquadTeamEvent(teamEvent)}
                        className="px-2.5 py-1 rounded-lg font-mono text-xs font-semibold bg-white/[0.05] hover:bg-[#FF6A00]/20 text-zinc-200 hover:text-[#FF8833] border border-white/[0.1] hover:border-[#FF6A00]/40 transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span>Squad</span>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Side Scroll Button at the right of the div */}
            {canScrollRightPaid && (
              <div className="absolute right-0 top-0 bottom-3.5 w-14 bg-gradient-to-l from-[#07090E] via-[#07090E]/80 to-transparent pointer-events-none flex items-center justify-end pr-1">
                <button
                  type="button"
                  onClick={() => scrollPaidEvents('right')}
                  aria-label="Side scroll right"
                  className="pointer-events-auto p-2 rounded-full bg-[#0B0F17]/95 border border-emerald-500/50 text-emerald-400 hover:text-white hover:bg-emerald-500/30 shadow-[0_0_18px_rgba(16,185,129,0.35)] transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}

            {/* Left Side Scroll Button when scrolled */}
            {canScrollLeftPaid && (
              <div className="absolute left-0 top-0 bottom-3.5 w-14 bg-gradient-to-r from-[#07090E] via-[#07090E]/80 to-transparent pointer-events-none flex items-center justify-start pl-1">
                <button
                  type="button"
                  onClick={() => scrollPaidEvents('left')}
                  aria-label="Side scroll left"
                  className="pointer-events-auto p-2 rounded-full bg-[#0B0F17]/95 border border-white/[0.15] text-zinc-300 hover:text-white hover:bg-white/[0.1] shadow-lg transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 03 — Free Events Enrollment Section (with Dropdown Effect) */}
      <section className="flex flex-col gap-4">
        <div className="rounded-2xl border border-emerald-500/30 bg-[#07090E] hover:border-emerald-500/40 transition-colors overflow-hidden shadow-[0_0_25px_rgba(16,185,129,0.06)]">
          {/* Collapsed Bar: Clickable Header */}
          <div
            onClick={() => setIsFreeEventsOpen(!isFreeEventsOpen)}
            className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 cursor-pointer select-none"
          >
            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="font-subheading font-medium text-base sm:text-lg text-white flex items-center gap-2 tracking-wide uppercase">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                  FREE EVENTS
                </h3>
                <span className="text-xs font-mono text-emerald-400 font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 uppercase tracking-wider whitespace-nowrap">
                  ENTRY PASS REQUIRED
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Your Entry Pass covers these events. Choose the ones you want to participate in and complete your enrollment.
              </p>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-white/[0.06]">
              {isFreeEventsOpen && (
                <div className="hidden sm:flex items-center gap-1 pr-2 border-r border-white/[0.08]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      scrollFreeEvents('left');
                    }}
                    disabled={!canScrollLeftFree}
                    aria-label="Scroll left"
                    className="w-7 h-7 rounded-lg border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 hover:text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      scrollFreeEvents('right');
                    }}
                    disabled={!canScrollRightFree}
                    aria-label="Scroll right"
                    className="w-7 h-7 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
              <span className="text-[11px] sm:text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 whitespace-nowrap">
                {freeEvents.length} AVAILABLE
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFreeEventsOpen(!isFreeEventsOpen);
                }}
                aria-expanded={isFreeEventsOpen}
                aria-label={isFreeEventsOpen ? 'Collapse free events' : 'Expand free events'}
                className="p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span className="text-xs font-mono text-zinc-400 sm:hidden">
                  {isFreeEventsOpen ? 'Hide' : 'View'}
                </span>
                <svg
                  className={`w-5 h-5 transition-transform duration-300 ${
                    isFreeEventsOpen ? 'rotate-180 text-emerald-400' : 'text-zinc-400'
                  }`}
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

          {/* Expanded Dropdown Panel */}
          <div
            className={`grid transition-[grid-template-rows] duration-250 ease-out motion-reduce:transition-none ${
              isFreeEventsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            }`}
          >
            <div className="overflow-hidden">
              <div className="p-4 sm:p-5 pt-3 border-t border-white/[0.06] flex flex-col gap-4 bg-white/[0.01]">
                {/* Free Events List: Arranged in a single horizontal line with side scroll */}
                <div className="relative group/scroll">
                  <div
                    ref={freeEventsScrollRef}
                    onScroll={checkFreeScroll}
                    className="flex flex-row items-stretch gap-3.5 overflow-x-auto scroll-smooth pb-3.5 pt-1 scrollbar-thin scrollbar-thumb-emerald-500/30 hover:scrollbar-thumb-emerald-500/60 scrollbar-track-white/[0.02]"
                  >
                    {freeEvents.map((ev) => {
                      const isTeam = ev.participants_type === 'team';
                      const isAlreadyEnrolled = isTeam
                        ? teamPaid.some((e) => e.event_id === ev._id)
                        : individualPaid.some((e) => e.event_id === ev._id);

                      return (
                        <div
                          key={ev._id}
                          className={`w-[290px] sm:w-[320px] shrink-0 rounded-2xl border transition-all p-4 flex flex-col justify-between gap-3.5 group ${
                            isAlreadyEnrolled
                              ? 'border-emerald-500/40 bg-emerald-950/[0.14] shadow-[0_0_20px_rgba(16,185,129,0.08)]'
                              : 'border-emerald-500/20 bg-[#07090E] hover:border-emerald-500/45 hover:shadow-[0_0_20px_rgba(16,185,129,0.06)]'
                          }`}
                        >
                          <div className="flex flex-col gap-2.5">
                            {/* Badges */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                                FREE EVENT
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-wider bg-white/[0.05] text-zinc-300 border border-white/[0.08]">
                                {isTeam ? 'TEAM' : 'INDIVIDUAL'}
                              </span>
                            </div>

                            {/* Title & Description */}
                            <div className="flex flex-col gap-1 min-w-0">
                              <h4 className="font-subheading font-medium text-sm sm:text-base text-white tracking-wide line-clamp-1 group-hover:text-emerald-300 transition-colors">
                                {ev.title}
                              </h4>
                              {ev.short_description && (
                                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                                  {ev.short_description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Bottom Row */}
                          <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-white/[0.06] text-[11px] font-mono text-zinc-400">
                            <span className="text-zinc-300 truncate text-[11px]">
                              {isTeam
                                ? `Squad: ${ev.team_size || ev.min_team_size || 2} Members`
                                : 'Solo Participation'}
                            </span>

                            {isAlreadyEnrolled ? (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="px-2.5 py-1 rounded-lg font-mono text-xs uppercase tracking-wider font-semibold border border-emerald-500/40 bg-emerald-500/15 text-emerald-400 flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  ENROLLED ✓
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUnenrollFreeEvent(ev)}
                                  aria-label={`Unenroll from ${ev.title}`}
                                  title="Unenroll from free event"
                                  className="p-1 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleFreeEnrollment(ev)}
                                className="px-3.5 py-1.5 rounded-lg font-mono text-xs uppercase tracking-wider font-semibold border border-emerald-500/60 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-white shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_22px_rgba(16,185,129,0.4)] transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                              >
                                <span>ENROLL NOW</span>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Side Scroll Button at the right of the div */}
                  {canScrollRightFree && (
                    <div className="absolute right-0 top-0 bottom-3.5 w-14 bg-gradient-to-l from-[#07090E] via-[#07090E]/80 to-transparent pointer-events-none flex items-center justify-end pr-1">
                      <button
                        type="button"
                        onClick={() => scrollFreeEvents('right')}
                        aria-label="Side scroll right"
                        className="pointer-events-auto p-2 rounded-full bg-[#0B0F17]/95 border border-emerald-500/50 text-emerald-400 hover:text-white hover:bg-emerald-500/30 shadow-[0_0_18px_rgba(16,185,129,0.35)] transition-all cursor-pointer hover:scale-105 active:scale-95"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Left Side Scroll Button when scrolled */}
                  {canScrollLeftFree && (
                    <div className="absolute left-0 top-0 bottom-3.5 w-14 bg-gradient-to-r from-[#07090E] via-[#07090E]/80 to-transparent pointer-events-none flex items-center justify-start pl-1">
                      <button
                        type="button"
                        onClick={() => scrollFreeEvents('left')}
                        aria-label="Side scroll left"
                        className="pointer-events-auto p-2 rounded-full bg-[#0B0F17]/95 border border-white/[0.15] text-zinc-300 hover:text-white hover:bg-white/[0.1] shadow-lg transition-all cursor-pointer hover:scale-105 active:scale-95"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 04 — Add Events Section (Side-by-Side Dual-Box Layout) */}
      <section className="flex flex-col gap-6 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.08] pb-3 gap-2">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base sm:text-lg font-subheading font-medium uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF6A00]" />
              Add Events
            </h2>
            <p className="text-xs font-mono text-zinc-500">
              Browse and select paid competitions below
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-400 shrink-0">
            {eligibleIndividualEvents.length + eligibleTeamEvents.length} paid events open
          </span>
        </div>

        {/* Two-Column Side-by-Side Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* LEFT BOX: Event Switcher & Available Catalog */}
          <div className="rounded-2xl border border-white/[0.12] bg-[#07090E] p-4 sm:p-5 flex flex-col gap-4 shadow-xl">
            {/* Segmented Switch at top: [ TEAM ] | [ INDIVIDUAL ] */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-black/60 border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setActiveTab('team')}
                className={`py-2 px-3 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  activeTab === 'team'
                    ? 'bg-[#FF6A00] text-white shadow-[0_0_15px_rgba(255,106,0,0.4)]'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                Team Events
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('individual')}
                className={`py-2 px-3 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  activeTab === 'individual'
                    ? 'bg-[#FF6A00] text-white shadow-[0_0_15px_rgba(255,106,0,0.4)]'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                Individual Events
              </button>
            </div>

            {/* List Header & Counter */}
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400 px-1 pt-1">
              <span>
                Available {activeTab === 'team' ? 'Team' : 'Individual'} Events
              </span>
              <span className="text-zinc-500">
                {(activeTab === 'team' ? eligibleTeamEvents : eligibleIndividualEvents).length} Available
              </span>
            </div>

            {/* Scrollable Events List */}
            <div className="flex flex-col gap-3 max-h-[620px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-700 hover:scrollbar-thumb-zinc-500">
              {activeTab === 'team' ? (
                eligibleTeamEvents.length === 0 ? (
                  <div className="py-12 px-4 text-center rounded-xl border border-dashed border-white/[0.08] text-zinc-500 font-mono text-xs">
                    All available team competitions are already selected or registered.
                  </div>
                ) : (
                  eligibleTeamEvents.map((ev) => (
                    <div
                      key={ev._id}
                      className="rounded-xl border border-white/[0.08] bg-white/[0.02] hover:border-white/[0.18] transition-all p-4 flex flex-col gap-2.5 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1 min-w-0">
                          <h4 className="font-subheading font-medium text-sm sm:text-base text-white tracking-wide">
                            {ev.title}
                          </h4>
                          {ev.short_description && (
                            <p className="text-xs text-zinc-400 line-clamp-1 leading-relaxed">
                              {ev.short_description}
                            </p>
                          )}
                        </div>
                        <span className="text-xs font-mono font-semibold text-emerald-400 shrink-0 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                          {ev.entry_fee ? `₹${ev.entry_fee}` : 'FREE'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.05] text-[11px] font-mono text-zinc-400">
                        <span className="text-zinc-300">
                          Squad: {ev.team_size || ev.min_team_size || 2} Members Required
                        </span>

                        <button
                          type="button"
                          onClick={() => handleSelectTeamEvent(ev._id)}
                          className="px-3 py-1.5 rounded-lg border border-[#FF6A00]/60 bg-[#FF6A00]/15 hover:bg-[#FF6A00]/25 text-[#FF8833] hover:text-white font-mono text-xs uppercase tracking-wider transition-all cursor-pointer font-medium shrink-0"
                        >
                          + Select Event
                        </button>
                      </div>
                    </div>
                  ))
                )
              ) : eligibleIndividualEvents.length === 0 ? (
                <div className="py-12 px-4 text-center rounded-xl border border-dashed border-white/[0.08] text-zinc-500 font-mono text-xs">
                  All available individual events are already selected or paid.
                </div>
              ) : (
                eligibleIndividualEvents.map((ev) => (
                  <div
                    key={ev._id}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.02] hover:border-white/[0.18] transition-all p-4 flex flex-col gap-2.5 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1 min-w-0">
                        <h4 className="font-subheading font-medium text-sm sm:text-base text-white tracking-wide">
                          {ev.title}
                        </h4>
                        {ev.short_description && (
                          <p className="text-xs text-zinc-400 line-clamp-1 leading-relaxed">
                            {ev.short_description}
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-mono font-semibold text-emerald-400 shrink-0 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                        {ev.entry_fee ? `₹${ev.entry_fee}` : 'FREE'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.05] text-[11px] font-mono text-zinc-400">
                      <span className="text-zinc-300">
                        Individual Participation
                      </span>

                      <button
                        type="button"
                        onClick={() => handleSelectIndividualEvent(ev._id)}
                        className="px-3 py-1.5 rounded-lg border border-[#FF6A00]/60 bg-[#FF6A00]/15 hover:bg-[#FF6A00]/25 text-[#FF8833] hover:text-white font-mono text-xs uppercase tracking-wider transition-all cursor-pointer font-medium shrink-0"
                      >
                        + Select Event
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT BOX: SELECTED EVENTS & Checkout */}
          <div className="rounded-2xl border border-white/[0.12] bg-[#07090E] p-4 sm:p-5 flex flex-col gap-4 shadow-xl">
            {/* Header: Title, Cart Expiration Notice & Counter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.08] pb-3 gap-2">
              <div className="flex flex-col gap-0.5">
                <h3 className="font-subheading font-semibold text-sm sm:text-base text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF6A00] animate-pulse" />
                  Selected Events
                </h3>
                <span className="text-xs font-mono text-amber-400/90 flex items-center gap-1.5">
                  ⏱️ This cart expires in 5 minutes
                </span>
              </div>
              <span className="text-xs font-mono text-zinc-400 bg-white/[0.05] border border-white/[0.08] px-2.5 py-0.5 rounded-full shrink-0 self-start sm:self-auto">
                {totalSelectedCount} Selected
              </span>
            </div>

            {/* Flat Unified List of Selected Events */}
            <div className="flex flex-col gap-3 max-h-[580px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-700 hover:scrollbar-thumb-zinc-500">
              {totalSelectedCount === 0 ? (
                <div className="py-16 px-4 text-center rounded-xl border border-dashed border-white/[0.08] text-zinc-500 font-mono text-xs flex flex-col items-center justify-center gap-2">
                  <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>No events selected yet.</span>
                  <span className="text-zinc-600 text-[11px]">Select events from the left box to add them here.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* 1. Unpaid Enrolled Individual Events */}
                  {pendingIndividual.map((item) => (
                    <div
                      key={item._id}
                      className="rounded-xl border border-white/[0.1] bg-black/40 hover:border-white/[0.18] transition-colors p-3.5 flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-subheading font-medium text-sm text-white truncate">
                              {item.event_title}
                            </h4>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-zinc-400 uppercase">
                              INDIVIDUAL
                            </span>
                          </div>
                          {item.event_details?.date_time && (
                            <span className="text-[11px] font-mono text-zinc-400 pt-0.5">
                              {item.event_details.date_time}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-xs font-mono font-medium text-emerald-400">
                            {item.event_details?.entry_fee ? `₹${item.event_details.entry_fee}` : 'FREE'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteEnrolled(item._id, item.event_id, 'individual')}
                            disabled={deletingEnrollId === item._id}
                            aria-label={`Remove ${item.event_title}`}
                            title="Remove event"
                            className="p-1 rounded-md text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {deletingEnrollId === item._id ? (
                              <span className="w-4 h-4 block border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 2. Newly Staged Individual Events */}
                  {selectedIndividualEventObjects.map((ev) => (
                    <div
                      key={ev._id}
                      className="rounded-xl border border-white/[0.1] bg-black/40 hover:border-white/[0.18] transition-colors p-3.5 flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-subheading font-medium text-sm text-white truncate">
                              {ev.title}
                            </h4>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-zinc-400 uppercase">
                              INDIVIDUAL
                            </span>
                            {(!ev.entry_fee || ev.entry_fee === 0) && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-semibold">
                                FREE
                              </span>
                            )}
                          </div>
                          {ev.date_time && (
                            <span className="text-[11px] font-mono text-zinc-400 pt-0.5">
                              {ev.date_time}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-xs font-mono font-medium text-emerald-400">
                            {ev.entry_fee ? `₹${ev.entry_fee}` : 'FREE'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveIndividual(ev._id)}
                            aria-label={`Remove ${ev.title}`}
                            title="Remove event"
                            className="p-1 rounded-md text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 3. Unpaid Enrolled Team Events */}
                  {pendingTeam.map((item) => (
                    <div
                      key={item._id}
                      className="rounded-xl border border-white/[0.1] bg-black/40 hover:border-white/[0.18] transition-colors p-3.5 flex flex-col gap-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-subheading font-medium text-sm text-white truncate">
                              {item.event_title}
                            </h4>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FF6A00]/20 text-[#FF8833] uppercase">
                              TEAM
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-zinc-400 pt-0.5">
                            Team: <span className="text-white font-medium">{item.team_name || 'Squad'}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-xs font-mono font-medium text-emerald-400">
                            {item.event_details?.entry_fee ? `₹${item.event_details.entry_fee}` : 'FREE'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteEnrolled(item._id, item.event_id, 'team')}
                            disabled={deletingEnrollId === item._id}
                            aria-label={`Remove ${item.event_title}`}
                            title="Remove team event"
                            className="p-1 rounded-md text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {deletingEnrollId === item._id ? (
                              <span className="w-4 h-4 block border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      {item.team_members && item.team_members.length > 0 && (
                        <div className="pt-2 border-t border-white/[0.06] flex flex-wrap gap-1.5 text-xs font-mono">
                          <span className="text-zinc-500 text-[10px] uppercase w-full">Teammates:</span>
                          {item.team_members.map((email) => (
                            <span key={email} className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-[10px] text-zinc-300">
                              {email}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* 4. Newly Staged Team Events with Setup Inputs */}
                  {selectedTeamEvents.map((tItem) => {
                    const ev = eventsList.find((e) => e._id === tItem.eventId);
                    if (!ev) return null;

                    const minSize = ev.min_team_size || 2;
                    const maxSize = ev.max_team_size || ev.team_size || 2;
                    const maxTeammates = Math.max(0, maxSize - 1);
                    const minTeammates = Math.max(0, minSize - 1);
                    const currentStatus = memberStatus[tItem.eventId] || 'idle';

                    return (
                      <div
                        key={tItem.eventId}
                        className="rounded-xl border border-white/[0.1] bg-black/40 hover:border-white/[0.18] transition-colors p-3.5 flex flex-col gap-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-subheading font-medium text-sm text-white truncate">
                                {ev.title}
                              </h4>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FF6A00]/20 text-[#FF8833] uppercase">
                                TEAM
                              </span>
                              {(!ev.entry_fee || ev.entry_fee === 0) && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-semibold">
                                  FREE
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-zinc-400 pt-0.5">
                              Team Size: Min {minSize} – Max {maxSize} members
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="text-xs font-mono font-medium text-emerald-400">
                              {ev.entry_fee ? `₹${ev.entry_fee}` : 'FREE'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTeam(tItem.eventId)}
                              aria-label={`Remove ${ev.title}`}
                              title="Remove team event"
                              className="p-1 rounded-md text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Team Form Fields */}
                        <div className="pt-2 border-t border-white/[0.06] flex flex-col gap-2.5 text-xs">
                          {/* Team Name */}
                          <div className="flex flex-col gap-1">
                            <label className="font-mono text-[10px] uppercase text-zinc-400">
                              Team Name <span className="text-[#FF6A00]">*</span>
                            </label>
                            <input
                              type="text"
                              value={tItem.teamName}
                              onChange={(e) => updateTeamName(tItem.eventId, e.target.value)}
                              placeholder="e.g. Apex Titans"
                              className="w-full bg-black/60 text-white font-sans text-xs px-3 py-2 rounded-lg border border-white/[0.12] focus:border-[#FF6A00] focus:outline-none"
                            />
                          </div>

                          {/* Leader (Read-only) */}
                          <div className="flex flex-col gap-1">
                            <label className="font-mono text-[10px] uppercase text-zinc-400">
                              Team Leader (You)
                            </label>
                            <input
                              type="email"
                              value={userEmail}
                              readOnly
                              className="w-full bg-white/[0.02] text-zinc-400 font-mono text-xs px-3 py-2 rounded-lg border border-white/[0.08] cursor-not-allowed"
                            />
                          </div>

                          {/* Teammates List & Progressive Addition */}
                          {maxTeammates > 0 && (
                            <div className="flex flex-col gap-2 pt-1">
                              <div className="flex items-center justify-between">
                                <label className="font-mono text-[10px] uppercase text-zinc-400">
                                  Teammates ({tItem.teamMembers.length}/{maxTeammates} added • Min {minTeammates} required)
                                </label>
                              </div>

                              {/* Verified Members List */}
                              {(tItem.verifiedDetails || []).map((m, mIdx) => (
                                <div
                                  key={m.email}
                                  className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0 pr-2">
                                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                                      ✓
                                    </span>
                                    <div className="flex items-center gap-2 min-w-0 truncate">
                                      <span className="text-white font-medium text-xs truncate">
                                        {m.name || `Member ${mIdx + 1}`}
                                      </span>
                                      <span className="text-zinc-400 font-mono text-[11px] truncate">
                                        ({m.email})
                                      </span>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveVerifiedMember(tItem.eventId, m.email)}
                                    aria-label={`Remove ${m.name || m.email}`}
                                    className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer shrink-0"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              ))}

                              {/* Teammate Input with + / ✓ / ✕ Button */}
                              {tItem.teamMembers.length < maxTeammates ? (
                                <div className="flex flex-col gap-1.5 pt-0.5">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="email"
                                      value={pendingMemberEmail[tItem.eventId] || ''}
                                      onChange={(e) => {
                                        setPendingMemberEmail((prev) => ({
                                          ...prev,
                                          [tItem.eventId]: e.target.value,
                                        }));
                                        if (memberError[tItem.eventId]) {
                                          setMemberError((prev) => ({
                                            ...prev,
                                            [tItem.eventId]: null,
                                          }));
                                        }
                                        if (memberStatus[tItem.eventId] && memberStatus[tItem.eventId] !== 'idle') {
                                          setMemberStatus((prev) => ({
                                            ...prev,
                                            [tItem.eventId]: 'idle',
                                          }));
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleVerifyAndAddMember(tItem.eventId);
                                        }
                                      }}
                                      disabled={verifyingMember[tItem.eventId]}
                                      placeholder={`Enter teammate ${tItem.teamMembers.length + 1} registered email`}
                                      className="flex-1 bg-black/60 text-white font-mono text-xs px-3 py-2 rounded-lg border border-white/[0.12] focus:border-[#FF6A00] focus:outline-none disabled:opacity-50"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleVerifyAndAddMember(tItem.eventId)}
                                      disabled={
                                        verifyingMember[tItem.eventId] ||
                                        !(pendingMemberEmail[tItem.eventId] || '').trim()
                                      }
                                      title={
                                        currentStatus === 'success'
                                          ? 'Verified'
                                          : currentStatus === 'error'
                                          ? 'Not Paid or Not Found'
                                          : 'Verify Teammate'
                                      }
                                      className={`h-9 w-9 rounded-lg font-bold text-sm flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${
                                        currentStatus === 'success'
                                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                                          : currentStatus === 'error'
                                          ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                                          : 'bg-[#FF6A00]/20 text-[#FF8833] border border-[#FF6A00]/60 hover:bg-[#FF6A00] hover:text-white'
                                      }`}
                                    >
                                      {verifyingMember[tItem.eventId] ? (
                                        <svg className="animate-spin w-4 h-4 text-[#FF6A00]" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                      ) : currentStatus === 'success' ? (
                                        <span className="text-base leading-none">✓</span>
                                      ) : currentStatus === 'error' ? (
                                        <span className="text-base leading-none">✕</span>
                                      ) : (
                                        <span className="text-base leading-none font-bold">+</span>
                                      )}
                                    </button>
                                  </div>

                                  {/* Red alert message when not paid or not found */}
                                  {memberError[tItem.eventId] && (
                                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-400 flex items-start gap-2">
                                      <span className="shrink-0">⚠️</span>
                                      <span>{memberError[tItem.eventId]}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.06] text-[11px] font-mono text-zinc-500 text-center">
                                  Maximum squad limit reached for this event.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Actions inside Right Box */}
            <div className="pt-3 border-t border-white/[0.08] flex flex-col gap-3 mt-auto">
              {/* Total Summary Row */}
              <div className="flex items-center justify-between px-1">
                <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">
                  Total Payable:
                </span>
                <span className="font-sans font-bold text-base text-emerald-400">
                  {totalFee > 0 ? `₹${totalFee}` : '₹0'}
                </span>
              </div>

              {feedbackError && (
                <div
                  className="text-xs text-red-400 font-mono tracking-wide px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/20"
                  role="alert"
                >
                  {feedbackError}
                </div>
              )}

              {feedbackSuccess && (
                <div
                  className="text-xs text-emerald-400 font-mono tracking-wide px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
                  role="status"
                >
                  {feedbackSuccess}
                </div>
              )}

              <button
                type="button"
                onClick={handleProceedToCheckout}
                disabled={submitting || totalSelectedCount === 0}
                className="w-full relative group overflow-hidden inline-flex items-center justify-center border border-[#FF6A00]/70 hover:border-[#FF6A00] bg-[#FF6A00]/20 text-white font-mono text-xs sm:text-sm tracking-wider uppercase rounded-xl py-3 shadow-[0_0_25px_rgba(255,106,0,0.25)] hover:shadow-[0_0_35px_rgba(255,106,0,0.5)] transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-r from-[#FF6A00] via-[#FF3B2E] to-[#D8182B] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"
                />
                <span className="relative z-10 font-bold tracking-widest flex items-center gap-2">
                  {submitting ? 'Processing Enrolment...' : 'Proceed to Checkout'}
                  {!submitting && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
