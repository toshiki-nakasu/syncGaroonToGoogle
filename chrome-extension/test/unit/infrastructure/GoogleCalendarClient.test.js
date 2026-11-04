import assert from 'node:assert/strict';
import test from 'node:test';
import { GoogleCalendarClient } from '../../../src/infrastructure/GoogleCalendarClient.js';
import { makeSettings } from '../../support/Schedules.js';
import { GoogleCalendarFake } from '../../support/GoogleCalendarFake.js';
import { installGlobals } from '../../support/Globals.js';

test('Workerのfetchをグローバルに束縛し、Google APIへ認証情報を送る', async (t) => {
  const calls = [];
  function workerFetch(url, options) {
    assert.equal(this, globalThis);
    calls.push({ url, options });
    return Promise.resolve(Response.json({ kind: 'calendar#calendarList' }));
  }
  installGlobals(t, { fetch: workerFetch });
  await new GoogleCalendarClient('default-token').request(
    'users/me/calendarList',
  );
  await new GoogleCalendarClient('injected-token', workerFetch).request(
    'calendars',
    { method: 'POST', body: { summary: 'Garoon' } },
  );
  assert.equal(calls[0].options.headers.Authorization, 'Bearer default-token');
  assert.deepEqual(JSON.parse(calls[1].options.body), { summary: 'Garoon' });
});

test('GoogleはnextPageTokenを最後まで処理する', async () => {
  const calls = [];
  const client = new GoogleCalendarClient('token', async (url) => {
    calls.push(new URL(url).searchParams.get('pageToken'));
    return Response.json(
      calls.length === 1
        ? { items: [{ id: '1' }], nextPageToken: 'next' }
        : { items: [{ id: '2' }] },
    );
  });
  assert.equal((await client.listAll('users/me/calendarList', {})).length, 2);
  assert.deepEqual(calls, [null, 'next']);
});

test('Googleのページトークンが循環したら中止する', async () => {
  const client = new GoogleCalendarClient('token', async () =>
    Response.json({ items: [], nextPageToken: 'same' }),
  );
  await assert.rejects(client.listAll('users/me/calendarList', {}), /循環/);
});

test('Googleの取得失敗を空配列にせずエラーにする', async () => {
  const client = new GoogleCalendarClient(
    'token',
    async () => new Response('denied', { status: 403 }),
  );
  await assert.rejects(client.listAll('users/me/calendarList', {}), /HTTP 403/);
});

test('GoogleのBearerトークンを指定ホスト以外へ送信しない', async () => {
  let sent = false;
  const client = new GoogleCalendarClient('secret', async () => {
    sent = true;
  });
  await assert.rejects(client.request('https://evil.test/path'), /不正/);
  assert.equal(sent, false);
});

test('正式な空一覧を空配列として返す', async () => {
  const empty = new GoogleCalendarClient('token', async () =>
    Response.json({ kind: 'calendar#events' }),
  );
  assert.deepEqual(await empty.listAll('calendars/id/events', {}), []);
});

test('空のDELETE成功応答をJSON解析エラーにしない', async () => {
  const client = new GoogleCalendarClient(
    'token',
    async () => new Response('', { status: 200 }),
  );
  assert.equal(await client.deleteEvent('calendar', 'event', 'etag'), null);
});
test('削除のURLをエンコードし、確認したETagをIf-Matchで送る', async () => {
  let request;
  const client = new GoogleCalendarClient('token', async (url, options) => {
    request = { url: new URL(url), options };
    return new Response(null, { status: 204 });
  });
  await client.deleteEvent('target@example.com', 'event-id', '"version"');
  assert.equal(
    request.url.pathname,
    '/calendar/v3/calendars/target%40example.com/events/event-id',
  );
  assert.equal(request.options.headers['If-Match'], '"version"');
  assert.equal(request.url.searchParams.get('sendUpdates'), 'none');
});
test('複数のタグで同じ同期先を指定してもカレンダーを重複作成しない', async () => {
  const api = new GoogleCalendarFake([]);
  const client = new GoogleCalendarClient('token', api.fetch);
  const calendars = await client.resolveCalendars(
    makeSettings({
      calendarMappings: [
        { tag: '', calendarName: '仕事' },
        { tag: 'work', calendarName: '仕事' },
        { tag: 'family', calendarName: '家族' },
      ],
    }),
    async () => {},
  );
  assert.deepEqual(
    api.calendars.map(({ summary }) => summary),
    ['仕事', '家族'],
  );
  assert.equal(calendars.size, 2);
});
test('HTTP 401でキャッシュした認証トークンを無効にし、再認証を案内する', async (t) => {
  const removed = [];
  installGlobals(t, {
    chrome: {
      identity: { removeCachedAuthToken: async (value) => removed.push(value) },
    },
  });
  const client = new GoogleCalendarClient(
    'expired-token',
    async () => new Response(null, { status: 401 }),
  );
  await assert.rejects(client.request('users/me/calendarList'), /認証が切れ/);
  assert.deepEqual(removed, [{ token: 'expired-token' }]);
});
