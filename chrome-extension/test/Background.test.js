import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_SETTINGS, SYNC_ALARM } from '../src/Settings.js';

test('5分のアラームとアイコン状態を起動・手動・定期・認証切れで確認する', async () => {
  const saved = { settings: {
    ...DEFAULT_SETTINGS, origin: 'https://example.cybozu.com', userCode: 'user1',
  } };
  const listeners = {};
  const event = (name) => ({ addListener: (callback) => { listeners[name] = callback; } });
  const badges = [];
  const authCalls = [];
  const alarms = [];
  let tabOpen = true;
  let authenticationFails = false;
  globalThis.OffscreenCanvas = class {
    getContext() {
      return { scale() {}, fillRect() {}, getImageData: () => ({}) };
    }
  };
  globalThis.chrome = {
    storage: { local: {
      setAccessLevel: async () => {},
      get: async (key) => ({ [key]: saved[key] }),
      set: async (value) => { Object.assign(saved, value); },
    } },
    alarms: {
      get: async () => undefined,
      create: async (name, config) => { alarms.push({ name, ...config }); },
      onAlarm: event('alarm'),
    },
    action: {
      setIcon: async () => {}, setBadgeBackgroundColor: async () => {}, setTitle: async () => {},
      setBadgeText: async ({ text }) => { badges.push(text); },
    },
    permissions: { contains: async () => true },
    identity: {
      getAuthToken: async (options) => {
        authCalls.push(options);
        if (authenticationFails) throw new Error('Google認証が必要です');
        return { token: 'mock-token' };
      },
    },
    tabs: {
      query: async () => tabOpen ? [{ id: 1, status: 'complete', url: 'https://example.cybozu.com/g/index.csp' }] : [],
      get: async () => ({ id: 1, url: 'https://example.cybozu.com/g/index.csp' }),
      onUpdated: event('tabUpdated'), onRemoved: event('tabRemoved'),
    },
    scripting: {
      executeScript: async ({ world }) => [{ result: world === 'MAIN' ? { code: 'user1', garoonId: '10' } : { events: [], hasNext: false } }],
    },
    runtime: {
      id: 'extension-id', getURL: (path) => `chrome-extension://extension-id/${path}`,
      onMessage: event('message'), onInstalled: event('installed'), onStartup: event('startup'),
    },
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const path = new URL(url).pathname;
    if (path.endsWith('/users/me/calendarList')) {
      return Response.json({ items: [{ id: 'work', summary: 'Garoon', accessRole: 'owner' }] });
    }
    return Response.json({ items: [] });
  };
  try {
    await import('../src/background.js');
    const sender = { id: 'extension-id', url: 'chrome-extension://extension-id/ui/popup.html' };
    const send = (message, from = sender) => new Promise((resolve) => listeners.message(message, from, resolve));
    assert.equal((await send({ type: 'status' })).value.kind, 'ready');
    assert.deepEqual(alarms, [{ name: SYNC_ALARM, periodInMinutes: 5 }]);
    assert.equal((await send({ type: 'sync' })).ok, true);
    assert.ok(badges.includes('…'));
    assert.equal(badges.at(-1), 'OK');
    assert.ok(saved.state.lastSuccessAt);
    assert.ok(authCalls.every((options) => options.interactive === false));

    const until = async (predicate) => {
      for (let index = 0; index < 100; index++) {
        if (predicate()) return;
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
      assert.fail('状態の更新が完了しませんでした。');
    };
    const count = authCalls.length;
    listeners.alarm({ name: SYNC_ALARM });
    await until(() => authCalls.length > count && saved.state.kind === 'ready');

    tabOpen = false;
    assert.equal((await send({ type: 'status' })).value.kind, 'unavailable');
    assert.equal(badges.at(-1), '!');

    tabOpen = true;
    authenticationFails = true;
    assert.equal((await send({ type: 'status' })).value.kind, 'unavailable');
    assert.match(saved.state.message, /Google認証/);

    saved.settings.autoSync = false;
    assert.equal((await send({ type: 'status' })).value.kind, 'paused');
    assert.equal(badges.at(-1), 'OFF');

    const forbidden = await send({ type: 'sync' }, { id: 'extension-id', url: 'https://example.cybozu.com/g/' });
    assert.equal(forbidden.ok, false);
    assert.match(forbidden.error, /許可されていない/);
  } finally {
    globalThis.fetch = originalFetch;
    delete globalThis.chrome;
    delete globalThis.OffscreenCanvas;
  }
});
