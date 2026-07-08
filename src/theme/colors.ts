export const colors = {
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
} as const;

export type AppColor = keyof typeof colors;
