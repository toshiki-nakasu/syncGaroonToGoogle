import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

/** 個人のプロファイルを使わず、外部APIを差し替えた拡張機能を起動する。 */
export async function createBrowser(t) {
  const profile = await mkdtemp(path.join(tmpdir(), 'garoon-extension-test-'));
  let context;
  t.after(async () => {
    try {
      await context?.close();
    } finally {
      await rm(profile, { recursive: true, force: true });
    }
  });
  const extensionPath = fileURLToPath(new URL('../../', import.meta.url));
  context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
  const errors = [];
  context.on('weberror', (error) => errors.push(error.error().message));
  const worker =
    context.serviceWorkers()[0] ||
    (await context.waitForEvent('serviceworker'));
  await worker.evaluate(async () => {
    globalThis.browserTest = { events: [], deleted: [], failDelete: false };
    chrome.identity.getAuthToken = async () => ({
      token: 'browser-test-token',
    });
    chrome.permissions.contains = async () => true;
    globalThis.fetch = async (input, options = {}) => {
      const url = new URL(input);
      if (url.origin !== 'https://www.googleapis.com')
        throw new Error('テスト中は外部サービスへ接続しません。');
      if (url.pathname.endsWith('/calendarList'))
        return Response.json({
          items: [
            {
              id: 'test@example.com',
              summary: 'Browser test',
              accessRole: 'owner',
            },
          ],
        });
      if (
        url.pathname !== '/calendar/v3/calendars/test%40example.com/events' &&
        !url.pathname.startsWith(
          '/calendar/v3/calendars/test%40example.com/events/',
        )
      )
        throw new Error(`未定義のテスト用API: ${url.pathname}`);
      const state = globalThis.browserTest;
      if (options.method === 'DELETE') {
        if (state.failDelete) return new Response('denied', { status: 403 });
        const id = url.pathname.split('/').at(-1);
        state.deleted.push(id);
        state.events = state.events.filter((event) => event.id !== id);
        return new Response(null, { status: 204 });
      }
      return Response.json({ items: state.events });
    };
    await chrome.storage.local.set({
      settings: {
        origin: 'https://example.cybozu.com',
        userCode: 'test',
        calendarMappings: [{ tag: '', calendarName: 'Browser test' }],
        daysAgo: 7,
        daysAfter: 90,
        timeZone: 'Asia/Tokyo',
        autoSync: false,
      },
      state: { kind: 'paused', message: 'Browser test' },
    });
  });
  const id = new URL(worker.url()).hostname;
  const options = await context.newPage();
  await options.goto(`chrome-extension://${id}/ui/options.html`);
  return {
    context,
    worker,
    options,
    async popup() {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${id}/ui/popup.html`);
      return page;
    },
    assertNoPageErrors() {
      assert.deepEqual(errors, []);
    },
  };
}
