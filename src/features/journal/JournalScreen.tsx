import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { moodDefinitionFor, journalMoodCatalog } from '@/domain/journal/mood-catalog';
import type { JournalEntry, JournalMoodId } from '@/domain/journal/types';
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

const skyBlue = '#5CC4BA';
const lightBlue = '#DDF3F0';
const ink = '#253030';
const muted = '#718282';
const line = '#DDE7E7';
const panel = '#F2F7F7';

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
  return (
    <Pressable accessibilityLabel="Mở Khác" accessibilityRole="button" onPress={goToMore} style={styles.headerIconButton}>
      <MaterialCommunityIcons color={ink} name="dots-horizontal" size={26} />
    </Pressable>
  );
}

function ScreenHeader({
  subtitle,
  title,
}: {
  subtitle?: string;
  title: string;
}) {
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
  const mood = moodDefinitionFor(moodId);

  return (
    <View
      style={[
        styles.moodSticker,
        {
          backgroundColor: mood.softColor,
          height: size,
          width: size,
        },
      ]}>
      <MaterialCommunityIcons color={mood.color} name={mood.icon as never} size={Math.round(size * 0.55)} />
    </View>
  );
}

function DatePill({
  onNext,
  onPrevious,
  value,
}: {
  onNext: () => void;
  onPrevious: () => void;
  value: string;
}) {
  return (
    <View style={styles.dateRow}>
      <Pressable accessibilityRole="button" onPress={onPrevious} style={styles.stepButton}>
        <MaterialCommunityIcons color={ink} name="chevron-left" size={26} />
      </Pressable>
      <View style={styles.datePill}>
        <MaterialCommunityIcons color={skyBlue} name="calendar-month-outline" size={18} />
        <Text numberOfLines={1} style={styles.datePillText}>
          {formatMoneyNoteDate(value)}
        </Text>
      </View>
      <Pressable accessibilityRole="button" onPress={onNext} style={styles.stepButton}>
        <MaterialCommunityIcons color={ink} name="chevron-right" size={26} />
      </Pressable>
    </View>
  );
}

function JournalTimeline({ entries }: { entries: JournalEntry[] }) {
  if (entries.length === 0) {
    return (
      <View style={styles.emptyBlock}>
        <MaterialCommunityIcons color={skyBlue} name="camera-plus-outline" size={34} />
        <Text style={styles.emptyTitle}>Chưa có nhật ký hôm nay</Text>
        <Text style={styles.emptyText}>Chụp một tấm ảnh để lưu lại khoảnh khắc kèm cảm xúc.</Text>
      </View>
    );
  }

  return (
    <View style={styles.timeline}>
      {entries.map((entry, index) => (
        <View key={entry.id} style={styles.timelineRow}>
          <View style={styles.timeColumn}>
            <Text style={styles.timeText}>{entry.localTime}</Text>
            <View style={styles.timelineDot} />
            {index < entries.length - 1 ? <View style={styles.timelineLine} /> : null}
          </View>
          <MoodSticker moodId={entry.moodId} />
          <View style={styles.entryText}>
            <Text numberOfLines={2} style={styles.entryNote}>
              {entry.note ?? moodDefinitionFor(entry.moodId).labelVi}
            </Text>
            <Text style={styles.entryMood}>{moodDefinitionFor(entry.moodId).labelVi}</Text>
          </View>
          <Image source={{ uri: entry.photoUri }} style={styles.thumbnail} transition={160} />
        </View>
      ))}
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
      <Pressable accessibilityRole="button" onPress={() => onChange(shiftMonth(monthDate, -1))} style={styles.stepButton}>
        <MaterialCommunityIcons color={ink} name="chevron-left" size={24} />
      </Pressable>
      <View style={styles.monthPill}>
        <Text style={styles.monthText}>{monthLabel(monthDate)}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={() => onChange(shiftMonth(monthDate, 1))} style={styles.stepButton}>
        <MaterialCommunityIcons color={ink} name="chevron-right" size={24} />
      </Pressable>
    </View>
  );
}

function MoodDonut({
  rows,
}: {
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
        <Text style={styles.emptyText}>Chưa có dữ liệu tháng này</Text>
      </View>
    );
  }

  return (
    <View style={styles.donutWrap}>
      <Svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={center} cy={center} fill="none" r={radius} stroke="#E9EFEF" strokeWidth={strokeWidth} />
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
        <Text style={styles.donutLabel}>lần</Text>
      </View>
    </View>
  );
}

function MoodStats({
  rows,
}: {
  rows: { color: string; count: number; label: string; moodId: JournalMoodId; percent: number }[];
}) {
  return (
    <View style={styles.statsPanel}>
      <MoodDonut rows={rows} />
      <View style={styles.legend}>
        {(rows.length > 0 ? rows : journalMoodCatalog.slice(0, 4).map((mood) => ({
          color: mood.color,
          count: 0,
          label: mood.labelVi,
          moodId: mood.id,
          percent: 0,
        }))).map((row) => (
          <View key={row.moodId} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: row.color }]} />
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
  monthDate,
  selectedLocalDate,
  onSelect,
}: {
  dayMoods: { color: string; localDate: string }[];
  monthDate: Date;
  onSelect: (localDate: string) => void;
  selectedLocalDate: string;
}) {
  const days = useMemo(() => buildMoneyNoteCalendarMonth(monthDate), [monthDate]);
  const moodByDate = useMemo(
    () => new Map(dayMoods.map((item) => [item.localDate, item])),
    [dayMoods],
  );
  const weekdayLabels = ['T.2', 'T.3', 'T.4', 'T.5', 'T.6', 'T.7', 'CN'];

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
            ]}>
            <Text style={[styles.calendarDayText, !day.inCurrentMonth ? styles.dayMuted : null]}>
              {day.dayOfMonth}
            </Text>
            {mood ? <View style={[styles.calendarMoodDot, { backgroundColor: mood.color }]} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function JournalScreen() {
  const language = useAppLanguage();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [monthDate, setMonthDate] = useState(() => new Date());
  const overview = useJournalOverview(selectedDate, monthDate);
  const selectedLocalDate = formatLocalDate(selectedDate);
  const data = overview.state.data;
  const statsRows = data?.monthSummary.moodBreakdown ?? [];

  const selectCalendarDate = (localDate: string) => {
    setSelectedDate(parseLocalDate(localDate));
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          subtitle={language === 'en' ? 'Photo mood diary' : 'Ghi lại ngày bằng ảnh và cảm xúc'}
          title={language === 'en' ? 'Journal' : 'Nhật ký'}
        />

        <View style={styles.heroPanel}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Chào buổi sáng!</Text>
            <Text style={styles.heroText}>Hôm nay là một ngày tuyệt vời để ghi lại khoảnh khắc đáng nhớ.</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={goToCapture} style={styles.heroButton}>
            <MaterialCommunityIcons color="#FFFFFF" name="camera-plus-outline" size={20} />
            <Text style={styles.heroButtonText}>Chụp ảnh</Text>
          </Pressable>
        </View>

        <DatePill
          onNext={() => setSelectedDate(parseLocalDate(shiftLocalDate(selectedLocalDate, 1)))}
          onPrevious={() => setSelectedDate(parseLocalDate(shiftLocalDate(selectedLocalDate, -1)))}
          value={selectedLocalDate}
        />

        {overview.state.status === 'loading' && !data ? (
          <ActivityIndicator color={skyBlue} style={styles.loading} />
        ) : null}

        {overview.state.status === 'failed' ? (
          <Text style={styles.warningText}>
            {overview.state.error?.message ?? 'Không thể tải nhật ký.'}
          </Text>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nhật ký trong ngày</Text>
            <Pressable accessibilityRole="button" onPress={goToCapture} style={styles.inlineCapture}>
              <MaterialCommunityIcons color={skyBlue} name="camera-outline" size={18} />
              <Text style={styles.inlineCaptureText}>Thêm</Text>
            </Pressable>
          </View>
          <JournalTimeline entries={data?.entries ?? []} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Thống kê cảm xúc</Text>
            <Text style={styles.sectionMeta}>{monthLabel(monthDate)}</Text>
          </View>
          <MonthSwitcher monthDate={monthDate} onChange={setMonthDate} />
          <MoodStats rows={statsRows} />
          <MoodCalendar
            dayMoods={data?.monthSummary.dayMoods ?? []}
            monthDate={monthDate}
            onSelect={selectCalendarDate}
            selectedLocalDate={selectedLocalDate}
          />
        </View>
      </ScrollView>
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
  calendarMoodDot: {
    borderRadius: 4,
    height: 7,
    marginTop: 3,
    width: 7,
  },
  content: {
    backgroundColor: panel,
    gap: 16,
    paddingBottom: 108,
  },
  datePill: {
    alignItems: 'center',
    backgroundColor: lightBlue,
    borderRadius: 12,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  datePillText: {
    ...journalType.label,
    color: ink,
    flex: 1,
  },
  dateRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dayMuted: {
    color: '#B7B7B7',
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
  entryMood: {
    ...journalType.caption,
    color: muted,
  },
  entryNote: {
    ...journalType.label,
    color: ink,
  },
  entryText: {
    flex: 1,
    gap: 3,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    gap: 12,
    minHeight: 62,
    paddingHorizontal: 18,
  },
  headerIconButton: {
    alignItems: 'center',
    borderColor: line,
    borderRadius: 18,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  headerSubtitle: {
    ...journalType.caption,
    color: muted,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    ...journalType.title,
    color: ink,
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
  inlineCapture: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    minHeight: 36,
  },
  inlineCaptureText: {
    ...journalType.label,
    color: skyBlue,
  },
  legend: {
    flex: 1,
    gap: 10,
  },
  legendDot: {
    borderRadius: 6,
    height: 12,
    width: 12,
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
  moodSticker: {
    alignItems: 'center',
    borderRadius: 999,
    justifyContent: 'center',
  },
  monthPill: {
    alignItems: 'center',
    backgroundColor: lightBlue,
    borderRadius: 12,
    flex: 1,
    minHeight: 46,
    justifyContent: 'center',
  },
  monthSwitcher: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  monthText: {
    ...journalType.label,
    color: ink,
  },
  safeArea: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
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
    height: 42,
    justifyContent: 'center',
    width: 36,
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
