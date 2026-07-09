import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import type { FeedStackParamList } from '@/types/navigation';

import FeedHomeScreen from '@/screens/feed/FeedHomeScreen';
import CreatePostScreen from '@/screens/feed/CreatePostScreen';
import PostDetailScreen from '@/screens/feed/PostDetailScreen';
import MemberProfileScreen from '@/screens/feed/MemberProfileScreen';
import NotificationsScreen from '@/screens/more/NotificationsScreen';
import MessagesScreen from '@/screens/messages/MessagesScreen';
import ChatScreen from '@/screens/messages/ChatScreen';

const Stack = createNativeStackNavigator<FeedStackParamList>();

export function FeedStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FeedHome" component={FeedHomeScreen} />
      <Stack.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="MemberProfile" component={MemberProfileScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Messages" component={MessagesScreen} />
      <Stack.Screen name="ChatThread" component={ChatScreen} />
    </Stack.Navigator>
  );
}
