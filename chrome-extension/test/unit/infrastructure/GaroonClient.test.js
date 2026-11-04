import assert from 'node:assert/strict';
import test from 'node:test';
import { GaroonClient } from '../../../src/infrastructure/GaroonClient.js';
import { installGlobals } from '../../support/Globals.js';
import { createChrome } from '../../support/Chrome.js';
import { makeSettings, range } from '../../support/Schedules.js';

/** Chromeのタブ境界を差し替え、接続から予定取得までを通す。 */
async function connectedClient(readPage) {
  const { chrome } = createChrome();
  const executeScript = chrome.scripting.executeScript;
  chrome.scripting.executeScript = async (request) =>
    request.world === 'MAIN'
      ? executeScript(request)
      : [{ result: await readPage(request) }];
  const client = new GaroonClient(makeSettings(), chrome);
  await client.connect();
  return client;
}

test('Garoonは短いページでもhasNext=trueなら次のオフセットを取得する', async () => {
  const offsets = [];
  const client = await connectedClient(({ args }) => {
    const offset = args[3];
    offsets.push(offset);
    return offset === 0
      ? { events: [{ id: '1' }], hasNext: true }
      : { events: [{ id: '2' }], hasNext: false };
  });
  assert.equal((await client.listEvents(range)).length, 2);
  assert.deepEqual(offsets, [0, 200]);
});

test('Garoonの取得上限では部分的な成功を返さない', async () => {
  const client = await connectedClient(() => ({ events: [], hasNext: true }));
  await assert.rejects(client.listEvents(range), /取得上限/);
});

test('Garoonのページ途中で認証が切れたら部分データを返さない', async () => {
  const client = await connectedClient(({ args }) => {
    if (args[3]) return { error: '認証切れ' };
    return { events: [{ id: '1' }], hasNext: true };
  });
  await assert.rejects(client.listEvents(range), /認証切れ/);
});

test('休止中のタブと設定したユーザーに一致しないタブを利用しない', async () => {
  for (const tab of [
    { id: 1, status: 'complete', discarded: true },
    { id: 2, status: 'complete' },
  ]) {
    const client = new GaroonClient(
      { origin: 'https://example.cybozu.com', userCode: 'expected' },
      {
        tabs: { query: async () => [tab] },
        scripting: {
          executeScript: async () => [
            { result: { code: 'other', garoonId: '1' } },
          ],
        },
      },
    );
    await assert.rejects(client.connect(), /ログイン済み/);
  }
});
test('タブ内のGETはセッションを利用し、HTML応答は予定の一覧にしない', async (t) => {
  const calls = [];
  const origin = 'https://example.cybozu.com';
  let response = Response.json({ events: [], hasNext: false });
  installGlobals(t, {
    location: { origin, pathname: '/g/index.csp' },
    fetch: async (url, options) => {
      calls.push({ url: new URL(url), options });
      return response;
    },
  });
  const client = await connectedClient(({ func, args }) => func(...args));
  await client.readPage(range, 0);
  assert.equal(calls[0].url.origin, origin);
  assert.equal(calls[0].url.searchParams.get('target'), '10');
  assert.equal(calls[0].options.credentials, 'same-origin');
  assert.deepEqual(calls[0].options.headers, {
    'X-Requested-With': 'XMLHttpRequest',
  });
  response = new Response('<html>login</html>', {
    headers: { 'content-type': 'text/html' },
  });
  await assert.rejects(client.readPage(range, 0), /JSON/);
});
