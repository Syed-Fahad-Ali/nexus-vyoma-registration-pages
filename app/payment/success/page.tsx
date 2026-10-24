import { Suspense } from 'react';
import type { Metadata } from 'next';
import StatusLayout from '@/components/payment/StatusLayout';
import StatusCard from '@/components/payment/StatusCard';

export const metadata: Metadata = {
  title: 'Payment Successful | Nexus Vyoma',
  description:
    'Your transaction has been verified and registration confirmed for Nexus Vyoma 2026 at ISL Engineering College, Hyderabad.',
};

interface SuccessPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function SuccessContent({ searchParams }: SuccessPageProps) {
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

export default function SuccessPage(props: SuccessPageProps) {
  return (
    <StatusLayout>
      <Suspense fallback={<StatusCard status="success" />}>
        <SuccessContent {...props} />
      </Suspense>
    </StatusLayout>
  );
}
