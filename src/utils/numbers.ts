export function safeNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function safePositive(value: unknown, fallback = 0): number {
  return Math.max(0, safeNumber(value, fallback));
}

export function safePercent(numerator: unknown, denominator: unknown): number {
  const n = safeNumber(numerator, 0);
  const d = safeNumber(denominator, 0);
  if (d <= 0) return 0;
  return Math.min(100, Math.max(0, (n / d) * 100));
}

export function safeRatio(numerator: unknown, denominator: unknown): number {
  return safePercent(numerator, denominator) / 100;
}
