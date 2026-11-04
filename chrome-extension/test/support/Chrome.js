import { createEvent, createStorage } from './Storage.js';

/** アプリケーションと画面で共有するChrome境界のテスト用実装。 */
export function createChrome(initial = {}) {
  const storage = createStorage(initial);
  const alarms = new Map();
  const calls = { auth: [], badges: [], alarms: [], permissionRequests: [] };
  const controls = {
    tabs: [{ id: 1, status: 'complete', url: 'https://example.cybozu.com/g/' }],
    userCode: 'user1',
    events: [],
    authError: null,
    permissionsGranted: true,
  };
  const chrome = {
    storage,
    alarms: {
      get: async (name) => structuredClone(alarms.get(name)),
      create: async (name, config) => {
        calls.alarms.push({ name, ...config });
        alarms.set(name, structuredClone(config));
      },
      clear: async (name) => alarms.delete(name),
      onAlarm: createEvent(),
    },
    action: {
      setIcon: async () => {},
      setBadgeBackgroundColor: async () => {},
      setTitle: async () => {},
      setBadgeText: async ({ text }) => calls.badges.push(text),
    },
    permissions: {
      contains: async () => controls.permissionsGranted,
      request: async (value) => {
        calls.permissionRequests.push(value);
        return controls.permissionsGranted;
      },
    },
    identity: {
      getAuthToken: async (options) => {
        calls.auth.push(options);
        if (controls.authError) throw controls.authError;
        return { token: 'test-token' };
      },
      removeCachedAuthToken: async () => {},
    },
    tabs: {
      query: async () => structuredClone(controls.tabs),
      get: async (id) =>
        structuredClone(controls.tabs.find((tab) => tab.id === id)),
      onUpdated: createEvent(),
      onRemoved: createEvent(),
    },
    scripting: {
      executeScript: async (request) => {
        return [
          {
            result:
              request.world === 'MAIN'
                ? { code: controls.userCode, garoonId: '10' }
                : { events: structuredClone(controls.events), hasNext: false },
          },
        ];
      },
    },
    runtime: {
      id: 'extension-id',
      getURL: (path) => `chrome-extension://extension-id/${path}`,
      getManifest: () => ({
        oauth2: { client_id: 'test.apps.googleusercontent.com' },
      }),
      openOptionsPage: async () => {},
      onMessage: createEvent(),
      onInstalled: createEvent(),
      onStartup: createEvent(),
    },
  };
  return { chrome, storage, alarms, calls, controls };
}

/** アイコンの描画結果そのものは検証せず、Chrome依存だけを置き換える。 */
export class TestCanvas {
  getContext() {
    return { scale() {}, fillRect() {}, getImageData: () => ({}) };
  }
}
