'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { authClient } from '@/lib/auth-client';
import { useUser } from '@/hooks/useUser';
import Button from '@/components/Button';
import useSubscribeModal from '@/hooks/useSubscribeModal';
import { toast } from 'sonner';

const AccountContent = () => {
  const router = useRouter();
  const subscribeModal = useSubscribeModal();
  const { isLoading, subscription, user } = useUser();
  const [loading, setLoading] = useState(false);

  if (!isLoading && !user) {
    router.replace('/');
  }

  const redirectToCustomerPortal = async () => {
    setLoading(true);
    try {
      const { data } = await authClient.subscription.billingPortal({
        returnUrl: `${window.location.origin}/account`,
      });
      if (data?.url) window.location.assign(data.url);
    } catch (error) {
      toast.error((error as Error).message);
    }
    setLoading(false);
  };

  return (
    <div className="mb-7 px-6">
      {!subscription && (
        <div className="flex flex-col gap-y-4">
          <p>No active plan.</p>
          <Button onClick={subscribeModal.onOpen} className="w-[300px]">
            Subscribe
          </Button>
        </div>
      )}
      {subscription && (
        <div className="flex flex-col gap-y-4">
          <p>
            You are currently on the
            <b> {subscription?.prices?.products?.name} </b>
            plan.
          </p>
          <Button
            disabled={loading || isLoading}
            onClick={redirectToCustomerPortal}
            className="w-[300px]">
            Open customer portal
          </Button>
        </div>
      )}
    </div>
  );
};

export default AccountContent;
