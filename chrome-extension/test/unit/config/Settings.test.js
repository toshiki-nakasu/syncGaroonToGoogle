import assert from 'node:assert/strict';
import test from 'node:test';
import {
  validateSettings,
  loadSettings,
} from '../../../src/config/Settings.js';
import { makeSettings } from '../../support/Schedules.js';
import { createStorage } from '../../support/Storage.js';

test('HTTPSのGaroonオリジンだけを保存し、パスと別ホストを拒否する', () => {
  assert.equal(
    validateSettings(makeSettings({ origin: 'https://example.s.cybozu.com' }))
      .origin,
    'https://example.s.cybozu.com',
  );
  for (const origin of [
    'http://example.cybozu.com',
    'https://example.cybozu.com.evil.test',
    'https://example.cybozu.com/g/',
    'https://user:pass@example.cybozu.com',
  ]) {
    assert.throws(() => validateSettings(makeSettings({ origin })));
  }
});
test('タグとカレンダー名を別々に保存し、同じカレンダーを共有できる', () => {
  const mappings = [
    { tag: '', calendarName: '仕事' },
    { tag: '#work', calendarName: '仕事' },
  ];
  assert.deepEqual(
    validateSettings(makeSettings({ calendarMappings: mappings }))
      .calendarMappings,
    [
      { tag: '', calendarName: '仕事' },
      { tag: 'work', calendarName: '仕事' },
    ],
  );
});
test('同じタグと空欄の重複、予約タグ、空のカレンダー名を拒否する', () => {
  for (const calendarMappings of [
    [],
    [{ tag: '', calendarName: '' }],
    [{ tag: 'nosync', calendarName: '仕事' }],
    [
      { tag: '', calendarName: 'A' },
      { tag: '', calendarName: 'B' },
    ],
    [
      { tag: 'work', calendarName: 'A' },
      { tag: 'WORK', calendarName: 'B' },
    ],
  ])
    assert.throws(() => validateSettings(makeSettings({ calendarMappings })));
});
test('同期間隔は1分以上の整数で保存する', () => {
  assert.equal(
    validateSettings(makeSettings({ syncIntervalMinutes: 1 }))
      .syncIntervalMinutes,
    1,
  );
  for (const syncIntervalMinutes of [0, 1.5, '5', Infinity]) {
    assert.throws(
      () => validateSettings(makeSettings({ syncIntervalMinutes })),
      /1分以上の整数/,
    );
  }
  assert.throws(
    () => validateSettings(makeSettings({ daysAgo: -1 })),
    /同期期間/,
  );
});
test('省略された設定値を補い、以前に保存した同期先の意味を保つ', async () => {
  const storage = createStorage({
    settings: {
      calendarName: '仕事',
      tagCalendars: ['family'],
      autoSync: false,
    },
  });
  const settings = await loadSettings({ storage });
  assert.equal(settings.autoSync, false);
  assert.equal(settings.syncIntervalMinutes, 5);
  assert.deepEqual(settings.calendarMappings, [
    { tag: '', calendarName: '仕事' },
    { tag: 'family', calendarName: 'family' },
  ]);
});
