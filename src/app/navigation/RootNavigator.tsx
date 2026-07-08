import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { useAuth } from '@/app/providers/AuthProvider';
import { colors } from '@/theme';
import type { RootStackParamList } from '@/types/navigation';

import PendingApprovalScreen from '@/screens/auth/PendingApprovalScreen';
import SuspendedScreen from '@/screens/auth/SuspendedScreen';
import CompleteProfileScreen from '@/screens/auth/CompleteProfileScreen';

import { AuthNavigator } from './AuthNavigator';
import { TabNavigator } from './TabNavigator';
import { linking } from './linking';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.black,
    card: colors.black,
    primary: colors.lime,
    text: colors.white,
    border: colors.charcoal,
  },
};

function Splash() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.black,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: colors.white,
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
        ) : isApproved ? (
          <Stack.Screen name="App" component={TabNavigator} />
        ) : profile === null ? (
          // Session exists but no profile row yet (e.g. just signed up).
          <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
        ) : (
          <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
