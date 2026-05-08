import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/ui/tokens/colors';
import { spacing } from '@/ui/tokens/spacing';

import { RecoveryPanel } from '../recovery/RecoveryPanel';
import { RecoveryHandoffProvider } from '../recovery/recovery-handoff';
import { ReminderForm } from './ReminderForm';

export function ReminderRouteScreen() {
  return (
    <RecoveryHandoffProvider>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <RecoveryPanel targetKinds={['reminder_occurrence']} />
          <ReminderForm />
        </ScrollView>
      </SafeAreaView>
    </RecoveryHandoffProvider>
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
