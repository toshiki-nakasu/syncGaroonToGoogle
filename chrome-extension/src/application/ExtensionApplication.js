import { SYNC_ALARM } from '../config/Settings.js';
import { CLEAR_ALARM } from './CalendarClearService.js';
import { OperationCoordinator } from './OperationCoordinator.js';
import { SettingsService } from './SettingsService.js';
import { StatusService } from './StatusService.js';
import { ConnectionService } from './ConnectionService.js';
import { AutoSyncScheduler } from './AutoSyncScheduler.js';
import { AutoSyncService } from './AutoSyncService.js';
import { SyncController } from './SyncController.js';
import { CalendarClearController } from './CalendarClearController.js';

/** 依存関係を組み立て、画面とChromeイベントから各処理へ取り次ぐ。 */
export class ExtensionApplication {
  constructor(api = chrome) {
    this.api = api;
    this.operations = new OperationCoordinator();
    this.settings = new SettingsService(api);
    this.status = new StatusService(api);
    this.connections = new ConnectionService(api);
    this.scheduler = new AutoSyncScheduler(api.alarms);
    const shared = {
      api,
      operations: this.operations,
      settings: this.settings,
      connections: this.connections,
      status: this.status,
    };
    this.clear = new CalendarClearController(shared);
    this.sync = new SyncController({ ...shared, clear: this.clear });
    this.autoSync = new AutoSyncService({
      ...shared,
      scheduler: this.scheduler,
      sync: this.sync,
      clear: this.clear,
    });
    this.ready = this.initialize();
  }

  /** 保存済みの設定と中断された処理を起動時に復元する。 */
  async initialize() {
    await this.api.storage.local.setAccessLevel({
      accessLevel: 'TRUSTED_CONTEXTS',
    });
    await this.scheduler.reconcile(await this.settings.load());
    if (await this.clear.restore()) return;
    const state = await this.status.read();
    if (state?.kind === 'syncing') {
      await this.status.set(
        'unavailable',
        '前回の同期が中断されました。次回同期で再取得します。',
      );
    } else if (state) await this.status.render(state);
  }

  /** 初期化の完了後に、接続状態を読み取り専用で確認する。 */
  async refreshStatus() {
    await this.ready;
    return this.sync.refreshStatus();
  }

  /** 停止と実行中の同期の終了を待ってから削除対象を準備する。 */
  async prepareClear(calendarName) {
    await this.autoSync.setEnabled(false);
    await this.operations.finished;
    return this.clear.prepare(calendarName);
  }

  /** 設定とアラームを同じ更新順で保存し、削除中の変更を防ぐ。 */
  async saveSettings(input) {
    return this.operations.run(() =>
      this.operations.updateSettings(async () => {
        if (await this.clear.isRunning())
          throw new Error('予定の全削除中は設定を変更できません。');
        const settings = await this.settings.configured(input);
        await this.settings.write(settings);
        await this.scheduler.reconcile(settings);
        await this.api.storage.local.set({
          garoonConnection: {
            kind: 'unchecked',
            message: '設定を変更しました。接続を検証してください。',
          },
        });
        await this.status.set(
          settings.autoSync ? 'unavailable' : 'paused',
          '設定を保存しました。接続を確認してください。',
          { lastSuccessAt: null, summary: null },
        );
        return { message: '設定を保存しました。' };
      }),
    );
  }

  /** 拡張機能の画面から届いた、許可された操作だけを実行する。 */
  async handleMessage(message, sender) {
    if (
      sender.id !== this.api.runtime.id ||
      !sender.url?.startsWith(this.api.runtime.getURL('ui/'))
    ) {
      throw new Error('許可されていない操作元です。');
    }
    await this.ready;
    switch (message.type) {
      case 'status':
        if (!this.operations.running) await this.sync.refreshStatus(true);
        return this.status.snapshot();
      case 'setAutoSync':
        return this.autoSync.setEnabled(message.enabled);
      case 'prepareCalendarClear':
        return this.prepareClear(message.calendarName);
      case 'executeCalendarClear':
        if (message.confirmed !== true)
          throw new Error('予定の全削除には確認操作が必要です。');
        await this.clear.start(message.token);
        await this.clear.processBatch();
        return this.status.snapshot();
      case 'sync':
        return this.sync.run(true);
      case 'probe':
        return this.operations.run(async () => {
          const { data } = await this.connections.garoon(
            await this.settings.configured(),
          );
          return {
            message: `Garoonのセッション認証で予定取得に成功しました。${data.events.length ? '予定を取得できました。' : '指定期間の予定は0件です。'}`,
          };
        });
      case 'connectGoogle':
        await this.operations.run(async () => {
          if (
            this.api.runtime
              .getManifest()
              .oauth2.client_id.startsWith('REPLACE_')
          )
            throw new Error(
              'Google側の準備手順に従いOAuthクライアントIDを設定してください。',
            );
          await this.connections.google(true);
        });
        await this.sync.refreshStatus();
        return { message: 'Googleに接続しました。' };
      case 'saveSettings':
        return this.saveSettings(message.settings);
      default:
        throw new Error('不明な操作です。');
    }
  }

  /** アラームごとに同期または全削除の続きを実行する。 */
  async handleAlarm(alarm) {
    await this.ready;
    if (alarm.name === CLEAR_ALARM) return this.clear.processBatch();
    if (alarm.name === SYNC_ALARM) return this.sync.run();
  }
}
