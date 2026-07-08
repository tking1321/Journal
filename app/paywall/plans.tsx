import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { usePurchases } from '@/contexts/PurchasesContext';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

export default function PlansScreen() {
  const router = useRouter();
  const { presentPaywall } = usePurchases();

  useEffect(() => {
    if (!isNative) {
      router.replace('/paywall');
      return;
    }
    presentPaywall().then((purchased) => {
      if (purchased) {
        router.replace('/(tabs)');
      } else {
        router.back();
      }
    });
  }, []);

  return null;
}
