import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Button, Card, Screen } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadCount } from '@/hooks/useNotifications';
import { copy } from '@/lib/copy';
import { hapticLight } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme';
import type { AppTabsParamList, MoreStackScreenProps } from '@/types/navigation';

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  badgeCount?: number;
};

export default function MoreHomeScreen({ navigation }: MoreStackScreenProps<'MoreHome'>) {
  const { isAdmin, signOut } = useAuth();
  const unreadQuery = useUnreadCount();

  const tabNav = navigation.getParent<BottomTabNavigationProp<AppTabsParamList>>();
  const unread = unreadQuery.data ?? 0;

  const items: MenuItem[] = [
    {
      icon: 'notifications-outline',
      label: 'Notifications',
      onPress: () => navigation.navigate('Notifications'),
      badgeCount: unread,
    },
    { icon: 'qr-code-outline', label: 'My QR Code', onPress: () => navigation.navigate('MyQRCode') },
    { icon: 'pricetags-outline', label: 'Partner Perks', onPress: () => navigation.navigate('PartnerPerks') },
    {
      icon: 'card-outline',
      label: 'Discount Card',
      onPress: () => tabNav?.navigate('ProfileTab', { screen: 'MemberPass' }),
    },
    { icon: 'stopwatch-outline', label: 'Courses', onPress: () => navigation.navigate('Courses') },
    { icon: 'person-add-outline', label: 'Invite a Friend', onPress: () => navigation.navigate('InviteFriend') },
    { icon: 'megaphone-outline', label: 'Sponsorships', onPress: () => navigation.navigate('Sponsorship') },
    { icon: 'help-circle-outline', label: 'Help & Support', onPress: () => navigation.navigate('HelpSupport') },
    {
      icon: 'settings-outline',
      label: 'Settings',
      onPress: () => tabNav?.navigate('ProfileTab', { screen: 'Settings' }),
    },
  ];

  if (isAdmin) {
    items.push({
      icon: 'shield-checkmark-outline',
      label: 'Admin Dashboard',
      onPress: () => navigation.navigate('AdminDashboard'),
    });
  }

  const handleSignOut = () => {
    Alert.alert(copy.actions.signOut, 'Sign out of Pinellas Run Club?', [
      { text: copy.actions.cancel, style: 'cancel' },
      { text: copy.actions.signOut, style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <Screen scroll>
      <Text
        style={{
          color: colors.white,
          fontSize: 32,
          fontWeight: '900',
          textTransform: 'uppercase',
          letterSpacing: -0.5,
          marginBottom: spacing.md,
        }}
      >
        More
      </Text>

      {items.map((item) => (
        <Pressable
          key={item.label}
          onPress={() => {
            hapticLight();
            item.onPress();
          }}
          accessibilityRole="button"
          accessibilityLabel={item.label}
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
          <Ionicons name={item.icon} size={20} color={colors.lime} style={{ marginRight: spacing.sm }} />
          <Text style={{ color: colors.white, fontSize: 15, fontWeight: '700', flex: 1 }}>
            {item.label}
          </Text>
          {item.badgeCount ? (
            <View
              style={{
                minWidth: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: colors.lime,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 6,
                marginRight: spacing.xs,
              }}
            >
              <Text style={{ color: colors.black, fontSize: 12, fontWeight: '900' }}>
                {item.badgeCount > 99 ? '99+' : item.badgeCount}
              </Text>
            </View>
          ) : null}
          <Ionicons name="chevron-forward" size={18} color={colors.gray500} />
        </Pressable>
      ))}

      <Card style={{ marginTop: spacing.md, borderWidth: 1, borderColor: colors.lime }}>
        <Text style={{ color: colors.white, fontSize: 18, fontWeight: '900' }}>
          Want to partner with PRC?
        </Text>
        <Text style={{ color: colors.gray300, fontSize: 14, lineHeight: 20, marginTop: spacing.xs }}>
          Learn about sponsorship opportunities and exclusive member perks.
        </Text>
        <Button
          title="Become a Sponsor"
          onPress={() => navigation.navigate('Sponsorship')}
          style={{ marginTop: spacing.md }}
        />
      </Card>

      <Pressable
        onPress={handleSignOut}
        accessibilityRole="button"
        accessibilityLabel={copy.actions.signOut}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.md,
          marginTop: spacing.md,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.gray500} style={{ marginRight: spacing.xs }} />
        <Text style={{ color: colors.gray500, fontSize: 14, fontWeight: '700' }}>{copy.actions.signOut}</Text>
      </Pressable>
    </Screen>
  );
}
