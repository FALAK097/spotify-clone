'use client';

import { useSession } from '@/lib/auth-client';
import { createContext, useContext, useEffect, useState } from 'react';
import type { Subscription, UserDetails } from '@/types';

type UserContextType = {
  accessToken: string | null;
  user: any | null;
  userDetails: UserDetails | null;
  isLoading: boolean;
  subscription: Subscription | null;
};

export const UserContext = createContext<UserContextType | undefined>(
  undefined
);

export interface Props {
  [propName: string]: any;
}

export const MyUserContextProvider = (props: Props) => {
  const { data: session, isPending } = useSession();
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    if (session?.user && !isPending) {
      setIsLoadingData(true);
      fetch('/api/user/details')
        .then(res => res.json())
        .then(data => {
          setUserDetails(data.userDetails ?? null);
          setSubscription(data.subscription ?? null);
        })
        .catch(() => {
          setUserDetails(null);
          setSubscription(null);
        })
        .finally(() => setIsLoadingData(false));
    } else if (!session && !isPending) {
      setUserDetails(null);
      setSubscription(null);
    }
  }, [session, isPending]);

  const value = {
    accessToken: null,
    user: session?.user ?? null,
    userDetails,
    isLoading: isPending || isLoadingData,
    subscription,
  };

  return <UserContext.Provider value={value} {...props} />;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a MyUserContextProvider');
  }
  return context;
};
