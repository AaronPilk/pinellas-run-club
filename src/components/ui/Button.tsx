import React from 'react';
import { ActivityIndicator, Pressable, Text, type ViewStyle } from 'react-native';

import { hapticLight } from '@/lib/haptics';
import { radius, useTheme } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  /** Skip the haptic tap (e.g. inside lists). */
  noHaptic?: boolean;
  style?: ViewStyle;
};

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  noHaptic,
  style,
}: Props) {
  const { colors } = useTheme();
  const isDisabled = Boolean(disabled || loading);

  const backgroundColor =
    variant === 'primary'
      ? colors.lime
      : variant === 'danger'
        ? colors.danger
        : 'transparent';

  const textColor =
    variant === 'primary'
      ? colors.black
      : variant === 'danger'
        ? colors.white
        : variant === 'secondary'
          ? colors.textPrimary
          : colors.gray300;

  const borderColor = variant === 'secondary' ? colors.lime : colors.gray700;

  const handlePress = () => {
    if (!noHaptic) hapticLight();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        {
          height: 52,
          borderRadius: radius.pill,
          paddingHorizontal: 24,
          backgroundColor: isDisabled && variant === 'primary' ? colors.gray700 : backgroundColor,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : isDisabled ? 0.6 : 1,
          borderWidth: variant === 'secondary' || variant === 'ghost' ? 1 : 0,
          borderColor,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={{ color: textColor, fontWeight: '900', fontSize: 15 }}>{title}</Text>
      )}
    </Pressable>
  );
}
