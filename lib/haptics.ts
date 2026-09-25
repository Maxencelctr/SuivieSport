// Petite vibration sur les actions clés (mobile only, no-op ailleurs).
export function haptic(pattern: number | number[] = 12) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // pas grave si ça échoue (permission, navigateur qui bloque, etc.)
    }
  }
}
