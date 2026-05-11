import {
  buildPrivacySettingAreas,
  findPrivacySettingArea,
  privacySettingAreaIds,
} from './privacy-settings';

describe('privacy settings domain', () => {
  it('includes the five required privacy areas in stable display order', () => {
    const areas = buildPrivacySettingAreas();

    expect(areas.map((area) => area.id)).toEqual([...privacySettingAreaIds]);
    expect(new Set(areas.map((area) => area.id)).size).toBe(5);
  });

  it('uses safe defaults for diagnostics and OCR when environment values are absent', () => {
    const diagnostics = findPrivacySettingArea(buildPrivacySettingAreas(), 'analytics_diagnostics');
    const parsing = findPrivacySettingArea(buildPrivacySettingAreas(), 'ocr_parsing');

    expect(diagnostics?.status).toBe('off');
    expect(diagnostics?.statusLabel).toBe('Currently off');
    expect(parsing?.status).toBe('not_configured');
    expect(parsing?.statusLabel).toBe('Not configured');
  });

  it('marks configured diagnostics without exposing sensitive data categories', () => {
    const diagnostics = findPrivacySettingArea(
      buildPrivacySettingAreas({ diagnosticsEnabled: true }),
      'analytics_diagnostics',
    );

    expect(diagnostics?.status).toBe('configured');
    expect(diagnostics?.affectedDataCategories).toContain('diagnostic event name');
    expect(diagnostics?.beforeEnablementDisclosure).toContain('raw receipts');
    expect(diagnostics?.beforeEnablementDisclosure).toContain('spending details');
  });

  it('marks configured OCR and keeps manual alternatives visible', () => {
    const parsing = findPrivacySettingArea(
      buildPrivacySettingAreas({ ocrProvider: 'example-ocr' }),
      'ocr_parsing',
    );

    expect(parsing?.status).toBe('configured');
    expect(parsing?.affectedDataCategories).toContain('receipt photo');
    expect(parsing?.affectedDataCategories).toContain('candidate total amount');
    expect(parsing?.beforeEnablementDisclosure).toContain('external receipt parsing');
    expect(parsing?.manualAlternative).toContain('Manual receipt or expense entry');
  });

  it('keeps notification and local-data manual alternatives explicit', () => {
    const areas = buildPrivacySettingAreas();
    const notifications = findPrivacySettingArea(areas, 'notifications');
    const localData = findPrivacySettingArea(areas, 'local_data');

    expect(notifications?.manualAlternative).toContain('notifications are disabled');
    expect(localData?.manualAlternative).toContain('does not require an account');
  });
});
