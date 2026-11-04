import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CalendarClearService,
  CLEAR_PREVIEW_TTL,
} from '../../../src/application/CalendarClearService.js';
import { storageValue } from '../../support/Storage.js';

/** このサービスのGoogleポートだけを差し替え、通信の仕様はここへ持ち込まない。 */
function fixture(
  calendars = [{ id: 'target', summary: 'Garoon', accessRole: 'owner' }],
) {
  const events = [
    { id: 'manual', etag: 'a' },
    { id: 'series', etag: 'b', recurrence: ['RRULE:FREQ=DAILY'] },
  ];
  const queries = [];
  const writes = [];
  const google = {
    eventsPath: (id) => `calendars/${id}/events`,
    listAll: async (path, query) => {
      queries.push({ path, query });
      return structuredClone(
        path === 'users/me/calendarList' ? calendars : events,
      );
    },
    deleteEvent: async (...args) => writes.push(args),
  };
  return {
    service: new CalendarClearService(google),
    google,
    events,
    queries,
    writes,
  };
}

test('存在しないカレンダーを全削除のために作成しない', async () => {
  const f = fixture([]);
  assert.deepEqual(await f.service.prepare('Garoon'), {
    exists: false,
    name: 'Garoon',
    count: 0,
  });
  assert.equal(f.writes.length, 0);
});
test('同名が複数ある場合と削除権限がない場合は対象を確定しない', async () => {
  for (const calendars of [
    [
      { id: 'a', summary: 'Garoon', accessRole: 'owner' },
      { id: 'b', summary: 'Garoon', accessRole: 'owner' },
    ],
    [{ id: 'a', summary: 'Garoon', accessRole: 'reader' }],
  ]) {
    const f = fixture(calendars);
    await assert.rejects(f.service.prepare('Garoon'), /複数|削除権限/);
    assert.equal(f.writes.length, 0);
  }
});
test('全期間の予定をタグで絞らず、繰り返しを展開せずに確認する', async () => {
  const f = fixture();
  const preview = await f.service.prepare('Garoon');
  assert.equal(preview.count, 2);
  assert.deepEqual(f.queries[1].query, {
    maxResults: '2500',
    singleEvents: 'false',
    showDeleted: 'false',
  });
  assert.deepEqual(preview.events, [
    { id: 'manual', etag: 'a' },
    { id: 'series', etag: 'b' },
  ]);
});
test('トークンと期限、予定の更新を確認し、変わった対象を承認済みとして扱わない', async () => {
  const f = fixture();
  const preview = await f.service.prepare('Garoon');
  await assert.rejects(f.service.validatePreview(preview, 'wrong'), /確認/);
  await assert.rejects(
    f.service.validatePreview(
      { ...preview, createdAt: Date.now() - CLEAR_PREVIEW_TTL - 1 },
      preview.token,
    ),
    /期限切れ/,
  );
  f.events[0].etag = 'changed';
  await assert.rejects(
    f.service.validatePreview(preview, preview.token),
    /予定が変更/,
  );
  assert.equal(f.writes.length, 0);
});
test('Chrome保存領域でキー順が変わっても同じIDとETagなら実行できる', async () => {
  const f = fixture();
  const preview = storageValue(await f.service.prepare('Garoon'));
  await f.service.validatePreview(preview, preview.token);
});
test('途中で更新された予定は削除せず、成功した位置までを保存する', async () => {
  const f = fixture();
  f.google.deleteEvent = async (...args) => {
    if (args[1] === 'series')
      throw Object.assign(new Error('changed'), { status: 412 });
    f.writes.push(args);
  };
  const job = { ...(await f.service.prepare('Garoon')), cursor: 0 };
  const progress = [];
  await assert.rejects(
    f.service.runBatch(job, async ({ cursor }) => progress.push(cursor)),
    /確認後に予定が変更/,
  );
  assert.deepEqual(f.writes, [['target', 'manual', 'a']]);
  assert.deepEqual(progress, [1]);
});
test('削除応答が成功でも残件があれば完了にしない', async () => {
  const f = fixture();
  await assert.rejects(
    f.service.verifyEmpty('target'),
    /予定が2件残っています/,
  );
  f.events.length = 0;
  await f.service.verifyEmpty('target');
});
