import * as Haptics from 'expo-haptics';

/** Light tap for button presses / toggles. Never throws. */
export function hapticLight(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

/** Success buzz for check-ins, PRs, RSVPs. Never throws. */
export function hapticSuccess(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

/** Error buzz for failed actions. Never throws. */
export function hapticError(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
}
