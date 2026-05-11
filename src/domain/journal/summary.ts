import type { LocalDate } from '@/domain/common/date-rules';

import { journalMoodCatalog, moodDefinitionFor } from './mood-catalog';
import type { JournalEntry, JournalMoodId } from './types';

export type JournalMoodBreakdownItem = {
  color: string;
  count: number;
  label: string;
  moodId: JournalMoodId;
  percent: number;
};

export type JournalDayMood = {
  color: string;
  count: number;
  localDate: LocalDate;
  moodId: JournalMoodId;
};

export type JournalMonthSummary = {
  dayMoods: JournalDayMood[];
  moodBreakdown: JournalMoodBreakdownItem[];
  totalCount: number;
};

export function calculateJournalMonthSummary(entries: JournalEntry[]): JournalMonthSummary {
  const activeEntries = entries.filter((entry) => entry.deletedAt === null);
  const totalCount = activeEntries.length;
  const countsByMood = new Map<JournalMoodId, number>();
  const countsByDate = new Map<LocalDate, Map<JournalMoodId, number>>();

  for (const entry of activeEntries) {
    countsByMood.set(entry.moodId, (countsByMood.get(entry.moodId) ?? 0) + 1);

    const dateCounts = countsByDate.get(entry.localDate) ?? new Map<JournalMoodId, number>();
    dateCounts.set(entry.moodId, (dateCounts.get(entry.moodId) ?? 0) + 1);
    countsByDate.set(entry.localDate, dateCounts);
  }

  const moodBreakdown = journalMoodCatalog
    .map<JournalMoodBreakdownItem>((mood) => {
      const count = countsByMood.get(mood.id) ?? 0;

      return {
        color: mood.color,
        count,
        label: mood.labelVi,
        moodId: mood.id,
        percent: totalCount === 0 ? 0 : Math.round((count / totalCount) * 100),
      };
    })
    .filter((item) => item.count > 0);

  const dayMoods = [...countsByDate.entries()]
    .map<JournalDayMood>(([localDate, moodCounts]) => {
      const dominantMood = journalMoodCatalog
        .map((mood, index) => ({
          count: moodCounts.get(mood.id) ?? 0,
          index,
          moodId: mood.id,
        }))
        .sort((left, right) => right.count - left.count || left.index - right.index)[0];
      const mood = moodDefinitionFor(dominantMood.moodId);

      return {
        color: mood.color,
        count: dominantMood.count,
        localDate,
        moodId: dominantMood.moodId,
      };
    })
    .sort((left, right) => left.localDate.localeCompare(right.localDate));

  return {
    dayMoods,
    moodBreakdown,
    totalCount,
  };
}
