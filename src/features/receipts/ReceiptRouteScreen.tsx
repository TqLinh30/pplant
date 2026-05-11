import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AppError } from '@/domain/common/app-error';
import type { CaptureDraft } from '@/domain/capture-drafts/types';
import type { MoneyRecord } from '@/domain/money/types';
import {
  receiptReviewFieldDescriptors,
  validateReceiptReviewDraft,
  type ReceiptReviewDraft,
  type ReceiptReviewFieldErrors,
} from '@/domain/receipts/review';
import type { ReceiptDuplicateWarning, ReceiptDuplicateWarningActionId } from '@/domain/receipts/duplicates';
import type { ReceiptParseJob } from '@/domain/receipts/types';
import {
  isReceiptCaptureDraftPayload,
  parseReceiptCaptureDraftPayload,
  receiptDraftHasRetainedImage,
  type ReceiptImageRetentionPolicy,
  type ReceiptCaptureDraftPayload,
} from '@/features/capture-drafts/captureDraftPayloads';
import {
  discardCaptureDraft,
  keepCaptureDraft,
  listActiveCaptureDrafts,
} from '@/services/capture-drafts/capture-draft.service';
import {
  getLatestReceiptParseJobForDraft,
  runReceiptParseJob,
  startReceiptParseJob,
} from '@/services/receipt-parsing/receipt-parse-job.service';
import { loadReceiptDuplicateWarning } from '@/services/receipt-parsing/receipt-duplicate.service';
import { recordReceiptRecoveryFailure } from '@/services/receipt-parsing/receipt-recovery-diagnostics.service';
import {
  loadReceiptReviewData,
  saveCorrectedReceiptExpense,
  type ReceiptReviewData,
} from '@/services/receipt-parsing/receipt-review.service';
import {
  deleteReceiptDraftImage,
  setReceiptDraftRetentionPolicy,
} from '@/services/files/receipt-retention.service';
import { translateText } from '@/i18n/strings';
import { Button } from '@/ui/primitives/Button';
import { ListRow } from '@/ui/primitives/ListRow';
import { StatusBanner } from '@/ui/primitives/StatusBanner';
import { TextField } from '@/ui/primitives/TextField';
import { colors } from '@/ui/tokens/colors';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';

import { receiptParseNoticeFor, receiptProposalRows } from './receipt-parse-state';
import {
  receiptRecoveryStateFor,
  type ReceiptRecoveryActionId,
} from './receipt-recovery-actions';

type ReceiptDraftViewState =
  | { error: AppError; status: 'failed' }
  | { status: 'discarded' }
  | { status: 'loading' }
  | { status: 'missing' }
  | {
      draft: CaptureDraft;
      payload: ReceiptCaptureDraftPayload;
      parseJob: ReceiptParseJob | null;
      status: 'ready';
    };

function routeParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function goToManualExpense() {
  router.push(`/(tabs)/capture?draft=expense&draftSeq=${Date.now().toString(36)}`);
}

function isReviewableJob(job: ReceiptParseJob | null): boolean {
  return (
    job?.normalizedResult !== null &&
    job?.normalizedResult !== undefined &&
    (job.status === 'parsed' || job.status === 'low_confidence' || job.status === 'reviewed')
  );
}

function formatSize(sizeBytes: number | null): string {
  if (sizeBytes === null) {
    return translateText('Size unavailable');
  }

  if (sizeBytes < 1024) {
    return translateText(`${sizeBytes} bytes`);
  }

  return `${Math.round(sizeBytes / 1024)} KB`;
}

function formatRecordAmount(record: MoneyRecord): string {
  return `${(record.amountMinor / 100).toFixed(2)} ${record.currencyCode}`;
}

function formatRetention(payload: ReceiptCaptureDraftPayload): string {
  if (payload.receipt.retentionStatus === 'deleted') {
    return translateText(`Image deleted; expense details remain. ${payload.receipt.deletedAt ?? ''}`.trim());
  }

  switch (payload.receipt.retentionPolicy) {
    case 'delete_after_expense_saved':
      return translateText('Delete image after receipt expense is saved');
    case 'keep_until_saved_or_discarded':
      return translateText('Legacy policy: keep until saved or discarded');
    case 'keep_until_user_deletes':
      return translateText('Keep image until you delete it');
    default:
      payload.receipt.retentionPolicy satisfies never;
      return translateText('Keep image until you delete it');
  }
}

function categoryName(reviewData: ReceiptReviewData, categoryId: string | null): string {
  if (!categoryId) {
    return translateText('No category');
  }

  return reviewData.categories.find((category) => category.id === categoryId)?.name ?? categoryId;
}

export function ReceiptRouteScreen() {
  const { receiptDraftId } = useLocalSearchParams<{ receiptDraftId: string }>();
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<ReceiptDuplicateWarning | null>(null);
  const [duplicateWarningDismissed, setDuplicateWarningDismissed] = useState(false);
  const [parseActionRunning, setParseActionRunning] = useState(false);
  const [retentionActionRunning, setRetentionActionRunning] = useState(false);
  const [reviewActionRunning, setReviewActionRunning] = useState(false);
  const [reviewData, setReviewData] = useState<ReceiptReviewData | null>(null);
  const [reviewDraft, setReviewDraft] = useState<ReceiptReviewDraft | null>(null);
  const [reviewFieldErrors, setReviewFieldErrors] = useState<ReceiptReviewFieldErrors>({});
  const [savedRecord, setSavedRecord] = useState<MoneyRecord | null>(null);
  const [viewState, setViewState] = useState<ReceiptDraftViewState>({ status: 'loading' });
  const draftId = routeParam(receiptDraftId);

  const loadDraft = useCallback(() => {
    if (!draftId) {
      setViewState({ status: 'missing' });
      return;
    }

    setReviewData(null);
    setReviewDraft(null);
    setReviewFieldErrors({});
    setSavedRecord(null);
    setDuplicateWarning(null);
    setDuplicateWarningDismissed(false);
    setViewState({ status: 'loading' });
    void (async () => {
      const result = await listActiveCaptureDrafts();

      if (!result.ok) {
        setViewState({ error: result.error, status: 'failed' });
        return;
      }

      const draft = result.value.find((item) => item.id === draftId && item.kind === 'expense');

      if (!draft || !isReceiptCaptureDraftPayload(draft.payload)) {
        setViewState({ status: 'missing' });
        return;
      }

      const payload = parseReceiptCaptureDraftPayload(draft.payload);

      if (!payload.ok) {
        setViewState({ error: payload.error, status: 'failed' });
        return;
      }

      const latestJob = await getLatestReceiptParseJobForDraft({
        receiptDraftId: draft.id,
      });

      if (!latestJob.ok) {
        setViewState({ error: latestJob.error, status: 'failed' });
        return;
      }

      if (isReviewableJob(latestJob.value)) {
        const review = await loadReceiptReviewData({
          receiptDraftId: draft.id,
        });

        if (review.ok) {
          setReviewData(review.value);
          setReviewDraft(review.value.reviewDraft);
        } else {
          setActionMessage('Receipt review could not load. Manual expense remains available.');
        }
      }

      if (latestJob.value?.normalizedResult) {
        const warning = await loadReceiptDuplicateWarning({
          result: latestJob.value.normalizedResult,
        });

        if (warning.ok) {
          setDuplicateWarning(warning.value);
        }
      }

      setViewState({
        draft,
        parseJob: latestJob.value,
        payload: payload.value,
        status: 'ready',
      });
    })();
  }, [draftId]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  const recordRecoveryFailure = (actionId: ReceiptRecoveryActionId, error: AppError) => {
    void recordReceiptRecoveryFailure({
      actionId,
      error,
      parseJob: viewState.status === 'ready' ? viewState.parseJob : null,
    });
  };

  const discardDraft = () => {
    if (viewState.status !== 'ready') {
      return;
    }

    void discardCaptureDraft({ id: viewState.draft.id }).then((result) => {
      if (!result.ok) {
        recordRecoveryFailure('discard_draft', result.error);
        setViewState({ error: result.error, status: 'failed' });
        return;
      }

      setActionMessage('Receipt draft discarded. No expense was created.');
      setViewState({ status: 'discarded' });
    });
  };

  const keepDraft = () => {
    if (viewState.status !== 'ready') {
      return;
    }

    void keepCaptureDraft({ id: viewState.draft.id }).then((result) => {
      if (!result.ok) {
        recordRecoveryFailure('keep_draft', result.error);
        setViewState({ error: result.error, status: 'failed' });
        return;
      }

      setActionMessage('Receipt draft kept for later.');
      loadDraft();
    });
  };

  const updateParseJob = (parseJob: ReceiptParseJob) => {
    setViewState((current) => {
      if (current.status !== 'ready') {
        return current;
      }

      return {
        ...current,
        parseJob,
      };
    });
  };

  const runExistingParseJob = (
    parseJob: ReceiptParseJob,
    userInitiated = false,
    recoveryActionId: ReceiptRecoveryActionId = 'retry_parsing',
  ) => {
    setParseActionRunning(true);
    setActionMessage(userInitiated ? 'Manual parse retry started.' : 'Receipt parsing started.');

    void runReceiptParseJob({
      jobId: parseJob.id,
      userInitiated,
    }).then((result) => {
      setParseActionRunning(false);

      if (!result.ok) {
        recordRecoveryFailure(recoveryActionId, result.error);
        setViewState({ error: result.error, status: 'failed' });
        return;
      }

      setActionMessage(
        result.value.status === 'parsed' || result.value.status === 'low_confidence'
          ? 'Receipt parsing finished. Review proposed fields before saving.'
          : 'Receipt parsing state updated. Manual expense remains available.',
      );

      if (result.value.status === 'parsed' || result.value.status === 'low_confidence') {
        loadDraft();
        return;
      }

      updateParseJob(result.value);
    });
  };

  const startParsing = () => {
    if (viewState.status !== 'ready' || parseActionRunning) {
      return;
    }

    setParseActionRunning(true);
    setActionMessage('Receipt parsing queued. You can still enter the expense manually.');

    void startReceiptParseJob({
      receiptDraftId: viewState.draft.id,
    }).then((result) => {
      setParseActionRunning(false);

      if (!result.ok) {
        recordRecoveryFailure('start_parsing', result.error);
        setViewState({ error: result.error, status: 'failed' });
        return;
      }

      updateParseJob(result.value);
      runExistingParseJob(result.value, false, 'start_parsing');
    });
  };

  const retryParsing = () => {
    if (viewState.status !== 'ready' || !viewState.parseJob || parseActionRunning) {
      return;
    }

    runExistingParseJob(viewState.parseJob, viewState.parseJob.status === 'retry_exhausted', 'retry_parsing');
  };

  const handleRecoveryAction = (actionId: ReceiptRecoveryActionId) => {
    switch (actionId) {
      case 'start_parsing':
        startParsing();
        return;
      case 'retry_parsing':
        retryParsing();
        return;
      case 'edit_review':
        setActionMessage('Receipt Review Desk is ready. Edit the fields before saving.');
        return;
      case 'edit_draft':
      case 'manual_expense':
        goToManualExpense();
        return;
      case 'keep_draft':
        keepDraft();
        return;
      case 'discard_draft':
        discardDraft();
        return;
      default:
        actionId satisfies never;
    }
  };

  const handleDuplicateAction = (actionId: ReceiptDuplicateWarningActionId) => {
    switch (actionId) {
      case 'continue_review':
        setDuplicateWarningDismissed(true);
        setActionMessage('Duplicate warning kept as context. Continue if this is a separate purchase.');
        return;
      case 'edit_fields':
        setActionMessage('Review the receipt fields below before saving.');
        return;
      case 'manual_expense':
        goToManualExpense();
        return;
      case 'discard_draft':
        discardDraft();
        return;
      default:
        actionId satisfies never;
    }
  };

  const updateRetentionPolicy = (retentionPolicy: ReceiptImageRetentionPolicy) => {
    if (viewState.status !== 'ready' || retentionActionRunning) {
      return;
    }

    setRetentionActionRunning(true);
    void setReceiptDraftRetentionPolicy({
      draftId: viewState.draft.id,
      retentionPolicy,
    }).then((result) => {
      setRetentionActionRunning(false);

      if (!result.ok) {
        setActionMessage(result.error.message);
        return;
      }

      const payload = parseReceiptCaptureDraftPayload(result.value.payload);

      if (!payload.ok) {
        setActionMessage(payload.error.message);
        return;
      }

      setViewState((current) =>
        current.status === 'ready'
          ? {
              ...current,
              draft: result.value,
              payload: payload.value,
            }
          : current,
      );
      setActionMessage(
        retentionPolicy === 'delete_after_expense_saved'
          ? 'Receipt image will be deleted after this expense is saved.'
          : 'Receipt image will be kept until you delete it.',
      );
    });
  };

  const deleteRetainedImage = (reason: 'saved_policy' | 'user_deleted' = 'user_deleted') => {
    if (viewState.status !== 'ready' || retentionActionRunning) {
      return;
    }

    setRetentionActionRunning(true);
    void deleteReceiptDraftImage({
      deletionReason: reason,
      draftId: viewState.draft.id,
    }).then((result) => {
      setRetentionActionRunning(false);

      if (!result.ok) {
        setActionMessage(result.error.message);
        return;
      }

      const payload = parseReceiptCaptureDraftPayload(result.value.draft.payload);

      if (payload.ok) {
        setViewState((current) =>
          current.status === 'ready'
            ? {
                ...current,
                draft: result.value.draft,
                payload: payload.value,
              }
            : current,
        );
      }

      setActionMessage(
        result.value.deleted
          ? 'Receipt image deleted. The expense record and receipt review context remain.'
          : 'No retained receipt image needed deletion.',
      );
    });
  };

  const updateReviewDraft = (patch: Partial<ReceiptReviewDraft>) => {
    setReviewFieldErrors({});
    setReviewDraft((current) => (current ? { ...current, ...patch } : current));
  };

  const updateLineItem = (
    lineItemId: string,
    patch: Partial<ReceiptReviewDraft['lineItems'][number]>,
  ) => {
    setReviewFieldErrors({});
    setReviewDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        lineItems: current.lineItems.map((lineItem) =>
          lineItem.id === lineItemId ? { ...lineItem, ...patch } : lineItem,
        ),
      };
    });
  };

  const toggleTopic = (topicId: string) => {
    if (!reviewDraft) {
      return;
    }

    updateReviewDraft({
      topicIds: reviewDraft.topicIds.includes(topicId)
        ? reviewDraft.topicIds.filter((selectedId) => selectedId !== topicId)
        : [...reviewDraft.topicIds, topicId],
    });
  };

  const saveReview = () => {
    if (
      viewState.status !== 'ready' ||
      !reviewData ||
      !reviewDraft ||
      !reviewData.parseJob.normalizedResult ||
      reviewActionRunning
    ) {
      return;
    }

    const localValidation = validateReceiptReviewDraft(
      reviewDraft,
      reviewData.preferences,
      reviewData.parseJob.normalizedResult,
    );

    if (!localValidation.ok) {
      setReviewFieldErrors(localValidation.fieldErrors ?? {});
      setActionMessage('Check the highlighted receipt fields before saving.');
      return;
    }

    setReviewActionRunning(true);
    setActionMessage('Saving reviewed receipt expense.');

    void saveCorrectedReceiptExpense({
      parseJobId: reviewData.parseJob.id,
      receiptDraftId: viewState.draft.id,
      reviewDraft,
    }).then(async (result) => {
      setReviewActionRunning(false);

      if (!result.ok) {
        setReviewFieldErrors(result.fieldErrors ?? {});
        setActionMessage(result.error.message);
        return;
      }

      setReviewData({
        ...reviewData,
        draft: result.value.draft,
        parseJob: result.value.parseJob,
      });
      setSavedRecord(result.value.record);
      setViewState((current) =>
        current.status === 'ready'
          ? { ...current, draft: result.value.draft, parseJob: result.value.parseJob }
          : current,
      );
      const savedMessage = `${formatRecordAmount(result.value.record)} receipt expense saved. Parsed data stayed as review context.`;

      if (
        viewState.payload.receipt.retentionPolicy === 'delete_after_expense_saved' &&
        receiptDraftHasRetainedImage(viewState.payload)
      ) {
        const deletion = await deleteReceiptDraftImage({
          deletionReason: 'saved_policy',
          draftId: result.value.draft.id,
        });

        if (deletion.ok) {
          const payload = parseReceiptCaptureDraftPayload(deletion.value.draft.payload);

          if (payload.ok) {
            setViewState((current) =>
              current.status === 'ready'
                ? {
                    ...current,
                    draft: deletion.value.draft,
                    payload: payload.value,
                  }
                : current,
            );
          }

          setActionMessage(`${savedMessage} Receipt image deleted by your retention choice.`);
          return;
        }

        setActionMessage(`${savedMessage} Receipt image stayed retained; you can delete it later.`);
        return;
      }

      setActionMessage(savedMessage);
    });
  };

  const parseNotice = viewState.status === 'ready' ? receiptParseNoticeFor(viewState.parseJob) : null;
  const proposalRows =
    viewState.status === 'ready' && viewState.parseJob?.normalizedResult
      ? receiptProposalRows(viewState.parseJob.normalizedResult)
      : [];
  const reviewDescriptors =
    reviewData && reviewDraft && reviewData.parseJob.normalizedResult
      ? receiptReviewFieldDescriptors(reviewData.parseJob.normalizedResult, reviewDraft, {
          locale: reviewData.preferences.locale,
        })
      : [];
  const recoveryState =
    viewState.status === 'ready' && !savedRecord
      ? receiptRecoveryStateFor({
          parseActionRunning,
          parseJob: viewState.parseJob,
          reviewAvailable: Boolean(reviewData && reviewDraft && reviewData.parseJob.normalizedResult),
        })
      : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{translateText('Receipt draft')}</Text>
          <Text style={styles.title}>{translateText('Review saved receipt')}</Text>
          <Text style={styles.description}>
            {translateText(
              'This receipt photo is still a draft. Save a final expense only after manual review in later receipt steps.',
            )}
          </Text>
        </View>

        {viewState.status === 'loading' ? (
          <View
            accessibilityLabel={translateText('Loading receipt draft')}
            accessibilityRole="summary"
            style={styles.inlineLoading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.helper}>{translateText('Loading receipt draft.')}</Text>
          </View>
        ) : null}

        {viewState.status === 'failed' ? (
          <StatusBanner
            title="Receipt draft could not open"
            description="Try again from Today or Capture. Manual expense entry is still available."
            tone="warning"
          />
        ) : null}

        {viewState.status === 'missing' ? (
          <StatusBanner
            title="Receipt draft is not active"
            description="It may already be saved or discarded. Manual expense entry is still available."
            tone="warning"
          />
        ) : null}

        {viewState.status === 'discarded' ? (
          <StatusBanner
            title="Draft discarded"
            description={actionMessage ?? 'Receipt draft discarded. No expense was created.'}
          />
        ) : null}

        {viewState.status === 'ready' ? (
          <>
            <StatusBanner
              title="Receipt photo saved privately"
              description="The image reference is stored in the local expense draft. Parsing is optional and no expense is saved automatically."
            />
            {savedRecord ? (
              <StatusBanner
                title="Receipt expense saved"
                description={`${formatRecordAmount(savedRecord)} saved from reviewed receipt fields. The receipt draft is hidden from active drafts.`}
              />
            ) : null}
            {parseNotice ? (
              <StatusBanner
                title={parseNotice.title}
                description={parseNotice.description}
                tone={parseNotice.tone}
              />
            ) : null}
            <View style={styles.metadata}>
              <Text style={styles.label}>{translateText('Captured')}</Text>
              <Text style={styles.value}>{viewState.payload.receipt.capturedAt}</Text>
              <Text style={styles.label}>{translateText('Source')}</Text>
              <Text style={styles.value}>{viewState.payload.receipt.source}</Text>
              <Text style={styles.label}>{translateText('File')}</Text>
              <Text style={styles.value}>
                {viewState.payload.receipt.originalFileName ?? translateText('Receipt image')}
              </Text>
              <Text style={styles.label}>{translateText('Stored size')}</Text>
              <Text style={styles.value}>{formatSize(viewState.payload.receipt.sizeBytes)}</Text>
              <Text style={styles.label}>{translateText('Retention')}</Text>
              <Text style={styles.value}>{formatRetention(viewState.payload)}</Text>
            </View>
            <View
              style={styles.retentionPanel}
              accessibilityLabel={translateText('Receipt image retention controls')}
              accessibilityRole="summary">
              <Text style={styles.sectionTitle}>{translateText('Receipt image retention')}</Text>
              <Text style={styles.helper}>
                {translateText(
                  'Receipt images stay in app-private storage. Deleting the image keeps the expense record.',
                )}
              </Text>
              {viewState.payload.receipt.retentionStatus === 'retained' ? (
                <View style={styles.actions}>
                  <Button
                    disabled={retentionActionRunning}
                    label="Keep image"
                    onPress={() => updateRetentionPolicy('keep_until_user_deletes')}
                    variant="secondary"
                  />
                  <Button
                    disabled={retentionActionRunning}
                    label="Delete after save"
                    onPress={() => updateRetentionPolicy('delete_after_expense_saved')}
                    variant="secondary"
                  />
                  <Button
                    disabled={retentionActionRunning}
                    label="Delete image, keep expense"
                    onPress={() => deleteRetainedImage('user_deleted')}
                    variant="danger"
                  />
                </View>
              ) : (
                <StatusBanner
                  title="Receipt image deleted"
                  description="The image file reference was removed. Saved expense details remain available."
                />
              )}
            </View>
            {proposalRows.length > 0 ? (
              <View style={styles.proposals} accessibilityRole="summary">
                <Text style={styles.sectionTitle}>{translateText('Proposed fields')}</Text>
                {proposalRows.map((row) => (
                  <View key={row.label} style={styles.proposalRow}>
                    <Text style={styles.label}>{translateText(row.label)}</Text>
                    <Text style={styles.value}>{translateText(row.value)}</Text>
                    <Text style={styles.helper}>{translateText(row.confidenceLabel)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {recoveryState ? (
              <View
                style={styles.recoveryPanel}
                accessibilityLabel={translateText('Receipt recovery actions')}
                accessibilityRole="summary">
                <Text style={styles.sectionTitle}>{translateText(recoveryState.title)}</Text>
                <Text style={styles.helper}>{translateText(recoveryState.description)}</Text>
                <Text style={styles.helper}>
                  {translateText('State')}: {translateText(recoveryState.statusLabel)}
                </Text>
                {recoveryState.recommendedActionId ? (
                  <Text style={styles.helper}>
                    {translateText('Next action')}:{' '}
                    {translateText(
                      recoveryState.actions.find((action) => action.id === recoveryState.recommendedActionId)
                        ?.label ?? '',
                    )}
                  </Text>
                ) : null}
                <View style={styles.actions}>
                  {recoveryState.actions.map((action) => (
                    <View key={action.id} style={styles.recoveryAction}>
                      <Button
                        label={action.label}
                        onPress={() => handleRecoveryAction(action.id)}
                        disabled={action.disabled}
                        variant={action.variant}
                      />
                      <Text style={styles.helper}>{translateText(action.description)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
            {duplicateWarning && !duplicateWarningDismissed && !savedRecord ? (
              <View
                style={styles.duplicatePanel}
                accessibilityLabel={translateText('Possible duplicate receipt')}
                accessibilityRole="summary">
                <Text style={styles.sectionTitle}>{translateText(duplicateWarning.title)}</Text>
                <Text style={styles.helper}>{translateText(duplicateWarning.description)}</Text>
                {duplicateWarning.parserFlagged ? (
                  <Text style={styles.helper}>{translateText('Parser signal: possible duplicate.')}</Text>
                ) : null}
                {duplicateWarning.matches.map((match) => (
                  <Text key={match.id} style={styles.helper}>
                    {translateText('Similar expense')}: {match.merchantOrSource ?? translateText('Unnamed')}{' '}
                    {translateText('on')} {match.localDate}, {(match.amountMinor / 100).toFixed(2)}{' '}
                    {match.currencyCode}. {match.reasonLabels.map(translateText).join(', ')}.
                  </Text>
                ))}
                <View style={styles.actions}>
                  {duplicateWarning.actions.map((action) => (
                    <View key={action.id} style={styles.recoveryAction}>
                      <Button
                        label={action.label}
                        onPress={() => handleDuplicateAction(action.id)}
                        variant={action.variant}
                      />
                      <Text style={styles.helper}>{translateText(action.description)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
            {reviewData && reviewDraft && reviewData.parseJob.normalizedResult && !savedRecord ? (
              <View
                style={styles.reviewDesk}
                accessibilityLabel={translateText('Receipt Review Desk')}
                accessibilityRole="summary">
                <Text style={styles.sectionTitle}>{translateText('Receipt Review Desk')}</Text>
                <Text style={styles.helper}>{translateText('Review proposed fields before saving.')}</Text>
                <View style={styles.reviewSummary}>
                  {reviewDescriptors.map((descriptor) => (
                    <View key={descriptor.label} style={styles.reviewSummaryRow}>
                      <Text style={styles.label}>{translateText(descriptor.label)}</Text>
                      <Text style={styles.value}>{descriptor.value}</Text>
                      <Text style={styles.helper}>{translateText(descriptor.sourceLabel)}</Text>
                    </View>
                  ))}
                </View>
                <TextField
                  label="Merchant"
                  value={reviewDraft.merchant}
                  onChangeText={(merchant) => updateReviewDraft({ merchant })}
                  helperText="Text label: parsed, unknown, or corrected."
                  errorText={reviewFieldErrors.merchant}
                />
                <TextField
                  label="Date"
                  value={reviewDraft.localDate}
                  onChangeText={(localDate) => updateReviewDraft({ localDate })}
                  placeholder="YYYY-MM-DD"
                  helperText="Use a local date like 2026-05-08."
                  errorText={reviewFieldErrors.localDate}
                />
                <TextField
                  label={`Total (${reviewDraft.currency})`}
                  value={reviewDraft.totalAmount}
                  onChangeText={(totalAmount) => updateReviewDraft({ totalAmount })}
                  keyboardType="decimal-pad"
                  helperText="Stored as minor units after validation."
                  errorText={reviewFieldErrors.totalAmount}
                />
                <TextField
                  label="Note"
                  value={reviewDraft.note}
                  onChangeText={(note) => updateReviewDraft({ note })}
                  multiline
                  helperText="Optional."
                  errorText={reviewFieldErrors.note}
                />
                <View style={styles.optionGroup}>
                  <Text style={styles.label}>{translateText('Category')}</Text>
                  <ListRow
                    title="No category"
                    meta={reviewDraft.categoryId === null ? 'Selected' : 'Available'}
                    onPress={() => updateReviewDraft({ categoryId: null })}
                  />
                  {reviewData.categories.map((category) => (
                    <ListRow
                      key={category.id}
                      title={category.name}
                      meta={reviewDraft.categoryId === category.id ? 'Selected' : 'Available'}
                      onPress={() => updateReviewDraft({ categoryId: category.id })}
                    />
                  ))}
                  {reviewFieldErrors.categoryId ? (
                    <Text style={styles.error}>{translateText(reviewFieldErrors.categoryId)}</Text>
                  ) : null}
                  <Text style={styles.helper}>
                    {translateText('Selected')}: {categoryName(reviewData, reviewDraft.categoryId)}
                  </Text>
                </View>
                <View style={styles.optionGroup}>
                  <Text style={styles.label}>{translateText('Topics')}</Text>
                  {reviewData.topics.length === 0 ? (
                    <Text style={styles.helper}>
                      {translateText('Topics are optional. Add them later in Settings.')}
                    </Text>
                  ) : null}
                  {reviewData.topics.map((topic) => (
                    <ListRow
                      key={topic.id}
                      title={topic.name}
                      meta={reviewDraft.topicIds.includes(topic.id) ? 'Selected' : 'Available'}
                      onPress={() => toggleTopic(topic.id)}
                    />
                  ))}
                  {reviewFieldErrors.topicIds ? (
                    <Text style={styles.error}>{translateText(reviewFieldErrors.topicIds)}</Text>
                  ) : null}
                </View>
                <View style={styles.optionGroup}>
                  <Text style={styles.label}>{translateText('Line items')}</Text>
                  <Button
                    label={reviewDraft.ignoreLineItems ? 'Review line items' : 'Ignore line items'}
                    onPress={() => updateReviewDraft({ ignoreLineItems: !reviewDraft.ignoreLineItems })}
                    variant="secondary"
                  />
                  {reviewDraft.ignoreLineItems ? (
                    <Text style={styles.helper}>{translateText('Line items ignored; saving total only.')}</Text>
                  ) : null}
                  {!reviewDraft.ignoreLineItems
                    ? reviewDraft.lineItems.map((lineItem, index) => (
                        <View key={lineItem.id} style={styles.lineItem}>
                          <Text style={styles.helper}>
                            {translateText(`Line item ${index + 1}`)}:{' '}
                            {translateText(lineItem.ignored ? 'Ignored by you' : 'Review optional')}
                          </Text>
                          <TextField
                            label={`Item ${index + 1}`}
                            value={lineItem.label}
                            onChangeText={(label) => updateLineItem(lineItem.id, { label })}
                            editable={!lineItem.ignored}
                          />
                          <TextField
                            label={`Item ${index + 1} amount`}
                            value={lineItem.amount}
                            onChangeText={(amount) => updateLineItem(lineItem.id, { amount })}
                            editable={!lineItem.ignored}
                            keyboardType="decimal-pad"
                          />
                          <Button
                            label={lineItem.ignored ? 'Restore item' : 'Ignore item'}
                            onPress={() => updateLineItem(lineItem.id, { ignored: !lineItem.ignored })}
                            variant="secondary"
                          />
                        </View>
                      ))
                    : null}
                  {reviewFieldErrors.lineItems ? (
                    <Text style={styles.error}>{translateText(reviewFieldErrors.lineItems)}</Text>
                  ) : null}
                </View>
                <Button
                  label={reviewDraft.ignoreLineItems ? 'Save total-only expense' : 'Save corrected receipt'}
                  onPress={saveReview}
                  disabled={reviewActionRunning}
                />
              </View>
            ) : null}
            {actionMessage ? <StatusBanner title="Draft updated" description={actionMessage} /> : null}
            <View style={styles.actions}>
              {savedRecord ? (
                <Button label="Back to capture" onPress={() => router.push('/(tabs)/capture')} variant="secondary" />
              ) : null}
            </View>
          </>
        ) : null}

        {viewState.status === 'failed' || viewState.status === 'missing' || viewState.status === 'discarded' ? (
          <View style={styles.actions}>
            <Button label="Manual expense" onPress={goToManualExpense} />
            <Button label="Back to capture" onPress={() => router.push('/(tabs)/capture')} variant="secondary" />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  description: {
    ...typography.body,
    color: colors.body,
  },
  duplicatePanel: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.hairline,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    padding: spacing.md,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.muted,
    textTransform: 'uppercase',
  },
  header: {
    gap: spacing.sm,
  },
  helper: {
    ...typography.caption,
    color: colors.muted,
  },
  inlineLoading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.muted,
  },
  lineItem: {
    borderColor: colors.hairline,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  metadata: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.hairline,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    padding: spacing.md,
  },
  proposalRow: {
    gap: spacing.xs,
  },
  proposals: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.hairline,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    padding: spacing.md,
  },
  optionGroup: {
    gap: spacing.sm,
  },
  error: {
    ...typography.caption,
    color: colors.signatureCoral,
  },
  reviewDesk: {
    backgroundColor: colors.canvas,
    borderColor: colors.hairline,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    padding: spacing.md,
  },
  reviewSummary: {
    gap: spacing.sm,
  },
  reviewSummaryRow: {
    borderColor: colors.hairline,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  recoveryAction: {
    gap: spacing.xs,
  },
  recoveryPanel: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.hairline,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    padding: spacing.md,
  },
  retentionPanel: {
    backgroundColor: colors.canvas,
    borderColor: colors.hairline,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    padding: spacing.md,
  },
  safeArea: {
    backgroundColor: colors.appBackground,
    flex: 1,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.ink,
  },
  title: {
    ...typography.screenTitle,
    color: colors.ink,
  },
  value: {
    ...typography.body,
    color: colors.ink,
  },
});
