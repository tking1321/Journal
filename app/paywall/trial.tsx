import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function TrialScreen() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/paywall/plans');
  }, []);
  return null;
}
