import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Share, Text, View } from 'react-native';

import { Button, Card, ErrorState, Screen } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { hapticLight } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme';
import type { MoreStackScreenProps } from '@/types/navigation';

export default function InviteFriendScreen({ navigation }: MoreStackScreenProps<'InviteFriend'>) {
  const { profile } = useAuth();

  const handleShare = async () => {
    if (!profile) return;
    hapticLight();
    try {
      await Share.share({
        message: `Come run with us. Join Pinellas Run Club with my invite code ${profile.invite_code}: prc://invite/${profile.invite_code}`,
      });
    } catch {
      // Share sheet dismissed — nothing to do.
    }
  };

  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={26} color={colors.white} />
        </Pressable>
        <Text
          style={{
            color: colors.white,
            fontSize: 20,
            fontWeight: '900',
            textTransform: 'uppercase',
            marginLeft: spacing.xs,
          }}
        >
          Invite a Friend
        </Text>
      </View>

      {!profile ? (
        <ErrorState message="We couldn't load your invite code." />
      ) : (
        <>
          <View style={{ alignItems: 'center', marginTop: spacing.lg }}>
            <Ionicons name="people" size={44} color={colors.lime} />
            <Text
              style={{
                color: colors.white,
                fontSize: 24,
                fontWeight: '900',
                textAlign: 'center',
                marginTop: spacing.sm,
              }}
            >
              Bring a runner.
            </Text>
            <Text
              style={{
                color: colors.gray300,
                fontSize: 14,
                lineHeight: 21,
                textAlign: 'center',
                marginTop: spacing.xs,
                paddingHorizontal: spacing.lg,
              }}
            >
              Share your code below. When your friend signs up with it and gets approved, they skip
              the line and you get credit toward the Invite Champion badge.
            </Text>
          </View>

          <Card
            style={{
              marginTop: spacing.xl,
              alignItems: 'center',
              paddingVertical: spacing.lg,
              borderWidth: 1,
              borderColor: colors.lime,
              borderStyle: 'dashed',
              borderRadius: radius.lg,
            }}
          >
            <Text
              style={{
                color: colors.gray500,
                fontSize: 11,
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              Your invite code
            </Text>
            <Text
              style={{
                color: colors.lime,
                fontSize: 34,
                fontWeight: '900',
                letterSpacing: 4,
                marginTop: spacing.xs,
              }}
              accessibilityLabel={`Invite code ${profile.invite_code}`}
            >
              {profile.invite_code}
            </Text>
          </Card>

          <Button
            title="Share Invite"
            onPress={() => void handleShare()}
            style={{ marginTop: spacing.lg }}
          />

          <Text
            style={{
              color: colors.gray500,
              fontSize: 12,
              textAlign: 'center',
              marginTop: spacing.md,
              lineHeight: 18,
            }}
          >
            New members are reviewed by club organizers before they're in. No spam, no bots — just
            runners.
          </Text>
        </>
      )}
    </Screen>
  );
}
