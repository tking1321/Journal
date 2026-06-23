import React, { createContext, useContext, useState } from 'react';

export type SubscriptionStatus = 'free' | 'trial' | 'active' | 'expired';

interface SubscriptionContextType {
  status: SubscriptionStatus;
  plan: 'monthly' | 'annual' | null;
  trialDaysRemaining: number;
  startTrial: (plan: 'monthly' | 'annual') => void;
  subscribe: (plan: 'monthly' | 'annual') => void;
  isPremium: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SubscriptionStatus>('free');
  const [plan, setPlan] = useState<'monthly' | 'annual' | null>(null);
  const [trialStart, setTrialStart] = useState<Date | null>(null);

  const trialDaysRemaining = trialStart
    ? Math.max(0, 7 - Math.floor((Date.now() - trialStart.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isPremium = status === 'trial' || status === 'active';

  function startTrial(selectedPlan: 'monthly' | 'annual') {
    setStatus('trial');
    setPlan(selectedPlan);
    setTrialStart(new Date());
  }

  function subscribe(selectedPlan: 'monthly' | 'annual') {
    setStatus('active');
    setPlan(selectedPlan);
  }

  return (
    <SubscriptionContext.Provider
      value={{ status, plan, trialDaysRemaining, startTrial, subscribe, isPremium }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error('useSubscription must be used within SubscriptionProvider');
  return context;
}
