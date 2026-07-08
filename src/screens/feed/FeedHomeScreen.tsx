import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { PostCard } from '@/components/PostCard';
import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { useFeed, useToggleLike } from '@/hooks/useFeed';
import { copy } from '@/lib/copy';
import { hapticLight } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme';
import type { FeedPostWithAuthor } from '@/types/models';
import type { FeedStackScreenProps } from '@/types/navigation';

type FeedTab = 'all' | 'following';

export default function FeedHomeScreen({ navigation }: FeedStackScreenProps<'FeedHome'>) {
  const [tab, setTab] = useState<FeedTab>('all');
  const feed = useFeed();
  const toggleLike = useToggleLike();

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
            color: colors.white,
            fontWeight: '900',
            fontSize: 20,
            textTransform: 'uppercase',
            letterSpacing: -0.3,
          }}
          accessibilityRole="header"
        >
          Pinellas <Text style={{ color: colors.lime }}>Run Club</Text>
        </Text>
        <Pressable
          onPress={() => navigation.navigate('CreatePost', undefined)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={copy.feed.newPost}
        >
          <Ionicons name="add-circle" size={30} color={colors.lime} />
        </Pressable>
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
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
        }}
        refreshControl={
          <RefreshControl
            refreshing={feed.isRefetching && !feed.isFetchingNextPage}
            onRefresh={() => void feed.refetch()}
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
