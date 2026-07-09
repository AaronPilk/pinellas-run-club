import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Button, Card, ErrorState, Screen, TextField } from '@/components/ui';
import { useSendAnnouncement } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { copy } from '@/lib/copy';
import { getErrorMessage } from '@/lib/errors';
import { hapticSuccess } from '@/lib/haptics';
import { radius, spacing, useTheme } from '@/theme';
import type { MoreStackScreenProps } from '@/types/navigation';

export default function AdminNotificationsScreen({
  navigation,
}: MoreStackScreenProps<'AdminNotifications'>) {
  const { colors } = useTheme();

  const { isAdmin } = useAuth();
  const sendAnnouncement = useSendAnnouncement();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({});
  const [sent, setSent] = useState(false);

  if (!isAdmin) {
    return (
      <Screen>
        <ErrorState message="Admins only. Ask a club organizer if you need access." />
      </Screen>
    );
  }

  const handleSend = () => {
    const nextErrors: { title?: string; body?: string } = {};
    if (title.trim().length < 3) nextErrors.title = 'Give the announcement a title';
    if (body.trim().length < 3) nextErrors.body = 'Write the message body';

    if (nextErrors.title || nextErrors.body) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    Alert.alert(
      copy.admin.sendAnnouncement,
      'This sends a push notification to every member with the app installed. Ready?',
      [
        { text: copy.actions.cancel, style: 'cancel' },
        {
          text: 'Send Push',
          onPress: () =>
            sendAnnouncement.mutate(
              {
                title: title.trim(),
                body: body.trim(),
                deepLink: deepLink.trim() || undefined,
              },
              {
                onSuccess: () => {
                  hapticSuccess();
                  setSent(true);
                },
                onError: (error) => Alert.alert('Send failed', getErrorMessage(error)),
              }
            ),
        },
      ]
    );
  };

  if (sent) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 42,
              backgroundColor: colors.lime,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.lg,
            }}
          >
            <Ionicons name="paper-plane" size={40} color={colors.black} />
          </View>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: 24,
              fontWeight: '900',
              textTransform: 'uppercase',
              textAlign: 'center',
            }}
          >
            Announcement sent
          </Text>
          <Text
            style={{
              color: colors.gray300,
              fontSize: 14,
              lineHeight: 21,
              textAlign: 'center',
              marginTop: spacing.sm,
            }}
          >
            Pushes are delivering to members now. In-app notifications were stored too.
          </Text>
          <View style={{ alignSelf: 'stretch', marginTop: spacing.xl, gap: spacing.sm }}>
            <Button
              title="Send Another"
              onPress={() => {
                setTitle('');
                setBody('');
                setDeepLink('');
                setSent(false);
              }}
            />
            <Button title="Back to Dashboard" variant="secondary" onPress={() => navigation.goBack()} />
          </View>
        </View>
      </Screen>
    );
  }

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
          Announcements
        </Text>
      </View>

      <Text style={{ color: colors.gray300, fontSize: 14, lineHeight: 21, marginBottom: spacing.md }}>
        Compose a push announcement for all members. Keep it short — the title shows on lock
        screens.
      </Text>

      <TextField
        label="Title"
        value={title}
        onChangeText={setTitle}
        error={errors.title}
        placeholder="Run Club Tonight!"
        maxLength={80}
      />
      <TextField
        label="Body"
        value={body}
        onChangeText={setBody}
        error={errors.body}
        multiline
        style={{ minHeight: 100, textAlignVertical: 'top' }}
        placeholder="Wednesday Social Run at North Shore Park starts at 6:30 PM."
        maxLength={240}
      />
      <TextField
        label="Deep Link (optional)"
        value={deepLink}
        onChangeText={setDeepLink}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="prc://event/EVENT_ID"
      />

      {title.trim() || body.trim() ? (
        <Card style={{ marginBottom: spacing.md }}>
          <Text
            style={{
              color: colors.gray500,
              fontSize: 11,
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: spacing.xs,
            }}
          >
            Preview
          </Text>
          <View
            style={{
              backgroundColor: colors.charcoal,
              borderRadius: radius.md,
              padding: spacing.sm,
              flexDirection: 'row',
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: colors.lime,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: spacing.sm,
              }}
            >
              <Text style={{ color: colors.black, fontWeight: '900', fontSize: 12 }}>PRC</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 13 }} numberOfLines={1}>
                {title.trim() || 'Title'}
              </Text>
              <Text style={{ color: colors.gray300, fontSize: 12, marginTop: 1 }} numberOfLines={2}>
                {body.trim() || 'Body'}
              </Text>
            </View>
          </View>
        </Card>
      ) : null}

      <Button
        title={copy.admin.sendAnnouncement}
        onPress={handleSend}
        loading={sendAnnouncement.isPending}
      />
      <Text style={{ color: colors.gray500, fontSize: 12, lineHeight: 18, marginTop: spacing.sm }}>
        Delivery runs through the club's secure push function — recipients, tokens, and retries are
        handled server-side.
      </Text>
    </Screen>
  );
}
