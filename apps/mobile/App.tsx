import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import React, { useEffect } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './src/store/auth-store';
import AppNavigator from './src/navigation/AppNavigator';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function AppInner() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let sub1: { remove(): void } | undefined;
    let sub2: { remove(): void } | undefined;

    (async () => {
      const Notifications = await import('expo-notifications');

      sub1 = Notifications.addNotificationReceivedListener((n) => {
        console.log('Notification received:', n);
      });

      sub2 = Notifications.addNotificationResponseReceivedListener((r) => {
        const symbol = r.notification.request.content.data?.symbol;
        if (symbol) console.log('User tapped notification for:', symbol);
      });
    })();

    return () => {
      sub1?.remove();
      sub2?.remove();
    };
  }, []);

  return <AppNavigator />;
}

function App() {
  return (
    <View style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <AppInner />
        </QueryClientProvider>
      </SafeAreaProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f172a',
    ...(Platform.OS === 'web' ? { minHeight: '100vh' as any } : {}),
  },
});

registerRootComponent(App);
