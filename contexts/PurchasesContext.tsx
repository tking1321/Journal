import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';

const RC_API_KEY = 'test_yBgbhbwmFtXglVUSRJeeJQOOPtC';
const ENTITLEMENT_ID = 'Diverge Pro';

export type PurchasesEntitlementStatus = 'loading' | 'active' | 'inactive';

interface PurchasesContextType {
  isProActive: boolean;
  entitlementStatus: PurchasesEntitlementStatus;
  presentPaywall: () => Promise<boolean>;
  presentPaywallIfNeeded: () => Promise<boolean>;
  presentCustomerCenter: () => Promise<void>;
  restorePurchases: () => Promise<boolean>;
  identifyUser: (userId: string) => Promise<void>;
  logOutUser: () => Promise<void>;
}

const PurchasesContext = createContext<PurchasesContextType | undefined>(undefined);

function isNative() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  const [isProActive, setIsProActive] = useState(false);
  const [entitlementStatus, setEntitlementStatus] = useState<PurchasesEntitlementStatus>('loading');

  useEffect(() => {
    if (!isNative()) {
      setEntitlementStatus('inactive');
      return;
    }
    initializeSDK();
  }, []);

  async function initializeSDK() {
    try {
      const Purchases = (await import('react-native-purchases')).default;
      Purchases.configure({ apiKey: RC_API_KEY });
      await refreshEntitlements();
    } catch {
      setEntitlementStatus('inactive');
    }
  }

  const refreshEntitlements = useCallback(async () => {
    if (!isNative()) return;
    try {
      const Purchases = (await import('react-native-purchases')).default;
      const customerInfo = await Purchases.getCustomerInfo();
      const active = typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
      setIsProActive(active);
      setEntitlementStatus(active ? 'active' : 'inactive');
    } catch {
      setEntitlementStatus('inactive');
    }
  }, []);

  async function identifyUser(userId: string) {
    if (!isNative()) return;
    try {
      const Purchases = (await import('react-native-purchases')).default;
      await Purchases.logIn(userId);
      await refreshEntitlements();
    } catch {
      // silently fail — entitlement status remains unchanged
    }
  }

  async function logOutUser() {
    if (!isNative()) return;
    try {
      const Purchases = (await import('react-native-purchases')).default;
      await Purchases.logOut();
      setIsProActive(false);
      setEntitlementStatus('inactive');
    } catch {
      // silently fail
    }
  }

  async function presentPaywall(): Promise<boolean> {
    if (!isNative()) return false;
    try {
      const { default: RevenueCatUI, PAYWALL_RESULT } = await import('react-native-purchases-ui');
      const result = await RevenueCatUI.presentPaywall();
      const purchased = result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
      if (purchased) await refreshEntitlements();
      return purchased;
    } catch {
      return false;
    }
  }

  async function presentPaywallIfNeeded(): Promise<boolean> {
    if (!isNative()) return false;
    if (isProActive) return true;
    try {
      const { default: RevenueCatUI, PAYWALL_RESULT } = await import('react-native-purchases-ui');
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ENTITLEMENT_ID,
      });
      const purchased = result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
      if (purchased) await refreshEntitlements();
      return purchased;
    } catch {
      return false;
    }
  }

  async function presentCustomerCenter(): Promise<void> {
    if (!isNative()) return;
    try {
      const { default: RevenueCatUI } = await import('react-native-purchases-ui');
      await RevenueCatUI.presentCustomerCenter();
      await refreshEntitlements();
    } catch {
      // silently fail
    }
  }

  async function restorePurchases(): Promise<boolean> {
    if (!isNative()) return false;
    try {
      const Purchases = (await import('react-native-purchases')).default;
      const customerInfo = await Purchases.restorePurchases();
      const active = typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
      setIsProActive(active);
      setEntitlementStatus(active ? 'active' : 'inactive');
      return active;
    } catch {
      return false;
    }
  }

  return (
    <PurchasesContext.Provider
      value={{
        isProActive,
        entitlementStatus,
        presentPaywall,
        presentPaywallIfNeeded,
        presentCustomerCenter,
        restorePurchases,
        identifyUser,
        logOutUser,
      }}
    >
      {children}
    </PurchasesContext.Provider>
  );
}

export function usePurchases() {
  const context = useContext(PurchasesContext);
  if (!context) throw new Error('usePurchases must be used within PurchasesProvider');
  return context;
}
