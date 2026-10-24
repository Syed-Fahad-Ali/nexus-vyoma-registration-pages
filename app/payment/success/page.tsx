import { Suspense } from 'react';
import type { Metadata } from 'next';
import StatusLayout from '@/components/payment/StatusLayout';
import StatusCard from '@/components/payment/StatusCard';
import EntryPassSuccessView, {
  type PaidEventSummary,
} from '@/components/payment/EntryPassSuccessView';

export const metadata: Metadata = {
  title: 'Payment Successful | Nexus Vyoma',
  description:
    'Your transaction has been verified and registration confirmed for Nexus Vyoma 2026 at ISL Engineering College, Hyderabad.',
};

interface SuccessPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * The 6 curated premium events in the exact sequence requested by user:
 * 1. Jashn - E - Suroor (Qawwali Night)
 * 2. Eclipse 404
 * 3. CHARCHA
 * 4. Nexus Gel Blaster
 * 5. WEB 2 BUILD – Startup Initiative Hackathon
 * 6. Gemini Genie - Vibe coding Hackathon
 */
const SEQUENCED_TARGETS: PaidEventSummary[] = [
  {
    id: '6ad5c4e4959eb51581b6c908',
    slug: '6ad5c4e4959eb51581b6c908',
    title: 'Jashn - E - Suroor (Qawwali Night)',
    category: 'Entertainment',
    date: '12 Nov 2026',
    time: '6:00 PM',
    venue: 'Block-A, Ground Floor',
    price: 599,
    priceFormatted: '₹599',
    shortDescription:
      'Qawwali is a traditional form of Sufi music that brings people together through soulful singing, rhythmic clapping, and powerful musical performances celebrating timeless spiritual melodies.',
    imageUrl:
      'https://nexus-vyoma.s3.ap-south-2.amazonaws.com/event-banners/8c3657a4-488b-45e3-b05a-f84504d3b51e.jpeg',
    accentColor: '#FBB03B',
  },
  {
    id: '6ad32acf8fd375e15558c923',
    slug: '6ad32acf8fd375e15558c923',
    title: 'Eclipse 404',
    category: 'Entertainment',
    date: '10 Nov 2026',
    time: '4:00 PM',
    venue: 'Crown Hall, ISL Engineering College',
    price: 399,
    priceFormatted: '₹399',
    shortDescription:
      'Eclipse 404 is a high-energy DJ event featuring electrifying beats, vibrant music, and exciting dance moves. Get ready to groove to the rhythm and unleash your energy.',
    imageUrl:
      'https://nexus-vyoma.s3.ap-south-2.amazonaws.com/event-banners/14e32b2c-5206-470e-b64e-9c373e5d35dd.jpeg',
    accentColor: '#FF6A00',
  },
  {
    id: '6ad5c28c4e44180db97a9343',
    slug: '6ad5c28c4e44180db97a9343',
    title: 'CHARCHA',
    category: 'Creative & Cultural',
    date: '11 Nov 2026',
    time: '3:00 PM',
    venue: 'Amphitheatre, ISL Engineering College',
    price: 399,
    priceFormatted: '₹399',
    shortDescription:
      'Charcha is a vibrant celebration of talent, creativity, and self-expression! From hilarious stand-up comedy and soulful singing to energetic rapping and exciting live performances.',
    imageUrl:
      'https://nexus-vyoma.s3.ap-south-2.amazonaws.com/event-banners/c4a93f0f-6f43-40c7-8f56-0262c55ff302.jpg',
    accentColor: '#F59E0B',
  },
  {
    id: '6ad7c774dbbcaf1cf9eac2af',
    slug: '6ad7c774dbbcaf1cf9eac2af',
    title: 'Nexus Gel Blaster',
    category: 'Esports & Gaming',
    date: '11 Nov 2026',
    time: '10:00 AM',
    venue: 'Block-A, Seminar Hall-3',
    price: 299,
    priceFormatted: '₹299',
    shortDescription:
      'Step into the action-packed world of Gel Blaster! Gear up with laser guns and laser-tag jackets in an adrenaline-filled battle of aim, reflexes, and strategy.',
    imageUrl:
      'https://nexus-vyoma.s3.ap-south-2.amazonaws.com/event-banners/75281b98-8bb4-4621-bed0-5680ab33426f.jpeg',
    accentColor: '#0066FF',
  },
  {
    id: '6ad329108fd375e15558c920',
    slug: '6ad329108fd375e15558c920',
    title: 'WEB 2 BUILD – Startup Initiative Hackathon',
    category: 'Technical & Innovation',
    date: '11 Nov 2026',
    time: '10:00 AM',
    venue: 'Block-B, Second Floor',
    price: 99,
    priceFormatted: '₹99',
    shortDescription:
      'A fast-paced startup initiative hackathon where student teams ideate, architect, and build functional digital prototypes to solve real-world industry challenges.',
    imageUrl:
      'https://nexus-vyoma.s3.ap-south-2.amazonaws.com/event-banners/6791c20a-4f19-40e4-bc14-3385a77dc5e2.jpeg',
    accentColor: '#7B2CFF',
  },
  {
    id: '6ad09e0582a80681a78c8b59',
    slug: '6ad09e0582a80681a78c8b59',
    title: 'Gemini Genie - Vibe coding Hackathon',
    category: 'Technical & Innovation',
    date: '10 Nov 2026',
    time: '10:00 AM',
    venue: 'Block-B, Lab-1',
    price: 199,
    priceFormatted: '₹199',
    shortDescription:
      'Harness cutting-edge AI orchestration and vibe-coding tools to build innovative software solutions under championship sprint conditions.',
    imageUrl:
      'https://nexus-vyoma.s3.ap-south-2.amazonaws.com/event-banners/e3185938-4e7a-4efa-b742-522c96e781c2.jpeg',
    accentColor: '#00C8FF',
  },
];

/**
 * Loads the 6 specific events in the exact sequence requested, resolving instantly in-memory.
 */
function loadPremiumPaidEvents(): PaidEventSummary[] {
  return SEQUENCED_TARGETS;
}

async function SuccessContent({
  searchParams,
  isEntryTicket,
}: SuccessPageProps & { isEntryTicket: boolean }) {
  const params = searchParams ? await searchParams : {};

  const getParam = (key: string): string | undefined => {
    const val = params[key];
    if (typeof val === 'string') return val;
    if (Array.isArray(val) && typeof val[0] === 'string') return val[0];
    return undefined;
  };

  const transactionId =
    getParam('transaction_id') ||
    getParam('txnid') ||
    getParam('payment_id');

  const orderId =
    getParam('order_id') ||
    getParam('orderid');

  const teamName =
    getParam('team_name') ||
    getParam('team');

  const teamMembers =
    getParam('team_members') ||
    getParam('members');

  // If this is an Entry Pass checkout, render the redesigned 30/70 experience
  if (isEntryTicket) {
    const paidEvents = loadPremiumPaidEvents();
    return (
      <EntryPassSuccessView
        transactionId={transactionId}
        orderId={orderId}
        teamName={teamName}
        teamMembers={teamMembers}
        events={paidEvents}
      />
    );
  }

  // Final event-enrolment checkout remains completely unchanged
  return (
    <StatusCard
      status="success"
      transactionId={transactionId}
      orderId={orderId}
      teamName={teamName}
      teamMembers={teamMembers}
    />
  );
}

export default async function SuccessPage(props: SuccessPageProps) {
  const params = props.searchParams ? await props.searchParams : {};
  const orderId =
    typeof params.order_id === 'string'
      ? params.order_id
      : Array.isArray(params.order_id) && typeof params.order_id[0] === 'string'
      ? params.order_id[0]
      : undefined;

  // Distinguish Entry Pass vs Event Enrolment purely from order prefix / presence
  const isEntryTicket =
    (!orderId || orderId.startsWith('NVET_')) &&
    !orderId?.startsWith('NV_');

  return (
    <StatusLayout isDiscovery={isEntryTicket}>
      <Suspense fallback={isEntryTicket ? null : <StatusCard status="success" orderId={orderId} />}>
        <SuccessContent {...props} isEntryTicket={isEntryTicket} />
      </Suspense>
    </StatusLayout>
  );
}
