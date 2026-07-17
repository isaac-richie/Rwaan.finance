/**
 * Contextual card glow utilities for BNB Chain vibrant aesthetic
 * Provides subtle colored illumination based on card purpose
 */

export type CardGlowVariant = 'staking' | 'rewards' | 'analytics' | 'default';

/**
 * Get card glow class based on variant
 * @param variant - The card glow variant (staking, rewards, analytics, default)
 * @returns Tailwind classes for the card glow
 */
export function getCardGlow(variant: CardGlowVariant = 'default'): string {
  const glowMap: Record<CardGlowVariant, string> = {
    staking: 'card-glow-staking',
    rewards: 'card-glow-rewards',
    analytics: 'card-glow-analytics',
    default: '',
  };

  return glowMap[variant];
}

/**
 * Get accent color for positive/negative values
 * @param value - The numeric value
 * @returns Tailwind text color class
 */
export function getValueColor(value: number | bigint): string {
  const numValue = typeof value === 'bigint' ? Number(value) : value;
  
  if (numValue > 0) return 'text-positive';
  if (numValue < 0) return 'text-negative';
  return 'text-muted-foreground';
}

/**
 * Get section-specific accent color
 * @param section - The section type
 * @returns HSL color string
 */
export function getSectionAccent(section: 'staking' | 'rewards' | 'analytics'): string {
  const accentMap = {
    staking: 'hsl(45 90% 60%)',      // BNB Gold
    rewards: 'hsl(160 60% 55%)',     // Soft Emerald
    analytics: 'hsl(265 45% 60%)',   // Muted Violet
  };

  return accentMap[section];
}
