import assert from 'node:assert/strict';
import test from 'node:test';
import { SYNC_ALARM } from '../../src/config/Settings.js';
import { createApplication } from '../support/ApplicationFixture.js';
import { deferred } from '../support/Async.js';
import { event } from '../support/Schedules.js';

test('保存した間隔を使い、停止中の変更と再開、Worker再起動でも維持する', async (t) => {
  const f = await createApplication(t);
  assert.equal(f.alarms.get(SYNC_ALARM).periodInMinutes, 5);
  assert.equal(
    (
      await f.send({
        type: 'saveSettings',
        settings: { ...f.storage.data.settings, syncIntervalMinutes: 13 },
      })
    ).ok,
    true,
  );
  assert.equal(f.alarms.get(SYNC_ALARM).periodInMinutes, 13);
  const beforeCheck = f.calls.alarms.length;
  await f.send({ type: 'status' });
  assert.equal(
    f.calls.alarms.length,
    beforeCheck,
    '接続確認で次回の実行時刻をリセットしない',
  );
  await f.send({ type: 'setAutoSync', enabled: false });
  assert.equal(f.alarms.has(SYNC_ALARM), false);
  await f.send({
    type: 'saveSettings',
    settings: { ...f.storage.data.settings, syncIntervalMinutes: 17 },
  });
  assert.equal(f.alarms.has(SYNC_ALARM), false);
  await f.send({ type: 'setAutoSync', enabled: true });
  assert.equal(f.alarms.get(SYNC_ALARM).periodInMinutes, 17);
  const invalid = await f.send({
    type: 'saveSettings',
    settings: { ...f.storage.data.settings, syncIntervalMinutes: 0 },
  });
  assert.equal(invalid.ok, false);
  assert.equal(f.storage.data.settings.syncIntervalMinutes, 17);
  await f.chrome.alarms.clear(SYNC_ALARM);
  await f.restart();
  assert.equal(f.alarms.get(SYNC_ALARM).periodInMinutes, 17);
});

test('停止中のアラームは外部APIを呼ばず、再開後の定期同期は完了する', async (t) => {
  const f = await createApplication(t, { autoSync: false });
  await f.alarm(SYNC_ALARM);
  assert.equal(f.google.calls.length, 0);
  assert.equal(f.calls.auth.length, 0);
  await f.send({ type: 'setAutoSync', enabled: true });
  await f.alarm(SYNC_ALARM);
  assert.ok(f.storage.data.state.lastSuccessAt);
  assert.equal(f.storage.data.state.kind, 'ready');
  assert.equal(f.calls.badges.at(-1), 'OK');
  assert.ok(f.calls.auth.every(({ interactive }) => interactive === false));
});

test('同期の途中でも停止でき、完了前の再開と重複実行を防ぐ', async (t) => {
  const f = await createApplication(t);
  const now = Date.now();
  f.controls.events = [
    event({
      start: { dateTime: new Date(now + 3600000).toISOString() },
      end: { dateTime: new Date(now + 7200000).toISOString() },
    }),
  ];
  const entered = deferred();
  const release = deferred();
  let hold = true;
  f.google.beforeRequest = async ({ path, method }) => {
    if (hold && method === 'GET' && path[2] === 'events') {
      hold = false;
      entered.resolve();
      await release.promise;
    }
  };
  const running = f.send({ type: 'sync' });
  await entered.promise;
  let result;
  try {
    const count = f.google.calls.length;
    await f.alarm(SYNC_ALARM).catch(() => {});
    assert.equal(f.google.calls.length, count);
    assert.equal((await f.send({ type: 'status' })).value.kind, 'syncing');
    assert.equal(
      (await f.send({ type: 'setAutoSync', enabled: false })).value.autoSync,
      false,
    );
    assert.equal(
      (await f.send({ type: 'setAutoSync', enabled: true })).ok,
      false,
    );
  } finally {
    release.resolve();
    result = await running;
  }
  assert.equal(result.value.kind, 'paused');
  assert.equal(f.google.writes.length, 0);
  assert.equal(f.alarms.has(SYNC_ALARM), false);
});
