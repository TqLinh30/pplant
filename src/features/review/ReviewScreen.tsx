import { FeaturePlaceholderScreen } from '@/ui/components/FeaturePlaceholderScreen';

export function ReviewScreen() {
  return (
    <FeaturePlaceholderScreen
      title="Review"
      eyebrow="Reflection only"
      description="Weekly and monthly summaries will show relationships without advice, prediction, or blame."
      sections={[
        {
          title: 'Neutral prompts',
          description: 'Reflection prompts should stay optional, short, and non-shaming.',
        },
      ]}
    />
  );
}
