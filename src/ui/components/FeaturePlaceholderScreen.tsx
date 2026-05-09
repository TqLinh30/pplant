import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { translateText } from '@/i18n/strings';
import { Chip } from '@/ui/primitives/Chip';
import { ListRow } from '@/ui/primitives/ListRow';
import { StatusBanner } from '@/ui/primitives/StatusBanner';
import { colors } from '@/ui/tokens/colors';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';

type PlaceholderSection = {
  title: string;
  description: string;
};

type FeaturePlaceholderScreenProps = {
  title: string;
  eyebrow: string;
  description: string;
  sections: PlaceholderSection[];
};

export function FeaturePlaceholderScreen({
  title,
  eyebrow,
  description,
  sections,
}: FeaturePlaceholderScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Chip label={eyebrow} />
          <Text style={styles.title}>{translateText(title)}</Text>
          <Text style={styles.description}>{translateText(description)}</Text>
        </View>

        <StatusBanner
          title="Foundation ready"
          description="This screen is intentionally light until its owning story adds local data and full behavior."
        />

        <View style={styles.list}>
          {sections.map((section) => (
            <ListRow key={section.title} title={section.title} description={section.description} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  description: {
    ...typography.body,
    color: colors.body,
  },
  header: {
    gap: spacing.sm,
  },
  list: {
    gap: spacing.xs,
  },
  safeArea: {
    backgroundColor: colors.appBackground,
    flex: 1,
  },
  title: {
    ...typography.screenTitle,
    color: colors.ink,
  },
});
