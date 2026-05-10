import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { journalMoodCatalog } from '@/domain/journal/mood-catalog';
import type { JournalMoodId } from '@/domain/journal/types';

import { journalCaptureErrorNotice, journalCaptureNoticeForOutcome } from './journal-capture';
import { MoodFaceIcon } from './MoodFaceIcon';
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

function Header() {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Quay lại"
        accessibilityRole="button"
        onPress={() => router.back()}
        style={styles.iconButton}
      >
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
      ]}
    >
      <MoodFaceIcon moodId={moodId} size={34} />
      <Text
        numberOfLines={1}
        style={[styles.moodLabel, selected ? styles.moodLabelSelected : null]}
      >
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
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [noteFocused, setNoteFocused] = useState(false);
  const savedHandledRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const capture = useJournalCapture();
  const { state } = capture;
  const working = state.status === 'working' || state.status === 'saving';
  const notice = state.outcome ? journalCaptureNoticeForOutcome(state.outcome) : null;
  const errorNotice = state.actionError ? journalCaptureErrorNotice(state.actionError) : null;
  const maxKeyboardOffset = windowHeight * 0.38;
  const keyboardOffset =
    keyboardVisible || noteFocused
      ? Math.min(keyboardHeight || maxKeyboardOffset, maxKeyboardOffset)
      : 0;
  const actionBottomPadding = keyboardVisible ? 10 : Math.max(insets.bottom, 16);
  const actionBarBottom = keyboardOffset > 0 ? keyboardOffset + 8 : 0;
  const scrollBottomPadding = 104 + actionBottomPadding + keyboardOffset;
  const canSave = !working && Boolean(state.photo && state.moodId);
  const scrollNoteIntoView = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
  };

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      const measuredKeyboardHeight = Math.max(0, windowHeight - event.endCoordinates.screenY);

      setKeyboardVisible(true);
      setKeyboardHeight(
        measuredKeyboardHeight > 0
          ? measuredKeyboardHeight
          : Math.min(event.endCoordinates.height, windowHeight * 0.44),
      );
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 50);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
      setNoteFocused(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [windowHeight]);

  useEffect(() => {
    if (state.status !== 'idle') {
      return;
    }

    void capture.takePhoto();
  }, [capture, state.status]);

  useEffect(() => {
    if (state.status !== 'saved' || savedHandledRef.current) {
      return;
    }

    savedHandledRef.current = true;
    if (Platform.OS === 'android') {
      ToastAndroid.show('Đã lưu nhật ký', ToastAndroid.SHORT);
    }
    router.replace('/(tabs)/journal');
  }, [state.status]);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.keyboardRoot}>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPadding }]}
          keyboardShouldPersistTaps="handled"
          ref={scrollRef}
          style={styles.scroll}
        >
          <Header />

          {working ? (
            <View
              accessibilityLabel="Đang xử lý ảnh nhật ký"
              accessibilityRole="summary"
              style={styles.inlineLoading}
            >
              <ActivityIndicator color={skyBlue} />
              <Text style={styles.helper}>
                {state.status === 'saving' ? 'Đang lưu nhật ký.' : 'Đang mở camera.'}
              </Text>
            </View>
          ) : null}

          {notice ? <Notice {...notice} /> : null}
          {errorNotice ? <Notice {...errorNotice} /> : null}

          {state.photo ? (
            <View style={styles.previewPanel}>
              <Image
                source={{ uri: state.photo.photoUri }}
                style={styles.previewImage}
                transition={180}
              />
              <Pressable
                accessibilityRole="button"
                disabled={working}
                onPress={capture.takePhoto}
                style={styles.retakeButton}
              >
                <MaterialCommunityIcons color={skyBlue} name="camera-retake-outline" size={18} />
                <Text style={styles.retakeText}>Chụp lại</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.photoMissing}>
              <MaterialCommunityIcons color={skyBlue} name="camera-plus-outline" size={40} />
              <Text style={styles.photoMissingTitle}>Cần một tấm ảnh</Text>
              <Text style={styles.helper}>Nhật ký v1 lưu mỗi mục bằng một ảnh chụp mới.</Text>
              <Pressable
                accessibilityRole="button"
                disabled={working}
                onPress={capture.takePhoto}
                style={styles.primaryButton}
              >
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
              onBlur={() => setNoteFocused(false)}
              onFocus={() => {
                setNoteFocused(true);
                scrollNoteIntoView();
              }}
              onPressIn={() => {
                setNoteFocused(true);
                scrollNoteIntoView();
              }}
              placeholder="Viết ngắn gọn điều đang xảy ra..."
              placeholderTextColor="#A8A8A8"
              style={styles.noteInput}
              value={state.note}
            />
          </View>
        </ScrollView>
        <View
          style={[
            styles.actions,
            {
              bottom: actionBarBottom,
              paddingBottom: actionBottomPadding,
            },
          ]}
        >
          {state.actionError ? (
            <Text style={styles.warningText}>{state.actionError.message}</Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={!canSave}
            onPress={capture.save}
            style={[styles.primaryButton, !canSave ? styles.disabledButton : null]}
          >
            <Text style={styles.primaryButtonText}>
              {state.status === 'saving' ? 'Đang lưu' : 'Lưu nhật ký'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    backgroundColor: panel,
    borderTopColor: line,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
    left: 0,
    paddingTop: 12,
    position: 'absolute',
    right: 0,
  },
  content: {
    backgroundColor: panel,
    gap: 16,
    paddingBottom: 18,
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
  keyboardRoot: {
    flex: 1,
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
  scroll: {
    flex: 1,
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
