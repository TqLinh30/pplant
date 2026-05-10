import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import type { AppError } from '@/domain/common/app-error';
import { formatLocalDate } from '@/features/moneynote/moneyNoteModel';
import { loadJournalOverview, type JournalOverviewData } from '@/services/journal/journal.service';

import { subscribeJournalEntriesChanged } from './journal-entry-events';

export type JournalOverviewState = {
  data: JournalOverviewData | null;
  error: AppError | null;
  status: 'empty' | 'failed' | 'loading' | 'ready';
};

export function useJournalOverview(selectedDate: Date, monthDate: Date) {
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<JournalOverviewState>({
    data: null,
    error: null,
    status: 'loading',
  });
  const selectedLocalDate = formatLocalDate(selectedDate);
  const reload = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  useEffect(() => subscribeJournalEntriesChanged(reload), [reload]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setState((current) => ({
        ...current,
        error: null,
        status: 'loading',
      }));

      const result = await loadJournalOverview({
        localDate: selectedLocalDate,
        monthDate,
      });

      if (cancelled) {
        return;
      }

      if (result.ok) {
        setState({
          data: result.value,
          error: null,
          status: result.value.entries.length === 0 && result.value.monthSummary.totalCount === 0 ? 'empty' : 'ready',
        });
        return;
      }

      setState((current) => ({
        ...current,
        error: result.error,
        status: 'failed',
      }));
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [monthDate, reloadToken, selectedLocalDate]);

  return {
    reload,
    state,
  };
}
