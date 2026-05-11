import {
  reviewHistoryRowAccessibilityLabel,
  reviewModeOptionAccessibilityLabel,
  reviewStatusAccessibilityLabel,
} from './review-accessibility';

describe('review accessibility helpers', () => {
  it('describes selected and unselected review modes without relying on color', () => {
    expect(reviewModeOptionAccessibilityLabel('Week', true)).toBe('Week review mode, selected');
    expect(reviewModeOptionAccessibilityLabel('Month', false)).toBe('Month review mode, not selected');
  });

  it('combines status title and description for screen readers', () => {
    expect(
      reviewStatusAccessibilityLabel('Nothing recorded in this period', 'That is only a data state.'),
    ).toBe('Nothing recorded in this period. That is only a data state.');
  });

  it('labels history rows by period, prompt, and saved response', () => {
    expect(
      reviewHistoryRowAccessibilityLabel({
        periodLabel: 'Week 2026-05-04',
        promptText: 'What do you want to remember about this period?',
        responseText: 'A saved note.',
      }),
    ).toBe('Week 2026-05-04. What do you want to remember about this period? A saved note.');
  });
});
