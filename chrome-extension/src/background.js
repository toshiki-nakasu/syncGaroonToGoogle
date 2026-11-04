import { loadSettings, validateSettings, syncRange, SYNC_ALARM, SYNC_MINUTES } from './Settings.js';
import { GaroonClient } from './GaroonClient.js';
import { GoogleCalendarClient } from './GoogleCalendarClient.js';
import { SyncService } from './SyncService.js';
import { renderStatus, setStatus } from './Status.js';

let running = false;

/** 停止後の再起動でも設定の読み取り元を拡張機能内に限定する。 */
async function initialize() {
  await chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
  const alarm = await chrome.alarms.get(SYNC_ALARM);
  if (!alarm || alarm.periodInMinutes !== SYNC_MINUTES) {
    await chrome.alarms.create(SYNC_ALARM, { periodInMinutes: SYNC_MINUTES });
  }
  const { state } = await chrome.storage.local.get('state');
  if (state?.kind === 'syncing') {
    await setStatus('unavailable', '前回の同期が中断されました。次回同期で再取得します。');
  } else if (state) await renderStatus(state);
}

const initialized = initialize();

/** 同期や接続確認を直列化し、複数タブからの重複実行を防ぐ。 */
async function exclusive(action) {
  await initialized;
  if (running) throw new Error('同期または接続確認が進行中です。完了後に再実行してください。');
  running = true;
  try {
    return await action();
  } finally {
    running = false;
  }
}

/** 設定と対象ホストへの許可を検証する。 */
async function configured() {
  const settings = validateSettings(await loadSettings());
  if (!await chrome.permissions.contains({ origins: [`${settings.origin}/*`] })) {
    throw new Error('設定画面でGaroonへのアクセスを許可してください。');
  }
  return settings;
}

/** ステータス確認は読み取りだけに限定する。 */
async function refreshStatus() {
  return exclusive(async () => {
    try {
      const settings = await configured();
      if (!settings.autoSync) return await setStatus('paused', '自動同期は停止中です。手動同期は利用できます。');
      const garoon = new GaroonClient(settings);
      await garoon.connect();
      await garoon.readPage(syncRange(settings), 0, 1);
      const google = await GoogleCalendarClient.authenticate();
      await google.request('users/me/calendarList', { query: { maxResults: '1' } });
      return await setStatus('ready', 'GaroonとGoogleに接続できます。5分ごとに同期します。');
    } catch (error) {
      return await setStatus('unavailable', error.message);
    }
  });
}

/** 手動実行または5分ごとの同期。Googleへの同意画面は手動接続時だけ表示する。 */
async function runSync(manual = false) {
  return exclusive(async () => {
    let settings;
    try {
      settings = await configured();
      if (!manual && !settings.autoSync) return await setStatus('paused', '自動同期は停止中です。');
      await setStatus('syncing', '予定を取得して同期しています。');
      const garoon = new GaroonClient(settings);
      const google = await GoogleCalendarClient.authenticate();
      const deadline = Date.now() + 220000;
      const check = async () => {
        if (Date.now() > deadline) throw new Error('同期を時間内に完了できませんでした。次回に再取得します。件数が多い場合は同期期間を短くしてください。');
        if (garoon.tab) {
          const tab = await chrome.tabs.get(garoon.tab.id);
          if (!tab.url?.startsWith(`${settings.origin}/g/`) || tab.discarded) {
            throw new Error('Garoonのタブが閉じられたか移動しました。再度開いてください。');
          }
        }
      };
      const summary = await new SyncService(garoon, google, settings).sync(syncRange(settings), check);
      return await setStatus(settings.autoSync ? 'ready' : 'paused', '同期が完了しました。', {
        lastSuccessAt: new Date().toISOString(), summary,
      });
    } catch (error) {
      await setStatus('unavailable', error.message);
      throw error;
    }
  });
}

/** 拡張機能の画面からだけ操作を受け付ける。ページからの任意API呼び出しは提供しない。 */
async function handleMessage(message, sender) {
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL('ui/'))) {
    throw new Error('許可されていない操作元です。');
  }
  switch (message.type) {
    case 'status':
      if (!running) await refreshStatus();
      return (await chrome.storage.local.get('state')).state;
    case 'sync':
      return runSync(true);
    case 'probe':
      return exclusive(async () => {
        const settings = await configured();
        const garoon = new GaroonClient(settings);
        await garoon.connect();
        const data = await garoon.readPage(syncRange(settings), 0, 1);
        return { message: `Garoonのセッション認証で予定取得に成功しました。${data.events.length ? '予定を取得できました。' : '指定期間の予定は0件です。'}` };
      });
    case 'connectGoogle':
      await exclusive(async () => {
        const clientId = chrome.runtime.getManifest().oauth2.client_id;
        if (clientId.startsWith('REPLACE_')) throw new Error('READMEの手順でmanifest.jsonにGoogleのOAuthクライアントIDを設定してください。');
        const google = await GoogleCalendarClient.authenticate(true);
        await google.request('users/me/calendarList', { query: { maxResults: '1' } });
      });
      await refreshStatus();
      return { message: 'Googleに接続しました。' };
    case 'saveSettings':
      return exclusive(async () => {
        const settings = validateSettings(message.settings);
        if (!await chrome.permissions.contains({ origins: [`${settings.origin}/*`] })) {
          throw new Error('Garoonへのアクセス許可がありません。');
        }
        await chrome.storage.local.set({ settings });
        await setStatus(settings.autoSync ? 'unavailable' : 'paused', '設定を保存しました。接続を確認してください。', { lastSuccessAt: null, summary: null });
        return { message: '設定を保存しました。' };
      });
    default:
      throw new Error('不明な操作です。');
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(
    (value) => sendResponse({ ok: true, value }),
    (error) => sendResponse({ ok: false, error: error.message }),
  );
  return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_ALARM) runSync().catch(() => {});
});

chrome.runtime.onInstalled.addListener(() => refreshStatus().catch(() => {}));
chrome.runtime.onStartup.addListener(() => refreshStatus().catch(() => {}));

chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
  if (change.status === 'complete' && tab.url?.includes('.cybozu.com/g/')) {
    refreshStatus().catch(() => {});
  }
});

chrome.tabs.onRemoved.addListener(() => refreshStatus().catch(() => {}));
