export interface RawPackageEvent {
  _id?: string;
  title?: string;
  short_description?: string;
  long_description?: string;
  venue?: string;
  date_time?: string;
  image_url?: string;
  isFlatship?: boolean;
  isFlagship?: boolean;
  category?: string;
  participant_limit?: number;
  prize?: string;
  entry_fee?: number;
  participants_type?: string;
  team_size?: number;
  requirements?: string[];
  min_team_size?: number;
  max_team_size?: number;
  index?: number;
  isTechEvent?: boolean;
  isSoldOut?: boolean;
  isSoldout?: boolean;
  fewRemaining?: boolean;
  purchased?: boolean;
  isPurchased?: boolean;
}

export interface RawPackageDoc {
  _id?: string;
  title?: string;
  eventIds?: RawPackageEvent[];
  events?: RawPackageEvent[];
  isEntryTicket?: boolean;
  price?: number;
  isShowOnEntryPage?: boolean;
  indexPackage?: number;
  isSoldOut?: boolean;
  isSoldout?: boolean;
  fewRemaining?: boolean;
  purchased?: boolean;
  isPurchased?: boolean;
}

export interface RawPackageApiItem {
  package?: RawPackageDoc;
}

export interface PackageApiResponse {
  message?: string;
  data?: RawPackageApiItem[] | null;
  error?: unknown;
  redirect?: boolean;
  redirectUrl?: string | null;
}

export interface SerializedPackage {
  id: string;
  packageId: string;
  eventId?: string;
  title: string;
  subtitle: string;
  shortDescription?: string;
  longDescription?: string;
  venue?: string;
  dateTime?: string;
  formattedDate?: string;
  formattedTime?: string;
  imageUrl?: string;
  category?: string;
  prize?: string;
  participantsType?: string;
  participantLimit?: number;
  price: number;
  isEntryTicket: boolean;
  isShowOnEntryPage: boolean;
  indexPackage: number;
  inclusions: string[];
  isFlagship: boolean;
  isSoldOut: boolean;
  fewRemaining: boolean;
  isPurchased: boolean;
  isRecommended?: boolean;
  recommendationTag?: string;
  mobileOrderClass?: string;
}

export interface SerializedWorkshop {
  id: string;
  packageId: string;
  eventId?: string;
  packageTitle: string;
  indexPackage: number;
  code: string;
  title: string;
  subtitle: string;
  shortDescription?: string;
  longDescription?: string;
  date: string;
  time?: string;
  venue?: string;
  prize?: string;
  fee: number;
  imageUrl?: string;
  participationType?: string;
  category?: string;
  isEntryTicket: boolean;
  isFlagship: boolean;
  isSoldOut: boolean;
  fewRemaining: boolean;
  isPurchased: boolean;
}

export interface PackagesPageData {
  packages: SerializedPackage[];
  workshops: SerializedWorkshop[];
  entryTicketPrice: number;
}

export function formatPackageEventSchedule(rawDateStr?: string): { date: string; time: string } {
  if (!rawDateStr || rawDateStr === 'Schedule TBA') {
    return { date: '10–12 November', time: '' };
  }
  try {
    const parsed = new Date(rawDateStr);
    if (!Number.isNaN(parsed.getTime())) {
      const date = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
      }).format(parsed);
      const time = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(parsed);
      return { date, time };
    }
    const parts = String(rawDateStr).split(',');
    return {
      date: parts[0]?.trim() || rawDateStr,
      time: parts.slice(1).join(',').trim(),
    };
  } catch {
    return { date: rawDateStr, time: '' };
  }
}

function getMergedEvents(pkg: RawPackageDoc): RawPackageEvent[] {
  if (Array.isArray(pkg.events) && pkg.events.length > 0) {
    return pkg.events;
  }
  if (Array.isArray(pkg.eventIds) && pkg.eventIds.length > 0) {
    return pkg.eventIds;
  }
  return [];
}

function isWorkshopPassTitle(title?: string): boolean {
  const normalized = (title || '').trim().toUpperCase();
  return (
    normalized === 'WORKSHOP PASS' ||
    normalized === 'WORKSHOP PASSES' ||
    normalized.includes('WORKSHOP PASS')
  );
}

/**
 * Parses and aligns the response data from GET /api/package:
 * 1. Sorts all packages by `indexPackage` ascending.
 * 2. Separates "WORKSHOP PASS" / "WORKSHOP PASSES" into `workshops` container.
 * 3. Maps remaining packages into `packages` with `package.title` as card title and `event.title` as subtitle.
 * 4. Computes `isSoldOut`, `fewRemaining`, and `isPurchased` flags accurately.
 */
export function parseApiPackagesData(rawItems?: RawPackageApiItem[] | null): PackagesPageData {
  const entryTicketPrice = Number(process.env.NEXT_PUBLIC_ENTRY_TICKET_PRICE) || 299;

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return {
      packages: [],
      workshops: [],
      entryTicketPrice,
    };
  }

  // Extract valid package objects and sort ascending by indexPackage
  const validPackages: RawPackageDoc[] = rawItems
    .map((item) => (item?.package ? item.package : (item as unknown as RawPackageDoc)))
    .filter((pkg): pkg is RawPackageDoc => Boolean(pkg && pkg._id));

  validPackages.sort((a, b) => {
    const idxA = typeof a.indexPackage === 'number' ? a.indexPackage : Number(a.indexPackage) || 0;
    const idxB = typeof b.indexPackage === 'number' ? b.indexPackage : Number(b.indexPackage) || 0;
    return idxA - idxB;
  });

  const packages: SerializedPackage[] = [];
  const workshops: SerializedWorkshop[] = [];

  for (const pkg of validPackages) {
    const pkgId = String(pkg._id);
    const pkgTitle = String(pkg.title || 'FESTIVAL PASS').trim();
    const pkgPrice = Number(pkg.price) || entryTicketPrice;
    const isEntryTicket = Boolean(pkg.isEntryTicket);
    const isShowOnEntryPage = pkg.isShowOnEntryPage !== undefined ? Boolean(pkg.isShowOnEntryPage) : true;
    const indexPackage = Number(pkg.indexPackage) || 0;

    const events = getMergedEvents(pkg);
    const primaryEvent = events[0] || {};

    // Status flags across package and its events
    const isPurchased = Boolean(
      pkg.purchased ||
        pkg.isPurchased ||
        events.some((e) => Boolean(e?.purchased || e?.isPurchased))
    );

    const isSoldOut = Boolean(
      pkg.isSoldOut ||
        pkg.isSoldout ||
        events.some((e) => Boolean(e?.isSoldOut || e?.isSoldout))
    );

    // Only mark fewRemaining if not already sold out
    const fewRemaining =
      !isSoldOut &&
      Boolean(pkg.fewRemaining || events.some((e) => Boolean(e?.fewRemaining)));

    const isFlagship = Boolean(
      primaryEvent.isFlatship ||
        primaryEvent.isFlagship ||
        events.some((e) => Boolean(e?.isFlatship || e?.isFlagship))
    );

    const { date, time } = formatPackageEventSchedule(primaryEvent.date_time);

    if (isWorkshopPassTitle(pkgTitle)) {
      const wsIndex = workshops.length + 1;
      const eventTitle = String(primaryEvent.title || pkgTitle).trim();
      const shortDesc = String(
        primaryEvent.short_description || primaryEvent.long_description || ''
      ).trim();

      workshops.push({
        id: pkgId,
        packageId: pkgId,
        eventId: primaryEvent._id ? String(primaryEvent._id) : undefined,
        packageTitle: pkgTitle,
        indexPackage,
        code: `WS / 0${wsIndex}`,
        title: eventTitle,
        subtitle: shortDesc,
        shortDescription: shortDesc,
        longDescription: primaryEvent.long_description
          ? String(primaryEvent.long_description).trim()
          : undefined,
        date,
        time,
        venue: primaryEvent.venue ? String(primaryEvent.venue).trim() : undefined,
        prize: primaryEvent.prize ? String(primaryEvent.prize).trim() : undefined,
        fee: pkgPrice,
        imageUrl: primaryEvent.image_url
          ? String(primaryEvent.image_url).trim()
          : (primaryEvent as Record<string, unknown>).imageUrl
          ? String((primaryEvent as Record<string, unknown>).imageUrl).trim()
          : undefined,
        participationType:
          primaryEvent.participants_type === 'team' ? 'Team' : 'Individual',
        category: primaryEvent.category ? String(primaryEvent.category).trim() : 'Workshop',
        isEntryTicket,
        isFlagship,
        isSoldOut,
        fewRemaining,
        isPurchased,
      });
    } else {
      // Subtitle is event.title below package.title
      const eventTitles = events
        .map((e) => (e?.title ? String(e.title).trim() : ''))
        .filter(Boolean);
      const subtitle = eventTitles.length > 0 ? eventTitles.join(' + ') : 'Festival Access Pass';

      // Build inclusions list from package & event properties
      const inclusions: string[] = [];
      if (isEntryTicket) {
        inclusions.push('3 Day Entry');
        inclusions.push('9 Free Events');
      }
      if (eventTitles.length > 0) {
        for (const evTitle of eventTitles) {
          inclusions.push(`${evTitle} Access`);
        }
      }

      packages.push({
        id: pkgId,
        packageId: pkgId,
        eventId: primaryEvent._id ? String(primaryEvent._id) : undefined,
        title: pkgTitle,
        subtitle,
        shortDescription: primaryEvent.short_description
          ? String(primaryEvent.short_description).trim()
          : undefined,
        longDescription: primaryEvent.long_description
          ? String(primaryEvent.long_description).trim()
          : undefined,
        venue: primaryEvent.venue ? String(primaryEvent.venue).trim() : undefined,
        dateTime: primaryEvent.date_time ? String(primaryEvent.date_time) : undefined,
        formattedDate: date,
        formattedTime: time,
        imageUrl: primaryEvent.image_url
          ? String(primaryEvent.image_url).trim()
          : (primaryEvent as Record<string, unknown>).imageUrl
          ? String((primaryEvent as Record<string, unknown>).imageUrl).trim()
          : undefined,
        category: primaryEvent.category ? String(primaryEvent.category).trim() : undefined,
        prize: primaryEvent.prize ? String(primaryEvent.prize).trim() : undefined,
        participantsType: primaryEvent.participants_type
          ? String(primaryEvent.participants_type)
          : undefined,
        participantLimit:
          typeof primaryEvent.participant_limit === 'number'
            ? primaryEvent.participant_limit
            : undefined,
        price: pkgPrice,
        isEntryTicket,
        isShowOnEntryPage,
        indexPackage,
        inclusions,
        isFlagship,
        isSoldOut,
        fewRemaining,
        isPurchased,
        isRecommended: isFlagship,
        recommendationTag: isFlagship ? 'FLAGSHIP' : undefined,
      });
    }
  }

  return {
    packages,
    workshops,
    entryTicketPrice,
  };
}
