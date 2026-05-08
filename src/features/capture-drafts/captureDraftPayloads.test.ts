import {
  buildReceiptCaptureDraftPayload,
  isMoneyCaptureDraftMeaningful,
  isReceiptCaptureDraftPayload,
  isReminderCaptureDraftMeaningful,
  isTaskCaptureDraftMeaningful,
  isWorkCaptureDraftMeaningful,
  markReceiptImageDeleted,
  parseMoneyCaptureDraftPayload,
  parseReceiptCaptureDraftPayload,
  parseReminderCaptureDraftPayload,
  parseTaskCaptureDraftPayload,
  parseWorkCaptureDraftPayload,
  receiptDraftHasRetainedImage,
  toCaptureDraftPayload,
  updateReceiptRetentionPolicy,
} from './captureDraftPayloads';

describe('capture draft payload helpers', () => {
  it('detects meaningful and empty draft payloads', () => {
    const money = {
      amount: '',
      categoryId: null,
      kind: 'expense' as const,
      localDate: '2026-05-08',
      merchantOrSource: '',
      note: '',
      topicIds: [],
    };
    const task = {
      categoryId: null,
      deadlineLocalDate: '',
      notes: '',
      priority: 'high' as const,
      state: 'todo' as const,
      title: '',
      topicIds: [],
    };
    const reminder = {
      endsOnLocalDate: '',
      frequency: 'once' as const,
      notes: '',
      ownerKind: 'standalone' as const,
      reminderLocalTime: '09:00',
      skipLocalDate: '',
      startsOnLocalDate: '2026-05-08',
      taskId: null,
      taskRecurrenceRuleId: null,
      title: '',
    };
    const work = {
      breakMinutes: '0',
      categoryId: null,
      durationHours: '',
      endedAtLocalDate: '2026-05-08',
      endedAtLocalTime: '',
      entryMode: 'hours' as const,
      localDate: '2026-05-08',
      note: '',
      paid: true,
      startedAtLocalDate: '2026-05-08',
      startedAtLocalTime: '',
      topicIds: [],
      wageOverride: '',
    };

    expect(isMoneyCaptureDraftMeaningful(money, money)).toBe(false);
    expect(isMoneyCaptureDraftMeaningful({ ...money, amount: '12.50' }, money)).toBe(true);
    expect(isTaskCaptureDraftMeaningful(task, task)).toBe(false);
    expect(isTaskCaptureDraftMeaningful({ ...task, title: 'Essay' }, task)).toBe(true);
    expect(isReminderCaptureDraftMeaningful(reminder, reminder)).toBe(false);
    expect(isReminderCaptureDraftMeaningful({ ...reminder, reminderLocalTime: '14:30' }, reminder)).toBe(true);
    expect(isWorkCaptureDraftMeaningful(work, work)).toBe(false);
    expect(isWorkCaptureDraftMeaningful({ ...work, durationHours: '2' }, work)).toBe(true);
  });

  it('parses persisted payloads with safe defaults', () => {
    const moneyDefault = {
      amount: '',
      categoryId: null,
      kind: 'expense' as const,
      localDate: '2026-05-08',
      merchantOrSource: '',
      note: '',
      topicIds: [],
    };
    const taskDefault = {
      categoryId: null,
      deadlineLocalDate: '',
      notes: '',
      priority: 'high' as const,
      state: 'todo' as const,
      title: '',
      topicIds: [],
    };
    const reminderDefault = {
      endsOnLocalDate: '',
      frequency: 'once' as const,
      notes: '',
      ownerKind: 'standalone' as const,
      reminderLocalTime: '09:00',
      skipLocalDate: '',
      startsOnLocalDate: '2026-05-08',
      taskId: null,
      taskRecurrenceRuleId: null,
      title: '',
    };
    const workDefault = {
      breakMinutes: '0',
      categoryId: null,
      durationHours: '',
      endedAtLocalDate: '2026-05-08',
      endedAtLocalTime: '',
      entryMode: 'hours' as const,
      localDate: '2026-05-08',
      note: '',
      paid: true,
      startedAtLocalDate: '2026-05-08',
      startedAtLocalTime: '',
      topicIds: [],
      wageOverride: '',
    };

    expect(parseMoneyCaptureDraftPayload('income', { amount: '18' }, moneyDefault)).toMatchObject({
      amount: '18',
      kind: 'income',
      localDate: '2026-05-08',
    });
    expect(parseTaskCaptureDraftPayload({ priority: 'urgent', title: 'Essay' }, taskDefault)).toMatchObject({
      priority: 'high',
      title: 'Essay',
    });
    expect(parseReminderCaptureDraftPayload({ frequency: 'weekly', ownerKind: 'task' }, reminderDefault)).toMatchObject({
      frequency: 'weekly',
      ownerKind: 'task',
    });
    expect(parseWorkCaptureDraftPayload({ entryMode: 'shift', paid: false }, workDefault)).toMatchObject({
      entryMode: 'shift',
      paid: false,
    });
    expect(toCaptureDraftPayload({ topicIds: ['topic-1'] })).toEqual({ topicIds: ['topic-1'] });
  });

  it('builds and validates receipt expense draft payloads', () => {
    const payload = buildReceiptCaptureDraftPayload({
      capturedAt: '2026-05-08T10:00:00.000Z',
      contentType: 'image/jpeg',
      originalFileName: 'receipt.jpg',
      retainedImageUri: 'file:///app/documents/receipts/receipt-1.jpg',
      sizeBytes: 12345,
      source: 'camera',
    });
    const parsed = parseReceiptCaptureDraftPayload(toCaptureDraftPayload(payload));

    expect(payload.kind).toBe('expense');
    expect(payload.captureMode).toBe('receipt');
    expect(payload.receipt).toMatchObject({
      parsingState: 'draft',
      retentionAnchor: 'capture_draft',
      retentionPolicy: 'keep_until_user_deletes',
      retentionStatus: 'retained',
      storageScope: 'app_private_documents',
    });
    expect(isReceiptCaptureDraftPayload(payload)).toBe(true);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.receipt.retainedImageUri).toBe('file:///app/documents/receipts/receipt-1.jpg');
      expect(parsed.value.localDate).toBe('2026-05-08');
    }
  });

  it('parses legacy receipt retention payloads and marks image deletion metadata', () => {
    const legacyPayload = buildReceiptCaptureDraftPayload({
      capturedAt: '2026-05-08T10:00:00.000Z',
      retainedImageUri: 'file:///app/documents/receipts/receipt-1.jpg',
      source: 'camera',
    });
    delete (legacyPayload.receipt as Partial<typeof legacyPayload.receipt>).deletedAt;
    delete (legacyPayload.receipt as Partial<typeof legacyPayload.receipt>).deletionReason;
    delete (legacyPayload.receipt as Partial<typeof legacyPayload.receipt>).retentionStatus;
    legacyPayload.receipt.retentionPolicy = 'keep_until_saved_or_discarded';

    const parsed = parseReceiptCaptureDraftPayload(toCaptureDraftPayload(legacyPayload));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.value.receipt.retentionPolicy).toBe('keep_until_saved_or_discarded');
    expect(parsed.value.receipt.retentionStatus).toBe('retained');
    expect(receiptDraftHasRetainedImage(parsed.value)).toBe(true);

    const policyUpdated = updateReceiptRetentionPolicy(parsed.value, 'delete_after_expense_saved');
    const deleted = markReceiptImageDeleted(policyUpdated, {
      deletedAt: '2026-05-08T11:00:00.000Z',
      deletionReason: 'user_deleted',
    });

    expect(deleted.receipt.retentionPolicy).toBe('delete_after_expense_saved');
    expect(deleted.receipt.retentionStatus).toBe('deleted');
    expect(deleted.receipt.retainedImageUri).toBeNull();
    expect(deleted.receipt.sizeBytes).toBeNull();
    expect(receiptDraftHasRetainedImage(deleted)).toBe(false);
  });

  it('treats receipt expense draft payloads as meaningful even before amount entry', () => {
    const moneyDefault = {
      amount: '',
      categoryId: null,
      kind: 'expense' as const,
      localDate: '2026-05-08',
      merchantOrSource: '',
      note: '',
      topicIds: [],
    };
    const receipt = buildReceiptCaptureDraftPayload({
      capturedAt: '2026-05-08T10:00:00.000Z',
      retainedImageUri: 'file:///app/documents/receipts/receipt-1.jpg',
      source: 'library',
    });

    expect(isMoneyCaptureDraftMeaningful(receipt, moneyDefault)).toBe(true);
    expect(parseReceiptCaptureDraftPayload({ captureMode: 'receipt' }).ok).toBe(false);
  });

  it('hands receipt expense drafts to manual expense capture without requiring parsing', () => {
    const moneyDefault = {
      amount: '',
      categoryId: null,
      kind: 'expense' as const,
      localDate: '2026-05-08',
      merchantOrSource: '',
      note: '',
      topicIds: [],
    };
    const receipt = buildReceiptCaptureDraftPayload({
      capturedAt: '2026-05-09T10:00:00.000Z',
      localDate: '2026-05-09',
      retainedImageUri: 'file:///app/documents/receipts/receipt-1.jpg',
      source: 'camera',
    });

    expect(parseMoneyCaptureDraftPayload('expense', toCaptureDraftPayload(receipt), moneyDefault)).toEqual({
      amount: '',
      categoryId: null,
      kind: 'expense',
      localDate: '2026-05-09',
      merchantOrSource: '',
      note: '',
      topicIds: [],
    });
  });
});
