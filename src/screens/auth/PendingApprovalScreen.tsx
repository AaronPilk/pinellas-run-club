import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import { Button, Card, Screen } from '@/components/ui';
import { copy } from '@/lib/copy';
import { getErrorMessage } from '@/lib/errors';
import { hapticLight } from '@/lib/haptics';
import { spacing, useTheme } from '@/theme';

export default function PendingApprovalScreen() {
  const { colors } = useTheme();

  const { profile, refetchProfile, signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setError(null);
    setRefreshing(true);
    try {
      hapticLight();
      await refetchProfile();
      // If the status flipped to approved, RootNavigator moves us into the app.
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRefreshing(false);
    }
  };

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
            <Ionicons name="hourglass-outline" size={32} color={colors.lime} />
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
            {copy.auth.pendingTitle}
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
            {profile?.full_name ? `Thanks for joining, ${profile.full_name.split(' ')[0]}. ` : ''}
            {copy.auth.pendingBody}
          </Text>

          {error ? (
            <Text
              style={{
                color: colors.danger,
                fontSize: 14,
                textAlign: 'center',
                marginTop: spacing.sm,
              }}
            >
              {error}
            </Text>
          ) : null}

          <Button
            title="Refresh Status"
            onPress={handleRefresh}
            loading={refreshing}
            style={{ alignSelf: 'stretch', marginTop: spacing.lg }}
          />
          <Button
            title={copy.actions.signOut}
            variant="ghost"
            onPress={() => void signOut()}
            style={{ alignSelf: 'stretch', marginTop: spacing.sm }}
          />
        </Card>

        <Text
          style={{
            color: colors.gray500,
            fontSize: 13,
            fontWeight: '600',
            textAlign: 'center',
            marginTop: spacing.lg,
          }}
        >
          {copy.brand.together}
        </Text>
      </View>
    </Screen>
  );
}
