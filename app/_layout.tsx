import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { PurchasesProvider, usePurchases } from '@/contexts/PurchasesContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

function RCUserBridge() {
  const { user } = useAuth();
  const { identifyUser, logOutUser } = usePurchases();

  useEffect(() => {
    if (user?.id) {
      identifyUser(user.id);
    } else {
      logOutUser();
    }
  }, [user?.id]);

  return null;
}

function AppShell() {
  const { isDark } = useTheme();
  return (
    <>
      <RCUserBridge />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="paywall" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <PurchasesProvider>
          <OnboardingProvider>
            <SubscriptionProvider>
              <AppShell />
            </SubscriptionProvider>
          </OnboardingProvider>
        </PurchasesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
