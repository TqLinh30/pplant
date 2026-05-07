import { View, StyleSheet } from 'react-native';

import { Button } from '@/ui/primitives/Button';
import { spacing } from '@/ui/tokens/spacing';

export type RecoveryAction = {
  label: string;
  onPress: () => void;
};

type RecoveryActionsProps = {
  actions: RecoveryAction[];
};

export function RecoveryActions({ actions }: RecoveryActionsProps) {
  return (
    <View style={styles.container}>
      {actions.map((action) => (
        <Button key={action.label} label={action.label} variant="secondary" onPress={action.onPress} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
});
