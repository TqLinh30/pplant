import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { CameraView, useCameraPermissions, type CameraCapturedPicture } from 'expo-camera';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { journalMoodCatalog } from '@/domain/journal/mood-catalog';
import type { JournalMoodId } from '@/domain/journal/types';
import { useAppBackground } from '@/features/settings/app-background';
import { AppBackgroundFrame } from '@/features/settings/AppBackgroundFrame';
import { useAppLanguage } from '@/i18n/strings';

import { journalCaptureErrorNotice } from './journal-capture';
import { MoodFaceIcon } from './MoodFaceIcon';
import { useJournalCapture } from './useJournalCapture';

const skyBlue = '#5CC4BA';
const lightBlue = '#DDF3F0';
const ink = '#253030';
const muted = '#718282';
const line = '#DDE7E7';
const panel = '#F2F7F7';
const danger = '#E46B6B';

const captureCopy = {
  en: {
    allowCamera: 'Allow camera',
    cameraHint: 'Frame the moment',
    cameraMountError: 'Camera could not open. Try again.',
    cameraPermissionBody: 'Allow camera to take a photo inside this frame.',
    cameraPermissionTitle: 'Camera permission needed',
    captureError: 'Could not take a photo. Try again.',
    headerBack: 'Go back',
    headerSubtitle: 'Each journal moment needs one photo.',
    headerTitle: 'Create journal',
    moodQuestion: 'How do you feel?',
    notePlaceholder: 'Write a short note about what is happening...',
    noteTitle: 'Note',
    preparingPhoto: 'Preparing photo',
    retake: 'Retake',
    save: 'Save journal',
    saving: 'Saving',
    savingJournal: 'Saving journal.',
  },
  vi: {
    allowCamera: 'Cho phép camera',
    cameraHint: 'Căn khoảnh khắc trong khung',
    cameraMountError: 'Camera chưa mở được. Thử lại nhé.',
    cameraPermissionBody: 'Cho phép camera để chụp ảnh ngay trong khung này.',
    cameraPermissionTitle: 'Cần quyền camera',
    captureError: 'Không thể chụp ảnh. Thử lại nhé.',
    headerBack: 'Quay lại',
    headerSubtitle: 'Ảnh là bắt buộc cho mỗi khoảnh khắc.',
    headerTitle: 'Tạo nhật ký',
    moodQuestion: 'Bạn đang cảm thấy gì?',
    notePlaceholder: 'Viết ngắn gọn điều đang xảy ra...',
    noteTitle: 'Ghi chú',
    preparingPhoto: 'Đang chuẩn bị ảnh',
    retake: 'Chụp lại',
    save: 'Lưu nhật ký',
    saving: 'Đang lưu',
    savingJournal: 'Đang lưu nhật ký.',
  },
  'zh-Hant': {
    allowCamera: '允許相機',
    cameraHint: '把片刻放進畫面中',
    cameraMountError: '相機尚未開啟，請再試一次。',
    cameraPermissionBody: '允許相機後，就能直接在此區塊拍照。',
    cameraPermissionTitle: '需要相機權限',
    captureError: '無法拍照，請再試一次。',
    headerBack: '返回',
    headerSubtitle: '每一則日記都需要一張照片。',
    headerTitle: '建立日記',
    moodQuestion: '你現在感覺如何？',
    notePlaceholder: '簡短寫下正在發生的事...',
    noteTitle: '備註',
    preparingPhoto: '正在準備照片',
    retake: '重拍',
    save: '儲存日記',
    saving: '儲存中',
    savingJournal: '正在儲存日記。',
  },
} as const;

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

function Header({ copy }: { copy: (typeof captureCopy)[keyof typeof captureCopy] }) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel={copy.headerBack}
        accessibilityRole="button"
        onPress={() => router.back()}
        style={styles.iconButton}
      >
        <MaterialCommunityIcons color={ink} name="chevron-left" size={28} />
      </Pressable>
      <View style={styles.headerText}>
        <Text style={styles.headerTitle}>{copy.headerTitle}</Text>
        <Text style={styles.headerSubtitle}>{copy.headerSubtitle}</Text>
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
  const appBackground = useAppBackground();
  const language = useAppLanguage();
  const copy = captureCopy[language];
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const { height: windowHeight } = useWindowDimensions();
  const cameraRef = useRef<CameraView>(null);
  const permissionRequestedRef = useRef(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [noteFocused, setNoteFocused] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [takingPhoto, setTakingPhoto] = useState(false);
  const savedHandledRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const capture = useJournalCapture();
  const { state } = capture;
  const saving = state.status === 'saving';
  const photoPreparing = state.status === 'photo_pending';
  const working = state.status === 'working' || saving || takingPhoto;
  const errorNotice = state.actionError ? journalCaptureErrorNotice(state.actionError) : null;
  const maxKeyboardOffset = windowHeight * 0.38;
  const keyboardOffset =
    keyboardVisible || noteFocused
      ? Math.min(keyboardHeight || maxKeyboardOffset, maxKeyboardOffset)
      : 0;
  const actionBottomPadding = keyboardVisible ? 10 : Math.max(insets.bottom, 16);
  const actionBarBottom = keyboardOffset > 0 ? keyboardOffset + 8 : 0;
  const scrollBottomPadding = 104 + actionBottomPadding + keyboardOffset;
  const canSave = !saving && !photoPreparing && Boolean(state.photo && state.moodId);
  const previewUri = state.previewUri ?? state.photo?.photoUri ?? null;
  const canTakeInlinePhoto = Boolean(cameraPermission?.granted && cameraReady && !working);
  const scrollNoteIntoView = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
  };

  const acceptInlinePicture = useCallback(
    (picture: CameraCapturedPicture) => {
      const extension = picture.format === 'png' ? 'png' : 'jpg';

      void capture.acceptInlinePhoto({
        fileName: `journal-${Date.now()}.${extension}`,
        mimeType: picture.format === 'png' ? 'image/png' : 'image/jpeg',
        uri: picture.uri,
      });
    },
    [capture],
  );

  const takeInlinePhoto = useCallback(async () => {
    if (!cameraRef.current || !canTakeInlinePhoto) {
      return;
    }

    setTakingPhoto(true);
    setCameraError(null);

    try {
      const picture = await cameraRef.current.takePictureAsync({
        quality: 0.86,
        shutterSound: true,
      });

      if (!picture?.uri) {
        setCameraError(copy.captureError);
        return;
      }

      acceptInlinePicture(picture);
    } catch {
      setCameraError(copy.captureError);
    } finally {
      setTakingPhoto(false);
    }
  }, [acceptInlinePicture, canTakeInlinePhoto, copy.captureError]);

  const retakeInlinePhoto = useCallback(() => {
    setCameraError(null);
    setCameraReady(false);
    capture.retakePhoto();
  }, [capture]);

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
    if (!cameraPermission || cameraPermission.granted || permissionRequestedRef.current) {
      return;
    }

    if (cameraPermission.canAskAgain) {
      permissionRequestedRef.current = true;
      void requestCameraPermission();
    }
  }, [cameraPermission, requestCameraPermission]);

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
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: appBackground.colors.appBackground }]}
    >
      <AppBackgroundFrame>
        <View style={styles.keyboardRoot}>
          <ScrollView
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPadding }]}
            keyboardShouldPersistTaps="handled"
            ref={scrollRef}
            style={styles.scroll}
          >
            <Header copy={copy} />

            {saving ? (
              <View
                accessibilityLabel="Đang lưu nhật ký"
                accessibilityRole="summary"
                style={styles.inlineLoading}
              >
                <ActivityIndicator color={skyBlue} />
                <Text style={styles.helper}>{copy.savingJournal}</Text>
              </View>
            ) : null}

            {errorNotice ? <Notice {...errorNotice} /> : null}

            <View style={styles.cameraPanel}>
              {previewUri ? (
                <>
                  <Image source={{ uri: previewUri }} style={styles.previewImage} transition={80} />
                  {photoPreparing ? (
                    <View style={styles.photoPreparingBadge}>
                      <ActivityIndicator color="#FFFFFF" size="small" />
                      <Text style={styles.photoPreparingText}>{copy.preparingPhoto}</Text>
                    </View>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    disabled={saving}
                    onPress={retakeInlinePhoto}
                    style={styles.retakeButton}
                  >
                    <MaterialCommunityIcons
                      color="#FFFFFF"
                      name="camera-retake-outline"
                      size={18}
                    />
                    <Text style={styles.retakeText}>{copy.retake}</Text>
                  </Pressable>
                </>
              ) : cameraPermission?.granted ? (
                <>
                  <CameraView
                    active
                    facing="back"
                    mode="picture"
                    onCameraReady={() => setCameraReady(true)}
                    onMountError={() => setCameraError(copy.cameraMountError)}
                    ratio="4:3"
                    ref={cameraRef}
                    style={styles.cameraView}
                  />
                  <View style={styles.cameraOverlay}>
                    <Text style={styles.cameraHint}>{copy.cameraHint}</Text>
                    {cameraError ? <Text style={styles.cameraErrorText}>{cameraError}</Text> : null}
                    <Pressable
                      accessibilityRole="button"
                      disabled={!canTakeInlinePhoto}
                      onPress={takeInlinePhoto}
                      style={[
                        styles.inlineCaptureButton,
                        !canTakeInlinePhoto ? styles.disabledButton : null,
                      ]}
                    >
                      {takingPhoto ? (
                        <ActivityIndicator color={skyBlue} />
                      ) : (
                        <MaterialCommunityIcons color={skyBlue} name="camera" size={28} />
                      )}
                    </Pressable>
                  </View>
                </>
              ) : (
                <View style={styles.cameraPermissionPanel}>
                  <MaterialCommunityIcons color={skyBlue} name="camera-plus-outline" size={40} />
                  <Text style={styles.photoMissingTitle}>{copy.cameraPermissionTitle}</Text>
                  <Text style={styles.helper}>{copy.cameraPermissionBody}</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={requestCameraPermission}
                    style={styles.primaryButton}
                  >
                    <Text style={styles.primaryButtonText}>{copy.allowCamera}</Text>
                  </Pressable>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{copy.moodQuestion}</Text>
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
              <Text style={styles.sectionTitle}>{copy.noteTitle}</Text>
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
                placeholder={copy.notePlaceholder}
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
                {photoPreparing
                  ? copy.preparingPhoto
                  : state.status === 'saving'
                    ? copy.saving
                    : copy.save}
              </Text>
            </Pressable>
          </View>
        </View>
      </AppBackgroundFrame>
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
    gap: 16,
    paddingBottom: 18,
  },
  cameraErrorText: {
    ...captureType.caption,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  cameraHint: {
    ...captureType.caption,
    color: '#FFFFFF',
    opacity: 0.94,
    textAlign: 'center',
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    justifyContent: 'flex-end',
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  cameraPanel: {
    aspectRatio: 1.35,
    backgroundColor: '#FFFFFF',
    borderColor: '#E4F1F1',
    borderRadius: 22,
    borderWidth: 1,
    elevation: 4,
    marginHorizontal: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#99D9DA',
    shadowOffset: {
      height: 8,
      width: 0,
    },
    shadowOpacity: 0.16,
    shadowRadius: 14,
  },
  cameraPermissionPanel: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    padding: 22,
  },
  cameraView: {
    ...StyleSheet.absoluteFillObject,
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
  inlineCaptureButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(255, 255, 255, 0.86)',
    borderRadius: 34,
    borderWidth: 6,
    elevation: 6,
    height: 68,
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#000000',
    shadowOffset: {
      height: 5,
      width: 0,
    },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    width: 68,
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
  photoPreparingBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(37, 48, 48, 0.72)',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    left: 14,
    minHeight: 36,
    paddingHorizontal: 12,
    position: 'absolute',
    top: 14,
  },
  photoPreparingText: {
    ...captureType.caption,
    color: '#FFFFFF',
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E9EFEF',
    height: '100%',
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
    backgroundColor: 'rgba(37, 48, 48, 0.68)',
    borderRadius: 18,
    bottom: 14,
    flexDirection: 'row',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 12,
    position: 'absolute',
    right: 14,
  },
  retakeText: {
    ...captureType.caption,
    color: '#FFFFFF',
  },
  safeArea: {
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
