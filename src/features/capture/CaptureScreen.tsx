import { FeaturePlaceholderScreen } from '@/ui/components/FeaturePlaceholderScreen';

export function CaptureScreen() {
  return (
    <FeaturePlaceholderScreen
      title="Capture"
      eyebrow="Fast entry shell"
      description="This route is ready for the launcher that will start expense, receipt, task, work, income, and reminder flows."
      sections={[
        {
          title: 'Manual paths first',
          description: 'Future capture flows must keep manual entry available when camera, notification, or network services are unavailable.',
        },
        {
          title: 'Draft-safe by design',
          description: 'Risky transitions such as camera launch or app backgrounding should save recoverable local drafts.',
        },
      ]}
    />
  );
}
