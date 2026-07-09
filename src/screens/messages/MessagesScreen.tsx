import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import {
  Avatar,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  TextField,
} from '@/components/ui';
import { useConversations, useMemberSearch, useStartDm } from '@/hooks/useDms';
import { useMyProfile } from '@/hooks/useMyProfile';
import { copy } from '@/lib/copy';
import { hapticLight } from '@/lib/haptics';
import { formatRelativeTime } from '@/lib/timeUtils';
import { radius, spacing, useTheme } from '@/theme';
import type { DmConversationListItem, ProfileSummary } from '@/types/models';
import type { ProfileStackScreenProps } from '@/types/navigation';

export default function MessagesScreen({ navigation }: ProfileStackScreenProps<'Messages'>) {
  const { colors } = useTheme();

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const conversations = useConversations();
  const results = useMemberSearch(debounced);
  const startDm = useStartDm();
  const myProfile = useMyProfile();

  const myProfileId = myProfile.data?.id;
  const refetchConversations = conversations.refetch;

  useFocusEffect(
    useCallback(() => {
      void refetchConversations();
    }, [refetchConversations])
  );

  const searching = debounced.trim().length >= 2;

  const openChat = (conversationId: string, other: ProfileSummary) => {
    navigation.navigate('ChatThread', {
      conversationId,
      otherName: other.full_name,
      otherProfileId: other.id,
    });
  };

  const handleSearchResult = (member: ProfileSummary) => {
    hapticLight();
    startDm.mutate(member.id, {
      onSuccess: (conversationId) => {
        setSearch('');
        setDebounced('');
        openChat(conversationId, member);
      },
    });
  };

  const renderSearchResult = ({ item }: { item: ProfileSummary }) => (
    <Pressable
      onPress={() => handleSearchResult(item)}
      disabled={startDm.isPending}
      accessibilityRole="button"
      accessibilityLabel={`Message ${item.full_name}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.darkCard,
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.xs,
        opacity: pressed || startDm.isPending ? 0.7 : 1,
      })}
    >
      <Avatar uri={item.avatar_url} name={item.full_name} size={44} />
      <View style={{ flex: 1, marginLeft: spacing.sm }}>
        <Text
          style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 15 }}
          numberOfLines={1}
        >
          {item.full_name}
        </Text>
        {item.username ? (
          <Text style={{ color: colors.gray500, fontSize: 13, marginTop: 1 }} numberOfLines={1}>
            @{item.username}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chatbubble-outline" size={18} color={colors.lime} />
    </Pressable>
  );

  const renderConversation = ({ item }: { item: DmConversationListItem }) => {
    const { conversation, other, unread } = item;
    const mine =
      Boolean(myProfileId) && conversation.last_message_sender_profile_id === myProfileId;
    const preview = conversation.last_message_preview
      ? `${mine ? copy.dms.youPrefix : ''}${conversation.last_message_preview}`
      : 'Say hi.';

    return (
      <Pressable
        onPress={() => {
          hapticLight();
          openChat(conversation.id, other);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Conversation with ${other.full_name}${unread ? ', unread' : ''}`}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.darkCard,
          borderRadius: radius.md,
          padding: spacing.md,
          marginBottom: spacing.xs,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Avatar uri={other.avatar_url} name={other.full_name} size={48} />
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text
              style={{
                color: colors.textPrimary,
                fontWeight: unread ? '900' : '700',
                fontSize: 15,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {other.full_name}
            </Text>
            {conversation.last_message_at ? (
              <Text style={{ color: colors.gray500, fontSize: 12, marginLeft: spacing.xs }}>
                {formatRelativeTime(conversation.last_message_at)}
              </Text>
            ) : null}
          </View>
          <Text
            style={{
              color: unread ? colors.textPrimary : colors.gray500,
              fontWeight: unread ? '700' : '400',
              fontSize: 13,
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {preview}
          </Text>
        </View>
        {unread ? (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: colors.lime,
              marginLeft: spacing.sm,
            }}
          />
        ) : null}
      </Pressable>
    );
  };

  let body: React.ReactNode;

  if (searching) {
    if (results.isLoading) {
      body = <LoadingState />;
    } else if (results.isError) {
      body = <ErrorState error={results.error} onRetry={() => void results.refetch()} />;
    } else if ((results.data ?? []).length === 0) {
      body = (
        <EmptyState
          icon="search-outline"
          title="No members found"
          message="Try a different name or username."
        />
      );
    } else {
      body = (
        <FlatList
          data={results.data}
          keyExtractor={(item) => item.id}
          renderItem={renderSearchResult}
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        />
      );
    }
  } else if (conversations.isLoading) {
    body = <LoadingState />;
  } else if (conversations.isError) {
    body = (
      <ErrorState error={conversations.error} onRetry={() => void conversations.refetch()} />
    );
  } else if ((conversations.data ?? []).length === 0) {
    body = (
      <EmptyState
        icon="chatbubbles-outline"
        title={copy.dms.emptyTitle}
        message={copy.dms.emptyBody}
      />
    );
  } else {
    body = (
      <FlatList
        data={conversations.data}
        keyExtractor={(item) => item.conversation.id}
        renderItem={renderConversation}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      />
    );
  }

  return (
    <Screen noPadding>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
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
            fontSize: 20,
            fontWeight: '900',
            textTransform: 'uppercase',
            marginLeft: spacing.xs,
          }}
        >
          {copy.dms.title}
        </Text>
      </View>

      {/* Member search */}
      <View style={{ paddingHorizontal: spacing.md }}>
        <TextField
          placeholder={copy.dms.searchPlaceholder}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          containerStyle={{ marginBottom: spacing.sm }}
        />
      </View>

      <View style={{ flex: 1 }}>{body}</View>
    </Screen>
  );
}
