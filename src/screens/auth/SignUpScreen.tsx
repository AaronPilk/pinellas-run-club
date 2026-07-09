import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, TextField } from '@/components/ui';
import { copy } from '@/lib/copy';
import { getErrorMessage } from '@/lib/errors';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { signUpSchema } from '@/lib/validation';
import { signUp } from '@/services/authService';
import { radius, spacing, useTheme } from '@/theme';
import type { AuthStackScreenProps } from '@/types/navigation';

const RUNNING_LEVELS = ['beginner', 'casual', 'intermediate', 'advanced'] as const;

export default function SignUpScreen({ navigation, route }: AuthStackScreenProps<'SignUp'>) {
  const { colors } = useTheme();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [favoriteRunSpot, setFavoriteRunSpot] = useState('');
  const [runningLevel, setRunningLevel] = useState<string | null>(null);
  const [typicalPace, setTypicalPace] = useState('');
  const [inviteCode, setInviteCode] = useState(route.params?.inviteCode ?? '');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);

  const handleSubmit = async () => {
    setSubmitError(null);

    const parsed = signUpSchema.safeParse({
      fullName,
      email,
      password,
      instagramHandle: instagramHandle || undefined,
      favoriteRunSpot: favoriteRunSpot || undefined,
      runningLevel: runningLevel ?? undefined,
      typicalPace: typicalPace || undefined,
      inviteCode: inviteCode || undefined,
      acceptedTerms,
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      if (errors.acceptedTerms) setSubmitError(errors.acceptedTerms);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      const session = await signUp(parsed.data);
      hapticSuccess();
      // With a live session the RootNavigator routes onward automatically.
      if (!session) setNeedsEmailConfirm(true);
    } catch (error) {
      hapticError();
      setSubmitError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (needsEmailConfirm) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg }}>
          <Ionicons name="mail-unread-outline" size={44} color={colors.lime} />
          <Text
            style={{
              color: colors.textPrimary,
              fontWeight: '900',
              fontSize: 26,
              marginTop: spacing.md,
              textTransform: 'uppercase',
            }}
          >
            Check your inbox
          </Text>
          <Text
            style={{ color: colors.gray300, fontSize: 15, lineHeight: 22, marginTop: spacing.sm }}
          >
            We sent a confirmation link to {email.trim()}. Tap it, then sign in.
          </Text>
          <Button
            title={copy.auth.signIn}
            onPress={() => navigation.navigate('SignIn')}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </SafeAreaView>
    );
  }

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
            {copy.auth.signUp}
          </Text>
          <Text
            style={{ color: colors.gray300, fontSize: 15, marginTop: 6, marginBottom: spacing.lg }}
          >
            {copy.brand.together}
          </Text>

          <TextField
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            textContentType="name"
            placeholder="Jane Runner"
            error={fieldErrors.fullName}
          />
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
            textContentType="newPassword"
            placeholder="At least 8 characters"
            error={fieldErrors.password}
          />
          <TextField
            label="Instagram (optional)"
            value={instagramHandle}
            onChangeText={setInstagramHandle}
            autoCapitalize="none"
            placeholder="@yourhandle"
          />
          <TextField
            label="Favorite run spot (optional)"
            value={favoriteRunSpot}
            onChangeText={setFavoriteRunSpot}
            placeholder="The Pier, Coffee Pot Blvd..."
          />

          {/* Running level */}
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
            Running level (optional)
          </Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.xs,
              marginBottom: spacing.md,
            }}
          >
            {RUNNING_LEVELS.map((level) => {
              const active = runningLevel === level;
              return (
                <Pressable
                  key={level}
                  onPress={() => setRunningLevel(active ? null : level)}
                  accessibilityRole="button"
                  accessibilityLabel={`Running level ${level}`}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                    borderRadius: radius.pill,
                    backgroundColor: active ? colors.lime : colors.charcoal,
                    borderWidth: 1,
                    borderColor: active ? colors.lime : colors.gray700,
                  }}
                >
                  <Text
                    style={{
                      color: active ? colors.black : colors.gray300,
                      fontWeight: '800',
                      fontSize: 13,
                      textTransform: 'capitalize',
                    }}
                  >
                    {level}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextField
            label="Typical pace (optional)"
            value={typicalPace}
            onChangeText={setTypicalPace}
            placeholder="9:30 / mi"
          />
          <TextField
            label="Invite code (optional)"
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="characters"
            placeholder="From a friend in the club"
          />

          {/* Terms */}
          <Pressable
            onPress={() => setAcceptedTerms((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acceptedTerms }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              marginBottom: spacing.md,
            }}
          >
            <Ionicons
              name={acceptedTerms ? 'checkbox' : 'square-outline'}
              size={24}
              color={acceptedTerms ? colors.lime : colors.gray500}
            />
            <Text style={{ color: colors.gray300, fontSize: 14, flex: 1 }}>
              I accept the club terms and understand runs are at my own risk.
            </Text>
          </Pressable>

          {submitError ? (
            <Text style={{ color: colors.danger, fontSize: 14, marginBottom: spacing.sm }}>
              {submitError}
            </Text>
          ) : null}

          <Button title={copy.auth.signUp} onPress={handleSubmit} loading={submitting} />

          <Pressable
            onPress={() => navigation.navigate('SignIn')}
            hitSlop={8}
            style={{ marginTop: spacing.md, alignItems: 'center' }}
          >
            <Text style={{ color: colors.gray300, fontSize: 14 }}>
              Already a member?{' '}
              <Text style={{ color: colors.lime, fontWeight: '800' }}>Sign In</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
