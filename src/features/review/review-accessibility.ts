export function reviewModeOptionAccessibilityLabel(label: string, selected: boolean): string {
  return `${label} review mode, ${selected ? 'selected' : 'not selected'}`;
}

export function reviewStatusAccessibilityLabel(title: string, description: string): string {
  return `${title}. ${description}`;
}

export function reviewHistoryRowAccessibilityLabel(input: {
  periodLabel: string;
  promptText: string;
  responseText: string | null;
}): string {
  const responseText = (input.responseText ?? 'Saved reflection').replace(/[.?!]+$/, '');

  return `${input.periodLabel}. ${input.promptText} ${responseText}.`;
}
