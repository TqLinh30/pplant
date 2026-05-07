import { useLocalSearchParams } from 'expo-router';

import { FeaturePlaceholderScreen } from '@/ui/components/FeaturePlaceholderScreen';

export function MoneyRouteScreen() {
  const { moneyRecordId } = useLocalSearchParams<{ moneyRecordId: string }>();

  return (
    <FeaturePlaceholderScreen
      title="Money record"
      eyebrow="Local-first record"
      description="Money records will store integer minor units, currency codes, source labels, and student context."
      sections={[
        {
          title: 'Record reference',
          description: moneyRecordId ? `Money record: ${moneyRecordId}` : 'Money record id is not available yet.',
        },
      ]}
    />
  );
}
