import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/ui/tokens/colors';
import { spacing } from '@/ui/tokens/spacing';

import { TaskForm } from './TaskForm';

export function TaskRouteScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TaskForm />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  safeArea: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
});
