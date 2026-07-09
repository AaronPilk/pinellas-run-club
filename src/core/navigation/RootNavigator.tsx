import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { useAuth } from '@/core/providers/AuthProvider';
import { useTheme } from '@/theme';
import type { RootStackParamList } from '@/types/navigation';

import PendingApprovalScreen from '@/screens/auth/PendingApprovalScreen';
import SuspendedScreen from '@/screens/auth/SuspendedScreen';
import CompleteProfileScreen from '@/screens/auth/CompleteProfileScreen';

import { AuthNavigator } from './AuthNavigator';
import { TabNavigator } from './TabNavigator';
import { linking } from './linking';

const Stack = createNativeStackNavigator<RootStackParamList>();

function Splash() {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: colors.textPrimary,
          fontWeight: '900',
          fontSize: 24,
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
      >
        Pinellas Run Club
      </Text>
      <ActivityIndicator color={colors.lime} />
    </View>
  );
}

/**
 * Auth guard:
 *   loading            -> splash
 *   no session         -> AuthStack
 *   profile pending    -> PendingApproval
 *   suspended/rejected -> Suspended
 *   approved           -> AppTabs
 */
export function RootNavigator() {
  const { session, profile, loading, isApproved, isPending, isSuspended } = useAuth();
  const { colors, mode } = useTheme();

  const navTheme = React.useMemo(() => {
    const base = mode === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.background,
        primary: colors.lime,
        text: colors.textPrimary,
        border: colors.charcoal,
      },
    };
  }, [colors, mode]);

  if (loading) {
    return <Splash />;
  }

  return (
    <NavigationContainer theme={navTheme} linking={linking} fallback={<Splash />}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : isSuspended ? (
          <Stack.Screen name="Suspended" component={SuspendedScreen} />
        ) : isPending ? (
          <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
        ) : profile === null ? (
          // Session exists but no profile row yet (e.g. just signed up).
          <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
        ) : isApproved && !profile.profile_completed_at ? (
          // Approved but hasn't finished onboarding — let them build their
          // profile (photo, bio, interests) before landing in the app.
          <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
        ) : isApproved ? (
          <Stack.Screen name="App" component={TabNavigator} />
        ) : (
          <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
