import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, TextField } from '@/components/ui';
import { getErrorMessage } from '@/lib/errors';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { resetPassword } from '@/services/authService';
import { spacing, useTheme } from '@/theme';
import type { AuthStackScreenProps } from '@/types/navigation';

export default function ForgotPasswordScreen({
  navigation,
}: AuthStackScreenProps<'ForgotPassword'>) {
  const { colors } = useTheme();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!/.+@.+\..+/.test(email.trim())) {
      setError('Enter a valid email');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(email);
      hapticSuccess();
      setSent(true);
    } catch (err) {
      hapticError();
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'left', 'right']}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </Pressable>

          {sent ? (
            <View style={{ marginTop: spacing.xl }}>
              <Ionicons name="mail-unread-outline" size={44} color={colors.lime} />
              <Text
                style={{
                  color: colors.textPrimary,
                  fontWeight: '900',
                  fontSize: 26,
                  textTransform: 'uppercase',
                  marginTop: spacing.md,
                }}
              >
                Check your inbox
              </Text>
              <Text
                style={{
                  color: colors.gray300,
                  fontSize: 15,
                  lineHeight: 22,
                  marginTop: spacing.sm,
                }}
              >
                If {email.trim()} has an account, a reset link is on its way.
              </Text>
              <Button
                title="Back to Sign In"
                onPress={() => navigation.navigate('SignIn')}
                style={{ marginTop: spacing.lg }}
              />
            </View>
          ) : (
            <>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontWeight: '900',
                  fontSize: 30,
                  textTransform: 'uppercase',
                  marginTop: spacing.md,
                }}
                accessibilityRole="header"
              >
                Reset password
              </Text>
              <Text
                style={{
                  color: colors.gray300,
                  fontSize: 15,
                  marginTop: 6,
                  marginBottom: spacing.lg,
                }}
              >
                Drop your email and we&apos;ll send a reset link.
              </Text>

              <TextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                placeholder="you@example.com"
                error={error ?? undefined}
              />

              <Button title="Send Reset Link" onPress={handleSubmit} loading={submitting} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
