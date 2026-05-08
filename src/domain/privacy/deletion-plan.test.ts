import {
  buildDataDeletionImpact,
  validateDataDeletionPlan,
  type DataDeletionPlan,
} from './deletion-plan';

describe('data deletion plans', () => {
  it('requires ids for record, draft, and receipt image targets', () => {
    const invalidPlans: DataDeletionPlan[] = [
      { target: { kind: 'record', recordId: '', recordKind: 'money' } },
      { target: { draftId: ' ', kind: 'draft' } },
      { target: { draftId: '', kind: 'receipt_image' } },
    ];

    for (const plan of invalidPlans) {
      expect(validateDataDeletionPlan(plan).ok).toBe(false);
    }
  });

  it('validates local date ranges before deletion can run', () => {
    expect(
      validateDataDeletionPlan({
        target: {
          endDate: '2026-05-01',
          kind: 'records_by_date_range',
          recordKind: 'all_records',
          startDate: '2026-05-08',
        },
      }).ok,
    ).toBe(false);
    expect(
      validateDataDeletionPlan({
        target: {
          endDate: '2026-05-31',
          kind: 'records_by_date_range',
          recordKind: 'money',
          startDate: '2026-05-01',
        },
      }).ok,
    ).toBe(true);
  });

  it('builds neutral impact copy and confirmation labels', () => {
    const impact = buildDataDeletionImpact({
      target: {
        endDate: '2026-05-31',
        kind: 'records_by_date_range',
        recordKind: 'expense',
        startDate: '2026-05-01',
      },
    });

    expect(impact.ok).toBe(true);
    if (impact.ok) {
      expect(impact.value.requiresConfirmation).toBe(true);
      expect(impact.value.confirmationLabel).toBe('Delete range');
      expect(impact.value.description).toContain('expense records');
      expect(impact.value.description).not.toMatch(/advice|bad|wrong|should/i);
    }
  });

  it('treats all personal data as a broad destructive local reset', () => {
    const impact = buildDataDeletionImpact({ target: { kind: 'all_personal_data' } });

    expect(impact.ok).toBe(true);
    if (impact.ok) {
      expect(impact.value.title).toBe('Delete all personal data');
      expect(impact.value.affectedDataCategories).toEqual(
        expect.arrayContaining(['money records', 'receipt images', 'settings', 'diagnostics']),
      );
      expect(impact.value.requiresConfirmation).toBe(true);
    }
  });
});
