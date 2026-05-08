import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { RecoveryAction, RecoveryTargetKind } from '@/domain/recovery/types';
import type { RecoveryItem } from '@/services/recovery/recovery.service';

export type RecoveryHandoffAction = Extract<RecoveryAction, 'edit' | 'reschedule'>;

export type RecoveryHandoffTarget = {
  action: RecoveryHandoffAction;
  item: RecoveryItem;
  sequence: number;
};

type RecoveryHandoffContextValue = {
  consumeHandoff: (sequence: number) => void;
  handoff: RecoveryHandoffTarget | null;
  startHandoff: (item: RecoveryItem, action: RecoveryHandoffAction) => void;
};

const noopHandoffContext: RecoveryHandoffContextValue = {
  consumeHandoff: () => undefined,
  handoff: null,
  startHandoff: () => undefined,
};

const RecoveryHandoffContext = createContext<RecoveryHandoffContextValue>(noopHandoffContext);

export function RecoveryHandoffProvider({ children }: { children: ReactNode }) {
  const [handoff, setHandoff] = useState<RecoveryHandoffTarget | null>(null);
  const nextSequence = useRef(0);

  const startHandoff = useCallback((item: RecoveryItem, action: RecoveryHandoffAction) => {
    nextSequence.current += 1;
    setHandoff({
      action,
      item,
      sequence: nextSequence.current,
    });
  }, []);

  const consumeHandoff = useCallback((sequence: number) => {
    setHandoff((current) => (current?.sequence === sequence ? null : current));
  }, []);

  const value = useMemo(
    () => ({
      consumeHandoff,
      handoff,
      startHandoff,
    }),
    [consumeHandoff, handoff, startHandoff],
  );

  return <RecoveryHandoffContext.Provider value={value}>{children}</RecoveryHandoffContext.Provider>;
}

export function useRecoveryHandoff() {
  return useContext(RecoveryHandoffContext);
}

export function isRecoveryHandoffForTarget(
  handoff: RecoveryHandoffTarget | null,
  targetKind: RecoveryTargetKind,
  targetId: string,
  actions: RecoveryHandoffAction[] = ['edit', 'reschedule'],
): handoff is RecoveryHandoffTarget {
  return (
    handoff !== null &&
    handoff.item.targetKind === targetKind &&
    handoff.item.targetId === targetId &&
    actions.includes(handoff.action)
  );
}
