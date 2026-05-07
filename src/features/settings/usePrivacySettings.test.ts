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
});
