import { connectToDatabase } from '@/database/db';
import Package from '@/database/schema/package.schema';
import Event from '@/database/schema/event.schema';
import { EVENTS_CATALOG } from '@/lib/data/eventsCatalog';

export interface SerializedPackage {
  id: string;
  title: string;
  subtitle?: string;
  price: number;
  isEntryTicket: boolean;
  isShowOnEntryPage: boolean;
  indexPackage: number;
  inclusions: string[];
  isRecommended?: boolean;
  recommendationTag?: string;
  mobileOrderClass?: string;
}

export interface SerializedWorkshop {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  shortDescription?: string;
  date: string;
  time?: string;
  venue?: string;
  fee: number;
  imageUrl?: string;
  participationType?: string;
  category?: string;
  isFlagship?: boolean;
  isRecommended?: boolean;
}

export interface PackagesPageData {
  packages: SerializedPackage[];
  workshops: SerializedWorkshop[];
  entryTicketPrice: number;
}

// EXACT 6 CANONICAL PASSES (Clean 3-3 Desktop & 2-2-2 Mobile Layout)
const CANONICAL_6_PACKAGES: SerializedPackage[] = [
  {
    id: 'qawali',
    title: 'QAWWALI PASS',
    subtitle: 'Jashn-e-Suroor Live Experience',
    price: 499,
    isEntryTicket: true,
    isShowOnEntryPage: true,
    indexPackage: 1,
    inclusions: ['3 Day entry', '9 Free events', 'qawali access'],
    isRecommended: true,
    recommendationTag: 'RECOMMENDED',
  },
  {
    id: 'elipse-dj',
    title: 'ELIPSE DJ',
    subtitle: 'Eclipse 404 Night Arena',
    price: 499,
    isEntryTicket: true,
    isShowOnEntryPage: true,
    indexPackage: 2,
    inclusions: ['3 Day entry', '9 Free events', 'DJ access'],
    isRecommended: true,
    recommendationTag: 'FLAGSHIP',
  },
  {
    id: 'gel-blaster',
    title: 'GEL BLASTER',
    subtitle: 'Tactical Combat Arena',
    price: 399,
    isEntryTicket: true,
    isShowOnEntryPage: true,
    indexPackage: 3,
    inclusions: ['3 Day entry', '9 Free events', 'Gelblas access'],
  },
  {
    id: 'open-mic',
    title: 'OPEN MIC',
    subtitle: 'Live Stage & Spotlight',
    price: 399,
    isEntryTicket: true,
    isShowOnEntryPage: true,
    indexPackage: 4,
    inclusions: ['3 Day entry', '9 Free events', 'Open mIc access'],
  },
  {
    id: 'arty-affairs',
    title: 'ARTY AFFAIRS',
    subtitle: 'Creative Arts & Crafts',
    price: 399,
    isEntryTicket: true,
    isShowOnEntryPage: true,
    indexPackage: 5,
    inclusions: ['3 Day entry', '9 Free events', 'artyaff(1) access'],
  },
  {
    id: 'signature-experiences',
    title: 'SIGNATURE EXPERIENCES',
    subtitle: 'Flagship All-Access Pass',
    price: 599,
    isEntryTicket: true,
    isShowOnEntryPage: true,
    indexPackage: 6,
    inclusions: ['3 Day entry', '9 Free events', 'jashn - e - suroor access'],
    isRecommended: true,
    recommendationTag: 'PREMIUM PASS',
  },
];

// Rich Fallback Workshops matching /events catalog
const FALLBACK_WORKSHOPS: SerializedWorkshop[] = [
  {
    id: 'ws-financial-detective',
    code: 'WS / 01',
    title: 'FINANCIAL DETECTIVE',
    subtitle: 'Forensic Accounting & Corporate Fraud Analysis',
    shortDescription:
      'Interactive forensic accounting and financial statement analysis workshop uncovering corporate anomalies and disguised balance sheets.',
    date: '10 November',
    time: '10:30 AM',
    venue: 'Seminar Hall 1',
    fee: 150,
    imageUrl: EVENTS_CATALOG.find((e) => e.slug === 'financial-detective')?.imageUrl,
    participationType: 'Individual',
    category: 'Workshop',
    isFlagship: false,
    isRecommended: false,
  },
  {
    id: 'ws-future-city',
    code: 'WS / 02',
    title: 'FUTURE CITY',
    subtitle: 'Sustainable Urban Prototyping & Clean Infrastructure',
    shortDescription:
      'Sustainable urban planning, green architecture, and smart transit prototyping workshop exploring zero-emission infrastructure.',
    date: '11 November',
    time: '11:30 AM',
    venue: 'Design Studio Block',
    fee: 200,
    imageUrl: EVENTS_CATALOG.find((e) => e.slug === 'future-city')?.imageUrl,
    participationType: 'Team of 2–4',
    category: 'Workshop',
    isFlagship: true,
    isRecommended: true,
  },
  {
    id: 'ws-drug-discovery',
    code: 'WS / 03',
    title: 'DRUG DISCOVERY CHALLENGE',
    subtitle: 'Computational Bio-Modeling & Molecular Docking',
    shortDescription:
      'Computational bio-modeling session focusing on molecular docking pipelines and therapeutic research against contemporary pathogen targets.',
    date: '12 November',
    time: '03:00 PM',
    venue: 'Bio-Tech Innovation Lab',
    fee: 150,
    imageUrl: EVENTS_CATALOG.find((e) => e.slug === 'drug-discovery-challenge')?.imageUrl,
    participationType: 'Individual',
    category: 'Workshop',
    isFlagship: false,
    isRecommended: false,
  },
];

export async function loadPackagesPageData(): Promise<PackagesPageData> {
  const entryTicketPrice = Number(process.env.ENTRY_TICKET_PRICE) || 299;

  try {
    await connectToDatabase();

    // 1. Fetch packages from existing MongoDB 'packages' collection
    const rawPackages = await Package.find({}).populate('eventIds').sort({ indexPackage: 1 }).lean();

    let packages: SerializedPackage[] = [];

    if (rawPackages && rawPackages.length > 0) {
      packages = rawPackages.slice(0, 6).map((doc: any, i: number) => {
        const events = Array.isArray(doc.eventIds) ? doc.eventIds : [];
        const eventTitles = events.map((e: any) => e?.title || 'Special Event');

        const inclusions: string[] = ['3 Day entry', '9 Free events'];
        if (eventTitles.length > 0) {
          inclusions.push(`${eventTitles[0].toLowerCase()} access`);
        } else {
          inclusions.push('event access');
        }

        const isRecommended = i < 2 || doc.price >= 499;
        const defaultSubtitle = CANONICAL_6_PACKAGES[i]?.subtitle || (eventTitles.length > 0 ? `${eventTitles[0]} Experience` : 'Festival Experience');
        const subtitle = doc.subtitle ? String(doc.subtitle) : defaultSubtitle;

        return {
          id: String(doc._id),
          title: String(doc.title || `PACKAGE ${i + 1}`).toUpperCase(),
          subtitle,
          price: Number(doc.price) || entryTicketPrice,
          isEntryTicket: Boolean(doc.isEntryTicket),
          isShowOnEntryPage: Boolean(doc.isShowOnEntryPage),
          indexPackage: Number(doc.indexPackage) || i + 1,
          inclusions,
          isRecommended,
          recommendationTag: i === 0 ? 'RECOMMENDED' : i === 1 ? 'FLAGSHIP' : doc.price >= 499 ? 'PREMIUM' : undefined,
        };
      });
    }

    if (packages.length < 6) {
      packages = CANONICAL_6_PACKAGES;
    }

    // 2. Fetch workshops from existing MongoDB 'events' collection
    const rawEvents = await Event.find({}).lean();
    const workshopEvents = rawEvents.filter((e: any) => {
      const cat = (e?.category || '').toLowerCase();
      const title = (e?.title || '').toLowerCase();
      return cat.includes('workshop') || title.includes('workshop');
    });

    let workshops: SerializedWorkshop[] = [];

    if (workshopEvents.length > 0) {
      workshops = workshopEvents.slice(0, 3).map((w: any, idx: number) => {
        let dateStr = '10 November';
        let timeStr = '11:00 AM';
        if (w.date_time) {
          const parsed = new Date(w.date_time);
          if (!Number.isNaN(parsed.getTime())) {
            dateStr = new Intl.DateTimeFormat('en-GB', {
              timeZone: 'Asia/Kolkata',
              day: 'numeric',
              month: 'long',
            }).format(parsed);
            timeStr = new Intl.DateTimeFormat('en-US', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            }).format(parsed);
          } else {
            const parts = String(w.date_time).split(',');
            dateStr = parts[0].trim();
            if (parts[1]) timeStr = parts.slice(1).join(',').trim();
          }
        }

        const isFlagship = Boolean(w.isFlatship);

        return {
          id: String(w._id),
          code: `WS / 0${idx + 1}`,
          title: String(w.title || 'WORKSHOP').toUpperCase(),
          subtitle: String(w.short_description || w.long_description || 'Hands-on Masterclass'),
          shortDescription: w.short_description || w.long_description || '',
          date: dateStr,
          time: timeStr,
          venue: w.venue || 'ISL Engineering College',
          fee: Number(w.entry_fee) || 150,
          imageUrl: w.image_url || undefined,
          participationType: w.participants_type === 'team' ? 'Team' : 'Individual',
          category: w.category || 'Workshop',
          isFlagship,
          isRecommended: isFlagship || idx === 1,
        };
      });
    }

    if (workshops.length === 0) {
      workshops = FALLBACK_WORKSHOPS;
    }

    return {
      packages,
      workshops,
      entryTicketPrice,
    };
  } catch (error) {
    console.error('Error loading packages page data from database:', error);
    return {
      packages: CANONICAL_6_PACKAGES,
      workshops: FALLBACK_WORKSHOPS,
      entryTicketPrice,
    };
  }
}
