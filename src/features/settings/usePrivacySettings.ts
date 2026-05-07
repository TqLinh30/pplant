import { useMemo, useReducer } from 'react';

import {
  buildPrivacySettingAreas,
  findPrivacySettingArea,
  type PrivacySettingAreaId,
  type PrivacySettingsEnvironment,
} from '@/domain/privacy/privacy-settings';
import { readEnvironment } from '@/services/environment/env';

export type PrivacySettingsState = {
  selectedAreaId: PrivacySettingAreaId | null;
};

export type PrivacySettingsAction =
  | { type: 'detail_closed' }
  | { type: 'detail_opened'; areaId: PrivacySettingAreaId };

export type PrivacySettingsOptions = {
  rawEnvironment?: Record<string, string | undefined>;
};

export const initialPrivacySettingsState: PrivacySettingsState = {
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

export function usePrivacySettings(options: PrivacySettingsOptions = {}) {
  const [state, dispatch] = useReducer(privacySettingsReducer, initialPrivacySettingsState);
  const rawEnvironment = options.rawEnvironment ?? getRuntimeEnvironment();
  const environment = useMemo(() => derivePrivacySettingsEnvironment(rawEnvironment), [rawEnvironment]);
  const areas = useMemo(() => buildPrivacySettingAreas(environment), [environment]);
  const selectedArea = useMemo(
    () => findPrivacySettingArea(areas, state.selectedAreaId),
    [areas, state.selectedAreaId],
  );

  return {
    areas,
    closeDetail: () => dispatch({ type: 'detail_closed' }),
    openDetail: (areaId: PrivacySettingAreaId) => dispatch({ areaId, type: 'detail_opened' }),
    selectedArea,
    state,
  };
}
