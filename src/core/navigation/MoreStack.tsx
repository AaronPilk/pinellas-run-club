import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import type { MoreStackParamList } from '@/types/navigation';

import MoreHomeScreen from '@/screens/more/MoreHomeScreen';
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
import AdminDashboardScreen from '@/screens/admin/AdminDashboardScreen';
import AdminMembersScreen from '@/screens/admin/AdminMembersScreen';
import AdminLapsedMembersScreen from '@/screens/admin/AdminLapsedMembersScreen';
import AdminEventsScreen from '@/screens/admin/AdminEventsScreen';
import AdminPartnersScreen from '@/screens/admin/AdminPartnersScreen';
import AdminCoursesScreen from '@/screens/admin/AdminCoursesScreen';
import AdminSponsorLeadsScreen from '@/screens/admin/AdminSponsorLeadsScreen';
import AdminNotificationsScreen from '@/screens/admin/AdminNotificationsScreen';

const Stack = createNativeStackNavigator<MoreStackParamList>();

export function MoreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MoreHome" component={MoreHomeScreen} />
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
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="AdminMembers" component={AdminMembersScreen} />
      <Stack.Screen name="AdminLapsedMembers" component={AdminLapsedMembersScreen} />
      <Stack.Screen name="AdminEvents" component={AdminEventsScreen} />
      <Stack.Screen name="AdminPartners" component={AdminPartnersScreen} />
      <Stack.Screen name="AdminCourses" component={AdminCoursesScreen} />
      <Stack.Screen name="AdminSponsorLeads" component={AdminSponsorLeadsScreen} />
      <Stack.Screen name="AdminNotifications" component={AdminNotificationsScreen} />
    </Stack.Navigator>
  );
}
