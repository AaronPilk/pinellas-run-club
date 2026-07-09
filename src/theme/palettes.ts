export type Palette = {
  // Raw brand + neutral scale (dark values are the original static palette).
  black: string;
  charcoal: string;
  darkCard: string;
  white: string;
  offWhite: string;
  gray50: string;
  gray100: string;
  gray200: string;
  gray300: string;
  gray500: string;
  gray700: string;
  lime: string;
  limeDark: string;
  limeSoft: string;
  warning: string;
  danger: string;
  success: string;
  // Semantic keys — prefer these for backgrounds, text, and borders.
  background: string;
  surface: string;
  card: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  tabBar: string;
  tabBarActive: string;
  tabBarInactive: string;
  inputBg: string;
};

export const darkPalette: Palette = {
  black: '#050505',
  charcoal: '#111111',
  darkCard: '#181818',
  white: '#FFFFFF',
  offWhite: '#F7F7F4',
  gray50: '#FAFAFA',
  gray100: '#F0F0F0',
  gray200: '#E0E0E0',
  gray300: '#C7C7C7',
  gray500: '#747474',
  gray700: '#3A3A3A',
  lime: '#B6FF00',
  limeDark: '#8FD400',
  limeSoft: '#E9FFB6',
  warning: '#FFB020',
  danger: '#FF4D4D',
  success: '#3EDC81',
  background: '#050505',
  surface: '#111111',
  card: '#181818',
  textPrimary: '#FFFFFF',
  textSecondary: '#C7C7C7',
  textMuted: '#747474',
  border: '#3A3A3A',
  tabBar: '#050505',
  tabBarActive: '#B6FF00',
  tabBarInactive: '#C7C7C7',
  // Matches the current TextField surface (charcoal) so dark mode is unchanged.
  inputBg: '#111111',
};

export const lightPalette: Palette = {
  // Stays dark — it's the text/icon color on lime buttons, pills, and badges.
  black: '#0A0A0A',
  // The "muted surface" (inactive pills, image placeholders, hairline
  // separators). A soft gray keeps separators visible on white cards.
  charcoal: '#EDEDEA',
  darkCard: '#FFFFFF',
  white: '#FFFFFF',
  offWhite: '#F7F7F4',
  // The gray text scale mirrors: light grays (text on dark) become dark grays.
  gray50: '#111111',
  gray100: '#1F1F1F',
  gray200: '#2E2E2E',
  gray300: '#3A3A3A',
  gray500: '#747474',
  gray700: '#C7C7C7',
  lime: '#B6FF00',
  limeDark: '#8FD400',
  limeSoft: '#E9FFB6',
  warning: '#FFB020',
  danger: '#FF4D4D',
  success: '#3EDC81',
  background: '#F7F7F4',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  textPrimary: '#0A0A0A',
  textSecondary: '#3A3A3A',
  textMuted: '#747474',
  border: '#E0E0E0',
  tabBar: '#FFFFFF',
  // Raw lime is too low-contrast on a white tab bar; use the darker lime.
  tabBarActive: '#8FD400',
  tabBarInactive: '#747474',
  inputBg: '#FFFFFF',
};
