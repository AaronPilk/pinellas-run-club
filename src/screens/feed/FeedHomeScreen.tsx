import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { PostCard } from '@/components/PostCard';
import { EmptyState, ErrorState, LoadingState, Screen, SectionHeader } from '@/components/ui';
import { useDmUnreadCount } from '@/hooks/useDms';
import { useFeed, usePinnedPosts, useToggleLike } from '@/hooks/useFeed';
import { useUnreadCount } from '@/hooks/useNotifications';
import { copy } from '@/lib/copy';
import { hapticLight } from '@/lib/haptics';
import { radius, spacing, useTheme } from '@/theme';
import type { FeedPostWithAuthor } from '@/types/models';
import type { AppTabsParamList, FeedStackScreenProps } from '@/types/navigation';

type FeedTab = 'all' | 'following';

export default function FeedHomeScreen({ navigation }: FeedStackScreenProps<'FeedHome'>) {
  const { colors } = useTheme();
  const [tab, setTab] = useState<FeedTab>('all');
  const feed = useFeed();
  const pinned = usePinnedPosts();
  const toggleLike = useToggleLike();
  const unreadQuery = useUnreadCount();
  const dmUnreadQuery = useDmUnreadCount();

  const unread = unreadQuery.data ?? 0;
  const dmUnread = dmUnreadQuery.data ?? 0;
  const tabNav = navigation.getParent<BottomTabNavigationProp<AppTabsParamList>>();

  const posts = useMemo(
    () => feed.data?.pages.flatMap((page) => page.posts) ?? [],
    [feed.data]
  );

  const renderPost = ({ item }: { item: FeedPostWithAuthor }) => (
    <PostCard
      post={item}
      onPressAuthor={() => navigation.navigate('MemberProfile', { profileId: item.profile_id })}
      onPressPost={() => navigation.navigate('PostDetail', { postId: item.id })}
      onPressComments={() => navigation.navigate('PostDetail', { postId: item.id })}
      onToggleLike={() => {
        hapticLight();
        toggleLike.mutate({ postId: item.id, liked: item.liked_by_me });
      }}
    />
  );

  const pinnedPosts = pinned.data ?? [];

  // Pinned announcements above the feed — inside ListHeaderComponent so the
  // FlatList keeps virtualizing. Only rendered when something is pinned.
  const pinnedSection =
    pinnedPosts.length > 0 ? (
      <View style={{ marginBottom: spacing.xs }}>
        <SectionHeader title="Pinned" />
        {pinnedPosts.map((item) => (
          <View key={item.id}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                marginBottom: 4,
              }}
            >
              <Ionicons name="pin" size={12} color={colors.lime} />
              <Text
                style={{
                  color: colors.lime,
                  fontSize: 11,
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                }}
              >
                Pinned
              </Text>
            </View>
            {renderPost({ item })}
          </View>
        ))}
      </View>
    ) : null;

  const header = (
    <View>
      {/* Brand header + create */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm,
        }}
      >
        <Text
          style={{
            color: colors.textPrimary,
            fontWeight: '900',
            fontSize: 20,
            textTransform: 'uppercase',
            letterSpacing: -0.3,
          }}
          accessibilityRole="header"
        >
          Pinellas <Text style={{ color: colors.lime }}>Run Club</Text>
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Pressable
            onPress={() => tabNav?.navigate('ProfileTab', { screen: 'Notifications' })}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'
            }
          >
            <Ionicons name="notifications-outline" size={26} color={colors.textPrimary} />
            {unread > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -6,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  paddingHorizontal: 3,
                  backgroundColor: colors.lime,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: colors.black, fontSize: 10, fontWeight: '900' }}>
                  {unread > 99 ? '99+' : unread}
                </Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            onPress={() => tabNav?.navigate('ProfileTab', { screen: 'Messages' })}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={dmUnread > 0 ? `Messages, ${dmUnread} unread` : 'Messages'}
          >
            <Ionicons name="chatbubbles-outline" size={26} color={colors.textPrimary} />
            {dmUnread > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -3,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: colors.lime,
                }}
              />
            ) : null}
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('CreatePost', undefined)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={copy.feed.newPost}
          >
            <Ionicons name="add-circle" size={30} color={colors.lime} />
          </Pressable>
        </View>
      </View>

      {/* All / Following tabs */}
      <View
        style={{
          flexDirection: 'row',
          gap: spacing.xs,
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.sm,
        }}
      >
        {(
          [
            { key: 'all', label: 'All' },
            { key: 'following', label: 'Following' },
          ] as const
        ).map((item) => {
          const active = tab === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setTab(item.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={{
                paddingHorizontal: 18,
                paddingVertical: 8,
                borderRadius: radius.pill,
                backgroundColor: active ? colors.lime : colors.charcoal,
              }}
            >
              <Text
                style={{
                  color: active ? colors.black : colors.gray300,
                  fontWeight: '800',
                  fontSize: 13,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  let body: React.ReactNode;

  if (tab === 'following') {
    body = (
      <EmptyState
        icon="people-outline"
        title="Following is coming soon"
        message="For now, the All tab has every post from the club."
        actionLabel="See All Posts"
        onAction={() => setTab('all')}
      />
    );
  } else if (feed.isPending) {
    body = <LoadingState />;
  } else if (feed.isError) {
    body = <ErrorState error={feed.error} onRetry={() => void feed.refetch()} />;
  } else if (posts.length === 0) {
    body = (
      <EmptyState
        icon="camera-outline"
        title="No posts yet."
        message="Be the first to share a run."
        actionLabel={copy.feed.newPost}
        onAction={() => navigation.navigate('CreatePost', undefined)}
      />
    );
  } else {
    body = (
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        ListHeaderComponent={pinnedSection}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
        }}
        refreshControl={
          <RefreshControl
            refreshing={feed.isRefetching && !feed.isFetchingNextPage}
            onRefresh={() => {
              void feed.refetch();
              void pinned.refetch();
            }}
            tintColor={colors.lime}
          />
        }
        ListFooterComponent={
          feed.isFetchingNextPage ? (
            <View style={{ paddingVertical: spacing.md }}>
              <LoadingState />
            </View>
          ) : null
        }
      />
    );
  }

  return (
    <Screen noPadding>
      {header}
      <View style={{ flex: 1 }}>{body}</View>
    </Screen>
  );
}
