import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { journalMoodCatalog } from '@/domain/journal/mood-catalog';
import type { JournalMoodId } from '@/domain/journal/types';

import {
  journalCaptureErrorNotice,
  journalCaptureNoticeForOutcome,
} from './journal-capture';
import { useJournalCapture } from './useJournalCapture';

const skyBlue = '#5CC4BA';
const lightBlue = '#DDF3F0';
const ink = '#253030';
const muted = '#718282';
const line = '#DDE7E7';
const panel = '#F2F7F7';
const danger = '#E46B6B';

const captureType = {
  body: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 22,
  },
  button: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 20,
  },
  caption: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0,
    lineHeight: 17,
  },
  label: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 22,
  },
  title: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 31,
  },
} as const;

function goToJournal() {
  router.replace('/(tabs)/journal');
}

function Header() {
  return (
    <View style={styles.header}>
      <Pressable accessibilityLabel="Quay lại" accessibilityRole="button" onPress={() => router.back()} style={styles.iconButton}>
        <MaterialCommunityIcons color={ink} name="chevron-left" size={28} />
      </Pressable>
      <View style={styles.headerText}>
        <Text style={styles.headerTitle}>Tạo nhật ký</Text>
        <Text style={styles.headerSubtitle}>Ảnh là bắt buộc cho mỗi khoảnh khắc.</Text>
      </View>
    </View>
  );
}

function MoodOption({
  moodId,
  onSelect,
  selected,
}: {
  moodId: JournalMoodId;
  onSelect: (moodId: JournalMoodId) => void;
  selected: boolean;
}) {
  const mood = journalMoodCatalog.find((item) => item.id === moodId) ?? journalMoodCatalog[0];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onSelect(moodId)}
      style={[
        styles.moodOption,
        selected ? styles.moodOptionSelected : null,
        { backgroundColor: mood.softColor },
      ]}>
      <MaterialCommunityIcons color={mood.color} name={mood.icon as never} size={28} />
      <Text numberOfLines={1} style={[styles.moodLabel, selected ? styles.moodLabelSelected : null]}>
        {mood.labelVi}
      </Text>
    </Pressable>
  );
}

function Notice({
  description,
  title,
  tone,
}: {
  description: string;
  title: string;
  tone: 'neutral' | 'warning';
}) {
  return (
    <View style={[styles.notice, tone === 'warning' ? styles.noticeWarning : null]}>
      <Text style={styles.noticeTitle}>{title}</Text>
      <Text style={styles.noticeText}>{description}</Text>
    </View>
  );
}

export function JournalCaptureScreen() {
  const capture = useJournalCapture();
  const { state } = capture;
  const working = state.status === 'working' || state.status === 'saving';
  const notice = state.outcome ? journalCaptureNoticeForOutcome(state.outcome) : null;
  const errorNotice = state.actionError ? journalCaptureErrorNotice(state.actionError) : null;

  useEffect(() => {
    if (state.status !== 'idle') {
      return;
    }

    void capture.takePhoto();
  }, [capture, state.status]);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Header />

        {working ? (
          <View accessibilityLabel="Đang xử lý ảnh nhật ký" accessibilityRole="summary" style={styles.inlineLoading}>
            <ActivityIndicator color={skyBlue} />
            <Text style={styles.helper}>{state.status === 'saving' ? 'Đang lưu nhật ký.' : 'Đang mở camera.'}</Text>
          </View>
        ) : null}

        {notice ? <Notice {...notice} /> : null}
        {errorNotice ? <Notice {...errorNotice} /> : null}

        {state.photo ? (
          <View style={styles.previewPanel}>
            <Image source={{ uri: state.photo.photoUri }} style={styles.previewImage} transition={180} />
            <Pressable accessibilityRole="button" disabled={working} onPress={capture.takePhoto} style={styles.retakeButton}>
              <MaterialCommunityIcons color={skyBlue} name="camera-retake-outline" size={18} />
              <Text style={styles.retakeText}>Chụp lại</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.photoMissing}>
            <MaterialCommunityIcons color={skyBlue} name="camera-plus-outline" size={40} />
            <Text style={styles.photoMissingTitle}>Cần một tấm ảnh</Text>
            <Text style={styles.helper}>Nhật ký v1 lưu mỗi mục bằng một ảnh chụp mới.</Text>
            <Pressable accessibilityRole="button" disabled={working} onPress={capture.takePhoto} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Chụp ảnh</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bạn đang cảm thấy gì?</Text>
          <View style={styles.moodGrid}>
            {journalMoodCatalog.map((mood) => (
              <MoodOption
                key={mood.id}
                moodId={mood.id}
                onSelect={capture.setMood}
                selected={state.moodId === mood.id}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ghi chú</Text>
          <TextInput
            multiline
            onChangeText={capture.setNote}
            placeholder="Viết ngắn gọn điều đang xảy ra..."
            placeholderTextColor="#A8A8A8"
            style={styles.noteInput}
            value={state.note}
          />
        </View>

        {state.status === 'saved' ? (
          <Notice
            description="Khoảnh khắc đã nằm trong timeline Nhật ký."
            title="Đã lưu nhật ký"
            tone="neutral"
          />
        ) : null}

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={working || !state.photo}
            onPress={capture.save}
            style={[styles.primaryButton, working || !state.photo ? styles.disabledButton : null]}>
            <Text style={styles.primaryButtonText}>{state.status === 'saving' ? 'Đang lưu' : 'Lưu nhật ký'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={goToJournal} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Xem nhật ký</Text>
          </Pressable>
        </View>

        {state.actionError ? <Text style={styles.warningText}>{state.actionError.message}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 10,
  },
  content: {
    backgroundColor: panel,
    gap: 16,
    paddingBottom: 34,
  },
  disabledButton: {
    opacity: 0.55,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 14,
  },
  headerSubtitle: {
    ...captureType.caption,
    color: muted,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    ...captureType.title,
    color: ink,
  },
  helper: {
    ...captureType.body,
    color: muted,
    textAlign: 'center',
  },
  iconButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 36,
  },
  inlineLoading: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    gap: 10,
    padding: 16,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodLabel: {
    ...captureType.caption,
    color: ink,
    marginTop: 4,
    textAlign: 'center',
  },
  moodLabelSelected: {
    color: skyBlue,
  },
  moodOption: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: 10,
    borderWidth: 2,
    flexBasis: '23%',
    flexGrow: 1,
    minHeight: 78,
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  moodOptionSelected: {
    borderColor: skyBlue,
  },
  noteInput: {
    ...captureType.body,
    backgroundColor: lightBlue,
    borderRadius: 12,
    color: ink,
    minHeight: 92,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  notice: {
    backgroundColor: '#FFFFFF',
    borderColor: line,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    marginHorizontal: 16,
    padding: 14,
  },
  noticeText: {
    ...captureType.body,
    color: muted,
  },
  noticeTitle: {
    ...captureType.label,
    color: ink,
  },
  noticeWarning: {
    backgroundColor: '#FFE8E8',
    borderColor: '#F4B8B8',
  },
  photoMissing: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    gap: 10,
    marginHorizontal: 16,
    padding: 22,
  },
  photoMissingTitle: {
    ...captureType.label,
    color: ink,
  },
  previewImage: {
    aspectRatio: 1.35,
    backgroundColor: '#E9EFEF',
    borderRadius: 12,
    width: '100%',
  },
  previewPanel: {
    backgroundColor: '#FFFFFF',
    gap: 12,
    marginHorizontal: 16,
    padding: 12,
  },
  primaryButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: skyBlue,
    borderRadius: 12,
    minHeight: 48,
    justifyContent: 'center',
    marginHorizontal: 22,
  },
  primaryButtonText: {
    ...captureType.button,
    color: '#FFFFFF',
  },
  retakeButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    minHeight: 36,
  },
  retakeText: {
    ...captureType.label,
    color: skyBlue,
  },
  safeArea: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  secondaryButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderColor: line,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    marginHorizontal: 22,
  },
  secondaryButtonText: {
    ...captureType.button,
    color: ink,
  },
  section: {
    backgroundColor: '#FFFFFF',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    ...captureType.label,
    color: ink,
  },
  warningText: {
    ...captureType.caption,
    color: danger,
    marginHorizontal: 22,
  },
});
