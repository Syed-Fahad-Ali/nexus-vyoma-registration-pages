import { Suspense } from 'react';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import Navbar from '@/components/navbar/Navbar';
import FooterSection from '@/components/footer/FooterSection';
import { MinimalBrandBackground } from '@/components/brand/VisualTextures';
import EventEnrollmentView, {
  SerializedEvent,
  SerializedEnrolledEvent,
} from '@/components/registration/EventEnrollmentView';
import { verifyJWT } from '@/utilities/jwt';

interface SessionTokenData {
  user?: { id?: string; name?: string; email?: string };
}

/** Read + verify both session cookies set by /api/registration/verify-email. */
async function getVerifiedSessionUser() {
  const cookieStore = await cookies();
  const userToken = cookieStore.get('nv-session')?.value;
  const tempToken = cookieStore.get('nv-session-temp')?.value;
  if (!userToken || !tempToken) return null;

  const userData = verifyJWT(userToken) as SessionTokenData | null;
  const tempData = verifyJWT(tempToken) as SessionTokenData | null;
  if (!userData?.user?.email || !tempData?.user?.email) return null;
  if (userData.user.email !== tempData.user.email) return null;

  return {
    id: userData.user.id || '',
    name: userData.user.name || 'Attendee',
    email: userData.user.email,
  };
}

export const metadata: Metadata = {
  title: 'Event Enrolment | Nexus Vyoma 2026',
  description:
    'Enroll in individual and team events, competitions, and workshops for Nexus Vyoma 2026 at ISL Engineering College, Hyderabad.',
};

// ---------------------------------------------------------------------------
// Mappers: API Doc -> Serialized shape expected by EventEnrollmentView
// ---------------------------------------------------------------------------

function mapEvent(e: Record<string, unknown>): SerializedEvent {
  return {
    _id: String(e._id ?? ''),
    title: String(e.title ?? ''),
    short_description: e.short_description ? String(e.short_description) : undefined,
    long_description: e.long_description ? String(e.long_description) : undefined,
    venue: e.venue ? String(e.venue) : undefined,
    date_time: e.date_time ? String(e.date_time) : undefined,
    image_url: e.image_url ? String(e.image_url) : undefined,
    entry_fee:
      typeof e.entry_fee === 'number'
        ? e.entry_fee
        : e.entry_fee !== undefined && e.entry_fee !== null && e.entry_fee !== ''
        ? Number(e.entry_fee) || 0
        : 0,
    participants_type: (e.participants_type as 'individual' | 'team') ?? undefined,
    team_size: typeof e.team_size === 'number' ? e.team_size : undefined,
    min_team_size: typeof e.min_team_size === 'number' ? e.min_team_size : undefined,
    max_team_size: typeof e.max_team_size === 'number' ? e.max_team_size : undefined,
    category: e.category ? String(e.category) : undefined,
    isTechEvent: Boolean(e.isTechEvent),
    isSoldOut: Boolean(e.isSoldOut),
  };
}

function mapPurchasedEvent(
  doc: Record<string, unknown>,
  currentUserName: string,
  currentUserEmail: string,
): SerializedEnrolledEvent {
  const isTeam = Boolean(
    doc.team_name ||
    doc.team_leader_register_user_id ||
    Array.isArray(doc.team_emails)
  );

  const eventObj =
    doc.event_id && typeof doc.event_id === 'object'
      ? (doc.event_id as Record<string, unknown>)
      : null;

  const eventId = String(eventObj?._id ?? doc.event_id ?? '');
  const eventTitle = String(eventObj?.title ?? 'Enrolled Event');
  const shortDescription = eventObj?.short_description
    ? String(eventObj.short_description)
    : undefined;

  if (isTeam) {
    const leaderObj =
      doc.team_leader_register_user_id &&
      typeof doc.team_leader_register_user_id === 'object'
        ? (doc.team_leader_register_user_id as Record<string, unknown>)
        : null;

    const teamEmails = Array.isArray(doc.team_emails)
      ? (doc.team_emails as string[])
      : [];

    const teamLength =
      typeof doc.team_length === 'number'
        ? doc.team_length
        : teamEmails.length + 1;

    return {
      _id: String(doc._id),
      event_id: eventId,
      event_title: eventTitle,
      participation_type: 'team',
      team_name: doc.team_name ? String(doc.team_name) : 'Squad',
      team_leader_name: leaderObj?.full_name
        ? String(leaderObj.full_name)
        : currentUserName,
      team_leader_email: leaderObj?.email
        ? String(leaderObj.email)
        : currentUserEmail,
      team_leader_phone: leaderObj?.phone_number
        ? String(leaderObj.phone_number)
        : null,
      team_size: teamLength,
      team_members: teamEmails,
      event_details: {
        _id: eventId,
        title: eventTitle,
        short_description: shortDescription,
        participants_type: 'team',
      },
    };
  }

  return {
    _id: String(doc._id),
    event_id: eventId,
    event_title: eventTitle,
    participation_type: 'individual',
    event_details: {
      _id: eventId,
      title: eventTitle,
      short_description: shortDescription,
      participants_type: 'individual',
    },
  };
}

// ---------------------------------------------------------------------------
// Server-side data fetcher
// ---------------------------------------------------------------------------

async function fetchEnrollmentData(cookieHeader: string) {
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const proto = headersList.get('x-forwarded-proto') || 'http';
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || `${proto}://${host}`;

  try {
    const res = await fetch(`${baseUrl}/api/enrollement/enrolled-event`, {
      method: 'GET',
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    });

    const json = await res.json().catch(() => null);
    return { json, status: res.status };
  } catch (error) {
    console.error('fetchEnrollmentData error:', error);
    return { json: null, status: 500 };
  }
}

// ---------------------------------------------------------------------------
// Main async server component
// ---------------------------------------------------------------------------

async function EnrollEventContent() {
  await connection();

  // Server-side session guard
  const sessionUser = await getVerifiedSessionUser();
  if (!sessionUser) {
    redirect('/register/check-email');
  }

  // Forward cookies so the API route can verify the session
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const { json, status } = await fetchEnrollmentData(cookieHeader);

  // Honour redirect responses from the API (e.g. expired token or unpaid ticket)
  if (json?.redirect && json?.redirectUrl) {
    redirect(json.redirectUrl as string);
  }

  // Hard failure — send user back to start
  if (status !== 200 || !json?.data) {
    redirect('/register/check-email');
  }

  const { data } = json as {
    data: {
      user: { id: string; name: string; email: string };
      purchasedEvents: Record<string, unknown>[];
      availableFreeEvents: Record<string, unknown>[];
      availableTechEvents: Record<string, unknown>[];
    };
  };

  const userName = data.user?.name || sessionUser.name;
  const userEmail = data.user?.email || sessionUser.email;

  const purchasedEvents: SerializedEnrolledEvent[] = Array.isArray(data.purchasedEvents)
    ? data.purchasedEvents.map((doc) => mapPurchasedEvent(doc, userName, userEmail))
    : [];

  const availableFreeEvents: SerializedEvent[] = Array.isArray(data.availableFreeEvents)
    ? data.availableFreeEvents.map(mapEvent)
    : [];

  const availableTechEvents: SerializedEvent[] = Array.isArray(data.availableTechEvents)
    ? data.availableTechEvents.map(mapEvent)
    : [];

  return (
    <EventEnrollmentView
      userName={userName}
      userEmail={userEmail}
      initialPurchasedEvents={purchasedEvents}
      initialFreeEvents={availableFreeEvents}
      initialTechEvents={availableTechEvents}
    />
  );
}

export default function EnrollEventPage() {
  return (
    <div className="relative min-h-screen flex flex-col bg-[#000000] text-white selection:bg-[#FF6A00] selection:text-white overflow-x-hidden">
      {/* 00 — Atmospheric Brand Background (Section 7 Textures at Minimal Level) */}
      <MinimalBrandBackground />

      {/* 01 — Mirror-Glass Navbar */}
      <Navbar alwaysVisible />

      {/* 02 — Main Enrolment Stage */}
      <main
        suppressHydrationWarning
        className="flex-1 w-full px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-16 z-10 bg-transparent"
      >
        <Suspense
          fallback={
            <div className="w-full max-w-7xl mx-auto py-20 flex items-center justify-center font-mono text-zinc-500 text-sm">
              Loading Enrolment Portal...
            </div>
          }
        >
          <EnrollEventContent />
        </Suspense>
      </main>

      {/* 03 — Footer */}
      <FooterSection />
    </div>
  );
}
