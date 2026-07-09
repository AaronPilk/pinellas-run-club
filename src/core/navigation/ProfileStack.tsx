import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import type { ProfileStackParamList } from '@/types/navigation';

import MyProfileScreen from '@/screens/profile/MyProfileScreen';
import EditProfileScreen from '@/screens/profile/EditProfileScreen';
import MyBadgesScreen from '@/screens/profile/MyBadgesScreen';
import MemberPassScreen from '@/screens/profile/MemberPassScreen';
import SettingsScreen from '@/screens/profile/SettingsScreen';
import NotificationsScreen from '@/screens/more/NotificationsScreen';
import MessagesScreen from '@/screens/messages/MessagesScreen';
import ChatScreen from '@/screens/messages/ChatScreen';
import MyQRCodeScreen from '@/screens/more/MyQRCodeScreen';
import SponsorshipScreen from '@/screens/more/SponsorshipScreen';
import InviteFriendScreen from '@/screens/more/InviteFriendScreen';
import HelpSupportScreen from '@/screens/more/HelpSupportScreen';
import PartnerPerksScreen from '@/screens/partners/PartnerPerksScreen';
import PartnerDetailScreen from '@/screens/partners/PartnerDetailScreen';
import CoursesScreen from '@/screens/courses/CoursesScreen';
import CourseDetailScreen from '@/screens/courses/CourseDetailScreen';
import TimeEntryScreen from '@/screens/courses/TimeEntryScreen';
import CourseHistoryScreen from '@/screens/courses/CourseHistoryScreen';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyProfile" component={MyProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="MyBadges" component={MyBadgesScreen} />
      <Stack.Screen name="MemberPass" component={MemberPassScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Messages" component={MessagesScreen} />
      <Stack.Screen name="ChatThread" component={ChatScreen} />
      <Stack.Screen name="MyQRCode" component={MyQRCodeScreen} />
      <Stack.Screen name="Sponsorship" component={SponsorshipScreen} />
      <Stack.Screen name="InviteFriend" component={InviteFriendScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <Stack.Screen name="PartnerPerks" component={PartnerPerksScreen} />
      <Stack.Screen name="PartnerDetail" component={PartnerDetailScreen} />
      <Stack.Screen name="Courses" component={CoursesScreen} />
      <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
      <Stack.Screen
        name="TimeEntry"
        component={TimeEntryScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="CourseHistory" component={CourseHistoryScreen} />
    </Stack.Navigator>
  );
}
