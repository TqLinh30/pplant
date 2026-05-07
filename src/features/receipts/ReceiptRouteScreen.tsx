import { useLocalSearchParams } from 'expo-router';

import { FeaturePlaceholderScreen } from '@/ui/components/FeaturePlaceholderScreen';

export function ReceiptRouteScreen() {
  const { receiptDraftId } = useLocalSearchParams<{ receiptDraftId: string }>();

  return (
    <FeaturePlaceholderScreen
      title="Receipt draft"
      eyebrow="Trust-preserving correction"
      description="Receipt parsing will stay assistive here. Manual review creates the final expense."
      sections={[
        {
          title: 'Draft reference',
          description: receiptDraftId ? `Draft: ${receiptDraftId}` : 'Draft id is not available yet.',
        },
      ]}
    />
  );
}
