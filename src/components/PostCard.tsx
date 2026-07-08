import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { formatRelativeTime } from '@/lib/timeUtils';
import { colors, radius, spacing } from '@/theme';
import type { FeedPostWithAuthor } from '@/types/models';

import { Avatar } from './ui/Avatar';

type Props = {
  post: FeedPostWithAuthor;
  /** Presentational only — all actions come in via callbacks. */
  onPressAuthor?: () => void;
  onPressPost?: () => void;
  onToggleLike?: () => void;
  onPressComments?: () => void;
};

export function PostCard({ post, onPressAuthor, onPressPost, onToggleLike, onPressComments }: Props) {
  const firstImage = post.media[0];

  return (
    <View
      style={{
        backgroundColor: colors.darkCard,
        borderRadius: radius.lg,
        overflow: 'hidden',
        marginBottom: spacing.md,
      }}
    >
      {/* Author row */}
      <Pressable
        onPress={onPressAuthor}
        disabled={!onPressAuthor}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.sm,
          gap: spacing.sm,
        }}
      >
        <Avatar uri={post.author?.avatar_url} name={post.author?.full_name} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.white, fontWeight: '800', fontSize: 14 }} numberOfLines={1}>
            {post.author?.full_name ?? 'Member'}
          </Text>
          {post.location_name ? (
            <Text style={{ color: colors.gray500, fontSize: 12 }} numberOfLines={1}>
              {post.location_name}
            </Text>
          ) : null}
        </View>
        <Text style={{ color: colors.gray500, fontSize: 12, fontWeight: '600' }}>
          {formatRelativeTime(post.created_at)}
        </Text>
      </Pressable>

      {/* Media */}
      {firstImage ? (
        <Pressable onPress={onPressPost} disabled={!onPressPost}>
          <Image
            source={{ uri: firstImage.media_url }}
            style={{ width: '100%', aspectRatio: 1, backgroundColor: colors.charcoal }}
            resizeMode="cover"
          />
          {post.media.length > 1 ? (
            <View
              style={{
                position: 'absolute',
                top: spacing.sm,
                right: spacing.sm,
                backgroundColor: colors.black,
                borderRadius: radius.pill,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Text style={{ color: colors.white, fontSize: 11, fontWeight: '700' }}>
                1/{post.media.length}
              </Text>
            </View>
          ) : null}
        </Pressable>
      ) : null}

      {/* Caption */}
      {post.caption ? (
        <Pressable onPress={onPressPost} disabled={!onPressPost}>
          <Text
            style={{
              color: colors.gray100,
              fontSize: 14,
              lineHeight: 20,
              paddingHorizontal: spacing.sm,
              paddingTop: spacing.sm,
            }}
            numberOfLines={4}
          >
            {post.caption}
          </Text>
        </Pressable>
      ) : null}

      {/* Actions */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.sm,
          gap: spacing.lg,
        }}
      >
        <Pressable
          onPress={onToggleLike}
          disabled={!onToggleLike}
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          accessibilityRole="button"
          accessibilityLabel={post.liked_by_me ? 'Unlike' : 'Like'}
        >
          <Ionicons
            name={post.liked_by_me ? 'heart' : 'heart-outline'}
            size={22}
            color={post.liked_by_me ? colors.lime : colors.gray300}
          />
          <Text style={{ color: colors.gray300, fontWeight: '700', fontSize: 13 }}>
            {post.like_count}
          </Text>
        </Pressable>

        <Pressable
          onPress={onPressComments}
          disabled={!onPressComments}
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          accessibilityRole="button"
          accessibilityLabel="Comments"
        >
          <Ionicons name="chatbubble-outline" size={20} color={colors.gray300} />
          <Text style={{ color: colors.gray300, fontWeight: '700', fontSize: 13 }}>
            {post.comment_count}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
