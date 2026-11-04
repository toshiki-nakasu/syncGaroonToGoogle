import assert from 'node:assert/strict';
import test from 'node:test';
import { syncRange } from '../../../src/domain/SyncRange.js';
import { settings } from '../../support/Schedules.js';

test('通常日はJSTで今日を含み、夏時間の切り替わりも日単位の範囲を使う', () => {
  assert.deepEqual(
    syncRange(
      { ...settings, daysAgo: 0, daysAfter: 0 },
      new Date('2026-11-04T23:00:00Z'),
    ),
    {
      start: '2026-11-04T15:00:00.000Z',
      end: '2026-11-05T15:00:00.000Z',
    },
  );
  const dst = syncRange(
    { ...settings, daysAgo: 0, daysAfter: 0, timeZone: 'America/New_York' },
    new Date('2026-11-01T12:00:00Z'),
  );
  assert.equal(Date.parse(dst.end) - Date.parse(dst.start), 25 * 60 * 60000);
});
