import { parseMoneyQuickCaptureParam } from './quickCaptureParams';

describe('quick capture params', () => {
  it('accepts manual money quick capture kinds', () => {
    expect(parseMoneyQuickCaptureParam('expense')).toBe('expense');
    expect(parseMoneyQuickCaptureParam(['income'])).toBe('income');
  });

  it('ignores unknown quick capture params', () => {
    expect(parseMoneyQuickCaptureParam('receipt')).toBeNull();
    expect(parseMoneyQuickCaptureParam('work')).toBeNull();
    expect(parseMoneyQuickCaptureParam(undefined)).toBeNull();
  });
});
