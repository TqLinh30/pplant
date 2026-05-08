import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { calculateSavingsGoalProgress } from '@/domain/budgets/schemas';
import type { SavingsGoal } from '@/domain/budgets/types';
import type { CategoryTopicItem, CategoryTopicKind } from '@/domain/categories/types';
import { formatMinorUnitsForInput } from '@/domain/common/money';
import type { PrivacySettingArea } from '@/domain/privacy/privacy-settings';
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

import { useBudgetPlanningSettings } from './useBudgetPlanningSettings';
import { useCategoryTopicSettings } from './useCategoryTopicSettings';
import { usePreferenceSettings } from './usePreferenceSettings';
import { usePrivacySettings } from './usePrivacySettings';

const organizationOptions: { label: string; value: CategoryTopicKind }[] = [
  { label: 'Categories', value: 'category' },
  { label: 'Topics', value: 'topic' },
];

export function SettingsScreen() {
  const { reload, save, state, updateField } = usePreferenceSettings();
  const categoryTopics = useCategoryTopicSettings({
    enabled: state.status !== 'failed' && state.status !== 'loading',
  });
  const budgetPlanning = useBudgetPlanningSettings({
    enabled: state.hasSavedPreferences,
  });
  const privacySettings = usePrivacySettings();

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
            {state.loadError?.message ?? 'Your preferences stay on this device. Try loading them again.'}
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
  const budgetSaving = budgetPlanning.state.status === 'saving';
  const budgetPreferences = budgetPlanning.state.preferences;
  const selectedPrivacyArea = privacySettings.selectedArea;
  const dataDeletion = privacySettings.state.dataDeletion;
  const dataDeletionWorking = dataDeletion.status === 'previewing' || dataDeletion.status === 'executing';
  const dataDeletionCounts = dataDeletion.result
    ? Object.entries(dataDeletion.result.counts).filter(([, count]) => count > 0)
    : [];

  const formatBudgetAmount = (amountMinor: number) => {
    if (!budgetPreferences) {
      return `${amountMinor}`;
    }

    const formatted = formatMinorUnitsForInput(amountMinor, budgetPreferences.currencyCode, {
      locale: budgetPreferences.locale,
    });

    return `${formatted.ok ? formatted.value : amountMinor} ${budgetPreferences.currencyCode}`;
  };

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

  const renderSavingsGoal = (goal: SavingsGoal) => {
    const editing = budgetPlanning.state.editingGoalId === goal.id;
    const progress = calculateSavingsGoalProgress({
      currentAmountMinor: goal.currentAmountMinor,
      targetAmountMinor: goal.targetAmountMinor,
    });
    const progressPercent = Math.floor(progress.progressBasisPoints / 100);

    return (
      <View key={goal.id} style={styles.itemGroup}>
        <ListRow
          title={goal.name}
          description={`${formatBudgetAmount(goal.currentAmountMinor)} saved of ${formatBudgetAmount(goal.targetAmountMinor)}`}
          meta={`${progressPercent}% progress · ${goal.targetDate ?? 'No target date'}`}
          onPress={() => budgetPlanning.startGoalEdit(goal)}
        />

        {editing ? (
          <View style={styles.inlineForm}>
            <TextField
              autoCapitalize="sentences"
              errorText={budgetPlanning.state.fieldErrors.name}
              label="Goal name"
              onChangeText={(value) => budgetPlanning.updateEditGoalDraft('name', value)}
              value={budgetPlanning.state.editGoalDraft.name}
            />
            <TextField
              errorText={budgetPlanning.state.fieldErrors.targetAmount}
              keyboardType="decimal-pad"
              label="Target amount"
              onChangeText={(value) => budgetPlanning.updateEditGoalDraft('targetAmount', value)}
              value={budgetPlanning.state.editGoalDraft.targetAmount}
            />
            <TextField
              errorText={budgetPlanning.state.fieldErrors.currentAmount}
              helperText="Manual progress for now; money records can update this later."
              keyboardType="decimal-pad"
              label="Current saved"
              onChangeText={(value) => budgetPlanning.updateEditGoalDraft('currentAmount', value)}
              value={budgetPlanning.state.editGoalDraft.currentAmount}
            />
            <TextField
              autoCapitalize="none"
              errorText={budgetPlanning.state.fieldErrors.targetDate}
              helperText="Optional, YYYY-MM-DD."
              label="Target date"
              onChangeText={(value) => budgetPlanning.updateEditGoalDraft('targetDate', value)}
              value={budgetPlanning.state.editGoalDraft.targetDate}
            />
            <View style={styles.buttonRow}>
              <Button
                disabled={budgetSaving}
                label="Cancel"
                onPress={budgetPlanning.cancelGoalEdit}
                style={styles.buttonFlex}
                variant="secondary"
              />
              <Button
                disabled={budgetSaving}
                label="Save goal"
                onPress={budgetPlanning.saveGoalEdit}
                style={styles.buttonFlex}
              />
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  const renderPrivacyArea = (area: PrivacySettingArea) => (
    <ListRow
      key={area.id}
      accessibilityLabel={`Open ${area.title} privacy details`}
      title={area.title}
      description={area.summary}
      meta={area.statusLabel}
      onPress={() => privacySettings.openDetail(area.id)}
    />
  );

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

        <View style={styles.divider} />

        <View style={styles.section}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Budget planning</Text>
            <Text style={styles.sectionTitle}>Budget and savings</Text>
            <Text style={styles.description}>
              Set a monthly limit and basic savings goals for later Today and Review summaries.
            </Text>
          </View>

          {budgetPlanning.state.status === 'loading' ? (
            <StatusBanner
              title="Loading budget planning"
              description="Pplant is opening your local budget and savings settings."
            />
          ) : null}

          {budgetPlanning.state.status === 'preferences_needed' ? (
            <StatusBanner
              title="Save preferences first"
              description="Budget planning uses your saved currency and monthly reset day."
              tone="warning"
            />
          ) : null}

          {budgetPlanning.state.status === 'failed' ? (
            <View style={styles.inlineForm}>
              <StatusBanner
                title="Budget planning could not load"
                description="Your local data is unchanged. Try loading it again."
                tone="warning"
              />
              <Button label="Retry budget planning" onPress={budgetPlanning.reload} variant="secondary" />
            </View>
          ) : null}

          {budgetPlanning.state.status === 'saved' ? (
            <StatusBanner
              title="Budget planning saved"
              description="Budget rules and savings goals are ready for future summaries."
              tone="success"
            />
          ) : null}

          {budgetPlanning.state.actionError ? (
            <StatusBanner
              title="Budget planning was not saved"
              description="Try the action again. Current edits are still on screen."
              tone="warning"
            />
          ) : null}

          {budgetPreferences ? (
            <>
              <View style={styles.inlineForm}>
                <TextField
                  errorText={budgetPlanning.state.fieldErrors.budgetAmount}
                  helperText={`Uses ${budgetPreferences.currencyCode}; reset day ${budgetPreferences.monthlyBudgetResetDay} comes from Preferences.`}
                  keyboardType="decimal-pad"
                  label="Monthly budget"
                  onChangeText={budgetPlanning.updateBudgetAmount}
                  value={budgetPlanning.state.budgetAmount}
                />
                <StatusBanner
                  title="No rollover to next month"
                  description="Positive remaining budget becomes savings-fund context. Over-budget months can show a negative remaining amount without blocking expense entry."
                />
                <Button
                  disabled={budgetSaving}
                  label={budgetSaving ? 'Saving budget' : 'Save budget'}
                  onPress={budgetPlanning.saveBudgetAmount}
                />
              </View>

              <View style={styles.inlineForm}>
                <Text style={styles.label}>Savings goals</Text>
                <TextField
                  autoCapitalize="sentences"
                  errorText={budgetPlanning.state.editingGoalId ? undefined : budgetPlanning.state.fieldErrors.name}
                  label="Goal name"
                  onChangeText={(value) => budgetPlanning.updateGoalDraft('name', value)}
                  value={budgetPlanning.state.goalDraft.name}
                />
                <TextField
                  errorText={
                    budgetPlanning.state.editingGoalId ? undefined : budgetPlanning.state.fieldErrors.targetAmount
                  }
                  keyboardType="decimal-pad"
                  label="Target amount"
                  onChangeText={(value) => budgetPlanning.updateGoalDraft('targetAmount', value)}
                  value={budgetPlanning.state.goalDraft.targetAmount}
                />
                <TextField
                  errorText={
                    budgetPlanning.state.editingGoalId ? undefined : budgetPlanning.state.fieldErrors.currentAmount
                  }
                  helperText="Manual progress for now; money records can update this later."
                  keyboardType="decimal-pad"
                  label="Current saved"
                  onChangeText={(value) => budgetPlanning.updateGoalDraft('currentAmount', value)}
                  value={budgetPlanning.state.goalDraft.currentAmount}
                />
                <TextField
                  autoCapitalize="none"
                  errorText={
                    budgetPlanning.state.editingGoalId ? undefined : budgetPlanning.state.fieldErrors.targetDate
                  }
                  helperText="Optional, YYYY-MM-DD."
                  label="Target date"
                  onChangeText={(value) => budgetPlanning.updateGoalDraft('targetDate', value)}
                  value={budgetPlanning.state.goalDraft.targetDate}
                />
                <Button
                  disabled={budgetSaving}
                  label={budgetSaving ? 'Saving goal' : 'Add savings goal'}
                  onPress={budgetPlanning.createGoalFromDraft}
                />
              </View>

              {budgetPlanning.state.savingsGoals.length === 0 ? (
                <StatusBanner
                  title="No savings goals yet"
                  description="Create a goal above to make it available for later budget and review summaries."
                />
              ) : null}

              <View style={styles.listGroup}>
                {budgetPlanning.state.savingsGoals.map((goal) => renderSavingsGoal(goal))}
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Privacy</Text>
            <Text style={styles.sectionTitle}>Privacy controls</Text>
            <Text style={styles.description}>
              Review how Pplant handles local data, receipt photos, parsing, notifications, and diagnostics.
            </Text>
          </View>

          <StatusBanner
            title="Local-first by default"
            description="These controls explain current behavior. Data deletion below runs locally and does not require network access."
          />

          <View style={styles.listGroup}>{privacySettings.areas.map((area) => renderPrivacyArea(area))}</View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Data controls</Text>
            <Text style={styles.sectionTitle}>Delete local data</Text>
            <Text style={styles.description}>
              Preview the impact before removing local records, drafts, receipt images, diagnostics, or workspace data.
            </Text>
          </View>

          {dataDeletion.status === 'failed' && !dataDeletion.impact ? (
            <StatusBanner
              title="Deletion could not start"
              description={dataDeletion.errorMessage ?? 'Check the selected data and try again.'}
              tone="warning"
            />
          ) : null}

          {dataDeletion.status === 'previewing' ? (
            <StatusBanner title="Preparing impact" description="Pplant is checking the local deletion plan." />
          ) : null}

          <View style={styles.inlineForm}>
            <Text style={styles.label}>Date range</Text>
            <TextField
              autoCapitalize="none"
              helperText="YYYY-MM-DD"
              label="Start"
              onChangeText={(value) =>
                privacySettings.updateDeletionDateRange(value, dataDeletion.dateRangeEndDate)
              }
              value={dataDeletion.dateRangeStartDate}
            />
            <TextField
              autoCapitalize="none"
              helperText="YYYY-MM-DD"
              label="End"
              onChangeText={(value) =>
                privacySettings.updateDeletionDateRange(dataDeletion.dateRangeStartDate, value)
              }
              value={dataDeletion.dateRangeEndDate}
            />
            <Button
              disabled={dataDeletionWorking}
              label="Preview date range deletion"
              onPress={privacySettings.requestDateRangeDeletion}
              variant="secondary"
            />
          </View>

          <View style={styles.buttonColumn}>
            <Button
              disabled={dataDeletionWorking}
              label="Delete money records"
              onPress={() => privacySettings.previewRecordsByTypeDeletion('money')}
              variant="secondary"
            />
            <Button
              disabled={dataDeletionWorking}
              label="Delete work entries"
              onPress={() => privacySettings.previewRecordsByTypeDeletion('work')}
              variant="secondary"
            />
            <Button
              disabled={dataDeletionWorking}
              label="Delete tasks"
              onPress={() => privacySettings.previewRecordsByTypeDeletion('task')}
              variant="secondary"
            />
            <Button
              disabled={dataDeletionWorking}
              label="Delete reminders"
              onPress={() => privacySettings.previewRecordsByTypeDeletion('reminder')}
              variant="secondary"
            />
            <Button
              disabled={dataDeletionWorking}
              label="Delete reflections"
              onPress={() => privacySettings.previewRecordsByTypeDeletion('reflection')}
              variant="secondary"
            />
            <Button
              disabled={dataDeletionWorking}
              label="Discard active drafts"
              onPress={privacySettings.previewDraftDeletion}
              variant="secondary"
            />
            <Button
              disabled={dataDeletionWorking}
              label="Delete receipt images"
              onPress={privacySettings.previewReceiptImageDeletion}
              variant="secondary"
            />
            <Button
              disabled={dataDeletionWorking}
              label="Clear diagnostics"
              onPress={privacySettings.previewDiagnosticsDeletion}
              variant="secondary"
            />
            <Button
              disabled={dataDeletionWorking}
              label="Delete all personal data"
              onPress={privacySettings.previewAllPersonalDataDeletion}
              variant="danger"
            />
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

      <BottomSheet
        title={selectedPrivacyArea ? selectedPrivacyArea.title : 'Privacy detail'}
        visible={Boolean(selectedPrivacyArea)}
        onClose={privacySettings.closeDetail}>
        {selectedPrivacyArea ? (
          <>
            <Text style={styles.description}>{selectedPrivacyArea.currentBehavior}</Text>

            <View style={styles.detailGroup}>
              <Text style={styles.label}>Affected data categories</Text>
              {selectedPrivacyArea.affectedDataCategories.map((category) => (
                <Text key={category} style={styles.detailLine}>
                  - {category}
                </Text>
              ))}
            </View>

            {selectedPrivacyArea.beforeEnablementDisclosure ? (
              <StatusBanner
                title="Before enablement"
                description={selectedPrivacyArea.beforeEnablementDisclosure}
              />
            ) : null}

            {selectedPrivacyArea.manualAlternative ? (
              <StatusBanner title="Manual alternative" description={selectedPrivacyArea.manualAlternative} />
            ) : null}

            <Button label="Done" onPress={privacySettings.closeDetail} variant="secondary" />
          </>
        ) : null}
      </BottomSheet>

      <BottomSheet
        title={dataDeletion.impact ? dataDeletion.impact.title : 'Delete local data'}
        visible={Boolean(dataDeletion.impact)}
        onClose={privacySettings.closeDataDeletion}>
        {dataDeletion.impact ? (
          <>
            {dataDeletion.status === 'completed' ? (
              <StatusBanner
                title="Local data updated"
                description="Deleted data is hidden from active app views and summaries."
                tone="success"
              />
            ) : null}

            {dataDeletion.status === 'failed' ? (
              <StatusBanner
                title="Deletion did not finish"
                description={dataDeletion.errorMessage ?? 'Try the local deletion again.'}
                tone="warning"
              />
            ) : null}

            <Text style={styles.description}>{dataDeletion.impact.description}</Text>

            <View style={styles.detailGroup}>
              <Text style={styles.label}>Affected data</Text>
              {dataDeletion.impact.affectedDataCategories.map((category) => (
                <Text key={category} style={styles.detailLine}>
                  - {category}
                </Text>
              ))}
            </View>

            {dataDeletion.result && dataDeletionCounts.length > 0 ? (
              <View style={styles.detailGroup}>
                <Text style={styles.label}>Updated locally</Text>
                {dataDeletionCounts.map(([key, count]) => (
                  <Text key={key} style={styles.detailLine}>
                    - {key}: {count}
                  </Text>
                ))}
              </View>
            ) : null}

            {dataDeletion.result && dataDeletion.result.warnings.length > 0 ? (
              <StatusBanner
                title="Cleanup notes"
                description={dataDeletion.result.warnings.join(' ')}
                tone="warning"
              />
            ) : null}

            <View style={styles.buttonColumn}>
              {dataDeletion.status === 'completed' ? (
                <Button label="Done" onPress={privacySettings.closeDataDeletion} variant="secondary" />
              ) : (
                <>
                  <Button
                    disabled={dataDeletion.status === 'executing'}
                    label={dataDeletion.status === 'executing' ? 'Deleting locally' : dataDeletion.impact.confirmationLabel}
                    onPress={privacySettings.confirmDeletion}
                    variant="danger"
                  />
                  <Button
                    disabled={dataDeletion.status === 'executing'}
                    label="Cancel"
                    onPress={privacySettings.closeDataDeletion}
                    variant="secondary"
                  />
                </>
              )}
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
    paddingBottom: spacing.xxl + spacing.xl,
  },
  description: {
    ...typography.body,
    color: colors.body,
  },
  detailGroup: {
    gap: spacing.xs,
  },
  detailLine: {
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
    backgroundColor: colors.appBackground,
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
