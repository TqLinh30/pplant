import { router } from 'expo-router';
import { useMemo, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { journalMoodCatalog, moodDefinitionFor } from '@/domain/journal/mood-catalog';
import type { JournalEntry, JournalMoodId } from '@/domain/journal/types';
import { useAppBackground } from '@/features/settings/app-background';
import { AppBackgroundFrame } from '@/features/settings/AppBackgroundFrame';
import { useAppLanguage } from '@/i18n/strings';
import {
  buildMoneyNoteCalendarMonth,
  formatLocalDate,
  formatMoneyNoteDate,
  monthLabel,
  parseLocalDate,
  shiftLocalDate,
  shiftMonth,
} from '@/features/moneynote/moneyNoteModel';

import { useJournalOverview } from './useJournalOverview';
import { MoodFaceIcon } from './MoodFaceIcon';

const skyBlue = '#5CC4BA';
const lightBlue = '#DDF3F0';
const ink = '#253030';
const muted = '#718282';
const line = '#DDE7E7';

const journalCopy = {
  en: {
    capturePhoto: 'Take photo',
    dayEntriesTitle: 'Journal for the day',
    emptyMonth: 'No data this month',
    emptyNoteFallback: 'Moment from the day',
    emptyTimelineText: 'Take one photo to save the moment with a mood.',
    emptyTimelineTitle: 'No journal today',
    heroText: 'Today is a good day to keep a small memory.',
    heroTitle: 'Good morning!',
    loadError: 'Could not load journal.',
    openMore: 'Open More',
    statsTitle: 'Stats',
    times: 'times',
    title: 'Journal',
    weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
  vi: {
    capturePhoto: 'Chụp ảnh',
    dayEntriesTitle: 'Nhật ký trong ngày',
    emptyMonth: 'Chưa có dữ liệu tháng này',
    emptyNoteFallback: 'Khoảnh khắc trong ngày',
    emptyTimelineText: 'Chụp một tấm ảnh để lưu lại khoảnh khắc kèm cảm xúc.',
    emptyTimelineTitle: 'Chưa có nhật ký hôm nay',
    heroText: 'Hôm nay là một ngày tuyệt vời để ghi lại khoảnh khắc đáng nhớ.',
    heroTitle: 'Chào buổi sáng!',
    loadError: 'Không thể tải nhật ký.',
    openMore: 'Mở Khác',
    statsTitle: 'Thống kê',
    times: 'lần',
    title: 'Nhật ký',
    weekdays: ['T.2', 'T.3', 'T.4', 'T.5', 'T.6', 'T.7', 'CN'],
  },
  'zh-Hant': {
    capturePhoto: '拍照',
    dayEntriesTitle: '當日記錄',
    emptyMonth: '本月尚無資料',
    emptyNoteFallback: '今天的片刻',
    emptyTimelineText: '拍一張照片，將片刻與心情一起保存。',
    emptyTimelineTitle: '今天尚無日記',
    heroText: '今天很適合留下值得記住的小片刻。',
    heroTitle: '早安！',
    loadError: '無法載入日記。',
    openMore: '開啟更多',
    statsTitle: '統計',
    times: '次',
    title: '日記',
    weekdays: ['週一', '週二', '週三', '週四', '週五', '週六', '週日'],
  },
} as const;

const journalType = {
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
  titleSmall: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 25,
  },
} as const;

function goToMore() {
  router.push('/(tabs)/settings');
}

function goToCapture() {
  router.push('/journal/new');
}

function HeaderMoreButton() {
  const language = useAppLanguage();
  const copy = journalCopy[language];

  return (
    <Pressable
      accessibilityLabel={copy.openMore}
      accessibilityRole="button"
      onPress={goToMore}
      style={styles.headerIconButton}
    >
      <View style={styles.headerIconButtonInner}>
        <MaterialCommunityIcons color={skyBlue} name="dots-horizontal" size={18} />
      </View>
    </Pressable>
  );
}

function ScreenHeader({ subtitle, title }: { subtitle?: string; title: string }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={styles.headerSubtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <HeaderMoreButton />
    </View>
  );
}

function MoodSticker({ moodId, size = 42 }: { moodId: JournalMoodId; size?: number }) {
  return <MoodFaceIcon moodId={moodId} size={size} />;
}

function DatePill({
  language,
  onNext,
  onPrevious,
  value,
}: {
  language: keyof typeof journalCopy;
  onNext: () => void;
  onPrevious: () => void;
  value: string;
}) {
  return (
    <View style={styles.dateRow}>
      <Pressable accessibilityRole="button" onPress={onPrevious} style={styles.stepButton}>
        <MaterialCommunityIcons color="#18325C" name="chevron-left" size={30} />
      </Pressable>
      <View style={styles.datePill}>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          numberOfLines={1}
          style={styles.datePillText}
        >
          {formatMoneyNoteDate(value, language)}
        </Text>
        <MaterialCommunityIcons
          color="#20C8C4"
          name="calendar-month-outline"
          size={24}
          style={styles.datePillIcon}
        />
      </View>
      <Pressable accessibilityRole="button" onPress={onNext} style={styles.stepButton}>
        <MaterialCommunityIcons color="#18325C" name="chevron-right" size={30} />
      </Pressable>
    </View>
  );
}

function SectionTitleRow({
  icon,
  meta,
  title,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  meta?: string;
  title: string;
}) {
  return (
    <View style={styles.sectionTitleRow}>
      <MaterialCommunityIcons color={skyBlue} name={icon} size={24} />
      <Text style={styles.sectionTitle}>{title}</Text>
      {meta ? <Text style={styles.sectionMeta}>{meta}</Text> : null}
    </View>
  );
}

function DayMoodPill({ moodId }: { moodId: JournalMoodId }) {
  const mood = moodDefinitionFor(moodId);

  return (
    <View style={[styles.dayMoodPill, { backgroundColor: mood.softColor }]}>
      <MoodFaceIcon moodId={moodId} size={20} />
      <Text style={[styles.dayMoodPillText, { color: mood.color }]}>{mood.labelVi}</Text>
    </View>
  );
}

function JournalTimeline({
  copy,
  entries,
}: {
  copy: (typeof journalCopy)[keyof typeof journalCopy];
  entries: JournalEntry[];
}) {
  if (entries.length === 0) {
    return (
      <View style={styles.emptyBlock}>
        <MaterialCommunityIcons color={skyBlue} name="camera-plus-outline" size={34} />
        <Text style={styles.emptyTitle}>{copy.emptyTimelineTitle}</Text>
        <Text style={styles.emptyText}>{copy.emptyTimelineText}</Text>
      </View>
    );
  }

  return (
    <View style={styles.timeline}>
      <DayMoodPill moodId={entries[0].moodId} />
      {entries.map((entry, index) => {
        const note = entry.note?.trim() || copy.emptyNoteFallback;

        return (
          <View key={entry.id} style={styles.timelineRow}>
            <View style={styles.timeColumn}>
              <Text style={styles.timeText}>{entry.localTime}</Text>
              <View style={styles.timelineDot} />
              {index < entries.length - 1 ? <View style={styles.timelineLine} /> : null}
            </View>
            <MoodSticker moodId={entry.moodId} />
            <View style={styles.entryText}>
              <Text numberOfLines={2} style={styles.entryNote}>
                {note}
              </Text>
            </View>
            <Image source={{ uri: entry.photoUri }} style={styles.thumbnail} transition={160} />
          </View>
        );
      })}
    </View>
  );
}

function MonthSwitcher({
  monthDate,
  onChange,
}: {
  monthDate: Date;
  onChange: (date: Date) => void;
}) {
  return (
    <View style={styles.monthSwitcher}>
      <Pressable
        accessibilityRole="button"
        onPress={() => onChange(shiftMonth(monthDate, -1))}
        style={styles.stepButton}
      >
        <MaterialCommunityIcons color={ink} name="chevron-left" size={24} />
      </Pressable>
      <View style={styles.monthPill}>
        <Text style={styles.monthText}>{monthLabel(monthDate)}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => onChange(shiftMonth(monthDate, 1))}
        style={styles.stepButton}
      >
        <MaterialCommunityIcons color={ink} name="chevron-right" size={24} />
      </Pressable>
    </View>
  );
}

function MoodDonut({
  copy,
  rows,
}: {
  copy: (typeof journalCopy)[keyof typeof journalCopy];
  rows: { color: string; count: number; label: string; moodId: JournalMoodId; percent: number }[];
}) {
  const size = 152;
  const center = size / 2;
  const radius = 48;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  if (rows.length === 0) {
    return (
      <View style={styles.donutEmpty}>
        <Text style={styles.emptyText}>{copy.emptyMonth}</Text>
      </View>
    );
  }

  return (
    <View style={styles.donutWrap}>
      <Svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={center}
          cy={center}
          fill="none"
          r={radius}
          stroke="#E9EFEF"
          strokeWidth={strokeWidth}
        />
        <G origin={`${center}, ${center}`} rotation="-90">
          {rows.map((row) => {
            const dashLength = Math.max(0.1, (row.percent / 100) * circumference);
            const segment = (
              <Circle
                cx={center}
                cy={center}
                fill="none"
                key={row.moodId}
                r={radius}
                stroke={row.color}
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                strokeWidth={strokeWidth}
              />
            );

            offset += dashLength;
            return segment;
          })}
        </G>
      </Svg>
      <View style={styles.donutCenter}>
        <Text style={styles.donutTotal}>{rows.reduce((total, row) => total + row.count, 0)}</Text>
        <Text style={styles.donutLabel}>{copy.times}</Text>
      </View>
    </View>
  );
}

function MoodStats({
  copy,
  rows,
}: {
  copy: (typeof journalCopy)[keyof typeof journalCopy];
  rows: { color: string; count: number; label: string; moodId: JournalMoodId; percent: number }[];
}) {
  return (
    <View style={styles.statsPanel}>
      <MoodDonut copy={copy} rows={rows} />
      <View style={styles.legend}>
        {(rows.length > 0
          ? rows
          : journalMoodCatalog.slice(0, 4).map((mood) => ({
              color: mood.color,
              count: 0,
              label: mood.labelVi,
              moodId: mood.id,
              percent: 0,
            }))
        ).map((row) => (
          <View key={row.moodId} style={styles.legendRow}>
            <MoodFaceIcon moodId={row.moodId} size={24} />
            <Text numberOfLines={1} style={styles.legendLabel}>
              {row.label}
            </Text>
            <Text style={styles.legendPercent}>{row.percent}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MoodCalendar({
  dayMoods,
  language,
  monthDate,
  selectedLocalDate,
  onSelect,
}: {
  dayMoods: { color: string; localDate: string; moodId: JournalMoodId }[];
  language: keyof typeof journalCopy;
  monthDate: Date;
  onSelect: (localDate: string) => void;
  selectedLocalDate: string;
}) {
  const days = useMemo(() => buildMoneyNoteCalendarMonth(monthDate), [monthDate]);
  const moodByDate = useMemo(
    () => new Map(dayMoods.map((item) => [item.localDate, item])),
    [dayMoods],
  );
  const weekdayLabels = journalCopy[language].weekdays;

  return (
    <View style={styles.moodCalendar}>
      {weekdayLabels.map((label) => (
        <Text key={label} style={styles.weekdayText}>
          {label}
        </Text>
      ))}
      {days.map((day) => {
        const mood = moodByDate.get(day.localDate);

        return (
          <Pressable
            accessibilityRole="button"
            key={day.localDate}
            onPress={() => onSelect(day.localDate)}
            style={[
              styles.calendarDay,
              selectedLocalDate === day.localDate ? styles.calendarDaySelected : null,
            ]}
          >
            <Text style={[styles.calendarDayText, !day.inCurrentMonth ? styles.dayMuted : null]}>
              {day.dayOfMonth}
            </Text>
            {mood ? (
              <View style={styles.calendarMoodFace}>
                <MoodFaceIcon moodId={mood.moodId} size={20} />
              </View>
            ) : (
              <View style={styles.calendarMoodSpacer} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export function JournalScreen() {
  const language = useAppLanguage();
  const copy = journalCopy[language];
  const appBackground = useAppBackground();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [monthDate, setMonthDate] = useState(() => new Date());
  const overview = useJournalOverview(selectedDate, monthDate);
  const selectedLocalDate = formatLocalDate(selectedDate);
  const data = overview.state.data;
  const statsRows = data?.monthSummary.moodBreakdown ?? [];
  const showCaptureHero = overview.state.status !== 'loading' && (data?.entries.length ?? 0) === 0;
  const contentBackgroundColor = 'transparent';

  const selectCalendarDate = (localDate: string) => {
    setSelectedDate(parseLocalDate(localDate));
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: appBackground.colors.appBackground }]}
    >
      <AppBackgroundFrame>
        <ScrollView
          contentContainerStyle={[styles.content, { backgroundColor: contentBackgroundColor }]}
        >
          <ScreenHeader title={copy.title} />

          <DatePill
            language={language}
            onNext={() => setSelectedDate(parseLocalDate(shiftLocalDate(selectedLocalDate, 1)))}
            onPrevious={() =>
              setSelectedDate(parseLocalDate(shiftLocalDate(selectedLocalDate, -1)))
            }
            value={selectedLocalDate}
          />

          {showCaptureHero ? (
            <View style={styles.heroPanel}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>{copy.heroTitle}</Text>
                <Text style={styles.heroText}>{copy.heroText}</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={goToCapture} style={styles.heroButton}>
                <MaterialCommunityIcons color="#FFFFFF" name="camera-plus-outline" size={20} />
                <Text style={styles.heroButtonText}>{copy.capturePhoto}</Text>
              </Pressable>
            </View>
          ) : null}

          {overview.state.status === 'loading' && !data ? (
            <ActivityIndicator color={skyBlue} style={styles.loading} />
          ) : null}

          {overview.state.status === 'failed' ? (
            <Text style={styles.warningText}>
              {overview.state.error?.message ?? copy.loadError}
            </Text>
          ) : null}

          <View style={styles.sectionGroup}>
            <SectionTitleRow icon="book-open-variant-outline" title={copy.dayEntriesTitle} />
            <View style={styles.sectionCard}>
              <JournalTimeline copy={copy} entries={data?.entries ?? []} />
            </View>
          </View>

          <View style={styles.sectionGroup}>
            <SectionTitleRow
              icon="chart-box-outline"
              meta={monthLabel(monthDate)}
              title={copy.statsTitle}
            />
            <View style={styles.sectionCard}>
              <MonthSwitcher monthDate={monthDate} onChange={setMonthDate} />
              <MoodStats copy={copy} rows={statsRows} />
              <MoodCalendar
                dayMoods={data?.monthSummary.dayMoods ?? []}
                language={language}
                monthDate={monthDate}
                onSelect={selectCalendarDate}
                selectedLocalDate={selectedLocalDate}
              />
            </View>
          </View>
        </ScrollView>
      </AppBackgroundFrame>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  calendarDay: {
    alignItems: 'center',
    aspectRatio: 1,
    borderRadius: 8,
    justifyContent: 'center',
    padding: 3,
    width: `${100 / 7}%`,
  },
  calendarDaySelected: {
    backgroundColor: lightBlue,
  },
  calendarDayText: {
    ...journalType.caption,
    color: ink,
  },
  calendarMoodFace: {
    height: 22,
    marginTop: 2,
    width: 22,
  },
  calendarMoodSpacer: {
    height: 22,
    marginTop: 2,
  },
  content: {
    gap: 16,
    paddingBottom: 108,
  },
  datePill: {
    alignItems: 'center',
    backgroundColor: '#E5F7F5',
    borderColor: '#D8EEF0',
    borderRadius: 24,
    borderWidth: 1,
    elevation: 2,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 44,
    shadowColor: '#99D9DA',
    shadowOffset: {
      height: 5,
      width: 0,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  datePillIcon: {
    position: 'absolute',
    right: 18,
  },
  datePillText: {
    color: '#18325C',
    flex: 1,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 23,
    minWidth: 0,
    textAlign: 'center',
  },
  dateRow: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    gap: 24,
    paddingBottom: 2,
    paddingHorizontal: 24,
  },
  dayMuted: {
    color: '#B7B7B7',
  },
  dayMoodPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    minHeight: 34,
    paddingHorizontal: 12,
  },
  dayMoodPillText: {
    ...journalType.label,
  },
  donutCenter: {
    alignItems: 'center',
    height: 70,
    justifyContent: 'center',
    left: 41,
    position: 'absolute',
    top: 41,
    width: 70,
  },
  donutEmpty: {
    alignItems: 'center',
    height: 152,
    justifyContent: 'center',
    width: 152,
  },
  donutLabel: {
    ...journalType.caption,
    color: muted,
  },
  donutTotal: {
    ...journalType.titleSmall,
    color: ink,
  },
  donutWrap: {
    height: 152,
    width: 152,
  },
  emptyBlock: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 34,
  },
  emptyText: {
    ...journalType.body,
    color: muted,
    textAlign: 'center',
  },
  emptyTitle: {
    ...journalType.label,
    color: ink,
  },
  entryNote: {
    ...journalType.label,
    color: ink,
    paddingTop: 4,
  },
  entryText: {
    flex: 1,
    gap: 3,
  },
  header: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 78,
    paddingBottom: 6,
    paddingLeft: 22,
    paddingRight: 14,
    paddingTop: 6,
  },
  headerIconButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF3F5',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 5,
    height: 40,
    justifyContent: 'center',
    shadowColor: '#8BA7B0',
    shadowOffset: {
      height: 6,
      width: 0,
    },
    shadowOpacity: 0.18,
    shadowRadius: 11,
    width: 40,
  },
  headerIconButtonInner: {
    alignItems: 'center',
    borderColor: '#EDF3F4',
    borderRadius: 15,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  headerSubtitle: {
    ...journalType.caption,
    color: muted,
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    color: '#0F2445',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 31,
  },
  heroButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: skyBlue,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  heroButtonText: {
    ...journalType.button,
    color: '#FFFFFF',
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heroPanel: {
    alignItems: 'center',
    backgroundColor: '#DDF3F0',
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 14,
    marginTop: 10,
    padding: 18,
  },
  heroText: {
    ...journalType.body,
    color: '#4F6060',
  },
  heroTitle: {
    ...journalType.title,
    color: '#1D6F99',
  },
  legend: {
    flex: 1,
    gap: 10,
  },
  legendLabel: {
    ...journalType.label,
    color: ink,
    flex: 1,
  },
  legendPercent: {
    ...journalType.label,
    color: ink,
    minWidth: 42,
    textAlign: 'right',
  },
  legendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  loading: {
    marginVertical: 14,
  },
  moodCalendar: {
    backgroundColor: '#FFFFFF',
    borderColor: line,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
    padding: 8,
  },
  monthPill: {
    alignItems: 'center',
    backgroundColor: '#E5F7F5',
    borderColor: '#D8EEF0',
    borderRadius: 24,
    borderWidth: 1,
    elevation: 2,
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 20,
    shadowColor: '#99D9DA',
    shadowOffset: {
      height: 5,
      width: 0,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  monthSwitcher: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  monthText: {
    color: '#18325C',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 25,
  },
  safeArea: {
    flex: 1,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5F1F1',
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionGroup: {
    gap: 10,
    paddingHorizontal: 12,
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 38,
    paddingHorizontal: 4,
  },
  sectionMeta: {
    ...journalType.caption,
    color: muted,
  },
  sectionTitle: {
    ...journalType.titleSmall,
    color: ink,
    flex: 1,
  },
  statsPanel: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  stepButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EBF2F3',
    borderRadius: 24,
    borderWidth: 1,
    elevation: 2,
    height: 48,
    justifyContent: 'center',
    shadowColor: '#8BA7B0',
    shadowOffset: {
      height: 5,
      width: 0,
    },
    shadowOpacity: 0.14,
    shadowRadius: 9,
    width: 48,
  },
  thumbnail: {
    backgroundColor: '#E9EFEF',
    borderRadius: 8,
    height: 74,
    width: 104,
  },
  timeColumn: {
    alignItems: 'center',
    alignSelf: 'stretch',
    width: 48,
  },
  timeText: {
    ...journalType.caption,
    color: '#2A7CAC',
    marginBottom: 6,
  },
  timeline: {
    gap: 0,
  },
  timelineDot: {
    backgroundColor: '#4D8FD9',
    borderColor: '#CBE2F8',
    borderRadius: 6,
    borderWidth: 2,
    height: 12,
    width: 12,
  },
  timelineLine: {
    backgroundColor: '#CFE1E1',
    flex: 1,
    minHeight: 44,
    width: 1,
  },
  timelineRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    minHeight: 98,
  },
  warningText: {
    ...journalType.caption,
    color: '#E46B6B',
    marginHorizontal: 18,
  },
  weekdayText: {
    ...journalType.caption,
    color: muted,
    paddingVertical: 6,
    textAlign: 'center',
    width: `${100 / 7}%`,
  },
});
