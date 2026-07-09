import { darkPalette } from './palettes';

/**
 * Static (dark) palette — kept only for non-component constants.
 * Inside components, prefer `const { colors } = useTheme()` so light mode works.
 */
export const colors = darkPalette;

export type AppColor = keyof typeof colors;
