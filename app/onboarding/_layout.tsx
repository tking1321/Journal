import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="duration" />
      <Stack.Screen name="attempts" />
      <Stack.Screen name="categories" />
      <Stack.Screen name="growth" />
      <Stack.Screen name="time" />
      <Stack.Screen name="goallimit" />
      <Stack.Screen name="coaching" />
      <Stack.Screen name="journaling" />
      <Stack.Screen name="obstacle" />
      <Stack.Screen name="success" />
      <Stack.Screen name="preview" />
    </Stack>
  );
}
