import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Avatar, ErrorState, LoadingState, Screen } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useMyPass } from '@/hooks/useMemberPass';
import { radius, spacing, useTheme } from '@/theme';
import type { MoreStackScreenProps } from '@/types/navigation';

export default function MyQRCodeScreen({ navigation }: MoreStackScreenProps<'MyQRCode'>) {
  const { colors } = useTheme();

  const { profile } = useAuth();
  const passQuery = useMyPass();

  const qrValue = passQuery.data?.public_pass_id ?? profile?.invite_code ?? null;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
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
          My QR Code
        </Text>
      </View>

      {passQuery.isLoading ? (
        <LoadingState />
      ) : !profile || !qrValue ? (
        <ErrorState
          message="We couldn't load your QR code. Pull to refresh."
          onRetry={() => passQuery.refetch()}
        />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Avatar uri={profile.avatar_url} name={profile.full_name} size={72} />
          <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '900', marginTop: spacing.sm }}>
            {profile.full_name}
          </Text>
          <Text style={{ color: colors.gray500, fontSize: 13, marginTop: 2 }}>
            Member #{profile.member_number}
          </Text>

          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: radius.lg,
              padding: spacing.lg,
              marginTop: spacing.lg,
            }}
          >
            <QRCode value={qrValue} size={220} backgroundColor={colors.white} color={colors.black} />
          </View>

          <Text
            style={{
              color: colors.gray300,
              fontSize: 14,
              lineHeight: 21,
              textAlign: 'center',
              marginTop: spacing.lg,
              paddingHorizontal: spacing.lg,
            }}
          >
            This is your personal club code. Organizers can scan it to verify your membership, and
            partners can check it against your member pass.
          </Text>
        </View>
      )}
    </Screen>
  );
}
