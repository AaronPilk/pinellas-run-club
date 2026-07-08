import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Button, Screen, TextField } from '@/components/ui';
import { useSubmitSponsorLead } from '@/hooks/usePartners';
import { getErrorMessage } from '@/lib/errors';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { sponsorLeadSchema } from '@/lib/validation';
import { colors, radius, spacing } from '@/theme';
import type { MoreStackScreenProps } from '@/types/navigation';

const CATEGORIES = [
  { value: 'food_drink', label: 'Food & Drink' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'retail', label: 'Retail' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'events', label: 'Events' },
  { value: 'other', label: 'Other' },
];

export default function SponsorshipScreen({ navigation }: MoreStackScreenProps<'Sponsorship'>) {
  const submitLead = useSubmitSponsorLead();

  const [form, setForm] = useState({
    businessName: '',
    contactName: '',
    email: '',
    phone: '',
    category: '',
    proposedOffer: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const setField = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    const parsed = sponsorLeadSchema.safeParse({
      ...form,
      phone: form.phone || undefined,
      category: form.category || undefined,
      proposedOffer: form.proposedOffer || undefined,
      message: form.message || undefined,
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});

    try {
      await submitLead.mutateAsync(parsed.data);
      hapticSuccess();
      setSubmitted(true);
    } catch (error) {
      Alert.alert('Submission failed', getErrorMessage(error));
    }
  };

  if (submitted) {
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
            <Ionicons name="checkmark" size={48} color={colors.black} />
          </View>
          <Text
            style={{
              color: colors.white,
              fontSize: 24,
              fontWeight: '900',
              textAlign: 'center',
              textTransform: 'uppercase',
            }}
          >
            We got it.
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
            Thanks for your interest in partnering with Pinellas Run Club. An organizer will reach
            out within a few days.
          </Text>
          <Button
            title="Back to More"
            onPress={() => navigation.goBack()}
            style={{ marginTop: spacing.xl, alignSelf: 'stretch' }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
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
          Sponsorships
        </Text>
      </View>

      <Text style={{ color: colors.white, fontSize: 24, fontWeight: '900', marginBottom: spacing.xs }}>
        Want to partner with PRC?
      </Text>
      <Text style={{ color: colors.gray300, fontSize: 14, lineHeight: 21, marginBottom: spacing.lg }}>
        Hundreds of local runners show up every week. Sponsors get real exposure at runs and events,
        a spot in our Partner Perks directory, and a community that backs the businesses that back
        us.
      </Text>

      <TextField
        label="Business Name"
        value={form.businessName}
        onChangeText={(value) => setField('businessName', value)}
        error={errors.businessName}
        autoCapitalize="words"
      />
      <TextField
        label="Contact Name"
        value={form.contactName}
        onChangeText={(value) => setField('contactName', value)}
        error={errors.contactName}
        autoCapitalize="words"
      />
      <TextField
        label="Email"
        value={form.email}
        onChangeText={(value) => setField('email', value)}
        error={errors.email}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />
      <TextField
        label="Phone (optional)"
        value={form.phone}
        onChangeText={(value) => setField('phone', value)}
        keyboardType="phone-pad"
      />

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
        Business Category
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md }}>
        {CATEGORIES.map((category) => {
          const selected = form.category === category.value;
          return (
            <Pressable
              key={category.value}
              onPress={() => {
                hapticLight();
                setField('category', selected ? '' : category.value);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Category ${category.label}`}
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: 8,
                borderRadius: radius.pill,
                backgroundColor: selected ? colors.lime : colors.charcoal,
                borderWidth: 1,
                borderColor: selected ? colors.lime : colors.gray700,
              }}
            >
              <Text style={{ color: selected ? colors.black : colors.gray300, fontWeight: '700', fontSize: 13 }}>
                {category.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextField
        label="Proposed Offer (optional)"
        value={form.proposedOffer}
        onChangeText={(value) => setField('proposedOffer', value)}
        placeholder="e.g. 15% off for PRC members"
      />
      <TextField
        label="Message (optional)"
        value={form.message}
        onChangeText={(value) => setField('message', value)}
        multiline
        style={{ minHeight: 100, textAlignVertical: 'top' }}
        placeholder="Tell us about your business and what you have in mind"
      />

      <Button
        title="Submit"
        onPress={() => void handleSubmit()}
        loading={submitLead.isPending}
        style={{ marginTop: spacing.sm }}
      />
    </Screen>
  );
}
