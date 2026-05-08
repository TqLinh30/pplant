import type { Href } from 'expo-router';

export type QuickCaptureActionId = 'expense' | 'income' | 'reminder' | 'task' | 'work';

export type QuickCaptureAction = {
  accessibilityLabel: string;
  description: string;
  id: QuickCaptureActionId;
  title: string;
};

export type QuickCaptureRouteOptions = {
  sequence?: string;
};

export const quickCaptureActions: QuickCaptureAction[] = [
  {
    accessibilityLabel: 'Start expense capture',
    description: 'Record spending manually.',
    id: 'expense',
    title: 'Expense',
  },
  {
    accessibilityLabel: 'Start income capture',
    description: 'Record allowance, pay, or other income.',
    id: 'income',
    title: 'Income',
  },
  {
    accessibilityLabel: 'Start task capture',
    description: 'Create a daily task or routine.',
    id: 'task',
    title: 'Task',
  },
  {
    accessibilityLabel: 'Start work entry capture',
    description: 'Log hours, shift time, and earned income.',
    id: 'work',
    title: 'Work entry',
  },
  {
    accessibilityLabel: 'Start reminder capture',
    description: 'Set a reminder with local-only fallback if notifications are off.',
    id: 'reminder',
    title: 'Reminder',
  },
];

function withSequence(route: string, options: QuickCaptureRouteOptions | undefined): Href {
  if (!options?.sequence) {
    return route as Href;
  }

  return `${route}&quickSeq=${encodeURIComponent(options.sequence)}` as Href;
}

export function routeForQuickCaptureAction(
  actionId: QuickCaptureActionId,
  options?: QuickCaptureRouteOptions,
): Href {
  switch (actionId) {
    case 'expense':
      return withSequence('/(tabs)/capture?quick=expense', options);
    case 'income':
      return withSequence('/(tabs)/capture?quick=income', options);
    case 'task':
      return '/task/new' as Href;
    case 'work':
      return '/work/new' as Href;
    case 'reminder':
      return '/reminder/new' as Href;
    default:
      actionId satisfies never;
      return '/(tabs)/capture' as Href;
  }
}
