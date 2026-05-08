import {
  quickCaptureActions,
  routeForQuickCaptureAction,
} from './quick-capture';

describe('quick capture actions', () => {
  it('includes supported quick capture actions including receipt capture', () => {
    expect(quickCaptureActions.map((action) => action.id)).toEqual([
      'expense',
      'income',
      'receipt',
      'task',
      'work',
      'reminder',
    ]);
  });

  it('keeps accessible labels and copy on every action', () => {
    for (const action of quickCaptureActions) {
      expect(action.title.length).toBeGreaterThan(0);
      expect(action.description.length).toBeGreaterThan(0);
      expect(action.accessibilityLabel).toMatch(/^Start .+ capture$/);
    }
  });

  it('maps each action to a safe existing capture route', () => {
    expect(routeForQuickCaptureAction('expense')).toBe('/(tabs)/capture?quick=expense');
    expect(routeForQuickCaptureAction('income')).toBe('/(tabs)/capture?quick=income');
    expect(routeForQuickCaptureAction('receipt')).toBe('/receipt/new');
    expect(routeForQuickCaptureAction('task')).toBe('/task/new');
    expect(routeForQuickCaptureAction('work')).toBe('/work/new');
    expect(routeForQuickCaptureAction('reminder')).toBe('/reminder/new');
  });

  it('can include a sequence for repeated Capture tab handoffs', () => {
    expect(routeForQuickCaptureAction('expense', { sequence: 'again' })).toBe(
      '/(tabs)/capture?quick=expense&quickSeq=again',
    );
  });
});
