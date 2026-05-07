import { FeaturePlaceholderScreen } from '@/ui/components/FeaturePlaceholderScreen';

export function SettingsScreen() {
  return (
    <FeaturePlaceholderScreen
      title="Settings"
      eyebrow="Local workspace controls"
      description="Currency, locale, categories, budgets, savings, privacy, notifications, and data controls will live here."
      sections={[
        {
          title: 'Privacy first',
          description: 'Receipt images, spending history, income, tasks, reminders, and reflections are treated as sensitive local data.',
        },
      ]}
    />
  );
}
