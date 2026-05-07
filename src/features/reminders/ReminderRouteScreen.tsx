import { useLocalSearchParams } from 'expo-router';

import { FeaturePlaceholderScreen } from '@/ui/components/FeaturePlaceholderScreen';

export function ReminderRouteScreen() {
  const { reminderId } = useLocalSearchParams<{ reminderId: string }>();

  return (
    <FeaturePlaceholderScreen
      title="Reminder"
      eyebrow="Recovery controls"
      description="Reminder details will expose snooze, reschedule, pause, disable, and recovery states without shaming copy."
      sections={[
        {
          title: 'Reminder reference',
          description: reminderId ? `Reminder: ${reminderId}` : 'Reminder id is not available yet.',
        },
      ]}
    />
  );
}
