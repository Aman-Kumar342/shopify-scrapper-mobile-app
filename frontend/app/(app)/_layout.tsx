import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0F172A' },
      }}
    >
      <Stack.Screen name="home/index" />
      <Stack.Screen name="validation/index" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="results/index" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="billing/index" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="download/index" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="history/index" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="settings/index" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
