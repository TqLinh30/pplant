import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CategoryTopicItem, CategoryTopicKind } from '@/domain/categories/types';
import { BottomSheet } from '@/ui/primitives/BottomSheet';
import { Button } from '@/ui/primitives/Button';
import { IconButton } from '@/ui/primitives/IconButton';
import { ListRow } from '@/ui/primitives/ListRow';
import { SegmentedControl } from '@/ui/primitives/SegmentedControl';
import { StatusBanner } from '@/ui/primitives/StatusBanner';
import { TextField } from '@/ui/primitives/TextField';
import { colors } from '@/ui/tokens/colors';
import { spacing } from '@/ui/tokens/spacing';
import { typography } from '@/ui/tokens/typography';

import { useCategoryTopicSettings } from './useCategoryTopicSettings';
import { usePreferenceSettings } from './usePreferenceSettings';

const organizationOptions: { label: string; value: CategoryTopicKind }[] = [
  { label: 'Categories', value: 'category' },
  { label: 'Topics', value: 'topic' },
];

export function SettingsScreen() {
  const categoryTopics = useCategoryTopicSettings();
  const { reload, save, state, updateField } = usePreferenceSettings();

  if (state.status === 'loading') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View accessibilityLabel="Loading preferences" accessibilityRole="summary" style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.title}>Loading preferences</Text>
          <Text style={styles.description}>Pplant is opening your local settings.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (state.status === 'failed') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View
          accessibilityLabel="Preferences could not be loaded"
          accessibilityRole="summary"
          style={styles.centered}>
          <Text style={styles.eyebrow}>Preferences</Text>
          <Text style={styles.title}>Settings could not open.</Text>
          <Text style={styles.description}>
            Your preferences stay on this device. Try loading them again.
          </Text>
          <Button label="Retry" onPress={reload} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  const saving = state.status === 'saving';
  const organizationSaving = categoryTopics.state.status === 'saving';
  const selectedKindLabel = categoryTopics.state.selectedKind === 'category' ? 'category' : 'topic';
  const selectedKindLabelPlural = categoryTopics.state.selectedKind === 'category' ? 'categories' : 'topics';
  const deletion = categoryTopics.state.pendingDeletion;
  const replacementOptions = categoryTopics.replacementOptions;
  const selectedReplacement = replacementOptions.find(
    (item) => item.id === categoryTopics.state.reassignTargetId,
  );

  const renderOrganizationItem = (item: CategoryTopicItem, index: number) => {
    const editing = categoryTopics.state.editingId === item.id;
    const isFirst = index === 0;
    const isLast = index === categoryTopics.selectedItems.length - 1;

    return (
      <View key={item.id} style={styles.itemGroup}>
        <ListRow
          title={item.name}
          meta={`Order ${index + 1}`}
          onPress={() => categoryTopics.startEdit(item)}
          right={
            <View style={styles.rowActions}>
              <IconButton
                disabled={isFirst || organizationSaving}
                icon="^"
                label={`Move ${item.name} up`}
                onPress={() => categoryTopics.moveItem(item.id, 'up')}
              />
              <IconButton
                disabled={isLast || organizationSaving}
                icon="v"
                label={`Move ${item.name} down`}
                onPress={() => categoryTopics.moveItem(item.id, 'down')}
              />
              <IconButton
                disabled={organizationSaving}
                icon="x"
                label={`Remove ${item.name}`}
                onPress={() => categoryTopics.requestDelete(item)}
              />
            </View>
          }
        />

        {editing ? (
          <View style={styles.inlineForm}>
            <TextField
              autoCapitalize="sentences"
              errorText={categoryTopics.state.fieldError}
              helperText="Names are kept local and can be updated later."
              label={`Edit ${selectedKindLabel}`}
              onChangeText={categoryTopics.updateEditName}
              value={categoryTopics.state.editName}
            />
            <View style={styles.buttonRow}>
              <Button
                disabled={organizationSaving}
                label="Cancel"
                onPress={categoryTopics.cancelEdit}
                style={styles.buttonFlex}
                variant="secondary"
              />
              <Button
                disabled={organizationSaving}
                label="Save"
                onPress={categoryTopics.saveEdit}
                style={styles.buttonFlex}
              />
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Local workspace controls</Text>
          <Text style={styles.title}>Preferences</Text>
          <Text style={styles.description}>
            Set the local defaults Pplant uses for money, calendar grouping, and work-time context.
          </Text>
        </View>

        {!state.hasSavedPreferences ? (
          <StatusBanner
            title="Ready to set up"
            description="These defaults are editable and stay local until you save them."
          />
        ) : null}

        {state.status === 'saved' ? (
          <StatusBanner
            title="Preferences saved"
            description="Money, locale, reset-day, and wage defaults are ready for future records."
            tone="success"
          />
        ) : null}

        {state.saveError ? (
          <StatusBanner
            title="Preferences were not saved"
            description="Try saving again. Your current edits are still on screen."
            tone="warning"
          />
        ) : null}

        {Object.keys(state.fieldErrors).length > 0 ? (
          <StatusBanner
            title="Check highlighted fields"
            description="Each highlighted field includes the next correction to make."
            tone="warning"
          />
        ) : null}

        <View style={styles.form}>
          <TextField
            autoCapitalize="characters"
            autoCorrect={false}
            errorText={state.fieldErrors.currencyCode}
            helperText="Use a 3-letter code such as USD, TWD, JPY, or VND."
            label="Currency"
            onChangeText={(value) => updateField('currencyCode', value)}
            value={state.form.currencyCode}
          />
          <TextField
            autoCapitalize="none"
            autoCorrect={false}
            errorText={state.fieldErrors.locale}
            helperText="Use a locale tag such as en-US or vi-VN."
            label="Locale"
            onChangeText={(value) => updateField('locale', value)}
            value={state.form.locale}
          />
          <TextField
            errorText={state.fieldErrors.monthlyBudgetResetDay}
            helperText="Choose a day from 1 to 31. Short months use their last day."
            keyboardType="number-pad"
            label="Monthly reset day"
            onChangeText={(value) => updateField('monthlyBudgetResetDay', value)}
            value={state.form.monthlyBudgetResetDay}
          />
          <TextField
            errorText={state.fieldErrors.defaultHourlyWage}
            helperText="Stored as integer minor units so wage math stays exact."
            keyboardType="decimal-pad"
            label="Default hourly wage"
            onChangeText={(value) => updateField('defaultHourlyWage', value)}
            value={state.form.defaultHourlyWage}
          />
        </View>

        <Button
          accessibilityLabel="Save preferences"
          disabled={saving}
          label={saving ? 'Saving preferences' : 'Save preferences'}
          onPress={save}
        />

        <View style={styles.divider} />

        <View style={styles.section}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Record organization</Text>
            <Text style={styles.sectionTitle}>Categories and topics</Text>
            <Text style={styles.description}>
              Keep reusable labels for future money, work, task, and reflection records.
            </Text>
          </View>

          <SegmentedControl
            options={organizationOptions}
            selectedValue={categoryTopics.state.selectedKind}
            onChange={categoryTopics.selectKind}
          />

          {categoryTopics.state.status === 'loading' ? (
            <StatusBanner
              title="Loading organization"
              description="Pplant is opening your local categories and topics."
            />
          ) : null}

          {categoryTopics.state.status === 'failed' ? (
            <View style={styles.inlineForm}>
              <StatusBanner
                title="Organization could not load"
                description="Your local data is unchanged. Try loading it again."
                tone="warning"
              />
              <Button label="Retry organization" onPress={categoryTopics.reload} variant="secondary" />
            </View>
          ) : null}

          {categoryTopics.state.status === 'saved' ? (
            <StatusBanner
              title="Organization saved"
              description="Active categories and topics are ready for future records."
              tone="success"
            />
          ) : null}

          {categoryTopics.state.actionError ? (
            <StatusBanner
              title="Organization was not saved"
              description="Try the action again. Current items are still on screen."
              tone="warning"
            />
          ) : null}

          <View style={styles.inlineForm}>
            <TextField
              autoCapitalize="sentences"
              errorText={categoryTopics.state.editingId ? undefined : categoryTopics.state.fieldError}
              helperText={`Add a local ${selectedKindLabel} for future records.`}
              label={`New ${selectedKindLabel}`}
              onChangeText={categoryTopics.updateNewName}
              value={categoryTopics.state.newName}
            />
            <Button
              disabled={organizationSaving}
              label={organizationSaving ? 'Saving' : `Add ${selectedKindLabel}`}
              onPress={categoryTopics.createSelectedItem}
            />
          </View>

          {categoryTopics.selectedItems.length === 0 && categoryTopics.state.status !== 'loading' ? (
            <StatusBanner
              title={`No ${selectedKindLabelPlural} yet`}
              description={`Create a ${selectedKindLabel} above to make it available for future records.`}
            />
          ) : null}

          <View style={styles.listGroup}>
            {categoryTopics.selectedItems.map((item, index) => renderOrganizationItem(item, index))}
          </View>
        </View>
      </ScrollView>

      <BottomSheet
        title={deletion ? `Remove ${deletion.itemName}` : 'Remove item'}
        visible={Boolean(deletion)}
        onClose={categoryTopics.cancelDelete}>
        {deletion ? (
          <>
            <Text style={styles.description}>
              {deletion.usage.totalCount > 0
                ? `${deletion.itemName} is used by ${deletion.usage.totalCount} saved record${deletion.usage.totalCount === 1 ? '' : 's'}.`
                : `${deletion.itemName} is not used by saved records yet.`}
            </Text>
            <Text style={styles.description}>
              Keeping history hides it from new records while preserving past associations. Reassign moves existing usage to another active item before hiding it.
            </Text>

            {deletion.usage.totalCount > 0 && replacementOptions.length > 0 ? (
              <View style={styles.reassignList}>
                <Text style={styles.label}>Reassign target</Text>
                {replacementOptions.map((item) => (
                  <ListRow
                    key={item.id}
                    title={item.name}
                    meta={item.id === categoryTopics.state.reassignTargetId ? 'Selected' : 'Available'}
                    onPress={() => categoryTopics.updateReassignTarget(item.id)}
                  />
                ))}
              </View>
            ) : null}

            <View style={styles.buttonColumn}>
              <Button label="Cancel" onPress={categoryTopics.cancelDelete} variant="secondary" />
              <Button
                disabled={organizationSaving}
                label="Keep history"
                onPress={() => categoryTopics.finishDelete('archive')}
                variant="secondary"
              />
              {deletion.usage.totalCount > 0 && replacementOptions.length > 0 ? (
                <Button
                  disabled={organizationSaving || !selectedReplacement}
                  label="Reassign"
                  onPress={() => categoryTopics.finishDelete('reassign')}
                />
              ) : null}
            </View>
          </>
        ) : null}
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  buttonColumn: {
    gap: spacing.sm,
  },
  buttonFlex: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  centered: {
    alignItems: 'flex-start',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  description: {
    ...typography.body,
    color: colors.body,
  },
  divider: {
    backgroundColor: colors.hairline,
    height: StyleSheet.hairlineWidth,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.muted,
  },
  form: {
    gap: spacing.md,
  },
  header: {
    gap: spacing.sm,
  },
  inlineForm: {
    gap: spacing.sm,
  },
  itemGroup: {
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.ink,
  },
  listGroup: {
    gap: spacing.xs,
  },
  reassignList: {
    gap: spacing.xs,
  },
  rowActions: {
    flexDirection: 'row',
    flexShrink: 0,
    gap: spacing.xs,
  },
  safeArea: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.ink,
  },
  title: {
    ...typography.screenTitle,
    color: colors.ink,
  },
});
