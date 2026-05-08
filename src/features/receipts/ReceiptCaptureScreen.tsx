import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/ui/primitives/Button';
import { StatusBanner } from '@/ui/primitives/StatusBanner';
import { colors } from '@/ui/tokens/colors';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';

import {
  receiptCaptureErrorNotice,
  receiptCaptureNoticeForOutcome,
} from './receipt-capture';
import { useReceiptCapture } from './useReceiptCapture';

function goToManualExpense() {
  router.push(`/(tabs)/capture?quick=expense&quickSeq=${Date.now().toString(36)}`);
}

function goToReceiptDraft(draftId: string) {
  router.push(`/receipt/${encodeURIComponent(draftId)}`);
}

export function ReceiptCaptureScreen() {
  const capture = useReceiptCapture();
  const { state } = capture;
  const working = state.status === 'working';
  const notice = state.outcome ? receiptCaptureNoticeForOutcome(state.outcome) : null;
  const errorNotice = state.actionError ? receiptCaptureErrorNotice(state.actionError) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Receipt capture</Text>
          <Text style={styles.title}>Save a receipt draft</Text>
          <Text style={styles.description}>
            Take a photo or choose one from your library. Pplant saves the image locally as an expense draft.
          </Text>
        </View>

        <StatusBanner
          title="You stay in control"
          description="No expense is created and no receipt is sent to parsing until a later review step asks for confirmation."
        />

        {working ? (
          <View accessibilityLabel="Saving receipt draft" accessibilityRole="summary" style={styles.inlineLoading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.helper}>Opening receipt capture.</Text>
          </View>
        ) : null}

        {notice ? (
          <StatusBanner title={notice.title} description={notice.description} tone={notice.tone} />
        ) : null}

        {errorNotice ? (
          <StatusBanner title={errorNotice.title} description={errorNotice.description} tone={errorNotice.tone} />
        ) : null}

        <View style={styles.actions}>
          <Button disabled={working} label="Take photo" onPress={capture.takePhoto} />
          <Button disabled={working} label="Choose photo" onPress={capture.choosePhoto} variant="secondary" />
          <Button disabled={working} label="Manual expense" onPress={goToManualExpense} variant="secondary" />
        </View>

        {state.draft ? (
          <View style={styles.actions}>
            <Button
              label="Review receipt draft"
              onPress={() => goToReceiptDraft(state.draft?.id ?? '')}
              variant="secondary"
            />
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
  safeArea: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  title: {
    ...typography.screenTitle,
    color: colors.ink,
  },
});
