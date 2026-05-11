import { useMemo, useReducer } from 'react';

import {
  dataDeletionRecordKindOptions,
  type DataDeletionImpact,
  type DataDeletionPlan,
  type DataDeletionRecordKind,
} from '@/domain/privacy/deletion-plan';
import {
  buildPrivacySettingAreas,
  findPrivacySettingArea,
  type PrivacySettingAreaId,
  type PrivacySettingsEnvironment,
} from '@/domain/privacy/privacy-settings';
import { readEnvironment } from '@/services/environment/env';
import {
  executeDeletionPlan,
  previewDeletionPlan,
  type DataDeletionExecutionResult,
  type DataDeletionServiceDependencies,
} from '@/services/privacy/data-deletion.service';

export type PrivacySettingsState = {
  dataDeletion: DataDeletionState;
  selectedAreaId: PrivacySettingAreaId | null;
};

export type DataDeletionStatus =
  | 'idle'
  | 'previewing'
  | 'awaiting_confirmation'
  | 'executing'
  | 'completed'
  | 'failed';

export type DataDeletionState = {
  dateRangeEndDate: string;
  dateRangeRecordKind: DataDeletionRecordKind;
  dateRangeStartDate: string;
  errorMessage: string | null;
  impact: DataDeletionImpact | null;
  result: DataDeletionExecutionResult | null;
  status: DataDeletionStatus;
};

export type PrivacySettingsAction =
  | { type: 'data_deletion_closed' }
  | { endDate: string; type: 'data_deletion_date_range_changed'; startDate: string }
  | { recordKind: DataDeletionRecordKind; type: 'data_deletion_record_kind_changed' }
  | { type: 'data_deletion_preview_started' }
  | { errorMessage: string; type: 'data_deletion_failed' }
  | { impact: DataDeletionImpact; type: 'data_deletion_preview_ready' }
  | { type: 'data_deletion_execute_started' }
  | { result: DataDeletionExecutionResult; type: 'data_deletion_completed' }
  | { type: 'detail_closed' }
  | { type: 'detail_opened'; areaId: PrivacySettingAreaId };

export type PrivacySettingsOptions = {
  deletionService?: {
    execute?: typeof executeDeletionPlan;
    preview?: typeof previewDeletionPlan;
  };
  deletionServiceDependencies?: DataDeletionServiceDependencies;
  rawEnvironment?: Record<string, string | undefined>;
};

export const initialPrivacySettingsState: PrivacySettingsState = {
  dataDeletion: {
    dateRangeEndDate: '',
    dateRangeRecordKind: 'all_records',
    dateRangeStartDate: '',
    errorMessage: null,
    impact: null,
    result: null,
    status: 'idle',
  },
  selectedAreaId: null,
};

type RuntimeProcess = {
  env?: Record<string, string | undefined>;
};

function getRuntimeEnvironment(): Record<string, string | undefined> {
  const maybeProcess = (globalThis as typeof globalThis & { process?: RuntimeProcess }).process;

  return {
    EXPO_PUBLIC_DIAGNOSTICS_ENABLED: maybeProcess?.env?.EXPO_PUBLIC_DIAGNOSTICS_ENABLED,
    EXPO_PUBLIC_OCR_PROVIDER: maybeProcess?.env?.EXPO_PUBLIC_OCR_PROVIDER,
  };
}

export function derivePrivacySettingsEnvironment(
  rawEnvironment: Record<string, string | undefined>,
): PrivacySettingsEnvironment {
  const result = readEnvironment(rawEnvironment);

  if (!result.ok) {
    return {
      diagnosticsEnabled: false,
      ocrProvider: null,
    };
  }

  return {
    diagnosticsEnabled: result.value.EXPO_PUBLIC_DIAGNOSTICS_ENABLED === 'true',
    ocrProvider: result.value.EXPO_PUBLIC_OCR_PROVIDER ?? null,
  };
}

export function privacySettingsReducer(
  state: PrivacySettingsState,
  action: PrivacySettingsAction,
): PrivacySettingsState {
  switch (action.type) {
    case 'data_deletion_closed':
      return {
        ...state,
        dataDeletion: {
          ...state.dataDeletion,
          errorMessage: null,
          impact: null,
          result: null,
          status: 'idle',
        },
      };
    case 'data_deletion_date_range_changed':
      return {
        ...state,
        dataDeletion: {
          ...state.dataDeletion,
          dateRangeEndDate: action.endDate,
          dateRangeStartDate: action.startDate,
        },
      };
    case 'data_deletion_record_kind_changed':
      return {
        ...state,
        dataDeletion: {
          ...state.dataDeletion,
          dateRangeRecordKind: action.recordKind,
        },
      };
    case 'data_deletion_preview_started':
      return {
        ...state,
        dataDeletion: {
          ...state.dataDeletion,
          errorMessage: null,
          impact: null,
          result: null,
          status: 'previewing',
        },
      };
    case 'data_deletion_failed':
      return {
        ...state,
        dataDeletion: {
          ...state.dataDeletion,
          errorMessage: action.errorMessage,
          status: 'failed',
        },
      };
    case 'data_deletion_preview_ready':
      return {
        ...state,
        dataDeletion: {
          ...state.dataDeletion,
          errorMessage: null,
          impact: action.impact,
          result: null,
          status: 'awaiting_confirmation',
        },
      };
    case 'data_deletion_execute_started':
      return {
        ...state,
        dataDeletion: {
          ...state.dataDeletion,
          errorMessage: null,
          status: 'executing',
        },
      };
    case 'data_deletion_completed':
      return {
        ...state,
        dataDeletion: {
          ...state.dataDeletion,
          errorMessage: null,
          impact: action.result.impact,
          result: action.result,
          status: 'completed',
        },
      };
    case 'detail_closed':
      return {
        ...state,
        selectedAreaId: null,
      };
    case 'detail_opened':
      return {
        ...state,
        selectedAreaId: action.areaId,
      };
    default:
      return state;
  }
}

function toErrorMessage(result: { error: { message: string } }): string {
  return result.error.message;
}

export function usePrivacySettings(options: PrivacySettingsOptions = {}) {
  const [state, dispatch] = useReducer(privacySettingsReducer, initialPrivacySettingsState);
  const rawEnvironment = options.rawEnvironment ?? getRuntimeEnvironment();
  const preview = options.deletionService?.preview ?? previewDeletionPlan;
  const execute = options.deletionService?.execute ?? executeDeletionPlan;
  const environment = useMemo(() => derivePrivacySettingsEnvironment(rawEnvironment), [rawEnvironment]);
  const areas = useMemo(() => buildPrivacySettingAreas(environment), [environment]);
  const selectedArea = useMemo(
    () => findPrivacySettingArea(areas, state.selectedAreaId),
    [areas, state.selectedAreaId],
  );

  const requestDeletion = async (plan: DataDeletionPlan) => {
    dispatch({ type: 'data_deletion_preview_started' });

    const result = await preview(plan);

    if (!result.ok) {
      dispatch({ errorMessage: toErrorMessage(result), type: 'data_deletion_failed' });
      return;
    }

    dispatch({ impact: result.value, type: 'data_deletion_preview_ready' });
  };

  const confirmDeletion = async () => {
    if (!state.dataDeletion.impact) {
      dispatch({ errorMessage: 'Choose data to delete first.', type: 'data_deletion_failed' });
      return;
    }

    dispatch({ type: 'data_deletion_execute_started' });

    const result = await execute(
      {
        ...state.dataDeletion.impact.plan,
        confirmed: true,
      },
      options.deletionServiceDependencies,
    );

    if (!result.ok) {
      dispatch({ errorMessage: toErrorMessage(result), type: 'data_deletion_failed' });
      return;
    }

    dispatch({ result: result.value, type: 'data_deletion_completed' });
  };

  const requestDateRangeDeletion = () =>
    requestDeletion({
      target: {
        endDate: state.dataDeletion.dateRangeEndDate,
        kind: 'records_by_date_range',
        recordKind: state.dataDeletion.dateRangeRecordKind,
        startDate: state.dataDeletion.dateRangeStartDate,
      },
    });

  return {
    areas,
    closeDataDeletion: () => dispatch({ type: 'data_deletion_closed' }),
    closeDetail: () => dispatch({ type: 'detail_closed' }),
    confirmDeletion,
    dataDeletionRecordKindOptions,
    openDetail: (areaId: PrivacySettingAreaId) => dispatch({ areaId, type: 'detail_opened' }),
    previewAllPersonalDataDeletion: () => requestDeletion({ target: { kind: 'all_personal_data' } }),
    previewDiagnosticsDeletion: () => requestDeletion({ target: { kind: 'diagnostics' } }),
    previewDraftDeletion: () => requestDeletion({ target: { draftKind: 'all', kind: 'drafts' } }),
    previewRecordsByTypeDeletion: (
      recordKind: Exclude<DataDeletionRecordKind, 'all_records'>,
    ) => requestDeletion({ target: { kind: 'records_by_type', recordKind } }),
    previewReceiptImageDeletion: () => requestDeletion({ target: { kind: 'receipt_images' } }),
    requestDateRangeDeletion,
    selectedArea,
    state,
    updateDeletionDateRange: (startDate: string, endDate: string) =>
      dispatch({ endDate, startDate, type: 'data_deletion_date_range_changed' }),
    updateDeletionRecordKind: (recordKind: DataDeletionRecordKind) =>
      dispatch({ recordKind, type: 'data_deletion_record_kind_changed' }),
  };
}
