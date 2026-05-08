import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AppError } from '@/domain/common/app-error';
import type { CaptureDraft } from '@/domain/capture-drafts/types';
import type { ReceiptParseJob } from '@/domain/receipts/types';
import {
  isReceiptCaptureDraftPayload,
  parseReceiptCaptureDraftPayload,
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
import { Button } from '@/ui/primitives/Button';
import { StatusBanner } from '@/ui/primitives/StatusBanner';
import { colors } from '@/ui/tokens/colors';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';

import { receiptParseNoticeFor, receiptProposalRows } from './receipt-parse-state';

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

function formatSize(sizeBytes: number | null): string {
  if (sizeBytes === null) {
    return 'Size unavailable';
  }

  if (sizeBytes < 1024) {
    return `${sizeBytes} bytes`;
  }

  return `${Math.round(sizeBytes / 1024)} KB`;
}

export function ReceiptRouteScreen() {
  const { receiptDraftId } = useLocalSearchParams<{ receiptDraftId: string }>();
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [parseActionRunning, setParseActionRunning] = useState(false);
  const [viewState, setViewState] = useState<ReceiptDraftViewState>({ status: 'loading' });
  const draftId = routeParam(receiptDraftId);

  const loadDraft = useCallback(() => {
    if (!draftId) {
      setViewState({ status: 'missing' });
      return;
    }

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

  const discardDraft = () => {
    if (viewState.status !== 'ready') {
      return;
    }

    void discardCaptureDraft({ id: viewState.draft.id }).then((result) => {
      if (!result.ok) {
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

  const runExistingParseJob = (parseJob: ReceiptParseJob, userInitiated = false) => {
    setParseActionRunning(true);
    setActionMessage(userInitiated ? 'Manual parse retry started.' : 'Receipt parsing started.');

    void runReceiptParseJob({
      jobId: parseJob.id,
      userInitiated,
    }).then((result) => {
      setParseActionRunning(false);

      if (!result.ok) {
        setViewState({ error: result.error, status: 'failed' });
        return;
      }

      updateParseJob(result.value);
      setActionMessage(
        result.value.status === 'parsed' || result.value.status === 'low_confidence'
          ? 'Receipt parsing finished. Review proposed fields before saving.'
          : 'Receipt parsing state updated. Manual expense remains available.',
      );
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
        setViewState({ error: result.error, status: 'failed' });
        return;
      }

      updateParseJob(result.value);
      runExistingParseJob(result.value);
    });
  };

  const retryParsing = () => {
    if (viewState.status !== 'ready' || !viewState.parseJob || parseActionRunning) {
      return;
    }

    runExistingParseJob(viewState.parseJob, viewState.parseJob.status === 'retry_exhausted');
  };

  const parseNotice = viewState.status === 'ready' ? receiptParseNoticeFor(viewState.parseJob) : null;
  const proposalRows =
    viewState.status === 'ready' && viewState.parseJob?.normalizedResult
      ? receiptProposalRows(viewState.parseJob.normalizedResult)
      : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Receipt draft</Text>
          <Text style={styles.title}>Review saved receipt</Text>
          <Text style={styles.description}>
            This receipt photo is still a draft. Save a final expense only after manual review in later receipt steps.
          </Text>
        </View>

        {viewState.status === 'loading' ? (
          <View accessibilityLabel="Loading receipt draft" accessibilityRole="summary" style={styles.inlineLoading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.helper}>Loading receipt draft.</Text>
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
            {parseNotice ? (
              <StatusBanner
                title={parseNotice.title}
                description={parseNotice.description}
                tone={parseNotice.tone}
              />
            ) : null}
            <View style={styles.metadata}>
              <Text style={styles.label}>Captured</Text>
              <Text style={styles.value}>{viewState.payload.receipt.capturedAt}</Text>
              <Text style={styles.label}>Source</Text>
              <Text style={styles.value}>{viewState.payload.receipt.source}</Text>
              <Text style={styles.label}>File</Text>
              <Text style={styles.value}>{viewState.payload.receipt.originalFileName ?? 'Receipt image'}</Text>
              <Text style={styles.label}>Stored size</Text>
              <Text style={styles.value}>{formatSize(viewState.payload.receipt.sizeBytes)}</Text>
              <Text style={styles.label}>Retention</Text>
              <Text style={styles.value}>Keep until saved or discarded</Text>
            </View>
            {proposalRows.length > 0 ? (
              <View style={styles.proposals} accessibilityRole="summary">
                <Text style={styles.sectionTitle}>Proposed fields</Text>
                {proposalRows.map((row) => (
                  <View key={row.label} style={styles.proposalRow}>
                    <Text style={styles.label}>{row.label}</Text>
                    <Text style={styles.value}>{row.value}</Text>
                    <Text style={styles.helper}>{row.confidenceLabel}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {actionMessage ? <StatusBanner title="Draft updated" description={actionMessage} /> : null}
            <View style={styles.actions}>
              {parseNotice?.actionLabel ? (
                <Button
                  label={parseNotice.actionLabel}
                  onPress={viewState.parseJob ? retryParsing : startParsing}
                  disabled={parseActionRunning}
                />
              ) : null}
              <Button label="Manual expense" onPress={goToManualExpense} />
              <Button label="Keep draft" onPress={keepDraft} variant="secondary" />
              <Button label="Discard draft" onPress={discardDraft} variant="danger" />
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
  safeArea: {
    backgroundColor: colors.canvas,
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
