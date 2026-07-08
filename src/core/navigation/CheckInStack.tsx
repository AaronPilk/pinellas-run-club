import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import type { CheckInStackParamList } from '@/types/navigation';

import CheckInHomeScreen from '@/screens/checkin/CheckInHomeScreen';
import CheckInHistoryScreen from '@/screens/checkin/CheckInHistoryScreen';

const Stack = createNativeStackNavigator<CheckInStackParamList>();

export function CheckInStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CheckInHome" component={CheckInHomeScreen} />
      <Stack.Screen name="CheckInHistory" component={CheckInHistoryScreen} />
    </Stack.Navigator>
  );
}
