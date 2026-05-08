import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { BottomSheet } from '@/ui/primitives/BottomSheet';
import { ListRow } from '@/ui/primitives/ListRow';
import { colors } from '@/ui/tokens/colors';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';

import {
  quickCaptureActions,
  routeForQuickCaptureAction,
  type QuickCaptureActionId,
} from './quick-capture';

type QuickCaptureLauncherProps = {
  onClose: () => void;
  visible: boolean;
};

export function QuickCaptureLauncher({ onClose, visible }: QuickCaptureLauncherProps) {
  const selectAction = (actionId: QuickCaptureActionId) => {
    onClose();
    router.push(routeForQuickCaptureAction(actionId, { sequence: String(Date.now()) }));
  };

  return (
    <BottomSheet title="Quick capture" visible={visible} onClose={onClose}>
      <Text style={styles.description}>Start one focused flow. Receipt capture saves a local draft first.</Text>
      <ScrollView contentContainerStyle={styles.actions} style={styles.actionScroller}>
        {quickCaptureActions.map((action) => (
          <ListRow
            key={action.id}
            accessibilityLabel={action.accessibilityLabel}
            title={action.title}
            description={action.description}
            meta="Start"
            onPress={() => selectAction(action.id)}
          />
        ))}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.xs,
  },
  actionScroller: {
    maxHeight: 420,
  },
  description: {
    ...typography.body,
    color: colors.body,
  },
});
