import type { LocalDate } from '@/domain/common/date-rules';

import type { Task } from './types';

export type TaskStateSummary = {
  doingCount: number;
  doneCount: number;
  highPriorityOpenCount: number;
  lowPriorityOpenCount: number;
  openCount: number;
  overdueOpenCount: number;
  todoCount: number;
  totalCount: number;
};

export function calculateTaskStateSummary(tasks: Task[], todayLocalDate: LocalDate): TaskStateSummary {
  return tasks.reduce<TaskStateSummary>(
    (summary, task) => {
      if (task.deletedAt !== null) {
        return summary;
      }

      summary.totalCount += 1;

      if (task.state === 'todo') {
        summary.todoCount += 1;
      }

      if (task.state === 'doing') {
        summary.doingCount += 1;
      }

      if (task.state === 'done') {
        summary.doneCount += 1;
        return summary;
      }

      summary.openCount += 1;

      if (task.priority === 'high') {
        summary.highPriorityOpenCount += 1;
      } else {
        summary.lowPriorityOpenCount += 1;
      }

      if (task.deadlineLocalDate && task.deadlineLocalDate < todayLocalDate) {
        summary.overdueOpenCount += 1;
      }

      return summary;
    },
    {
      doingCount: 0,
      doneCount: 0,
      highPriorityOpenCount: 0,
      lowPriorityOpenCount: 0,
      openCount: 0,
      overdueOpenCount: 0,
      todoCount: 0,
      totalCount: 0,
    },
  );
}
