import {
  firstRouteParam,
  isReturnToReviewParam,
  routeForEndOfDayReviewEdit,
} from './end-of-day-review-routes';

describe('end-of-day review edit routes', () => {
  it('maps review edit actions to existing capture and detail surfaces', () => {
    expect(routeForEndOfDayReviewEdit('money', 'money-1')).toBe(
      '/(tabs)/capture?editMoneyRecordId=money-1&returnTo=review',
    );
    expect(routeForEndOfDayReviewEdit('task', 'task-1')).toBe('/task/task-1?returnTo=review');
    expect(routeForEndOfDayReviewEdit('reminder', 'reminder-1')).toBe(
      '/reminder/reminder-1?returnTo=review',
    );
    expect(routeForEndOfDayReviewEdit('work', 'work-1')).toBe('/work/work-1?returnTo=review');
  });

  it('adds a sequence for repeated same-record handoffs', () => {
    expect(routeForEndOfDayReviewEdit('work', 'work 1', { sequence: 'again' })).toBe(
      '/work/work%201?returnTo=review&editSeq=again',
    );
  });

  it('parses review return route params conservatively', () => {
    expect(isReturnToReviewParam('review')).toBe(true);
    expect(isReturnToReviewParam(['review'])).toBe(true);
    expect(isReturnToReviewParam('today')).toBe(false);
    expect(firstRouteParam(['a', 'b'])).toBe('a');
    expect(firstRouteParam(undefined)).toBeUndefined();
  });
});
