import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, TextField } from '@/components/ui';
import { useUpcomingEvents } from '@/hooks/useEvents';
import { useCreatePost } from '@/hooks/useFeed';
import { copy } from '@/lib/copy';
import { getErrorMessage } from '@/lib/errors';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { formatEventDate } from '@/lib/timeUtils';
import { pickImage } from '@/services/mediaService';
import { colors, radius, spacing } from '@/theme';
import type { FeedStackScreenProps } from '@/types/navigation';

const MAX_IMAGES = 4;

export default function CreatePostScreen({ navigation, route }: FeedStackScreenProps<'CreatePost'>) {
  const [caption, setCaption] = useState('');
  const [locationName, setLocationName] = useState('');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [eventId, setEventId] = useState<string | null>(route.params?.eventId ?? null);
  const [error, setError] = useState<string | null>(null);

  const createPost = useCreatePost();
  const upcomingEvents = useUpcomingEvents();

  const canPost = Boolean(caption.trim()) || imageUris.length > 0;

  const handleAddImage = async () => {
    setError(null);
    try {
      const uri = await pickImage();
      if (uri) setImageUris((prev) => (prev.length < MAX_IMAGES ? [...prev, uri] : prev));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handlePost = async () => {
    if (!canPost || createPost.isPending) return;
    setError(null);
    try {
      await createPost.mutateAsync({
        caption: caption.trim() || undefined,
        locationName: locationName.trim() || undefined,
        eventId: eventId ?? undefined,
        imageUris,
      });
      hapticSuccess();
      navigation.goBack();
    } catch (err) {
      hapticError();
      setError(getErrorMessage(err));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.black }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}
        >
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Close">
            <Ionicons name="close" size={26} color={colors.white} />
          </Pressable>
          <Text
            style={{
              color: colors.white,
              fontWeight: '900',
              fontSize: 17,
              textTransform: 'uppercase',
            }}
          >
            {copy.feed.newPost}
          </Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TextField
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={2200}
            placeholder="How was the run?"
            style={{ minHeight: 110, textAlignVertical: 'top' }}
          />

          {/* Image thumbnails */}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.xs,
              marginBottom: spacing.md,
            }}
          >
            {imageUris.map((uri, index) => (
              <View key={`${uri}-${index}`} style={{ position: 'relative' }}>
                <Image
                  source={{ uri }}
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: radius.md,
                    backgroundColor: colors.charcoal,
                  }}
                />
                <Pressable
                  onPress={() => setImageUris((prev) => prev.filter((_, i) => i !== index))}
                  hitSlop={8}
                  accessibilityLabel="Remove photo"
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    backgroundColor: colors.black,
                    borderRadius: 12,
                  }}
                >
                  <Ionicons name="close-circle" size={22} color={colors.danger} />
                </Pressable>
              </View>
            ))}

            {imageUris.length < MAX_IMAGES ? (
              <Pressable
                onPress={handleAddImage}
                accessibilityRole="button"
                accessibilityLabel="Add photo"
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: colors.gray700,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="camera-outline" size={24} color={colors.lime} />
                <Text style={{ color: colors.gray500, fontSize: 11, fontWeight: '700' }}>
                  {imageUris.length}/{MAX_IMAGES}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <TextField
            label="Location (optional)"
            value={locationName}
            onChangeText={setLocationName}
            placeholder="North Shore Park"
          />

          {/* Event tag */}
          {(upcomingEvents.data?.length ?? 0) > 0 ? (
            <View style={{ marginBottom: spacing.md }}>
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
                Tag an event (optional)
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                  {upcomingEvents.data!.slice(0, 10).map((event) => {
                    const active = eventId === event.id;
                    return (
                      <Pressable
                        key={event.id}
                        onPress={() => setEventId(active ? null : event.id)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: radius.pill,
                          backgroundColor: active ? colors.lime : colors.charcoal,
                          borderWidth: 1,
                          borderColor: active ? colors.lime : colors.gray700,
                        }}
                      >
                        <Text
                          style={{
                            color: active ? colors.black : colors.gray300,
                            fontWeight: '700',
                            fontSize: 13,
                          }}
                          numberOfLines={1}
                        >
                          {event.title} · {formatEventDate(event.starts_at)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          ) : null}

          {error ? (
            <Text style={{ color: colors.danger, fontSize: 14, marginBottom: spacing.sm }}>
              {error}
            </Text>
          ) : null}

          <Button
            title={copy.feed.share}
            onPress={handlePost}
            disabled={!canPost}
            loading={createPost.isPending}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
