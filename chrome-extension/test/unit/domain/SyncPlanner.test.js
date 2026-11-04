import assert from 'node:assert/strict';
import test from 'node:test';
import { SyncPlanner } from '../../../src/domain/SyncPlanner.js';
import { managedTags } from '../../../src/domain/EventMapping.js';
import {
  sourceKey,
  TAG_ID,
  TAG_SOURCE,
  TAG_UPDATED,
} from '../../../src/config/Settings.js';
import {
  settings,
  range,
  calendars,
  event,
  googleEvent,
} from '../../support/Schedules.js';

test('手動予定、別同期元、同期元が不明な未対応IDの予定は削除しない', () => {
  const manual = googleEvent(event(), { extendedProperties: {} });
  const foreign = googleEvent(event(), {
    extendedProperties: { private: { [TAG_ID]: '123', [TAG_SOURCE]: 'other' } },
  });
  const unowned = googleEvent(event(), {
    extendedProperties: { private: { [TAG_ID]: '123' } },
  });
  const plan = new SyncPlanner(settings).build(
    [],
    new Map([['work', [manual, foreign, unowned]]]),
    calendars,
    range,
  );
  assert.equal(plan.deletes.length, 0);
  assert.equal(managedTags(unowned, settings).id, '123');
  assert.equal(managedTags(foreign, settings), null);
});

test('private/sharedの識別子が一致すれば同期元情報の有無にかかわらず新規作成しない', () => {
  for (const scope of ['private', 'shared']) {
    for (const source of [undefined, sourceKey(settings)]) {
      const existing = googleEvent(event(), {
        extendedProperties: {
          [scope]: {
            [TAG_ID]: '123-202611040900',
            [TAG_UPDATED]: event().updatedAt,
            ...(source ? { [TAG_SOURCE]: source } : {}),
          },
        },
      });
      const plan = new SyncPlanner(settings).build(
        [event()],
        new Map([['work', [existing]]]),
        calendars,
        range,
      );
      assert.equal(
        plan.upserts.filter((operation) => operation.kind === 'create').length,
        0,
      );
      assert.equal(plan.deletes.length, 0);
    }
  }
});

test('件名と日時が同じでも識別子が異なる予定を同一視しない', () => {
  const existing = googleEvent(event({ id: 'other' }));
  const plan = new SyncPlanner(settings).build(
    [event()],
    new Map([['work', [existing]]]),
    calendars,
    range,
  );
  assert.equal(plan.upserts[0].kind, 'create');
});

test('期間をまたぐ長期予定はGaroonにないと判断して削除しない', () => {
  const spanning = googleEvent(event(), {
    start: { dateTime: '2026-10-01T00:00:00Z' },
  });
  assert.equal(
    new SyncPlanner(settings).build(
      [],
      new Map([['work', [spanning]]]),
      calendars,
      range,
    ).deletes.length,
    0,
  );
});

test('nosync付与後は同期済み予定の削除だけを計画する', () => {
  const plan = new SyncPlanner(settings).build(
    [event({ notes: '#nosync' })],
    new Map([['work', [googleEvent()]]]),
    calendars,
    range,
  );
  assert.equal(plan.upserts.length, 0);
  assert.equal(plan.deletes.length, 1);
});

test('同じスナップショットを再実行しても変更を計画しない', () => {
  const plan = new SyncPlanner(settings).build(
    [event()],
    new Map([['work', [googleEvent()]]]),
    calendars,
    range,
  );
  assert.equal(plan.upserts.length, 0);
  assert.equal(plan.deletes.length, 0);
});

test('期間末尾の午前0時に終了する予定も、同期済み予定を誤削除しない', () => {
  const boundary = event({ end: { dateTime: range.end } });
  const plan = new SyncPlanner(settings).build(
    [boundary],
    new Map([['work', [googleEvent(boundary)]]]),
    calendars,
    range,
  );
  assert.equal(plan.upserts.length, 0);
  assert.equal(plan.deletes.length, 0);
});

test('移動中断で両カレンダーに存在しても移動元だけを削除する', () => {
  const target = event({ notes: '#family', updatedAt: '2026-11-04T00:00:00Z' });
  const plan = new SyncPlanner(settings).build(
    [target],
    new Map([
      ['work', [googleEvent()]],
      ['home', [googleEvent(target, { id: 'new' })]],
    ]),
    calendars,
    range,
  );
  assert.equal(plan.upserts.length, 0);
  assert.equal(plan.deletes.length, 1);
  assert.equal(plan.deletes[0].calendarId, 'work');
});

test('不正な予定や同じカレンダー内での重複は削除計画に流さない', () => {
  assert.throws(
    () =>
      new SyncPlanner(settings).build(
        [event({ start: null })],
        new Map(),
        calendars,
        range,
      ),
    /日時が不正/,
  );
  assert.throws(
    () =>
      new SyncPlanner(settings).build(
        [],
        new Map([['work', [googleEvent(), googleEvent()]]]),
        calendars,
        range,
      ),
    /重複/,
  );
});
