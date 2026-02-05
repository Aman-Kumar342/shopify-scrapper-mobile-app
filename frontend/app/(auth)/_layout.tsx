import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0F172A' },
      }}
    >
      <Stack.Screen name="onboarding/index" options={{ animation: 'none' }} />
      <Stack.Screen name="login/index" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
