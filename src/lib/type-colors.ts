/**
 * Tint an item type's color to a given opacity for card borders and
 * background washes. Uses color-mix so any valid CSS color works —
 * custom types will let users supply their own color strings, where
 * the old hex-alpha suffix trick (`${color}40`) would break.
 */
export function typeColorTint(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}
