export function toLocalISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Série de jours consécutifs actifs. Le jour en cours compte encore comme
// "en cours" tant qu'hier était actif, même si rien n'est encore loggé
// aujourd'hui (pas cassée avant minuit).
export function computeStreak(activeDates: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  if (!activeDates.has(toLocalISO(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (activeDates.has(toLocalISO(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
