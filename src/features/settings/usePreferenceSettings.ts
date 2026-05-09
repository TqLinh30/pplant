import { useCallback, useEffect, useReducer, useRef } from 'react';

import type { AppError } from '@/domain/common/app-error';
import { createAppError } from '@/domain/common/app-error';
import {
  asCurrencyCode,
  formatMinorUnitsForInput,
  parseMoneyAmountInputToMinorUnits,
} from '@/domain/common/money';
import { err, ok, type AppResult } from '@/domain/common/result';
import {
  asMonthlyBudgetResetDay,
  canonicalizeLocaleTag,
} from '@/domain/preferences/schemas';
import type { UserPreferences } from '@/domain/preferences/types';
import {
  loadUserPreferences,
  saveUserPreferences,
  type SaveUserPreferencesRequest,
} from '@/services/preferences/preferences.service';

export type PreferenceSettingsField =
  | 'currencyCode'
  | 'defaultHourlyWage'
  | 'locale'
  | 'monthlyBudgetResetDay';

export type PreferenceSettingsForm = Record<PreferenceSettingsField, string>;
export type PreferenceSettingsFieldErrors = Partial<Record<PreferenceSettingsField, string>>;

export type PreferenceSettingsState = {
  fieldErrors: PreferenceSettingsFieldErrors;
  form: PreferenceSettingsForm;
  hasSavedPreferences: boolean;
  loadError?: AppError;
  saveError?: AppError;
  status: 'failed' | 'loading' | 'ready' | 'saved' | 'saving';
};

export type PreferenceSettingsAction =
  | { type: 'field_changed'; field: PreferenceSettingsField; value: string }
  | { type: 'load_failed'; error: AppError }
  | { type: 'load_missing' }
  | { type: 'load_started' }
  | { type: 'load_succeeded'; preferences: UserPreferences }
  | { type: 'save_failed'; error: AppError }
  | { type: 'save_started' }
  | { type: 'save_succeeded'; preferences: UserPreferences }
  | { type: 'validation_failed'; fieldErrors: PreferenceSettingsFieldErrors };

export type PreferenceSettingsServices = {
  loadPreferences?: () => Promise<AppResult<UserPreferences>>;
  savePreferences?: (input: SaveUserPreferencesRequest) => Promise<AppResult<UserPreferences>>;
};

export const defaultPreferenceSettingsForm: PreferenceSettingsForm = {
  currencyCode: 'VND',
  defaultHourlyWage: '0',
  locale: 'vi-VN',
  monthlyBudgetResetDay: '1',
};

export const initialPreferenceSettingsState: PreferenceSettingsState = {
  fieldErrors: {},
  form: defaultPreferenceSettingsForm,
  hasSavedPreferences: false,
  status: 'loading',
};

function formFromPreferences(preferences: UserPreferences): PreferenceSettingsForm {
  const wageInput = formatMinorUnitsForInput(
    preferences.defaultHourlyWage.amountMinor,
    preferences.defaultHourlyWage.currency,
    { locale: preferences.locale },
  );

  return {
    currencyCode: preferences.currencyCode,
    defaultHourlyWage: wageInput.ok
      ? wageInput.value
      : String(preferences.defaultHourlyWage.amountMinor),
    locale: preferences.locale,
    monthlyBudgetResetDay: String(preferences.monthlyBudgetResetDay),
  };
}

function validationErrorMessage(result: AppResult<unknown>, fallback: string): string {
  return result.ok ? fallback : result.error.message;
}

export function validatePreferenceSettingsForm(
  form: PreferenceSettingsForm,
): AppResult<SaveUserPreferencesRequest> & {
  fieldErrors?: PreferenceSettingsFieldErrors;
} {
  const fieldErrors: PreferenceSettingsFieldErrors = {};
  const currency = asCurrencyCode(form.currencyCode);
  const locale = canonicalizeLocaleTag(form.locale);
  const resetDayText = form.monthlyBudgetResetDay.trim();
  const resetDayNumber = /^\d+$/.test(resetDayText) ? Number(resetDayText) : Number.NaN;
  const resetDay = asMonthlyBudgetResetDay(resetDayNumber);

  if (!currency.ok) {
    fieldErrors.currencyCode = validationErrorMessage(currency, 'Use a 3-letter currency code like USD.');
  }

  if (!locale.ok) {
    fieldErrors.locale = validationErrorMessage(locale, 'Use a locale like en-US.');
  }

  if (!resetDay.ok) {
    fieldErrors.monthlyBudgetResetDay = validationErrorMessage(resetDay, 'Choose a reset day from 1 to 31.');
  }

  let wageMinor: AppResult<number> | null = null;
  const wageText = form.defaultHourlyWage.trim();

  if (!/^\d+(?:\.\d+)?$/.test(wageText)) {
    fieldErrors.defaultHourlyWage = 'Enter a non-negative money amount.';
  } else if (currency.ok && locale.ok) {
    wageMinor = parseMoneyAmountInputToMinorUnits(form.defaultHourlyWage, currency.value, {
      locale: locale.value,
    });

    if (!wageMinor.ok) {
      fieldErrors.defaultHourlyWage = validationErrorMessage(wageMinor, 'Enter a wage amount of 0 or more.');
    }
  }

  if (Object.keys(fieldErrors).length > 0 || !currency.ok || !locale.ok || !resetDay.ok || !wageMinor?.ok) {
    return {
      ...err(createAppError('validation_failed', 'Check the highlighted preference fields.', 'edit')),
      fieldErrors,
    };
  }

  return ok({
    currencyCode: currency.value,
    defaultHourlyWageMinor: wageMinor.value,
    locale: locale.value,
    monthlyBudgetResetDay: resetDay.value,
  });
}

export function preferenceSettingsReducer(
  state: PreferenceSettingsState,
  action: PreferenceSettingsAction,
): PreferenceSettingsState {
  switch (action.type) {
    case 'field_changed': {
      const { [action.field]: _removed, ...fieldErrors } = state.fieldErrors;

      return {
        ...state,
        fieldErrors,
        form: {
          ...state.form,
          [action.field]: action.value,
        },
        saveError: undefined,
        status: state.status === 'failed' ? 'ready' : state.status,
      };
    }
    case 'load_failed':
      return {
        ...state,
        loadError: action.error,
        status: 'failed',
      };
    case 'load_missing':
      return {
        ...state,
        fieldErrors: {},
        form: defaultPreferenceSettingsForm,
        hasSavedPreferences: false,
        loadError: undefined,
        saveError: undefined,
        status: 'ready',
      };
    case 'load_started':
      return {
        ...state,
        loadError: undefined,
        status: 'loading',
      };
    case 'load_succeeded':
      return {
        fieldErrors: {},
        form: formFromPreferences(action.preferences),
        hasSavedPreferences: true,
        status: 'ready',
      };
    case 'save_failed':
      return {
        ...state,
        saveError: action.error,
        status: 'ready',
      };
    case 'save_started':
      return {
        ...state,
        fieldErrors: {},
        saveError: undefined,
        status: 'saving',
      };
    case 'save_succeeded':
      return {
        fieldErrors: {},
        form: formFromPreferences(action.preferences),
        hasSavedPreferences: true,
        status: 'saved',
      };
    case 'validation_failed':
      return {
        ...state,
        fieldErrors: action.fieldErrors,
        status: 'ready',
      };
  }
}

export function usePreferenceSettings({
  loadPreferences = loadUserPreferences,
  savePreferences = saveUserPreferences,
}: PreferenceSettingsServices = {}) {
  const [state, dispatch] = useReducer(preferenceSettingsReducer, initialPreferenceSettingsState);
  const isMounted = useRef(false);

  const reload = useCallback(() => {
    dispatch({ type: 'load_started' });

    void loadPreferences().then((result) => {
      if (!isMounted.current) {
        return;
      }

      if (result.ok) {
        dispatch({ type: 'load_succeeded', preferences: result.value });
        return;
      }

      if (result.error.code === 'not_found' || result.error.code === 'validation_failed') {
        dispatch({ type: 'load_missing' });
        return;
      }

      dispatch({ type: 'load_failed', error: result.error });
    });
  }, [loadPreferences]);

  const updateField = useCallback((field: PreferenceSettingsField, value: string) => {
    dispatch({ type: 'field_changed', field, value });
  }, []);

  const save = useCallback(() => {
    const validation = validatePreferenceSettingsForm(state.form);

    if (!validation.ok) {
      dispatch({ type: 'validation_failed', fieldErrors: validation.fieldErrors ?? {} });
      return;
    }

    dispatch({ type: 'save_started' });

    void savePreferences(validation.value).then((result) => {
      if (!isMounted.current) {
        return;
      }

      if (result.ok) {
        dispatch({ type: 'save_succeeded', preferences: result.value });
        return;
      }

      if (result.error.code === 'validation_failed') {
        dispatch({
          fieldErrors: {
            currencyCode: result.error.message,
          },
          type: 'validation_failed',
        });
        return;
      }

      dispatch({ type: 'save_failed', error: result.error });
    });
  }, [savePreferences, state.form]);

  useEffect(() => {
    isMounted.current = true;
    reload();

    return () => {
      isMounted.current = false;
    };
  }, [reload]);

  return {
    reload,
    save,
    state,
    updateField,
  };
}
