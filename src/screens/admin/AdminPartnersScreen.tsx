import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, FlatList, Image, Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { Badge, Button, EmptyState, ErrorState, LoadingState, Screen, TextField } from '@/components/ui';
import {
  useAdminCreatePartner,
  useAdminDeletePartner,
  useAdminPartners,
  useAdminUpdatePartner,
} from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { copy } from '@/lib/copy';
import { getErrorMessage } from '@/lib/errors';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { uploadPartnerImage } from '@/services/adminService';
import { pickImage } from '@/services/mediaService';
import { radius, spacing, useTheme } from '@/theme';
import type { Partner, PartnerCategory, SponsorLevel } from '@/types/models';
import type { MoreStackScreenProps } from '@/types/navigation';

const CATEGORIES: { value: PartnerCategory; label: string }[] = [
  { value: 'food_drink', label: 'Food & Drink' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'retail', label: 'Retail' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'events', label: 'Events' },
  { value: 'other', label: 'Other' },
];

const SPONSOR_LEVELS: { value: SponsorLevel; label: string }[] = [
  { value: 'community', label: 'Community' },
  { value: 'bronze', label: 'Bronze' },
  { value: 'silver', label: 'Silver' },
  { value: 'gold', label: 'Gold' },
  { value: 'title', label: 'Title' },
];

type FormState = {
  name: string;
  category: PartnerCategory;
  sponsor_level: SponsorLevel;
  short_offer: string;
  offer_details: string;
  redeem_instructions: string;
  terms: string;
  address: string;
  website_url: string;
  instagram_url: string;
  active: boolean;
  featured: boolean;
};

const EMPTY_FORM: FormState = {
  name: '',
  category: 'other',
  sponsor_level: 'community',
  short_offer: '',
  offer_details: '',
  redeem_instructions: '',
  terms: '',
  address: '',
  website_url: '',
  instagram_url: '',
  active: true,
  featured: false,
};

function formFromPartner(partner: Partner): FormState {
  return {
    name: partner.name,
    category: partner.category,
    sponsor_level: partner.sponsor_level,
    short_offer: partner.short_offer,
    offer_details: partner.offer_details ?? '',
    redeem_instructions: partner.redeem_instructions ?? '',
    terms: partner.terms ?? '',
    address: partner.address ?? '',
    website_url: partner.website_url ?? '',
    instagram_url: partner.instagram_url ?? '',
    active: partner.active,
    featured: partner.featured,
  };
}

function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              hapticLight();
              onChange(option.value);
            }}
            accessibilityRole="button"
            accessibilityLabel={option.label}
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
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function AdminPartnersScreen({ navigation }: MoreStackScreenProps<'AdminPartners'>) {
  const { colors } = useTheme();

  const { isAdmin } = useAuth();
  const partnersQuery = useAdminPartners();
  const createPartner = useAdminCreatePartner();
  const updatePartner = useAdminUpdatePartner();
  const deletePartner = useAdminDeletePartner();

  const [editing, setEditing] = useState<Partner | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isAdmin) {
    return (
      <Screen>
        <ErrorState message="Admins only. Ask a club organizer if you need access." />
      </Screen>
    );
  }

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setLogoUri(null);
    setShowForm(true);
  };

  const openEdit = (partner: Partner) => {
    setEditing(partner);
    setForm(formFromPartner(partner));
    setLogoUri(null);
    setShowForm(true);
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handlePickLogo = async () => {
    try {
      const uri = await pickImage({ allowsEditing: true, aspect: [1, 1] });
      if (uri) setLogoUri(uri);
    } catch (error) {
      Alert.alert('Photo picker failed', getErrorMessage(error));
    }
  };

  const toInput = () => ({
    name: form.name.trim(),
    category: form.category,
    sponsor_level: form.sponsor_level,
    short_offer: form.short_offer.trim(),
    offer_details: form.offer_details.trim() || null,
    redeem_instructions: form.redeem_instructions.trim() || null,
    terms: form.terms.trim() || null,
    address: form.address.trim() || null,
    website_url: form.website_url.trim() || null,
    instagram_url: form.instagram_url.trim() || null,
    active: form.active,
    featured: form.featured,
  });

  const handleSave = async () => {
    if (form.name.trim().length < 2 || form.short_offer.trim().length < 2) {
      Alert.alert('Missing info', 'Partner name and a short offer are required.');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        let input = toInput();
        if (logoUri) {
          const logoUrl = await uploadPartnerImage(logoUri, editing.id, 'logo');
          input = { ...input, logo_url: logoUrl } as typeof input & { logo_url: string };
        }
        await updatePartner.mutateAsync({ partnerId: editing.id, input });
      } else {
        const created = await createPartner.mutateAsync(toInput());
        if (logoUri) {
          const logoUrl = await uploadPartnerImage(logoUri, created.id, 'logo');
          await updatePartner.mutateAsync({ partnerId: created.id, input: { logo_url: logoUrl } });
        }
      }
      hapticSuccess();
      setShowForm(false);
    } catch (error) {
      Alert.alert('Save failed', getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (partner: Partner) => {
    Alert.alert('Deactivate Partner', `Remove "${partner.name}" from the directory?`, [
      { text: copy.actions.cancel, style: 'cancel' },
      {
        text: copy.actions.delete,
        style: 'destructive',
        onPress: () =>
          deletePartner.mutate(partner.id, {
            onSuccess: hapticSuccess,
            onError: (error) => Alert.alert('Delete failed', getErrorMessage(error)),
          }),
      },
    ]);
  };

  const toggleFlag = (partner: Partner, key: 'active' | 'featured', value: boolean) => {
    updatePartner.mutate(
      { partnerId: partner.id, input: { [key]: value } },
      { onError: (error) => Alert.alert('Update failed', getErrorMessage(error)) }
    );
  };

  return (
    <Screen noPadding>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        }}
      >
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
            flex: 1,
          }}
        >
          Partners
        </Text>
        <Pressable
          onPress={() => {
            hapticLight();
            openCreate();
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Add Partner"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.lime,
            borderRadius: radius.pill,
            paddingHorizontal: spacing.sm,
            paddingVertical: 8,
          }}
        >
          <Ionicons name="add" size={16} color={colors.black} />
          <Text style={{ color: colors.black, fontWeight: '900', fontSize: 13, marginLeft: 2 }}>
            Add Partner
          </Text>
        </Pressable>
      </View>

      {partnersQuery.isLoading ? (
        <LoadingState />
      ) : partnersQuery.isError ? (
        <ErrorState error={partnersQuery.error} onRetry={() => partnersQuery.refetch()} />
      ) : (partnersQuery.data ?? []).length === 0 ? (
        <EmptyState
          icon="pricetags-outline"
          title="No partners yet"
          message="Add the first local business to the perks directory."
          actionLabel="Add Partner"
          onAction={openCreate}
        />
      ) : (
        <FlatList
          data={partnersQuery.data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: colors.darkCard,
                borderRadius: radius.md,
                padding: spacing.md,
                marginBottom: spacing.xs,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {item.logo_url ? (
                  <Image
                    source={{ uri: item.logo_url }}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: radius.sm,
                      backgroundColor: colors.charcoal,
                      marginRight: spacing.sm,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: radius.sm,
                      backgroundColor: colors.charcoal,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: spacing.sm,
                    }}
                  >
                    <Ionicons name="storefront-outline" size={20} color={colors.lime} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={{ color: colors.lime, fontSize: 12, fontWeight: '700', marginTop: 1 }} numberOfLines={1}>
                    {item.short_offer}
                  </Text>
                </View>
                <Badge label={item.sponsor_level} tone="neutral" />
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: spacing.sm,
                  gap: spacing.md,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Text style={{ color: colors.gray500, fontSize: 12, fontWeight: '700' }}>Active</Text>
                  <Switch
                    value={item.active}
                    onValueChange={(value) => toggleFlag(item, 'active', value)}
                    trackColor={{ false: colors.gray700, true: colors.limeDark }}
                    thumbColor={colors.white}
                  />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Text style={{ color: colors.gray500, fontSize: 12, fontWeight: '700' }}>Featured</Text>
                  <Switch
                    value={item.featured}
                    onValueChange={(value) => toggleFlag(item, 'featured', value)}
                    trackColor={{ false: colors.gray700, true: colors.limeDark }}
                    thumbColor={colors.white}
                  />
                </View>
                <View style={{ flex: 1 }} />
                <Pressable
                  onPress={() => {
                    hapticLight();
                    openEdit(item);
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${item.name}`}
                >
                  <Ionicons name="create-outline" size={22} color={colors.lime} />
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(item)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${item.name}`}
                >
                  <Ionicons name="trash-outline" size={22} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowForm(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing.md,
            }}
          >
            <Pressable
              onPress={() => setShowForm(false)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={26} color={colors.textPrimary} />
            </Pressable>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 18,
                fontWeight: '900',
                textTransform: 'uppercase',
                marginLeft: spacing.xs,
              }}
            >
              {editing ? 'Edit Partner' : 'Add Partner'}
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}
            keyboardShouldPersistTaps="handled"
          >
            <Pressable
              onPress={() => void handlePickLogo()}
              accessibilityRole="button"
              accessibilityLabel="Upload logo"
              style={{ alignItems: 'center', marginBottom: spacing.md }}
            >
              {logoUri || editing?.logo_url ? (
                <Image
                  source={{ uri: logoUri ?? (editing?.logo_url as string) }}
                  style={{ width: 84, height: 84, borderRadius: radius.md, backgroundColor: colors.charcoal }}
                />
              ) : (
                <View
                  style={{
                    width: 84,
                    height: 84,
                    borderRadius: radius.md,
                    backgroundColor: colors.charcoal,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="image-outline" size={30} color={colors.gray500} />
                </View>
              )}
              <Text style={{ color: colors.lime, fontWeight: '700', fontSize: 13, marginTop: spacing.xs }}>
                {logoUri ? 'Change Logo' : 'Upload Logo'}
              </Text>
            </Pressable>

            <TextField
              label="Name"
              value={form.name}
              onChangeText={(value) => setField('name', value)}
              autoCapitalize="words"
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
              Category
            </Text>
            <ChipRow options={CATEGORIES} value={form.category} onChange={(value) => setField('category', value)} />

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
              Sponsor Level
            </Text>
            <ChipRow
              options={SPONSOR_LEVELS}
              value={form.sponsor_level}
              onChange={(value) => setField('sponsor_level', value)}
            />

            <TextField
              label="Short Offer"
              value={form.short_offer}
              onChangeText={(value) => setField('short_offer', value)}
              placeholder="15% off for PRC members"
            />
            <TextField
              label="Offer Details (optional)"
              value={form.offer_details}
              onChangeText={(value) => setField('offer_details', value)}
              multiline
              style={{ minHeight: 70, textAlignVertical: 'top' }}
            />
            <TextField
              label="Redeem Instructions (optional)"
              value={form.redeem_instructions}
              onChangeText={(value) => setField('redeem_instructions', value)}
              multiline
              style={{ minHeight: 70, textAlignVertical: 'top' }}
              placeholder="Show your member pass at checkout"
            />
            <TextField
              label="Terms (optional)"
              value={form.terms}
              onChangeText={(value) => setField('terms', value)}
              multiline
              style={{ minHeight: 70, textAlignVertical: 'top' }}
            />
            <TextField
              label="Address (optional)"
              value={form.address}
              onChangeText={(value) => setField('address', value)}
            />
            <TextField
              label="Website URL (optional)"
              value={form.website_url}
              onChangeText={(value) => setField('website_url', value)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <TextField
              label="Instagram URL (optional)"
              value={form.instagram_url}
              onChangeText={(value) => setField('instagram_url', value)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: spacing.sm,
              }}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600' }}>Active</Text>
              <Switch
                value={form.active}
                onValueChange={(value) => setField('active', value)}
                trackColor={{ false: colors.gray700, true: colors.limeDark }}
                thumbColor={colors.white}
              />
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: spacing.lg,
              }}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600' }}>Featured</Text>
              <Switch
                value={form.featured}
                onValueChange={(value) => setField('featured', value)}
                trackColor={{ false: colors.gray700, true: colors.limeDark }}
                thumbColor={colors.white}
              />
            </View>

            <Button title={copy.actions.save} onPress={() => void handleSave()} loading={saving} />
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}
