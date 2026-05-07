import { FeaturePlaceholderScreen } from '@/ui/components/FeaturePlaceholderScreen';

export function TodayScreen() {
  return (
    <FeaturePlaceholderScreen
      title="Today"
      eyebrow="Calm daily checkpoint"
      description="Money, tasks, reminders, savings, and work context will meet here as each feature lands."
      sections={[
        {
          title: 'Next foundation',
          description: 'Story 1.2 creates the single-user local workspace that future Today data will read from.',
        },
        {
          title: 'Capture stays close',
          description: 'The Capture tab is already reserved for fast expense, task, work, income, and reminder entry.',
        },
      ]}
    />
  );
}
