import { createAppError } from '@/domain/common/app-error';

import {
  defaultPreferenceSettingsForm,
  initialPreferenceSettingsState,
  preferenceSettingsReducer,
  validatePreferenceSettingsForm,
} from './usePreferenceSettings';

describe('preference settings form state', () => {
  it('builds a save request with normalized currency, locale, reset day, and wage minor units', () => {
    const result = validatePreferenceSettingsForm({
      currencyCode: 'usd',
      defaultHourlyWage: '12.50',
      locale: 'en-us',
      monthlyBudgetResetDay: '15',
    });

    expect(result).toEqual({
      ok: true,
      value: {
        currencyCode: 'USD',
        defaultHourlyWageMinor: 1250,
        locale: 'en-US',
        monthlyBudgetResetDay: 15,
      },
    });
  });

  it('returns field-level correction paths for invalid values', () => {
    const result = validatePreferenceSettingsForm({
      currencyCode: 'US',
      defaultHourlyWage: 'abc',
      locale: 'not a locale',
      monthlyBudgetResetDay: '40',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('validation_failed');
      expect(result.fieldErrors).toEqual({
        currencyCode: 'Currency code must be an ISO-style 3-letter code.',
        defaultHourlyWage: 'Enter a non-negative money amount.',
        locale: 'Locale must be a valid BCP 47 tag.',
        monthlyBudgetResetDay: 'Monthly budget reset day must be between 1 and 31.',
      });
    }
  });

  it('moves to editable setup state when preferences have not been saved', () => {
    const result = preferenceSettingsReducer(initialPreferenceSettingsState, {
      type: 'load_missing',
    });

    expect(result).toEqual({
      fieldErrors: {},
      form: defaultPreferenceSettingsForm,
      hasSavedPreferences: false,
      loadError: undefined,
      saveError: undefined,
      status: 'ready',
    });
  });

  it('keeps edits visible when save fails', () => {
    const edited = preferenceSettingsReducer(initialPreferenceSettingsState, {
      field: 'currencyCode',
      type: 'field_changed',
      value: 'TWD',
    });
    const error = createAppError('unavailable', 'Local preferences could not be saved.', 'retry');

    const result = preferenceSettingsReducer(edited, {
      error,
      type: 'save_failed',
    });

    expect(result.form.currencyCode).toBe('TWD');
    expect(result.saveError).toBe(error);
    expect(result.status).toBe('ready');
  });

  it('clears a field error when that field changes', () => {
    const failed = preferenceSettingsReducer(initialPreferenceSettingsState, {
      fieldErrors: {
        currencyCode: 'Use a 3-letter currency code like USD.',
        locale: 'Use a locale like en-US.',
      },
      type: 'validation_failed',
    });

    const result = preferenceSettingsReducer(failed, {
      field: 'currencyCode',
      type: 'field_changed',
      value: 'USD',
    });

    expect(result.fieldErrors).toEqual({
      locale: 'Use a locale like en-US.',
    });
  });
});
