import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PostCard } from '@/components/PostCard';
import { Avatar, ErrorState, LoadingState } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import {
  useAddComment,
  useAdminHidePost,
  useComments,
  useDeleteOwnPost,
  usePost,
  useSetPostPinned,
  useToggleLike,
} from '@/hooks/useFeed';
import { getErrorMessage } from '@/lib/errors';
import { hapticError, hapticLight, hapticSuccess } from '@/lib/haptics';
import { formatRelativeTime } from '@/lib/timeUtils';
import { radius, spacing, useTheme } from '@/theme';
import type { FeedCommentWithAuthor } from '@/types/models';
import type { FeedStackScreenProps } from '@/types/navigation';

export default function PostDetailScreen({ navigation, route }: FeedStackScreenProps<'PostDetail'>) {
  const { colors } = useTheme();

  const { postId } = route.params;
  const { profile, isAdmin } = useAuth();

  const post = usePost(postId);
  const comments = useComments(postId);
  const addComment = useAddComment(postId);
  const toggleLike = useToggleLike();
  const deletePost = useDeleteOwnPost();
  const hidePost = useAdminHidePost();
  const setPinned = useSetPostPinned();

  const [commentText, setCommentText] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const isOwnPost = Boolean(profile && post.data && post.data.profile_id === profile.id);

  const handleDelete = () => {
    Alert.alert('Delete post?', 'This removes the post from the feed for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deletePost.mutate(postId, {
            onSuccess: () => {
              hapticSuccess();
              navigation.goBack();
            },
            onError: (err) => {
              hapticError();
              setActionError(getErrorMessage(err));
            },
          });
        },
      },
    ]);
  };

  const handleAdminHide = () => {
    Alert.alert('Hide post?', 'Members will no longer see this post.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Hide',
        style: 'destructive',
        onPress: () => {
          hidePost.mutate(postId, {
            onSuccess: () => {
              hapticSuccess();
              navigation.goBack();
            },
            onError: (err) => {
              hapticError();
              setActionError(getErrorMessage(err));
            },
          });
        },
      },
    ]);
  };

  const handleTogglePin = (currentlyPinned: boolean) => {
    Alert.alert(
      currentlyPinned ? 'Unpin post?' : 'Pin post?',
      currentlyPinned
        ? 'It will no longer show in the pinned section at the top of the feed.'
        : 'It will show in the pinned section at the top of the feed for everyone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: currentlyPinned ? 'Unpin' : 'Pin',
          onPress: () => {
            setPinned.mutate(
              { postId, pinned: !currentlyPinned },
              {
                onSuccess: () => hapticSuccess(),
                onError: (err) => {
                  hapticError();
                  setActionError(getErrorMessage(err));
                },
              }
            );
          },
        },
      ]
    );
  };

  const handleAddComment = () => {
    const content = commentText.trim();
    if (!content || addComment.isPending) return;
    setActionError(null);
    addComment.mutate(content, {
      onSuccess: () => {
        hapticSuccess();
        setCommentText('');
      },
      onError: (err) => {
        hapticError();
        setActionError(getErrorMessage(err));
      },
    });
  };

  const renderComment = ({ item }: { item: FeedCommentWithAuthor }) => (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
      }}
    >
      <Pressable
        onPress={() => navigation.navigate('MemberProfile', { profileId: item.profile_id })}
        accessibilityLabel={`View ${item.author?.full_name ?? 'member'}'s profile`}
      >
        <Avatar uri={item.author?.avatar_url} name={item.author?.full_name} size={32} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 13 }}>
            {item.author?.full_name ?? 'Member'}
          </Text>
          <Text style={{ color: colors.gray500, fontSize: 12 }}>
            {formatRelativeTime(item.created_at)}
          </Text>
        </View>
        <Text style={{ color: colors.gray100, fontSize: 14, lineHeight: 20, marginTop: 2 }}>
          {item.content}
        </Text>
      </View>
    </View>
  );

  let body: React.ReactNode;

  if (post.isPending) {
    body = <LoadingState />;
  } else if (post.isError) {
    body = <ErrorState error={post.error} onRetry={() => void post.refetch()} />;
  } else {
    const data = post.data;
    body = (
      <FlatList
        data={comments.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderComment}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.lg }}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
            <PostCard
              post={data}
              onPressAuthor={() =>
                navigation.navigate('MemberProfile', { profileId: data.profile_id })
              }
              onToggleLike={() => {
                hapticLight();
                toggleLike.mutate({ postId: data.id, liked: data.liked_by_me });
              }}
            />

            {/* Owner / admin actions */}
            {isOwnPost || isAdmin ? (
              <View
                style={{
                  flexDirection: 'row',
                  gap: spacing.md,
                  marginBottom: spacing.sm,
                }}
              >
                {isOwnPost ? (
                  <Pressable
                    onPress={handleDelete}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Delete post"
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 13 }}>
                      Delete post
                    </Text>
                  </Pressable>
                ) : null}
                {isAdmin ? (
                  <Pressable
                    onPress={() => handleTogglePin(Boolean(data.pinned_at))}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={data.pinned_at ? 'Unpin post' : 'Pin post'}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  >
                    <Ionicons
                      name={data.pinned_at ? 'pin' : 'pin-outline'}
                      size={16}
                      color={colors.lime}
                    />
                    <Text style={{ color: colors.lime, fontWeight: '700', fontSize: 13 }}>
                      {data.pinned_at ? 'Unpin (admin)' : 'Pin post (admin)'}
                    </Text>
                  </Pressable>
                ) : null}
                {isAdmin && !isOwnPost ? (
                  <Pressable
                    onPress={handleAdminHide}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Hide post"
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  >
                    <Ionicons name="eye-off-outline" size={16} color={colors.warning} />
                    <Text style={{ color: colors.warning, fontWeight: '700', fontSize: 13 }}>
                      Hide post (admin)
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {actionError ? (
              <Text style={{ color: colors.danger, fontSize: 13, marginBottom: spacing.sm }}>
                {actionError}
              </Text>
            ) : null}

            <Text
              style={{
                color: colors.gray300,
                fontSize: 12,
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginBottom: spacing.xs,
              }}
            >
              Comments
            </Text>
          </View>
        }
        ListEmptyComponent={
          comments.isPending ? (
            <View style={{ paddingVertical: spacing.lg }}>
              <LoadingState />
            </View>
          ) : comments.isError ? (
            <Text
              style={{
                color: colors.gray500,
                fontSize: 14,
                textAlign: 'center',
                padding: spacing.md,
              }}
            >
              {getErrorMessage(comments.error)}
            </Text>
          ) : (
            <Text
              style={{
                color: colors.gray500,
                fontSize: 14,
                textAlign: 'center',
                padding: spacing.md,
              }}
            >
              No comments yet. Say something.
            </Text>
          )
        }
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
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
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </Pressable>
          <Text
            style={{
              color: colors.textPrimary,
              fontWeight: '900',
              fontSize: 17,
              textTransform: 'uppercase',
            }}
          >
            Post
          </Text>
        </View>

        <View style={{ flex: 1 }}>{body}</View>

        {/* Comment composer pinned bottom */}
        {post.isSuccess ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderTopWidth: 1,
              borderTopColor: colors.charcoal,
              backgroundColor: colors.background,
            }}
          >
            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Add a comment..."
              placeholderTextColor={colors.gray500}
              style={{
                flex: 1,
                backgroundColor: colors.charcoal,
                borderRadius: radius.pill,
                paddingHorizontal: spacing.md,
                paddingVertical: 10,
                color: colors.textPrimary,
                fontSize: 14,
              }}
              maxLength={1000}
              returnKeyType="send"
              onSubmitEditing={handleAddComment}
            />
            <Pressable
              onPress={handleAddComment}
              disabled={!commentText.trim() || addComment.isPending}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Send comment"
            >
              <Ionicons
                name="arrow-up-circle"
                size={32}
                color={commentText.trim() ? colors.lime : colors.gray700}
              />
            </Pressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
