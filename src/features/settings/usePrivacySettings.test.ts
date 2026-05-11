import {
  derivePrivacySettingsEnvironment,
  initialPrivacySettingsState,
  privacySettingsReducer,
} from './usePrivacySettings';

describe('privacy settings feature state', () => {
  it('derives safe defaults from absent environment values', () => {
    expect(derivePrivacySettingsEnvironment({})).toEqual({
      diagnosticsEnabled: false,
      ocrProvider: null,
    });
  });

  it('derives configured diagnostics and OCR values from environment', () => {
    expect(
      derivePrivacySettingsEnvironment({
        EXPO_PUBLIC_DIAGNOSTICS_ENABLED: 'true',
        EXPO_PUBLIC_OCR_PROVIDER: 'example-ocr',
      }),
    ).toEqual({
      diagnosticsEnabled: true,
      ocrProvider: 'example-ocr',
    });
  });

  it('falls back to safe defaults when environment validation fails', () => {
    expect(
      derivePrivacySettingsEnvironment({
        EXPO_PUBLIC_DIAGNOSTICS_ENABLED: 'yes',
        EXPO_PUBLIC_OCR_PROVIDER: 'example-ocr',
      }),
    ).toEqual({
      diagnosticsEnabled: false,
      ocrProvider: null,
    });
  });

  it('opens and closes privacy detail state', () => {
    const opened = privacySettingsReducer(initialPrivacySettingsState, {
      areaId: 'ocr_parsing',
      type: 'detail_opened',
    });
    const closed = privacySettingsReducer(opened, { type: 'detail_closed' });

    expect(opened.selectedAreaId).toBe('ocr_parsing');
    expect(closed.selectedAreaId).toBeNull();
  });

  it('tracks deletion preview, confirmation, and completion states', () => {
    const previewing = privacySettingsReducer(initialPrivacySettingsState, {
      type: 'data_deletion_preview_started',
    });
    const awaiting = privacySettingsReducer(previewing, {
      impact: {
        affectedDataCategories: ['diagnostics'],
        confirmationLabel: 'Clear diagnostics',
        description: 'This clears local diagnostic events.',
        destructive: true,
        plan: { target: { kind: 'diagnostics' } },
        requiresConfirmation: true,
        title: 'Clear diagnostics',
      },
      type: 'data_deletion_preview_ready',
    });
    const executing = privacySettingsReducer(awaiting, { type: 'data_deletion_execute_started' });
    const completed = privacySettingsReducer(executing, {
      result: {
        completedAt: '2026-05-09T00:00:00.000Z',
        counts: {
          budgetsDeleted: 0,
          categoriesDeleted: 0,
          diagnosticsDeleted: 2,
          draftsDiscarded: 0,
          moneyRecordsDeleted: 0,
          receiptImagesDeleted: 0,
          receiptParseJobsDeleted: 0,
          recurrenceRulesDeleted: 0,
          recoveryEventsDeleted: 0,
          reflectionPreferencesDeleted: 0,
          reflectionsDeleted: 0,
          reminderNotificationsDeleted: 0,
          remindersDeleted: 0,
          savingsGoalsDeleted: 0,
          taskRecurrenceCompletionsDeleted: 0,
          taskRecurrenceRulesDeleted: 0,
          tasksDeleted: 0,
          topicsDeleted: 0,
          userPreferencesDeleted: 0,
          workEntriesDeleted: 0,
        },
        impact: awaiting.dataDeletion.impact!,
        warnings: [],
      },
      type: 'data_deletion_completed',
    });

    expect(previewing.dataDeletion.status).toBe('previewing');
    expect(awaiting.dataDeletion.status).toBe('awaiting_confirmation');
    expect(executing.dataDeletion.status).toBe('executing');
    expect(completed.dataDeletion.status).toBe('completed');
    expect(completed.dataDeletion.result?.counts.diagnosticsDeleted).toBe(2);
  });

  it('stores deletion date range edits and failure copy', () => {
    const withRange = privacySettingsReducer(initialPrivacySettingsState, {
      endDate: '2026-05-31',
      startDate: '2026-05-01',
      type: 'data_deletion_date_range_changed',
    });
    const withKind = privacySettingsReducer(withRange, {
      recordKind: 'money',
      type: 'data_deletion_record_kind_changed',
    });
    const failed = privacySettingsReducer(withKind, {
      errorMessage: 'Start date must be on or before end date.',
      type: 'data_deletion_failed',
    });

    expect(withKind.dataDeletion.dateRangeStartDate).toBe('2026-05-01');
    expect(withKind.dataDeletion.dateRangeEndDate).toBe('2026-05-31');
    expect(withKind.dataDeletion.dateRangeRecordKind).toBe('money');
    expect(failed.dataDeletion.status).toBe('failed');
    expect(failed.dataDeletion.errorMessage).toContain('Start date');
  });
});
