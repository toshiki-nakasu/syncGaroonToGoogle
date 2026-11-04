import assert from 'node:assert/strict';
import test from 'node:test';
import { SyncService } from '../../src/application/SyncService.js';
import { GoogleCalendarClient } from '../../src/infrastructure/GoogleCalendarClient.js';
import { GoogleCalendarFake } from '../support/GoogleCalendarFake.js';
import { createApplication } from '../support/ApplicationFixture.js';
import { settings, range, event } from '../support/Schedules.js';

test('同じ予定を増やさずに作成と更新、削除をAPIへ反映する', async () => {
  const api = new GoogleCalendarFake();
  let inputs = [event()];
  const service = new SyncService(
    {
      connect: async () => {},
      listEvents: async () => structuredClone(inputs),
    },
    new GoogleCalendarClient('token', api.fetch),
    settings,
  );
  assert.equal((await service.sync(range, async () => {})).created, 1);
  assert.equal((await service.sync(range, async () => {})).created, 0);
  assert.equal(api.events('work').length, 1);
  inputs = [event({ subject: '変更後', updatedAt: '2026-11-04T01:00:00Z' })];
  assert.equal((await service.sync(range, async () => {})).updated, 1);
  assert.equal(api.events('work')[0].summary, '【会議】変更後');
  inputs = [];
  assert.equal((await service.sync(range, async () => {})).deleted, 1);
  assert.equal(api.events('work').length, 0);
});
test('タグなしとタグ付きの予定をまとめ、タグ変更で別カレンダーへ移動する', async () => {
  const api = new GoogleCalendarFake();
  const config = {
    ...settings,
    calendarMappings: [
      { tag: '', calendarName: 'Garoon' },
      { tag: 'work', calendarName: 'Garoon' },
      { tag: 'family', calendarName: 'family' },
    ],
  };
  let inputs = [
    event({ id: '1' }),
    event({ id: '2', notes: '#work' }),
    event({ id: '3', notes: '#family' }),
  ];
  const service = new SyncService(
    {
      connect: async () => {},
      listEvents: async () => structuredClone(inputs),
    },
    new GoogleCalendarClient('token', api.fetch),
    config,
  );
  await service.sync(range, async () => {});
  assert.equal(api.events('work').length, 2);
  assert.equal(api.events('home').length, 1);
  inputs[2].notes = '#work';
  assert.equal((await service.sync(range, async () => {})).moved, 1);
  assert.equal(api.events('work').length, 3);
  assert.equal(api.events('home').length, 0);
});
test('全削除後に手動同期すると、削除済みIDと衝突せずに再登録できる', async (t) => {
  const f = await createApplication(t);
  const now = Date.now();
  f.controls.events = [
    event({
      start: { dateTime: new Date(now + 3600000).toISOString() },
      end: { dateTime: new Date(now + 7200000).toISOString() },
    }),
  ];
  assert.equal((await f.send({ type: 'sync' })).ok, true);
  const oldId = f.google.events('work')[0].id;
  const preview = (
    await f.send({ type: 'prepareCalendarClear', calendarName: 'Garoon' })
  ).value;
  await f.send({
    type: 'executeCalendarClear',
    token: preview.token,
    confirmed: true,
  });
  assert.equal(f.google.events('work').length, 0);
  assert.equal((await f.send({ type: 'sync' })).ok, true);
  assert.equal(f.google.events('work').length, 1);
  assert.notEqual(f.google.events('work')[0].id, oldId);
});
