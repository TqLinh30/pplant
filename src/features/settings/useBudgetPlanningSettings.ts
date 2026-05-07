import { useCallback, useEffect, useReducer, useRef } from 'react';

import type { AppError } from '@/domain/common/app-error';
import { createAppError } from '@/domain/common/app-error';
import {
  formatMinorUnitsForInput,
  parseMoneyAmountInputToMinorUnits,
} from '@/domain/common/money';
import { asLocalDate } from '@/domain/common/date-rules';
import { err, ok, type AppResult } from '@/domain/common/result';
import {
  validateBudgetPlanningAmountMinor,
  validateSavingsGoalName,
} from '@/domain/budgets/schemas';
import type { BudgetRules, SavingsGoal } from '@/domain/budgets/types';
import type { UserPreferences } from '@/domain/preferences/types';
import {
  createSavingsGoal,
  loadBudgetPlanningSettings,
  saveBudgetRules,
  updateSavingsGoal,
  type BudgetPlanningSettingsData,
} from '@/services/budgets/budget-planning.service';

export type BudgetPlanningSettingsStatus =
  | 'failed'
  | 'loading'
  | 'preferences_needed'
  | 'ready'
  | 'saved'
  | 'saving';

export type SavingsGoalDraft = {
  currentAmount: string;
  name: string;
  targetAmount: string;
  targetDate: string;
};

export type BudgetPlanningField =
  | 'budgetAmount'
  | 'currentAmount'
  | 'name'
  | 'targetAmount'
  | 'targetDate';

export type BudgetPlanningFieldErrors = Partial<Record<BudgetPlanningField, string>>;

export type BudgetPlanningSettingsState = {
  actionError?: AppError;
  budgetAmount: string;
  budgetRules: BudgetRules | null;
  editingGoalId?: string;
  editGoalDraft: SavingsGoalDraft;
  fieldErrors: BudgetPlanningFieldErrors;
  goalDraft: SavingsGoalDraft;
  loadError?: AppError;
  preferences?: UserPreferences;
  savingsGoals: SavingsGoal[];
  status: BudgetPlanningSettingsStatus;
};

export type BudgetPlanningSettingsAction =
  | { type: 'action_failed'; error: AppError }
  | { type: 'budget_field_changed'; field: 'budgetAmount'; value: string }
  | { type: 'budget_saved'; budgetRules: BudgetRules }
  | { type: 'edit_cancelled' }
  | { type: 'edit_goal_field_changed'; field: keyof SavingsGoalDraft; value: string }
  | { type: 'edit_started'; goal: SavingsGoal }
  | { type: 'goal_field_changed'; field: keyof SavingsGoalDraft; value: string }
  | { type: 'goal_saved'; goal: SavingsGoal }
  | { type: 'load_failed'; error: AppError }
  | { type: 'load_started' }
  | {
      type: 'load_succeeded';
      budgetRules: BudgetRules | null;
      preferences: UserPreferences;
      savingsGoals: SavingsGoal[];
    }
  | { type: 'preferences_needed'; error: AppError }
  | { type: 'save_started' }
  | { type: 'validation_failed'; fieldErrors: BudgetPlanningFieldErrors };

export type BudgetPlanningSettingsServices = {
  createGoal?: (input: {
    currentAmountMinor: number;
    name: string;
    targetAmountMinor: number;
    targetDate?: string | null;
  }) => Promise<AppResult<SavingsGoal>>;
  loadSettings?: () => Promise<AppResult<BudgetPlanningSettingsData>>;
  saveBudget?: (input: { monthlyBudgetAmountMinor: number }) => Promise<AppResult<BudgetRules>>;
  updateGoal?: (input: {
    currentAmountMinor: number;
    id: string;
    name: string;
    targetAmountMinor: number;
    targetDate?: string | null;
  }) => Promise<AppResult<SavingsGoal>>;
};

export const defaultSavingsGoalDraft: SavingsGoalDraft = {
  currentAmount: '0.00',
  name: '',
  targetAmount: '',
  targetDate: '',
};

export const initialBudgetPlanningSettingsState: BudgetPlanningSettingsState = {
  budgetAmount: '',
  budgetRules: null,
  editGoalDraft: defaultSavingsGoalDraft,
  fieldErrors: {},
  goalDraft: defaultSavingsGoalDraft,
  savingsGoals: [],
  status: 'loading',
};

function formatAmountForInput(
  amountMinor: number,
  preferences: UserPreferences,
): string {
  const formatted = formatMinorUnitsForInput(amountMinor, preferences.currencyCode, {
    locale: preferences.locale,
  });

  return formatted.ok ? formatted.value : String(amountMinor);
}

function draftFromGoal(goal: SavingsGoal, preferences: UserPreferences): SavingsGoalDraft {
  return {
    currentAmount: formatAmountForInput(goal.currentAmountMinor, preferences),
    name: goal.name,
    targetAmount: formatAmountForInput(goal.targetAmountMinor, preferences),
    targetDate: goal.targetDate ?? '',
  };
}

function removeFieldError(
  fieldErrors: BudgetPlanningFieldErrors,
  field: BudgetPlanningField,
): BudgetPlanningFieldErrors {
  const { [field]: _removed, ...nextErrors } = fieldErrors;
  return nextErrors;
}

export function validateBudgetAmountDraft(
  value: string,
  currencyCode: string,
  locale: string,
): AppResult<number> {
  const parsed = parseMoneyAmountInputToMinorUnits(value, currencyCode, { locale });

  if (!parsed.ok) {
    return parsed;
  }

  return validateBudgetPlanningAmountMinor(parsed.value, { allowZero: false });
}

export function validateSavingsGoalDraft(
  draft: SavingsGoalDraft,
  currencyCode: string,
  locale: string,
): AppResult<{
  currentAmountMinor: number;
  name: string;
  targetAmountMinor: number;
  targetDate: string | null;
}> & { fieldErrors?: BudgetPlanningFieldErrors } {
  const fieldErrors: BudgetPlanningFieldErrors = {};
  const name = validateSavingsGoalName(draft.name);
  const targetAmount = parseMoneyAmountInputToMinorUnits(draft.targetAmount, currencyCode, { locale });
  const currentAmount = parseMoneyAmountInputToMinorUnits(draft.currentAmount, currencyCode, { locale });
  const targetDateText = draft.targetDate.trim();
  const targetDate = targetDateText.length === 0 ? ok(null) : asLocalDate(targetDateText);

  if (!name.ok) {
    fieldErrors.name = name.error.message;
  }

  if (!targetAmount.ok) {
    fieldErrors.targetAmount = targetAmount.error.message;
  } else {
    const positiveTarget = validateBudgetPlanningAmountMinor(targetAmount.value, { allowZero: false });

    if (!positiveTarget.ok) {
      fieldErrors.targetAmount = positiveTarget.error.message;
    }
  }

  if (!currentAmount.ok) {
    fieldErrors.currentAmount = currentAmount.error.message;
  }

  if (!targetDate.ok) {
    fieldErrors.targetDate = targetDate.error.message;
  }

  if (Object.keys(fieldErrors).length > 0 || !name.ok || !targetAmount.ok || !currentAmount.ok || !targetDate.ok) {
    return {
      ...err(createAppError('validation_failed', 'Check the highlighted savings goal fields.', 'edit')),
      fieldErrors,
    };
  }

  const positiveTarget = validateBudgetPlanningAmountMinor(targetAmount.value, { allowZero: false });
  const nonNegativeCurrent = validateBudgetPlanningAmountMinor(currentAmount.value, { allowZero: true });

  if (!positiveTarget.ok || !nonNegativeCurrent.ok) {
    return {
      ...err(createAppError('validation_failed', 'Check the highlighted savings goal fields.', 'edit')),
      fieldErrors,
    };
  }

  return ok({
    currentAmountMinor: nonNegativeCurrent.value,
    name: name.value,
    targetAmountMinor: positiveTarget.value,
    targetDate: targetDate.value,
  });
}

export function budgetPlanningSettingsReducer(
  state: BudgetPlanningSettingsState,
  action: BudgetPlanningSettingsAction,
): BudgetPlanningSettingsState {
  switch (action.type) {
    case 'action_failed':
      return {
        ...state,
        actionError: action.error,
        status: 'ready',
      };
    case 'budget_field_changed':
      return {
        ...state,
        budgetAmount: action.value,
        fieldErrors: removeFieldError(state.fieldErrors, action.field),
      };
    case 'budget_saved':
      return {
        ...state,
        actionError: undefined,
        budgetAmount: state.preferences
          ? formatAmountForInput(action.budgetRules.monthlyBudgetAmountMinor, state.preferences)
          : state.budgetAmount,
        budgetRules: action.budgetRules,
        fieldErrors: {},
        status: 'saved',
      };
    case 'edit_cancelled':
      return {
        ...state,
        editGoalDraft: defaultSavingsGoalDraft,
        editingGoalId: undefined,
        fieldErrors: {},
      };
    case 'edit_goal_field_changed':
      return {
        ...state,
        editGoalDraft: {
          ...state.editGoalDraft,
          [action.field]: action.value,
        },
        fieldErrors: removeFieldError(state.fieldErrors, action.field),
      };
    case 'edit_started':
      return {
        ...state,
        editGoalDraft: state.preferences
          ? draftFromGoal(action.goal, state.preferences)
          : {
              currentAmount: String(action.goal.currentAmountMinor),
              name: action.goal.name,
              targetAmount: String(action.goal.targetAmountMinor),
              targetDate: action.goal.targetDate ?? '',
            },
        editingGoalId: action.goal.id,
        fieldErrors: {},
      };
    case 'goal_field_changed':
      return {
        ...state,
        fieldErrors: removeFieldError(state.fieldErrors, action.field),
        goalDraft: {
          ...state.goalDraft,
          [action.field]: action.value,
        },
      };
    case 'goal_saved': {
      const existingIndex = state.savingsGoals.findIndex((goal) => goal.id === action.goal.id);
      const savingsGoals =
        existingIndex === -1
          ? [...state.savingsGoals, action.goal]
          : state.savingsGoals.map((goal) => (goal.id === action.goal.id ? action.goal : goal));

      return {
        ...state,
        actionError: undefined,
        editGoalDraft: defaultSavingsGoalDraft,
        editingGoalId: undefined,
        fieldErrors: {},
        goalDraft: defaultSavingsGoalDraft,
        savingsGoals,
        status: 'saved',
      };
    }
    case 'load_failed':
      return {
        ...state,
        loadError: action.error,
        status: 'failed',
      };
    case 'load_started':
      return {
        ...state,
        loadError: undefined,
        status: 'loading',
      };
    case 'load_succeeded':
      return {
        ...state,
        actionError: undefined,
        budgetAmount: action.budgetRules
          ? formatAmountForInput(action.budgetRules.monthlyBudgetAmountMinor, action.preferences)
          : '',
        budgetRules: action.budgetRules,
        fieldErrors: {},
        loadError: undefined,
        preferences: action.preferences,
        savingsGoals: action.savingsGoals,
        status: 'ready',
      };
    case 'preferences_needed':
      return {
        ...state,
        loadError: action.error,
        status: 'preferences_needed',
      };
    case 'save_started':
      return {
        ...state,
        actionError: undefined,
        fieldErrors: {},
        status: 'saving',
      };
    case 'validation_failed':
      return {
        ...state,
        fieldErrors: action.fieldErrors,
        status: 'ready',
      };
  }
}

export function useBudgetPlanningSettings({
  createGoal = createSavingsGoal,
  loadSettings = loadBudgetPlanningSettings,
  saveBudget = saveBudgetRules,
  updateGoal = updateSavingsGoal,
}: BudgetPlanningSettingsServices = {}) {
  const [state, dispatch] = useReducer(
    budgetPlanningSettingsReducer,
    initialBudgetPlanningSettingsState,
  );
  const isMounted = useRef(false);

  const reload = useCallback(() => {
    dispatch({ type: 'load_started' });

    void loadSettings().then((result) => {
      if (!isMounted.current) {
        return;
      }

      if (result.ok) {
        dispatch({
          budgetRules: result.value.budgetRules,
          preferences: result.value.preferences,
          savingsGoals: result.value.savingsGoals,
          type: 'load_succeeded',
        });
        return;
      }

      if (result.error.code === 'not_found') {
        dispatch({ error: result.error, type: 'preferences_needed' });
        return;
      }

      dispatch({ error: result.error, type: 'load_failed' });
    });
  }, [loadSettings]);

  const updateBudgetAmount = useCallback((value: string) => {
    dispatch({ field: 'budgetAmount', type: 'budget_field_changed', value });
  }, []);

  const saveBudgetAmount = useCallback(() => {
    if (!state.preferences) {
      dispatch({
        error: createAppError('not_found', 'Save preferences before setting budgets.', 'settings'),
        type: 'preferences_needed',
      });
      return;
    }

    const validation = validateBudgetAmountDraft(
      state.budgetAmount,
      state.preferences.currencyCode,
      state.preferences.locale,
    );

    if (!validation.ok) {
      dispatch({ fieldErrors: { budgetAmount: validation.error.message }, type: 'validation_failed' });
      return;
    }

    dispatch({ type: 'save_started' });

    void saveBudget({ monthlyBudgetAmountMinor: validation.value }).then((result) => {
      if (!isMounted.current) {
        return;
      }

      if (result.ok) {
        dispatch({ budgetRules: result.value, type: 'budget_saved' });
        return;
      }

      if (result.error.recovery === 'edit') {
        dispatch({ fieldErrors: { budgetAmount: result.error.message }, type: 'validation_failed' });
        return;
      }

      dispatch({ error: result.error, type: 'action_failed' });
    });
  }, [saveBudget, state.budgetAmount, state.preferences]);

  const updateGoalDraft = useCallback((field: keyof SavingsGoalDraft, value: string) => {
    dispatch({ field, type: 'goal_field_changed', value });
  }, []);

  const createGoalFromDraft = useCallback(() => {
    if (!state.preferences) {
      return;
    }

    const validation = validateSavingsGoalDraft(
      state.goalDraft,
      state.preferences.currencyCode,
      state.preferences.locale,
    );

    if (!validation.ok) {
      dispatch({ fieldErrors: validation.fieldErrors ?? {}, type: 'validation_failed' });
      return;
    }

    dispatch({ type: 'save_started' });

    void createGoal(validation.value).then((result) => {
      if (!isMounted.current) {
        return;
      }

      if (result.ok) {
        dispatch({ goal: result.value, type: 'goal_saved' });
        return;
      }

      dispatch({ error: result.error, type: 'action_failed' });
    });
  }, [createGoal, state.goalDraft, state.preferences]);

  const startGoalEdit = useCallback((goal: SavingsGoal) => {
    dispatch({ goal, type: 'edit_started' });
  }, []);

  const updateEditGoalDraft = useCallback((field: keyof SavingsGoalDraft, value: string) => {
    dispatch({ field, type: 'edit_goal_field_changed', value });
  }, []);

  const cancelGoalEdit = useCallback(() => {
    dispatch({ type: 'edit_cancelled' });
  }, []);

  const saveGoalEdit = useCallback(() => {
    if (!state.preferences || !state.editingGoalId) {
      return;
    }

    const validation = validateSavingsGoalDraft(
      state.editGoalDraft,
      state.preferences.currencyCode,
      state.preferences.locale,
    );

    if (!validation.ok) {
      dispatch({ fieldErrors: validation.fieldErrors ?? {}, type: 'validation_failed' });
      return;
    }

    dispatch({ type: 'save_started' });

    void updateGoal({ ...validation.value, id: state.editingGoalId }).then((result) => {
      if (!isMounted.current) {
        return;
      }

      if (result.ok) {
        dispatch({ goal: result.value, type: 'goal_saved' });
        return;
      }

      dispatch({ error: result.error, type: 'action_failed' });
    });
  }, [state.editGoalDraft, state.editingGoalId, state.preferences, updateGoal]);

  useEffect(() => {
    isMounted.current = true;
    reload();

    return () => {
      isMounted.current = false;
    };
  }, [reload]);

  return {
    cancelGoalEdit,
    createGoalFromDraft,
    reload,
    saveBudgetAmount,
    saveGoalEdit,
    startGoalEdit,
    state,
    updateBudgetAmount,
    updateEditGoalDraft,
    updateGoalDraft,
  };
}
