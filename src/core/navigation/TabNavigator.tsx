import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';

import { useAppSettings } from '@/hooks/useAppSettings';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/theme';
import type { AppTabsParamList } from '@/types/navigation';

import { FeedStack } from './FeedStack';
import { EventsStack } from './EventsStack';
import { CheckInStack } from './CheckInStack';
import { ProfileStack } from './ProfileStack';
import { MoreStack } from './MoreStack';
import PaywallScreen from '@/screens/paywall/PaywallScreen';

const Tab = createBottomTabNavigator<AppTabsParamList>();

type IoniconName = keyof typeof Ionicons.glyphMap;

/**
 * Paywall gate. Feed and Profile stay open; Events + Check-In lock behind an
 * active membership. Admins always pass. `paywall_enabled` (app_settings) lets
 * the club flip the wall off — fail-open while settings load so nothing flashes.
 */
function useLocked(): boolean {
  const { hasFullAccess } = useAuth();
  const settingsQuery = useAppSettings();
  const paywallOn = settingsQuery.data?.paywall_enabled ?? false;
  return paywallOn && !hasFullAccess;
}

function GatedEventsTab() {
  return useLocked() ? <PaywallScreen feature="Events" /> : <EventsStack />;
}

function GatedCheckInTab() {
  return useLocked() ? <PaywallScreen feature="Check-In" /> : <CheckInStack />;
}

const TAB_ICONS: Record<keyof AppTabsParamList, { active: IoniconName; inactive: IoniconName }> = {
  FeedTab: { active: 'home', inactive: 'home-outline' },
  EventsTab: { active: 'calendar', inactive: 'calendar-outline' },
  CheckInTab: { active: 'location', inactive: 'location-outline' },
  ProfileTab: { active: 'person', inactive: 'person-outline' },
  MoreTab: { active: 'menu', inactive: 'menu-outline' },
};

export function TabNavigator() {
  const { colors } = useTheme();
  const { isAdmin } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.charcoal,
          height: 88,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          return (
            <Ionicons name={focused ? icons.active : icons.inactive} size={size} color={color} />
          );
        },
      })}
    >
      <Tab.Screen name="FeedTab" component={FeedStack} options={{ title: 'Feed' }} />
      <Tab.Screen name="EventsTab" component={GatedEventsTab} options={{ title: 'Events' }} />
      <Tab.Screen name="CheckInTab" component={GatedCheckInTab} options={{ title: 'Check-In' }} />
      <Tab.Screen name="ProfileTab" component={ProfileStack} options={{ title: 'Profile' }} />
      {isAdmin ? (
        <Tab.Screen name="MoreTab" component={MoreStack} options={{ title: 'More' }} />
      ) : null}
    </Tab.Navigator>
  );
}
