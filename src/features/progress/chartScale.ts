/** Shared geometry for the progress charts (SVG viewBox units ≈ CSS px on a phone). */
export const CHART_W = 340;
export const PAD = { left: 32, right: 14, top: 18, bottom: 24 };

const NICE_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500];

/** A clean y-axis: about 4 ticks from 0 up to just above `max`. */
export function yScale(max: number): { top: number; step: number; ticks: number[] } {
  const step = NICE_STEPS.find((s) => s * 4 >= max) ?? Math.ceil(max / 4);
  const top = Math.max(step, Math.ceil((max + 1) / step) * step);
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  return { top, step, ticks };
}

/** Day 1, ¼, ½, ¾, last — e.g. 1, 8, 15, 23, 30. */
export function dayTicks(planLength: number): number[] {
  if (planLength <= 1) return [1];
  return [...new Set([1, ...[0.25, 0.5, 0.75].map((f) => Math.round(planLength * f)), planLength])];
}

export function xForDay(day: number, planLength: number): number {
  const w = CHART_W - PAD.left - PAD.right;
  return PAD.left + (planLength > 1 ? ((day - 1) / (planLength - 1)) * w : w / 2);
}
