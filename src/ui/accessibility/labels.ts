export function composeAccessibilityLabel(parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(', ');
}
