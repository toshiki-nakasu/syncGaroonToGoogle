import assert from 'node:assert/strict';
import test from 'node:test';
import {
  targetCalendar,
  toGoogleEvent,
  managedTags,
} from '../../../src/domain/EventMapping.js';
import { TAG_ID } from '../../../src/config/Settings.js';
import { settings, event } from '../../support/Schedules.js';

test('繰り返しID、タイトル、参加者とメモを変換し、招待者は追加しない', () => {
  const actual = toGoogleEvent(event(), settings);
  assert.equal(actual.summary, '【会議】定例');
  assert.equal(actual.description, '【参加者】\n田中 太郎\n\n【メモ】\nメモ');
  assert.equal(actual.extendedProperties.private[TAG_ID], '123-202611040900');
  assert.equal(actual.start.dateTime, '2026-11-04T00:00:00.000Z');
  assert.equal(actual.attendees, undefined);
});

test('終日予定の終了を翌日へ変換し、実行端末のタイムゾーンに依存しない', () => {
  const actual = toGoogleEvent(
    event({
      isAllDay: true,
      start: { dateTime: '2026-11-04T00:00:00+09:00', timeZone: 'Asia/Tokyo' },
      end: { dateTime: '2026-11-06T23:59:59+09:00', timeZone: 'Asia/Tokyo' },
    }),
    settings,
  );
  assert.deepEqual(actual.start, { date: '2026-11-04' });
  assert.deepEqual(actual.end, { date: '2026-11-07' });
});

test('開始時刻のみの予定はAPIで有効な1分の予定になる', () => {
  const actual = toGoogleEvent(
    event({ isStartOnly: true, end: null }),
    settings,
  );
  assert.equal(
    Date.parse(actual.end.dateTime) - Date.parse(actual.start.dateTime),
    60000,
  );
});

test('タグの優先順位を保ち、タグなしと複数のタグを同じカレンダーへまとめる', () => {
  const config = {
    ...settings,
    calendarMappings: [
      { tag: '', calendarName: '仕事' },
      { tag: 'work', calendarName: '仕事' },
      { tag: 'family', calendarName: '家族' },
      { tag: 'private', calendarName: '家族' },
    ],
  };
  for (const [notes, expected] of [
    [null, '仕事'],
    ['#unknown', '仕事'],
    ['#WORK', '仕事'],
    ['#family', '家族'],
    ['#private #work', '家族'],
    ['#family #NoSync', null],
    ['#nosync_extra', '仕事'],
  ])
    assert.equal(targetCalendar(event({ notes }), config), expected);
  const tagged = {
    ...config,
    calendarMappings: config.calendarMappings.filter(({ tag }) => tag),
  };
  assert.equal(targetCalendar(event(), tagged), null);
});
test('privateとsharedの管理情報が矛盾する予定は識別子で推測しない', () => {
  assert.throws(
    () =>
      managedTags(
        {
          extendedProperties: {
            private: { [TAG_ID]: 'one' },
            shared: { [TAG_ID]: 'another' },
          },
        },
        settings,
      ),
    /矛盾/,
  );
});
