import { TextStyle } from 'react-native';

import { colors } from './colors';

export const fontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  display: 32,
  hero: 40,
} as const;

/**
 * Bold, athletic headings. Clean, readable body copy.
 * Headings are heavy weight + uppercase where it counts.
 */
export const typography: Record<string, TextStyle> = {
  hero: {
    fontSize: fontSizes.hero,
    fontWeight: '900',
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: fontSizes.display,
    fontWeight: '900',
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: fontSizes.xxl,
    fontWeight: '900',
    color: colors.white,
  },
  h3: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.white,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.white,
  },
  body: {
    fontSize: fontSizes.md,
    fontWeight: '400',
    color: colors.gray200,
    lineHeight: 22,
  },
  bodyBold: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.white,
  },
  caption: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    color: colors.gray500,
  },
  label: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.gray300,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
};
