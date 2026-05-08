import {
  todayMinimumTouchTarget,
  todayUxNoticeFor,
  todayUxNotices,
  type TodayUxStateKind,
} from './today-ux-states';

const requiredStates: TodayUxStateKind[] = [
  'loading',
  'refreshing',
  'empty',
  'ready',
  'failed',
  'preferences_needed',
  'stale',
  'recovery',
  'partial_money',
  'partial_tasks_reminders',
  'partial_work',
  'draft_present',
  'offline',
  'estimated',
];

describe('today ux state contract', () => {
  it('provides clear text, next action, and tone for every required state', () => {
    for (const state of requiredStates) {
      const notice = todayUxNoticeFor(state);

      expect(notice.kind).toBe(state);
      expect(notice.title.length).toBeGreaterThan(0);
      expect(notice.description.length).toBeGreaterThan(0);
      expect(notice.actionLabel.length).toBeGreaterThan(0);
      expect(['neutral', 'success', 'warning']).toContain(notice.tone);
    }
  });

  it('keeps recoverable data visible for stale, partial, draft, estimated, and offline states', () => {
    for (const state of [
      'stale',
      'partial_money',
      'partial_tasks_reminders',
      'partial_work',
      'draft_present',
      'estimated',
      'offline',
    ] satisfies TodayUxStateKind[]) {
      expect(todayUxNotices[state].canKeepDataVisible).toBe(true);
    }
  });

  it('keeps Today-owned touch targets at or above the mobile minimum', () => {
    expect(todayMinimumTouchTarget).toBeGreaterThanOrEqual(44);
  });
});
