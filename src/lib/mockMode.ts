/**
 * Mock mode lets the app run without a Supabase backend.
 * Toggle via EXPO_PUBLIC_USE_MOCK_DATA=true in .env.
 */
export const USE_MOCK_DATA = process.env.EXPO_PUBLIC_USE_MOCK_DATA === 'true';

export function isMockMode(): boolean {
  return USE_MOCK_DATA;
}
