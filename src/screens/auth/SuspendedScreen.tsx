import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import { Button, Card, Screen } from '@/components/ui';
import { copy } from '@/lib/copy';
import { spacing, useTheme } from '@/theme';

// TODO: read from app_settings.support_email once a settings service exists.
const SUPPORT_EMAIL = 'pinellasrunclub@gmail.com';

export default function SuspendedScreen() {
  const { colors } = useTheme();

  const { signOut } = useAuth();

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.charcoal,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.md,
            }}
          >
            <Ionicons name="pause-circle-outline" size={34} color={colors.warning} />
          </View>

          <Text
            style={{
              color: colors.textPrimary,
              fontWeight: '900',
              fontSize: 24,
              textTransform: 'uppercase',
              textAlign: 'center',
            }}
            accessibilityRole="header"
          >
            {copy.auth.suspendedTitle}
          </Text>

          <Text
            style={{
              color: colors.gray300,
              fontSize: 15,
              lineHeight: 22,
              textAlign: 'center',
              marginTop: spacing.sm,
            }}
          >
            {copy.auth.suspendedBody}
          </Text>

          <Pressable
            onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel={`Email ${SUPPORT_EMAIL}`}
            style={{ marginTop: spacing.md }}
          >
            <Text style={{ color: colors.lime, fontWeight: '800', fontSize: 15 }}>
              {SUPPORT_EMAIL}
            </Text>
          </Pressable>

          <Button
            title={copy.actions.signOut}
            variant="secondary"
            onPress={() => void signOut()}
            style={{ alignSelf: 'stretch', marginTop: spacing.lg }}
          />
        </Card>
      </View>
    </Screen>
  );
}
