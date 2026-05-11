export const todayMinimumTouchTarget = 44;

export type TodayUxTone = 'neutral' | 'success' | 'warning';

export type TodayUxStateKind =
  | 'draft_present'
  | 'empty'
  | 'estimated'
  | 'failed'
  | 'loading'
  | 'offline'
  | 'partial_money'
  | 'partial_tasks_reminders'
  | 'partial_work'
  | 'preferences_needed'
  | 'ready'
  | 'recovery'
  | 'refreshing'
  | 'stale';

export type TodayUxNotice = {
  actionLabel: string;
  canKeepDataVisible: boolean;
  description: string;
  kind: TodayUxStateKind;
  title: string;
  tone: TodayUxTone;
};

export const todayUxNotices: Record<TodayUxStateKind, TodayUxNotice> = {
  draft_present: {
    actionLabel: 'Review drafts',
    canKeepDataVisible: true,
    description: 'An unfinished capture is available. Resume it, keep it for later, or discard the draft.',
    kind: 'draft_present',
    title: 'Draft saved',
    tone: 'neutral',
  },
  empty: {
    actionLabel: 'Capture one item',
    canKeepDataVisible: true,
    description:
      'Start with one money record, task, reminder, or work entry when the day gives you something concrete.',
    kind: 'empty',
    title: 'Today is clear',
    tone: 'neutral',
  },
  estimated: {
    actionLabel: 'Review source',
    canKeepDataVisible: true,
    description: 'Some context is approximate or derived from saved defaults. The source label stays visible.',
    kind: 'estimated',
    title: 'Estimated context',
    tone: 'neutral',
  },
  failed: {
    actionLabel: 'Retry',
    canKeepDataVisible: false,
    description: 'Your local data is unchanged. Try loading Today again.',
    kind: 'failed',
    title: 'Today could not open',
    tone: 'warning',
  },
  loading: {
    actionLabel: 'Wait',
    canKeepDataVisible: false,
    description: 'Pplant is gathering your local overview.',
    kind: 'loading',
    title: 'Loading Today',
    tone: 'neutral',
  },
  offline: {
    actionLabel: 'Use local capture',
    canKeepDataVisible: true,
    description: 'Core capture stays local. Network-dependent features can wait until connectivity returns.',
    kind: 'offline',
    title: 'Offline-ready',
    tone: 'neutral',
  },
  partial_money: {
    actionLabel: 'Add money',
    canKeepDataVisible: true,
    description: 'No money records yet today. Add an expense or income when something changes.',
    kind: 'partial_money',
    title: 'No money records today',
    tone: 'neutral',
  },
  partial_tasks_reminders: {
    actionLabel: 'Plan one item',
    canKeepDataVisible: true,
    description: 'No open task or reminder needs attention right now.',
    kind: 'partial_tasks_reminders',
    title: 'Clear for now',
    tone: 'neutral',
  },
  partial_work: {
    actionLabel: 'Log work',
    canKeepDataVisible: true,
    description: 'No work logged today. Log hours or a shift when work happens.',
    kind: 'partial_work',
    title: 'No work logged today',
    tone: 'neutral',
  },
  preferences_needed: {
    actionLabel: 'Open Settings',
    canKeepDataVisible: false,
    description: 'Today needs your currency, locale, reset day, and wage defaults.',
    kind: 'preferences_needed',
    title: 'Save preferences first',
    tone: 'warning',
  },
  ready: {
    actionLabel: 'Capture',
    canKeepDataVisible: true,
    description: 'Today is ready with the latest local data Pplant could load.',
    kind: 'ready',
    title: 'Today loaded',
    tone: 'success',
  },
  recovery: {
    actionLabel: 'Review items',
    canKeepDataVisible: true,
    description: 'Some items need a calm check. Recovery actions are optional and local.',
    kind: 'recovery',
    title: 'Some items need attention',
    tone: 'warning',
  },
  refreshing: {
    actionLabel: 'Keep reading',
    canKeepDataVisible: true,
    description: 'The last overview stays visible while local data reloads.',
    kind: 'refreshing',
    title: 'Refreshing',
    tone: 'neutral',
  },
  stale: {
    actionLabel: 'Retry',
    canKeepDataVisible: true,
    description: 'This overview is from the last successful local load. Try refreshing when ready.',
    kind: 'stale',
    title: 'Showing last loaded Today',
    tone: 'warning',
  },
};

export function todayUxNoticeFor(kind: TodayUxStateKind): TodayUxNotice {
  return todayUxNotices[kind];
}
