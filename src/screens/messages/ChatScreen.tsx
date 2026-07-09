import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState, LoadingState } from '@/components/ui';
import { queryKeys } from '@/hooks/queryKeys';
import {
  appendDmMessageToCache,
  useMarkDmRead,
  useMessages,
  useSendMessage,
} from '@/hooks/useDms';
import { useMyProfile } from '@/hooks/useMyProfile';
import { copy } from '@/lib/copy';
import { hapticLight } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { formatEventDateTime } from '@/lib/timeUtils';
import { radius, spacing, useTheme } from '@/theme';
import type { DmMessage } from '@/types/models';
import type { ProfileStackScreenProps } from '@/types/navigation';

/** New timestamp label whenever messages are more than 15 minutes apart. */
const TIMESTAMP_GAP_MS = 15 * 60_000;

export default function ChatScreen({
  navigation,
  route,
}: ProfileStackScreenProps<'ChatThread'>) {
  const { colors } = useTheme();
  const { conversationId, otherName } = route.params;

  const qc = useQueryClient();
  const tabBarHeight = useBottomTabBarHeight();

  const myProfile = useMyProfile();
  const myProfileId = myProfile.data?.id;

  const messagesQuery = useMessages(conversationId);
  const sendMessage = useSendMessage(conversationId, myProfileId);
  const markDmRead = useMarkDmRead();
  const markReadMutate = markDmRead.mutate;

  const [text, setText] = useState('');

  const messages = useMemo(
    () => messagesQuery.data?.pages.flatMap((page) => page.messages) ?? [],
    [messagesQuery.data]
  );

  // Read receipt whenever the thread is opened / re-focused.
  useFocusEffect(
    useCallback(() => {
      markReadMutate(conversationId);
    }, [conversationId, markReadMutate])
  );

  // Realtime: new messages in this conversation land straight in the cache.
  useEffect(() => {
    const channel = supabase
      .channel(`dm:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dm_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = payload.new as DmMessage;
          appendDmMessageToCache(qc, conversationId, message);
          qc.invalidateQueries({ queryKey: queryKeys.dms.conversations() });

          // Incoming from the other member while I'm looking at the thread.
          if (myProfileId && message.sender_profile_id !== myProfileId) {
            markReadMutate(conversationId);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, myProfileId, qc, markReadMutate]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || !myProfileId) return;
    hapticLight();
    sendMessage.mutate(trimmed);
    setText('');
  };

  const renderMessage = ({ item, index }: { item: DmMessage; index: number }) => {
    const mine = item.sender_profile_id === myProfileId;
    // List is newest-first, so the chronologically previous message is index+1.
    const older = messages[index + 1];
    const showTimestamp =
      !older ||
      new Date(item.created_at).getTime() - new Date(older.created_at).getTime() >
        TIMESTAMP_GAP_MS;

    return (
      <View style={{ marginBottom: spacing.xs }}>
        {showTimestamp ? (
          <Text
            style={{
              color: colors.gray500,
              fontSize: 11,
              fontWeight: '600',
              textAlign: 'center',
              marginVertical: spacing.sm,
            }}
          >
            {formatEventDateTime(item.created_at)}
          </Text>
        ) : null}
        <View
          style={{
            maxWidth: '78%',
            alignSelf: mine ? 'flex-end' : 'flex-start',
            backgroundColor: mine ? colors.lime : colors.darkCard,
            borderRadius: 18,
            borderBottomRightRadius: mine ? 4 : 18,
            borderBottomLeftRadius: mine ? 18 : 4,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}
        >
          <Text
            style={{
              color: mine ? colors.black : colors.textPrimary,
              fontSize: 15,
              lineHeight: 21,
            }}
          >
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  let body: React.ReactNode;

  if (messagesQuery.isPending) {
    body = <LoadingState />;
  } else if (messagesQuery.isError) {
    body = (
      <ErrorState error={messagesQuery.error} onRetry={() => void messagesQuery.refetch()} />
    );
  } else if (messages.length === 0) {
    // Rendered outside the inverted FlatList so it isn't flipped upside down.
    body = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
        <Ionicons name="chatbubbles-outline" size={40} color={colors.gray500} />
        <Text
          style={{
            color: colors.gray500,
            fontSize: 14,
            textAlign: 'center',
            marginTop: spacing.sm,
          }}
        >
          {copy.dms.threadEmpty}
        </Text>
      </View>
    );
  } else {
    body = (
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        inverted
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage) {
            void messagesQuery.fetchNextPage();
          }
        }}
        ListFooterComponent={
          messagesQuery.isFetchingNextPage ? (
            <View style={{ paddingVertical: spacing.sm }}>
              <LoadingState />
            </View>
          ) : null
        }
      />
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'left', 'right']}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          gap: spacing.sm,
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text
          style={{
            color: colors.textPrimary,
            fontWeight: '900',
            fontSize: 17,
            flex: 1,
          }}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {otherName ?? copy.dms.title}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? tabBarHeight : 0}
      >
        <View style={{ flex: 1 }}>{body}</View>

        {/* Input bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: spacing.sm,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderTopWidth: 1,
            borderTopColor: colors.charcoal,
          }}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={copy.dms.inputPlaceholder}
            placeholderTextColor={colors.gray500}
            multiline
            maxLength={2000}
            accessibilityLabel="Message input"
            style={{
              flex: 1,
              backgroundColor: colors.inputBg,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.gray700,
              color: colors.textPrimary,
              paddingHorizontal: spacing.md,
              paddingTop: 10,
              paddingBottom: 10,
              fontSize: 15,
              maxHeight: 120,
            }}
          />
          <Pressable
            onPress={handleSend}
            disabled={!text.trim() || !myProfileId}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            style={({ pressed }) => ({
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: text.trim() ? colors.lime : colors.gray700,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Ionicons name="arrow-up" size={22} color={colors.black} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
