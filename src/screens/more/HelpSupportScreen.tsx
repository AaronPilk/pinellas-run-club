import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';

import { Button, Screen } from '@/components/ui';
import { hapticLight } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme';
import type { MoreStackScreenProps } from '@/types/navigation';

const SUPPORT_EMAIL = 'pinellasrunclub@gmail.com';
const INSTAGRAM_URL = 'https://instagram.com/pinellasrunclub';
const WEBSITE_URL = 'https://www.pinellasrunclub.com';

const FAQS = [
  {
    question: 'When and where does the club run?',
    answer:
      'Our main social run is every Wednesday evening — check the Events tab for the exact time and meetup spot. We add races, sunrise runs, and after parties throughout the month.',
  },
  {
    question: 'How does check-in work?',
    answer:
      'Open the Check-In tab when you arrive at a run and tap Check In Now. The app confirms you are near the meetup spot with GPS. Check-ins build your streak and unlock badges.',
  },
  {
    question: 'What is the Member Pass?',
    answer:
      'Your digital membership card. Show it at local partner businesses for member-only discounts. Find it under Profile or in the More menu as Discount Card.',
  },
  {
    question: 'How do course times and PRs work?',
    answer:
      'Admins publish official club courses. Run one, then log your time under Courses. The app tracks your best time, your progress, and flags a New PR when you beat it.',
  },
  {
    question: 'How do I invite a friend?',
    answer:
      'Grab your personal code from Invite a Friend in the More menu and share it. Your friend enters it at signup, and an organizer approves them from there.',
  },
  {
    question: 'Do I have to be fast to join?',
    answer:
      "No. All paces welcome — walkers included. More than a run, we're a community.",
  },
];

export default function HelpSupportScreen({ navigation }: MoreStackScreenProps<'HelpSupport'>) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => Alert.alert('Link failed', 'Could not open that link.'));
  };

  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
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
          Help & Support
        </Text>
      </View>

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
        FAQ
      </Text>
      {FAQS.map((faq, index) => {
        const open = openIndex === index;
        return (
          <Pressable
            key={faq.question}
            onPress={() => {
              hapticLight();
              setOpenIndex(open ? null : index);
            }}
            accessibilityRole="button"
            accessibilityLabel={faq.question}
            style={{
              backgroundColor: colors.darkCard,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.xs,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: colors.white, fontSize: 15, fontWeight: '700', flex: 1 }}>
                {faq.question}
              </Text>
              <Ionicons
                name={open ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.lime}
              />
            </View>
            {open ? (
              <Text style={{ color: colors.gray300, fontSize: 14, lineHeight: 21, marginTop: spacing.sm }}>
                {faq.answer}
              </Text>
            ) : null}
          </Pressable>
        );
      })}

      <Text
        style={{
          color: colors.gray300,
          fontSize: 12,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginTop: spacing.lg,
          marginBottom: spacing.xs,
        }}
      >
        Get in touch
      </Text>
      <Button
        title="Email Support"
        onPress={() => openLink(`mailto:${SUPPORT_EMAIL}?subject=PRC App Support`)}
      />
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
        <Button
          title="Instagram"
          variant="secondary"
          onPress={() => openLink(INSTAGRAM_URL)}
          style={{ flex: 1 }}
        />
        <Button
          title="Website"
          variant="secondary"
          onPress={() => openLink(WEBSITE_URL)}
          style={{ flex: 1 }}
        />
      </View>
    </Screen>
  );
}
