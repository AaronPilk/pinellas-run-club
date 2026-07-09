import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { addNotificationResponseListener } from '@/services/pushNotifications';
import { ThemeProvider, useTheme } from '@/theme';

import { AuthProvider } from './AuthProvider';
import { QueryProvider } from './QueryProvider';

/** Status bar text flips with the active theme. */
function ThemedStatusBar() {
  const { mode } = useTheme();
  return <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Route deep links from tapped push notifications.
    const unsubscribe = addNotificationResponseListener();
    return unsubscribe;
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <ThemedStatusBar />
              {children}
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export { AuthProvider, useAuth } from './AuthProvider';
export { QueryProvider } from './QueryProvider';
