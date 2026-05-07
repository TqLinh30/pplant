import { FeaturePlaceholderScreen } from '@/ui/components/FeaturePlaceholderScreen';

export function HistoryScreen() {
  return (
    <FeaturePlaceholderScreen
      title="History"
      eyebrow="Reviewable records"
      description="Money, work, tasks, reminders, and reflections will become searchable and filterable here."
      sections={[
        {
          title: 'Student context',
          description: 'History filters should support category, topic, date, amount, merchant, source, and status as features arrive.',
        },
      ]}
    />
  );
}
