import { copy } from './copy';

/**
 * Map any thrown value to a human-readable message.
 * Never surfaces raw SQL/PostgREST errors to members.
 */
export function getErrorMessage(error: unknown): string {
  if (__DEV__) {
    // Log the raw error in dev so debugging stays easy.
    console.warn('[error]', error);
  }

  const raw =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : typeof (error as { message?: unknown })?.message === 'string'
          ? String((error as { message: string }).message)
          : '';

  const msg = raw.toLowerCase();

  if (msg.includes('too far')) return copy.errors.tooFar;
  if (msg.includes('not open') || msg.includes('has not opened')) return copy.errors.checkinNotOpen;
  if (msg.includes('already checked in') || msg.includes('duplicate key value violates unique constraint "event_checkins')) {
    return copy.errors.alreadyCheckedIn;
  }
  if (msg.includes('jwt') || msg.includes('refresh token') || msg.includes('not authenticated')) {
    return copy.errors.sessionExpired;
  }
  if (msg.includes('network request failed') || msg.includes('fetch failed')) {
    return copy.errors.network;
  }
  if (msg.includes('storage') && msg.includes('payload')) return copy.errors.uploadFailed;

  // Raw Postgres/PostgREST errors: hide the internals.
  if (msg.includes('violates') || msg.includes('pgrst') || msg.includes('syntax error')) {
    return copy.errors.generic;
  }

  // Errors we threw ourselves are already human-readable.
  if (raw && raw.length <= 140 && !msg.includes('supabase')) return raw;

  return copy.errors.generic;
}
