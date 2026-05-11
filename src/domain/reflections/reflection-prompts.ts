import type { PeriodReviewSummary } from '@/domain/summaries/period-summary';

import type { ReflectionPrompt } from './types';

export type BuildReflectionPromptsInput = {
  summary: PeriodReviewSummary;
};

const weeklyPromptNoun = 'week';
const monthlyPromptNoun = 'month';

function periodNoun(summary: PeriodReviewSummary): string {
  return summary.period.kind === 'week' ? weeklyPromptNoun : monthlyPromptNoun;
}

export function buildReflectionPrompts(input: BuildReflectionPromptsInput): ReflectionPrompt[] {
  const noun = periodNoun(input.summary);

  return [
    {
      helperText: `A short note about the ${noun} is enough.`,
      id: 'remember_period',
      optional: true,
      text: 'What do you want to remember about this period?',
    },
    {
      helperText: 'Use any pair already shown above, or leave it blank.',
      id: 'noticed_pair',
      optional: true,
      text: 'Which recorded pair stood out to you?',
    },
    {
      helperText: `This can be about layout, timing, or what would help this ${noun} feel clearer.`,
      id: 'next_review_ease',
      optional: true,
      text: 'What would make the next review easier to read?',
    },
  ];
}
