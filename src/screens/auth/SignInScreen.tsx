import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, TextField } from '@/components/ui';
import { copy } from '@/lib/copy';
import { getErrorMessage } from '@/lib/errors';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { signInSchema } from '@/lib/validation';
import { signIn } from '@/services/authService';
import { colors, spacing } from '@/theme';
import type { AuthStackScreenProps } from '@/types/navigation';

export default function SignInScreen({ navigation }: AuthStackScreenProps<'SignIn'>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitError(null);

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      await signIn(parsed.data.email, parsed.data.password);
      hapticSuccess();
      // RootNavigator switches stacks when the session lands.
    } catch (error) {
      hapticError();
      const raw = error instanceof Error ? error.message.toLowerCase() : '';
      setSubmitError(
        raw.includes('invalid login credentials')
          ? "That email and password don't match. Try again."
          : getErrorMessage(error)
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.black }}
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
            <Ionicons name="chevron-back" size={26} color={colors.white} />
          </Pressable>

          <Text
            style={{
              color: colors.white,
              fontWeight: '900',
              fontSize: 30,
              textTransform: 'uppercase',
              marginTop: spacing.md,
            }}
            accessibilityRole="header"
          >
            Welcome back
          </Text>
          <Text
            style={{ color: colors.gray300, fontSize: 15, marginTop: 6, marginBottom: spacing.lg }}
          >
            {copy.brand.together}
          </Text>

          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="you@example.com"
            error={fieldErrors.email}
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            placeholder="Your password"
            error={fieldErrors.password}
          />

          {submitError ? (
            <Text style={{ color: colors.danger, fontSize: 14, marginBottom: spacing.sm }}>
              {submitError}
            </Text>
          ) : null}

          <Button title={copy.auth.signIn} onPress={handleSubmit} loading={submitting} />

          <Pressable
            onPress={() => navigation.navigate('ForgotPassword')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={copy.auth.forgotPassword}
            style={{ marginTop: spacing.md, alignItems: 'center' }}
          >
            <Text style={{ color: colors.lime, fontWeight: '700', fontSize: 14 }}>
              {copy.auth.forgotPassword}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('SignUp')}
            hitSlop={8}
            style={{ marginTop: spacing.lg, alignItems: 'center' }}
          >
            <Text style={{ color: colors.gray300, fontSize: 14 }}>
              New here?{' '}
              <Text style={{ color: colors.lime, fontWeight: '800' }}>{copy.auth.signUp}</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
