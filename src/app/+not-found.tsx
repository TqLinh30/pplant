import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { translateText } from '@/i18n/strings';
import { colors } from '@/ui/tokens/colors';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';

export default function NotFoundRoute() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{translateText('Screen unavailable')}</Text>
      <Text style={styles.body}>{translateText('This Pplant surface has not been connected yet.')}</Text>
      <Link href="/" style={styles.link}>
        {translateText('Return to Today')}
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    ...typography.body,
    color: colors.body,
    textAlign: 'center',
  },
  container: {
    alignItems: 'center',
    backgroundColor: colors.appBackground,
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  link: {
    ...typography.button,
    color: colors.link,
    minHeight: 44,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.screenTitle,
    color: colors.ink,
    textAlign: 'center',
  },
});
