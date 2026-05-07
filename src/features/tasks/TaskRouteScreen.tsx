import { useLocalSearchParams } from 'expo-router';

import { FeaturePlaceholderScreen } from '@/ui/components/FeaturePlaceholderScreen';

export function TaskRouteScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();

  return (
    <FeaturePlaceholderScreen
      title="Task"
      eyebrow="Daily planning"
      description="Task details will support To Do, Doing, Done, priority, deadlines, recurrence, and reminder recovery."
      sections={[
        {
          title: 'Task reference',
          description: taskId ? `Task: ${taskId}` : 'Task id is not available yet.',
        },
      ]}
    />
  );
}
