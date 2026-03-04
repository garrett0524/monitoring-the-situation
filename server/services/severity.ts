const CRITICAL_KEYWORDS = ['strike', 'attack', 'war', 'bombing', 'killed', 'explosion', 'hostilities'];
const HIGH_KEYWORDS = ['escalation', 'missile', 'troops', 'warship', 'mobilization', 'confrontation'];
const ELEVATED_KEYWORDS = ['deployment', 'sanctions', 'warning', 'threat', 'tension', 'drill', 'exercise'];

export type Severity = 'critical' | 'high' | 'elevated' | 'normal';

export function computeSeverity(title: string, excerpt: string): Severity {
  const text = (title + ' ' + excerpt).toLowerCase();
  if (CRITICAL_KEYWORDS.some(k => text.includes(k))) return 'critical';
  if (HIGH_KEYWORDS.some(k => text.includes(k))) return 'high';
  if (ELEVATED_KEYWORDS.some(k => text.includes(k))) return 'elevated';
  return 'normal';
}

export function computeEscalationScore(items: { severity: Severity; publishedAt: string }[]): number {
  const now = Date.now();
  const weights: Record<Severity, number> = { critical: 10, high: 5, elevated: 2, normal: 0.5 };
  let score = 0;

  for (const item of items) {
    const ageHours = (now - new Date(item.publishedAt).getTime()) / 3_600_000;
    const decay = Math.max(0, 1 - ageHours / 48);
    score += weights[item.severity] * decay;
  }

  // Normalize 0–100
  return Math.min(100, score);
}

export function scoreToLevel(score: number): 1 | 2 | 3 | 4 | 5 {
  if (score >= 80) return 5;
  if (score >= 55) return 4;
  if (score >= 30) return 3;
  if (score >= 10) return 2;
  return 1;
}
