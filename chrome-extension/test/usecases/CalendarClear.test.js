import assert from 'node:assert/strict';
import test from 'node:test';
import { CLEAR_ALARM } from '../../src/application/CalendarClearService.js';
import { createApplication } from '../support/ApplicationFixture.js';
import { deferred } from '../support/Async.js';

const events = (count) =>
  Array.from({ length: count }, (_, i) => ({
    id: `event${String(i).padStart(2, '0')}`,
    etag: `"etag-${i}"`,
  }));
const prepare = async (f) =>
  (await f.send({ type: 'prepareCalendarClear', calendarName: 'Garoon' }))
    .value;
const execute = (f, preview) =>
  f.send({
    type: 'executeCalendarClear',
    token: preview.token,
    confirmed: true,
  });

test('確認操作と現在の予定が一致しない場合は削除を開始しない', async (t) => {
  const f = await createApplication(t);
  f.google.setEvents('work', events(2));
  const preview = await prepare(f);
  assert.equal(f.storage.data.settings.autoSync, false);
  assert.equal(
    (await f.send({ type: 'executeCalendarClear', token: preview.token })).ok,
    false,
  );
  f.google.setEvents('work', events(3));
  assert.match((await execute(f, preview)).error, /予定が変更/);
  assert.equal(f.google.deleted.length, 0);
});
test('全削除中の同期と設定変更を防ぎ、Worker再起動後は保存した続きから削除する', async (t) => {
  const f = await createApplication(t);
  f.google.setEvents('work', events(27));
  const preview = await prepare(f);
  await execute(f, preview);
  assert.equal(f.storage.data.calendarClearProgress.cursor, 25);
  assert.equal((await f.send({ type: 'sync' })).ok, false);
  assert.equal(
    (await f.send({ type: 'setAutoSync', enabled: true })).ok,
    false,
  );
  assert.equal(
    (await f.send({ type: 'saveSettings', settings: f.storage.data.settings }))
      .ok,
    false,
  );
  await f.restart();
  assert.equal((await f.send({ type: 'status' })).value.kind, 'clearing');
  await f.alarm(CLEAR_ALARM);
  assert.equal(f.google.deleted.length, 27);
  assert.equal(
    new Set(f.google.deleted.map(({ eventId }) => eventId)).size,
    27,
  );
  assert.equal(f.google.events('work').length, 0);
  assert.equal(f.storage.data.state.clearResult.remaining, 0);
  assert.equal(f.storage.data.settings.autoSync, false);
  assert.ok(f.google.calendars.some(({ id }) => id === 'work'));
  assert.equal(f.storage.data.calendarWriteGenerations.work, preview.token);
  assert.equal(
    (await execute(f, preview)).ok,
    false,
    '確認トークンを再利用しない',
  );
});
test('削除対象の再照合中に自動同期の再開を要求しても競合させない', async (t) => {
  const f = await createApplication(t);
  f.google.setEvents('work', events(27));
  const preview = await prepare(f);
  const entered = deferred();
  const release = deferred();
  let hold = true;
  f.google.beforeRequest = async ({ path }) => {
    if (hold && path.join('/') === 'users/me/calendarList') {
      hold = false;
      entered.resolve();
      await release.promise;
    }
  };
  const starting = execute(f, preview);
  await entered.promise;
  const resuming = f.send({ type: 'setAutoSync', enabled: true });
  release.resolve();
  assert.equal((await starting).ok, true);
  assert.equal((await resuming).ok, false);
  assert.equal(f.storage.data.settings.autoSync, false);
});
test('途中の更新エラーでは処理済み件数を残し、再起動後に自動再試行しない', async (t) => {
  const f = await createApplication(t);
  f.google.setEvents('work', events(3));
  const preview = await prepare(f);
  f.google.beforeRequest = async ({ path, method }) =>
    method === 'DELETE' && path[3] === 'event01'
      ? new Response(null, { status: 412 })
      : undefined;
  const result = (await execute(f, preview)).value;
  assert.equal(result.clearResult.status, 'failed');
  assert.equal(result.clearResult.deleted, 1);
  assert.match(result.message, /確認後に予定が変更/);
  assert.equal(f.alarms.has(CLEAR_ALARM), false);
  await f.restart();
  await f.alarm(CLEAR_ALARM);
  assert.equal(f.google.deleted.length, 1);
  assert.equal((await f.send({ type: 'status' })).value.kind, 'unavailable');
});
test('削除後の一覧に残件があれば成功を報告しない', async (t) => {
  const f = await createApplication(t);
  f.google.setEvents('work', events(1));
  f.google.retainOnDelete = true;
  const result = (await execute(f, await prepare(f))).value;
  assert.equal(result.clearResult.status, 'failed');
  assert.match(result.message, /予定が1件残っています/);
});
