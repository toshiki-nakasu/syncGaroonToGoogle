import assert from 'node:assert/strict';
import test from 'node:test';
import { GaroonClient } from '../src/GaroonClient.js';
import { GoogleCalendarClient } from '../src/GoogleCalendarClient.js';

test('Garoonは短いページでもhasNext=trueなら次のオフセットを取得する', async () => {
  const client = new GaroonClient({}, {});
  const offsets = [];
  client.readPage = async (range, offset) => {
    offsets.push(offset);
    return offset === 0 ? { events: [{ id: '1' }], hasNext: true } : { events: [{ id: '2' }], hasNext: false };
  };
  assert.equal((await client.listEvents({})).length, 2);
  assert.deepEqual(offsets, [0, 200]);
});

test('Garoonの取得上限では部分的な成功を返さない', async () => {
  const client = new GaroonClient({}, {});
  client.readPage = async () => ({ events: [], hasNext: true });
  await assert.rejects(client.listEvents({}), /取得上限/);
});

test('Garoonのページ途中で認証が切れたら部分データを返さない', async () => {
  const client = new GaroonClient({}, {});
  client.readPage = async (range, offset) => {
    if (offset) throw new Error('認証切れ');
    return { events: [{ id: '1' }], hasNext: true };
  };
  await assert.rejects(client.listEvents({}), /認証切れ/);
});

test('ログイン名が異なるタブと休止中タブでは同期しない', async () => {
  let injected = 0;
  const client = new GaroonClient({ origin: 'https://example.cybozu.com', userCode: 'expected' }, {
    tabs: { query: async () => [{ id: 1, status: 'complete', discarded: true }, { id: 2, status: 'complete' }] },
    scripting: { executeScript: async () => { injected++; return [{ result: { code: 'other', garoonId: '1' } }]; } },
  });
  await assert.rejects(client.connect(), /ログイン済み/);
  assert.equal(injected, 1);
});

test('GoogleはnextPageTokenを最後まで処理し、ページが循環したら中止する', async () => {
  const calls = [];
  const client = new GoogleCalendarClient('token', async (url) => {
    calls.push(new URL(url).searchParams.get('pageToken'));
    return Response.json(calls.length === 1 ? { items: [{ id: '1' }], nextPageToken: 'next' } : { items: [{ id: '2' }] });
  });
  assert.equal((await client.listAll('users/me/calendarList', {})).length, 2);
  assert.deepEqual(calls, [null, 'next']);
  client.fetcher = async () => Response.json({ items: [], nextPageToken: 'same' });
  await assert.rejects(client.listAll('users/me/calendarList', {}), /循環/);
});

test('Googleの取得失敗を空配列にせずエラーにする', async () => {
  const client = new GoogleCalendarClient('token', async () => new Response('denied', { status: 403 }));
  await assert.rejects(client.listAll('users/me/calendarList', {}), /HTTP 403/);
});

test('GoogleのBearerトークンを指定ホスト以外へ送信しない', async () => {
  let sent = false;
  const client = new GoogleCalendarClient('secret', async () => { sent = true; });
  await assert.rejects(client.request('https://evil.test/path'), /不正/);
  assert.equal(sent, false);
});

test('Garoonタブ内のGETはCookieをブラウザーに任せ、HTML応答は失敗にする', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.location = { origin: 'https://example.cybozu.com', pathname: '/g/index.csp' };
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return Response.json({ events: [], hasNext: false });
  };
  try {
    const client = new GaroonClient({ origin: location.origin }, {
      scripting: { executeScript: async ({ func, args }) => [{ result: await func(...args) }] },
    });
    client.tab = { id: 1 };
    client.userId = '10';
    const range = { start: '2026-11-01T00:00:00Z', end: '2026-11-05T00:00:00Z' };
    await client.readPage(range, 0);
    const { url, options } = calls[0];
    assert.equal(new URL(url).origin, location.origin);
    assert.equal(new URL(url).searchParams.get('target'), '10');
    assert.equal(options.credentials, 'same-origin');
    assert.equal(options.redirect, 'error');
    assert.deepEqual(options.headers, { 'X-Requested-With': 'XMLHttpRequest' });
    globalThis.fetch = async () => new Response('<html>login</html>', { headers: { 'content-type': 'text/html' } });
    await assert.rejects(client.readPage(range, 0), /JSON/);
  } finally {
    globalThis.fetch = originalFetch;
    delete globalThis.location;
  }
});
