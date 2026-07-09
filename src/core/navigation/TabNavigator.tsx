import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';

import { useTheme } from '@/theme';
import type { AppTabsParamList } from '@/types/navigation';

import { FeedStack } from './FeedStack';
import { EventsStack } from './EventsStack';
import { CheckInStack } from './CheckInStack';
import { ProfileStack } from './ProfileStack';
import { MoreStack } from './MoreStack';

const Tab = createBottomTabNavigator<AppTabsParamList>();

type IoniconName = keyof typeof Ionicons.glyphMap;

const TAB_ICONS: Record<keyof AppTabsParamList, { active: IoniconName; inactive: IoniconName }> = {
  FeedTab: { active: 'home', inactive: 'home-outline' },
  EventsTab: { active: 'calendar', inactive: 'calendar-outline' },
  CheckInTab: { active: 'location', inactive: 'location-outline' },
  ProfileTab: { active: 'person', inactive: 'person-outline' },
  MoreTab: { active: 'menu', inactive: 'menu-outline' },
};

export function TabNavigator() {
  const { colors } = useTheme();

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
      <Tab.Screen name="EventsTab" component={EventsStack} options={{ title: 'Events' }} />
      <Tab.Screen name="CheckInTab" component={CheckInStack} options={{ title: 'Check-In' }} />
      <Tab.Screen name="ProfileTab" component={ProfileStack} options={{ title: 'Profile' }} />
      <Tab.Screen name="MoreTab" component={MoreStack} options={{ title: 'More' }} />
    </Tab.Navigator>
  );
}
