import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import type { EventsStackParamList } from '@/types/navigation';

import EventsHomeScreen from '@/screens/events/EventsHomeScreen';
import EventDetailScreen from '@/screens/events/EventDetailScreen';
import EventAttendeesScreen from '@/screens/events/EventAttendeesScreen';
import CreateEditEventScreen from '@/screens/events/CreateEditEventScreen';

const Stack = createNativeStackNavigator<EventsStackParamList>();

export function EventsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EventsHome" component={EventsHomeScreen} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
      <Stack.Screen name="EventAttendees" component={EventAttendeesScreen} />
      <Stack.Screen
        name="CreateEditEvent"
        component={CreateEditEventScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
