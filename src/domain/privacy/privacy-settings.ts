export type PrivacySettingAreaId =
  | 'analytics_diagnostics'
  | 'local_data'
  | 'notifications'
  | 'ocr_parsing'
  | 'receipt_image_retention';

export type PrivacySettingStatus = 'configured' | 'future_controlled' | 'local_only' | 'not_configured' | 'off';

export type PrivacySettingArea = {
  id: PrivacySettingAreaId;
  title: string;
  status: PrivacySettingStatus;
  statusLabel: string;
  summary: string;
  currentBehavior: string;
  affectedDataCategories: string[];
  manualAlternative?: string;
  beforeEnablementDisclosure?: string;
};

export type PrivacySettingsEnvironment = {
  diagnosticsEnabled?: boolean;
  ocrProvider?: string | null;
};

export const privacySettingAreaIds = [
  'receipt_image_retention',
  'notifications',
  'analytics_diagnostics',
  'ocr_parsing',
  'local_data',
] as const satisfies readonly PrivacySettingAreaId[];

function hasConfiguredProvider(provider: string | null | undefined): boolean {
  return typeof provider === 'string' && provider.trim().length > 0;
}

export function buildPrivacySettingAreas(environment: PrivacySettingsEnvironment = {}): PrivacySettingArea[] {
  const diagnosticsEnabled = environment.diagnosticsEnabled === true;
  const ocrConfigured = hasConfiguredProvider(environment.ocrProvider);

  return [
    {
      affectedDataCategories: [
        'receipt photo files',
        'receipt file references',
        'retention metadata',
        'abandoned receipt draft age',
      ],
      currentBehavior:
        'Receipt images are stored in app-private storage from receipt capture. Receipt detail screens can keep an image, delete it after save, or delete the image while keeping the expense record. Abandoned receipt drafts older than 30 days are eligible for local cleanup.',
      id: 'receipt_image_retention',
      manualAlternative: 'Manual expense entry remains available when a receipt photo is not wanted.',
      status: 'configured',
      statusLabel: 'Local controls ready',
      summary: 'Receipt images stay private and can be retained or deleted from receipt detail without deleting expense records.',
      title: 'Receipt images',
    },
    {
      affectedDataCategories: ['reminder id', 'scheduled local time', 'permission status', 'delivery state'],
      currentBehavior:
        'Reminder notifications are intended to use local device scheduling. Permission prompts, missed states, and reminder controls are implemented in later reminder stories.',
      id: 'notifications',
      manualAlternative: 'You can still use in-app planning screens when notifications are disabled or unavailable.',
      status: 'future_controlled',
      statusLabel: 'Local notification plan',
      summary: 'Reminder notifications stay device-local in the MVP plan and should not block manual app use.',
      title: 'Notifications',
    },
    {
      affectedDataCategories: [
        'diagnostic event name',
        'app version',
        'non-sensitive error category',
        'retry count',
        'job or delivery state',
        'offline or timeout flags',
      ],
      beforeEnablementDisclosure:
        'Before diagnostics can be enabled, Pplant must keep raw receipts, OCR text, spending details, income values, task or reminder text, and reflections out of diagnostic payloads.',
      currentBehavior: diagnosticsEnabled
        ? 'Diagnostics are configured on. Diagnostic events must use the existing redaction layer and allow only non-sensitive metadata.'
        : 'Diagnostics are currently off by default. If enabled later, only redacted non-sensitive metadata may be recorded.',
      id: 'analytics_diagnostics',
      status: diagnosticsEnabled ? 'configured' : 'off',
      statusLabel: diagnosticsEnabled ? 'Configured on' : 'Currently off',
      summary: diagnosticsEnabled
        ? 'Redacted diagnostics are configured and must exclude sensitive personal content.'
        : 'Analytics and diagnostics are off unless explicitly configured.',
      title: 'Diagnostics',
    },
    {
      affectedDataCategories: [
        'receipt photo',
        'candidate merchant',
        'candidate date',
        'candidate total amount',
        'candidate line items',
        'parse confidence and failure state',
      ],
      beforeEnablementDisclosure:
        'Before external receipt parsing can be enabled, Pplant must disclose that receipt images and parsed field candidates may be processed outside the local app.',
      currentBehavior: ocrConfigured
        ? 'An OCR provider is configured in the environment, but receipt upload and consent flows are not implemented in this setup story.'
        : 'Receipt parsing is not configured. Pplant should use manual entry or a no-op parser until a receipt parsing story adds review and consent flows.',
      id: 'ocr_parsing',
      manualAlternative: 'Manual receipt or expense entry remains available when parsing is unavailable, disabled, failed, or not trusted.',
      status: ocrConfigured ? 'configured' : 'not_configured',
      statusLabel: ocrConfigured ? 'Provider configured' : 'Not configured',
      summary: ocrConfigured
        ? 'A parser can be wired later, with disclosure before any external processing.'
        : 'Receipt parsing is unavailable by default, and manual entry remains visible.',
      title: 'Receipt parsing',
    },
    {
      affectedDataCategories: [
        'workspace preferences',
        'categories and topics',
        'budget rules',
        'savings goals',
        'future records, drafts, receipt files, and diagnostics',
      ],
      currentBehavior:
        'Pplant is local-first. Data deletion workflows are planned for later privacy stories and are not run from this setup screen.',
      id: 'local_data',
      manualAlternative: 'Local-first use does not require an account, cloud sync, bank connection, or external finance integration.',
      status: 'local_only',
      statusLabel: 'Local-first',
      summary: 'Current setup data is local to this app workspace; broader deletion controls arrive in privacy/data-control stories.',
      title: 'Local data',
    },
  ];
}

export function findPrivacySettingArea(
  areas: PrivacySettingArea[],
  areaId: PrivacySettingAreaId | null,
): PrivacySettingArea | null {
  if (!areaId) {
    return null;
  }

  return areas.find((area) => area.id === areaId) ?? null;
}
