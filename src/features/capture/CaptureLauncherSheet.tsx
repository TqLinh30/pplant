import { BottomSheet } from '@/ui/primitives/BottomSheet';
import { ListRow } from '@/ui/primitives/ListRow';

export type CaptureAction = {
  id: string;
  title: string;
  description: string;
  onSelect: () => void;
};

type CaptureLauncherSheetProps = {
  actions: CaptureAction[];
  visible: boolean;
  onClose: () => void;
};

export function CaptureLauncherSheet({ actions, visible, onClose }: CaptureLauncherSheetProps) {
  return (
    <BottomSheet title="Capture" visible={visible} onClose={onClose}>
      {actions.map((action) => (
        <ListRow
          key={action.id}
          title={action.title}
          description={action.description}
          onPress={action.onSelect}
        />
      ))}
    </BottomSheet>
  );
}
