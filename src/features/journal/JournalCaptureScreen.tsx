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

import { journalMoodCatalog, journalMoodLabel } from '@/domain/journal/mood-catalog';
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
const danger = '#E46B6B';
const fastJournalPictureMaxSide = 1600;
const fastJournalPictureMinSide = 720;

const journalDesignCopy = {
  en: {
    addNote: 'Add a note',
    headerSubtitle: 'Save this moment 💕',
    headerTitle: 'Create journal',
    save: 'Save journal',
  },
  vi: {
    addNote: 'Thêm một ghi chú',
    headerSubtitle: 'Lưu lại khoảnh khắc này 💕',
    headerTitle: 'Tạo nhật ký',
    save: 'Lưu nhật ký',
  },
  'zh-Hant': {
    addNote: '新增備註',
    headerSubtitle: '留下這一刻 💕',
    headerTitle: '建立日記',
    save: '儲存日記',
  },
} as const;

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

function parsePictureSize(size: string): { height: number; width: number } | null {
  const [widthText, heightText] = size.split('x');
  const width = Number(widthText);
  const height = Number(heightText);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return { height, width };
}

function chooseFastJournalPictureSize(sizes: string[]): string | undefined {
  const candidates = sizes
    .map((size) => ({ size, dimensions: parsePictureSize(size) }))
    .filter(
      (
        candidate,
      ): candidate is {
        dimensions: { height: number; width: number };
        size: string;
      } => Boolean(candidate.dimensions),
    )
    .filter(({ dimensions }) => {
      const longSide = Math.max(dimensions.height, dimensions.width);
      const shortSide = Math.min(dimensions.height, dimensions.width);
      const ratio = longSide / shortSide;

      return (
        Math.abs(ratio - 4 / 3) < 0.04 &&
        longSide <= fastJournalPictureMaxSide &&
        shortSide >= fastJournalPictureMinSide
      );
    })
    .sort(
      (left, right) =>
        left.dimensions.width * left.dimensions.height -
        right.dimensions.width * right.dimensions.height,
    );

  return candidates[0]?.size;
}

function Header({
  copy,
  subtitle,
  title,
}: {
  copy: (typeof captureCopy)[keyof typeof captureCopy];
  subtitle: string;
  title: string;
}) {
  return (
    <View style={styles.header}>
      <Text style={[styles.headerSparkle, styles.headerSparkleLeft]}>✦</Text>
      <Text style={[styles.headerSparkle, styles.headerSparkleRight]}>✦</Text>
      <Pressable
        accessibilityLabel={copy.headerBack}
        accessibilityRole="button"
        onPress={() => router.back()}
        style={styles.iconButton}
      >
        <MaterialCommunityIcons color={skyBlue} name="chevron-left" size={34} />
      </Pressable>
      <View style={styles.headerText}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSubtitle}>{subtitle}</Text>
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
  const language = useAppLanguage();
  const label = journalMoodLabel(mood, language);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onSelect(moodId)}
      style={styles.moodOption}
    >
      <View
        style={[
          styles.moodIconFrame,
          { backgroundColor: mood.softColor },
          selected ? styles.moodIconFrameSelected : null,
        ]}
      >
        <MoodFaceIcon moodId={moodId} size={31} />
      </View>
      <Text
        adjustsFontSizeToFit
        numberOfLines={1}
        style={[styles.moodLabel, selected ? styles.moodLabelSelected : null]}
      >
        {label}
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
  const designCopy = journalDesignCopy[language];
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const { height: windowHeight } = useWindowDimensions();
  const cameraRef = useRef<CameraView>(null);
  const noteInputRef = useRef<TextInput>(null);
  const permissionRequestedRef = useRef(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [noteFocused, setNoteFocused] = useState(false);
  const [noteEditorVisible, setNoteEditorVisible] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pictureSize, setPictureSize] = useState<string | undefined>();
  const [takingPhoto, setTakingPhoto] = useState(false);
  const pictureSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const canUseCameraControl = Boolean(previewUri || canTakeInlinePhoto);
  const clearPictureSaveTimeout = useCallback(() => {
    if (!pictureSaveTimeoutRef.current) {
      return;
    }

    clearTimeout(pictureSaveTimeoutRef.current);
    pictureSaveTimeoutRef.current = null;
  }, []);
  const showNoteEditor = useCallback(() => {
    setNoteEditorVisible(true);
    setTimeout(() => {
      noteInputRef.current?.focus();
    }, 80);
  }, []);

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

  const handleCameraReady = useCallback(() => {
    setCameraReady(true);

    void cameraRef.current
      ?.getAvailablePictureSizesAsync()
      .then((sizes) => {
        const selectedSize = chooseFastJournalPictureSize(sizes);

        if (selectedSize) {
          setPictureSize(selectedSize);
        }
      })
      .catch(() => {
        setPictureSize(undefined);
      });
  }, []);

  const takeInlinePhoto = useCallback(async () => {
    if (!cameraRef.current || !canTakeInlinePhoto) {
      return;
    }

    setTakingPhoto(true);
    setCameraError(null);
    clearPictureSaveTimeout();

    let handled = false;
    const handlePictureReady = (picture: CameraCapturedPicture | null | undefined) => {
      if (handled) {
        return;
      }

      handled = true;
      clearPictureSaveTimeout();

      if (!picture?.uri) {
        setCameraError(copy.captureError);
        setTakingPhoto(false);
        return;
      }

      acceptInlinePicture(picture);
      setTakingPhoto(false);
    };

    pictureSaveTimeoutRef.current = setTimeout(() => {
      handlePictureReady(null);
    }, 5000);

    try {
      const picture = await cameraRef.current.takePictureAsync({
        base64: false,
        exif: false,
        fastMode: true,
        onPictureSaved: handlePictureReady,
        quality: 0.72,
        shutterSound: false,
      });

      if (picture?.uri) {
        handlePictureReady(picture);
      }
    } catch {
      handlePictureReady(null);
    }
  }, [acceptInlinePicture, canTakeInlinePhoto, clearPictureSaveTimeout, copy.captureError]);

  const retakeInlinePhoto = useCallback(() => {
    setCameraError(null);
    setCameraReady(false);
    setPictureSize(undefined);
    clearPictureSaveTimeout();
    capture.retakePhoto();
  }, [capture, clearPictureSaveTimeout]);

  const handleCameraControlPress = useCallback(() => {
    if (previewUri) {
      retakeInlinePhoto();
      return;
    }

    void takeInlinePhoto();
  }, [previewUri, retakeInlinePhoto, takeInlinePhoto]);

  const handleCloseControlPress = useCallback(() => {
    if (previewUri) {
      retakeInlinePhoto();
      return;
    }

    router.back();
  }, [previewUri, retakeInlinePhoto]);

  useEffect(() => {
    return clearPictureSaveTimeout;
  }, [clearPictureSaveTimeout]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      const measuredKeyboardHeight = Math.max(0, windowHeight - event.endCoordinates.screenY);

      setKeyboardVisible(true);
      setKeyboardHeight(
        measuredKeyboardHeight > 0
          ? measuredKeyboardHeight
          : Math.min(event.endCoordinates.height, windowHeight * 0.44),
      );
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
    if (previewUri && !state.moodId) {
      capture.setMood('love');
    }
  }, [capture, previewUri, state.moodId]);

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
            <Header
              copy={copy}
              subtitle={designCopy.headerSubtitle}
              title={designCopy.headerTitle}
            />

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

            <View style={styles.cameraBlock}>
              <View style={styles.cameraPanel}>
                {previewUri ? (
                  <>
                    <Image
                      contentFit="cover"
                      source={{ uri: previewUri }}
                      style={styles.previewImage}
                      transition={80}
                    />
                    {photoPreparing ? (
                      <View style={styles.photoPreparingBadge}>
                        <ActivityIndicator color="#FFFFFF" size="small" />
                        <Text style={styles.photoPreparingText}>{copy.preparingPhoto}</Text>
                      </View>
                    ) : null}
                    {noteEditorVisible || state.note.trim().length > 0 ? (
                      <TextInput
                        accessibilityLabel={designCopy.addNote}
                        onBlur={() => setNoteFocused(false)}
                        onChangeText={capture.setNote}
                        onFocus={() => setNoteFocused(true)}
                        onSubmitEditing={Keyboard.dismiss}
                        placeholder={designCopy.addNote}
                        placeholderTextColor="#3F9F99"
                        ref={noteInputRef}
                        returnKeyType="done"
                        style={styles.addNoteInput}
                        value={state.note}
                      />
                    ) : (
                      <Pressable
                        accessibilityRole="button"
                        onPress={showNoteEditor}
                        style={styles.addNoteButton}
                      >
                        <Text style={styles.addNoteButtonText}>{designCopy.addNote}</Text>
                      </Pressable>
                    )}
                  </>
                ) : cameraPermission?.granted ? (
                  <>
                    <View style={styles.cameraLens}>
                      <CameraView
                        active
                        animateShutter={false}
                        facing="back"
                        mode="picture"
                        onCameraReady={handleCameraReady}
                        onMountError={() => setCameraError(copy.cameraMountError)}
                        pictureSize={pictureSize}
                        ratio="4:3"
                        ref={cameraRef}
                        style={styles.cameraView}
                      />
                    </View>
                    {cameraError ? (
                      <View style={styles.cameraErrorBadge}>
                        <Text style={styles.cameraErrorText}>{cameraError}</Text>
                      </View>
                    ) : null}
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
              {cameraPermission?.granted ? (
                <View style={styles.cameraControlRow}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleCloseControlPress}
                    style={styles.sideCircleButton}
                  >
                    <MaterialCommunityIcons color={skyBlue} name="close" size={34} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={!canUseCameraControl}
                    onPress={handleCameraControlPress}
                    style={[
                      styles.inlineCaptureButton,
                      !canUseCameraControl ? styles.disabledButton : null,
                    ]}
                  >
                    {takingPhoto ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <MaterialCommunityIcons color="#FFFFFF" name="camera" size={38} />
                    )}
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled
                    style={styles.sideCircleButton}
                  >
                    <MaterialCommunityIcons color={skyBlue} name="download-outline" size={34} />
                  </Pressable>
                </View>
              ) : null}
            </View>

            {previewUri ? (
              <View style={styles.moodTray}>
                {journalMoodCatalog.slice(0, 4).map((mood) => (
                  <MoodOption
                    key={mood.id}
                    moodId={mood.id}
                    onSelect={capture.setMood}
                    selected={state.moodId === mood.id}
                  />
                ))}
              </View>
            ) : null}

          </ScrollView>
          {keyboardVisible ? null : (
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
                style={[styles.saveButton, !canSave ? styles.disabledButton : null]}
              >
                <MaterialCommunityIcons color="#FFFFFF" name="creation" size={18} />
                <Text style={styles.saveButtonText}>
                  {photoPreparing
                    ? copy.preparingPhoto
                    : state.status === 'saving'
                      ? copy.saving
                      : designCopy.save}
                </Text>
                <MaterialCommunityIcons color="#FFFFFF" name="heart-outline" size={24} />
              </Pressable>
            </View>
          )}
        </View>
      </AppBackgroundFrame>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    backgroundColor: 'transparent',
    gap: 10,
    left: 0,
    paddingTop: 8,
    position: 'absolute',
    right: 0,
  },
  content: {
    gap: 18,
    paddingBottom: 18,
  },
  addNoteButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(92, 196, 186, 0.16)',
    borderRadius: 24,
    borderWidth: 1,
    bottom: 14,
    elevation: 6,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 20,
    position: 'absolute',
    shadowColor: '#6EBEBB',
    shadowOffset: {
      height: 4,
      width: 0,
    },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  addNoteButtonText: {
    ...captureType.caption,
    color: '#3F9F99',
    fontFamily: 'Montserrat_700Bold',
    fontWeight: '700',
  },
  addNoteInput: {
    ...captureType.caption,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(92, 196, 186, 0.16)',
    borderRadius: 24,
    borderWidth: 1,
    bottom: 14,
    color: '#3F9F99',
    elevation: 6,
    fontFamily: 'Montserrat_700Bold',
    fontWeight: '700',
    height: 40,
    maxWidth: '76%',
    minWidth: 196,
    paddingHorizontal: 20,
    paddingVertical: 0,
    position: 'absolute',
    shadowColor: '#6EBEBB',
    shadowOffset: {
      height: 4,
      width: 0,
    },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  cameraErrorText: {
    ...captureType.caption,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  cameraErrorBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(37, 48, 48, 0.72)',
    borderRadius: 18,
    bottom: 12,
    left: 14,
    minHeight: 36,
    paddingHorizontal: 12,
    position: 'absolute',
    right: 14,
    justifyContent: 'center',
  },
  cameraLens: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cameraBlock: {
    gap: 20,
    marginHorizontal: 26,
  },
  cameraPanel: {
    aspectRatio: 1.16,
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
    borderRadius: 30,
    borderWidth: 7,
    elevation: 7,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#99D9DA',
    shadowOffset: {
      height: 10,
      width: 0,
    },
    shadowOpacity: 0.22,
    shadowRadius: 18,
  },
  cameraPermissionPanel: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    padding: 22,
  },
  cameraView: {
    aspectRatio: 3 / 4,
    width: '100%',
  },
  cameraControlRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 46,
  },
  disabledButton: {
    opacity: 0.62,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 176,
    paddingHorizontal: 26,
    position: 'relative',
  },
  headerSparkle: {
    color: '#AEE4DF',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 25,
    lineHeight: 26,
    position: 'absolute',
  },
  headerSparkleLeft: {
    left: 78,
    top: 108,
  },
  headerSparkleRight: {
    right: 86,
    top: 138,
  },
  headerSubtitle: {
    color: '#8F9A9A',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 24,
    marginTop: 8,
    textAlign: 'center',
  },
  headerText: {
    alignItems: 'center',
    marginTop: 48,
  },
  headerTitle: {
    color: ink,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 31,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 38,
    textAlign: 'center',
  },
  helper: {
    ...captureType.body,
    color: muted,
    textAlign: 'center',
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 33,
    elevation: 7,
    height: 66,
    justifyContent: 'center',
    left: 28,
    position: 'absolute',
    shadowColor: '#91CFCB',
    shadowOffset: {
      height: 8,
      width: 0,
    },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    top: 14,
    width: 66,
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
    backgroundColor: '#7EDDD5',
    borderColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: 41,
    borderWidth: 0,
    elevation: 9,
    height: 82,
    justifyContent: 'center',
    shadowColor: '#62C9C0',
    shadowOffset: {
      height: 10,
      width: 0,
    },
    shadowOpacity: 0.36,
    shadowRadius: 16,
    width: 82,
  },
  sideCircleButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    elevation: 7,
    height: 64,
    justifyContent: 'center',
    shadowColor: '#9ED4D0',
    shadowOffset: {
      height: 8,
      width: 0,
    },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    width: 64,
  },
  keyboardRoot: {
    flex: 1,
  },
  moodTray: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(232, 243, 243, 0.95)',
    borderRadius: 24,
    borderWidth: 1,
    elevation: 5,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
    marginHorizontal: 30,
    minHeight: 96,
    paddingHorizontal: 9,
    paddingVertical: 10,
    shadowColor: '#9ED4D0',
    shadowOffset: {
      height: 8,
      width: 0,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  moodLabel: {
    color: '#898D90',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 16,
    marginTop: 5,
    minWidth: 0,
    textAlign: 'center',
  },
  moodLabelSelected: {
    color: skyBlue,
  },
  moodIconFrame: {
    alignItems: 'center',
    borderColor: '#FFFFFF',
    borderRadius: 27,
    borderWidth: 4,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  moodIconFrameSelected: {
    borderColor: skyBlue,
    shadowColor: '#72D0C8',
    shadowOffset: {
      height: 4,
      width: 0,
    },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    transform: [{ scale: 1.04 }],
  },
  moodOption: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
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
  saveButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#88DDD6',
    borderRadius: 20,
    elevation: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginHorizontal: 42,
    minHeight: 62,
    shadowColor: '#62C9C0',
    shadowOffset: {
      height: 8,
      width: 0,
    },
    shadowOpacity: 0.28,
    shadowRadius: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 26,
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
    borderRadius: 18,
    gap: 12,
    marginHorizontal: 28,
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
