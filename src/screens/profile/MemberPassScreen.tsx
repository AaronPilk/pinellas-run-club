import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Badge, Button, EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useMyPass } from '@/hooks/useMemberPass';
import { copy } from '@/lib/copy';
import { radius, spacing, useTheme } from '@/theme';
import type { AppTabsParamList, ProfileStackScreenProps } from '@/types/navigation';

export default function MemberPassScreen({ navigation }: ProfileStackScreenProps<'MemberPass'>) {
  const { colors } = useTheme();

  const { profile } = useAuth();
  const passQuery = useMyPass();

  const pass = passQuery.data;
  const tabNav = navigation.getParent<BottomTabNavigationProp<AppTabsParamList>>();

  const statusTone =
    pass?.status === 'active' ? 'lime' : pass?.status === 'expired' ? 'warning' : 'danger';

  return (
    <Screen scroll>
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
          {copy.pass.title}
        </Text>
      </View>

      {passQuery.isLoading ? (
        <LoadingState />
      ) : passQuery.isError ? (
        <ErrorState error={passQuery.error} onRetry={() => passQuery.refetch()} />
      ) : !pass || !profile ? (
        <EmptyState
          icon="card-outline"
          title="No pass yet"
          message="Your member pass is issued once your membership is approved."
        />
      ) : (
        <>
          <View
            style={{
              backgroundColor: colors.charcoal,
              borderRadius: radius.xl,
              borderWidth: 2,
              borderColor: colors.lime,
              padding: spacing.lg,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: spacing.lg,
              }}
            >
              <View>
                <Text
                  style={{
                    color: colors.lime,
                    fontSize: 22,
                    fontWeight: '900',
                    letterSpacing: 1,
                  }}
                >
                  PRC
                </Text>
                <Text
                  style={{
                    color: colors.gray300,
                    fontSize: 10,
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: 1.4,
                  }}
                >
                  Pinellas Run Club
                </Text>
              </View>
              <Badge label={String(pass.status).toUpperCase()} tone={statusTone} />
            </View>

            <Text
              style={{
                color: colors.gray500,
                fontSize: 10,
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              Member
            </Text>
            <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '900', marginBottom: spacing.xs }}>
              {profile.full_name}
            </Text>
            <Text style={{ color: colors.gray300, fontSize: 13, fontWeight: '600', marginBottom: spacing.lg }}>
              Member #{profile.member_number} · {pass.public_pass_id}
            </Text>

            <View style={{ alignItems: 'center' }}>
              <View
                style={{
                  backgroundColor: colors.white,
                  borderRadius: radius.md,
                  padding: spacing.md,
                }}
              >
                <QRCode value={pass.public_pass_id} size={180} backgroundColor={colors.white} color={colors.black} />
              </View>
            </View>

            <Text
              style={{
                color: colors.lime,
                fontSize: 12,
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: 1,
                textAlign: 'center',
                marginTop: spacing.lg,
              }}
            >
              {copy.pass.subtitle}
            </Text>
          </View>

          <Text
            style={{
              color: colors.gray300,
              fontSize: 14,
              lineHeight: 21,
              textAlign: 'center',
              marginTop: spacing.lg,
              paddingHorizontal: spacing.sm,
            }}
          >
            Show your card at local partner businesses and enjoy special discounts & offers.
          </Text>

          <Button
            title="View All Partners"
            onPress={() => tabNav?.navigate('ProfileTab', { screen: 'PartnerPerks' })}
            style={{ marginTop: spacing.lg }}
          />
        </>
      )}
    </Screen>
  );
}
