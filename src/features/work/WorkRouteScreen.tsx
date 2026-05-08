import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/ui/tokens/colors';
import { spacing } from '@/ui/tokens/spacing';

import { WorkEntryForm } from './WorkEntryForm';

export function WorkRouteScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <WorkEntryForm />
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
    backgroundColor: colors.appBackground,
    flex: 1,
  },
});
