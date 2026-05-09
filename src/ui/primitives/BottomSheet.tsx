import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { translateText } from '@/i18n/strings';
import { colors } from '@/ui/tokens/colors';
import { radius } from '@/ui/tokens/radius';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';

type BottomSheetProps = {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function BottomSheet({ title, visible, onClose, children }: BottomSheetProps) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={translateText('Close sheet')}
        style={styles.scrim}
        onPress={onClose}
      />
      <View style={styles.sheet}>
        <Text style={styles.title}>{translateText(title)}</Text>
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: 'rgba(37, 48, 48, 0.28)',
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.ink,
  },
});
