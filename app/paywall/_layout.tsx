import { Stack } from 'expo-router';

export default function PaywallLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="plans" />
      <Stack.Screen name="trial" />
    </Stack>
  );
}
