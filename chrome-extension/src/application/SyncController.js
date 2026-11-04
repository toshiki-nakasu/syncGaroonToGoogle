import { syncRange } from '../domain/SyncRange.js';
import { SyncService } from './SyncService.js';

/** 同期の開始と中断、接続確認後の同期状態を管理する。 */
export class SyncController {
  constructor({ api, operations, settings, connections, status, clear }) {
    Object.assign(this, {
      api,
      operations,
      settings,
      connections,
      status,
      clear,
    });
    this.active = null;
  }

  /** 停止要求を、実行中の同期の次の確認地点へ伝える。 */
  requestStop() {
    if (this.active) this.active.stopRequested = true;
  }

  /** 中断が完了する前の再開を防ぐため、停止要求の有無を公開する。 */
  get stopRequested() {
    return this.active?.stopRequested === true;
  }

  /** 読み取り専用で接続を検証し、同期状態を更新する。 */
  async refreshStatus(checkPaused = false) {
    return this.operations.run(async () => {
      if (await this.clear.isRunning())
        return (await this.api.storage.local.get('state')).state;
      try {
        const settings = await this.settings.configured();
        if (!settings.autoSync && !checkPaused)
          return await this.status.set(
            'paused',
            '自動同期は停止中です。手動同期は利用できます。',
          );
        const connections = await Promise.allSettled([
          this.connections.garoon(settings),
          this.connections.google(),
        ]);
        const failures = connections.filter(
          (result) => result.status === 'rejected',
        );
        if (failures.length)
          throw new Error(
            failures.map((result) => result.reason.message).join('\n'),
          );
        const { state } = await this.api.storage.local.get('state');
        if (
          state?.kind === 'unavailable' &&
          state.clearResult?.status === 'failed'
        )
          return state;
        const current = await this.settings.load();
        return await this.status.set(
          current.autoSync ? 'ready' : 'paused',
          current.autoSync
            ? `GaroonとGoogleに接続できます。${current.syncIntervalMinutes}分ごとに同期します。`
            : 'GaroonとGoogleに接続できます。自動同期は停止中です。',
        );
      } catch (error) {
        return await this.status.set('unavailable', error.message);
      }
    });
  }

  /** 同期を排他実行し、停止と実行期限をAPI操作の間で確認する。 */
  async run(manual = false) {
    return this.operations.run(async () => {
      if (await this.clear.isRunning())
        throw new Error('予定を全削除しています。完了後に同期してください。');
      let settings;
      const control = { stopRequested: false };
      this.active = control;
      try {
        settings = await this.settings.configured();
        if (!manual && !settings.autoSync)
          return await this.status.set('paused', '自動同期は停止中です。');
        await this.status.set('syncing', '予定を取得して同期しています。', {
          clearProgress: null,
        });
        const { garoon } = await this.connections.garoon(settings);
        const google = await this.connections.google();
        const { calendarWriteGenerations = {} } =
          await this.api.storage.local.get('calendarWriteGenerations');
        const deadline = Date.now() + 220000;
        const check = async () => {
          if (control.stopRequested) {
            const error = new Error(
              '自動同期を停止しました。実行中の処理も中断しました。',
            );
            error.name = 'SyncStoppedError';
            throw error;
          }
          if (Date.now() > deadline)
            throw new Error(
              '同期を時間内に完了できませんでした。次回に再取得します。件数が多い場合は同期期間を短くしてください。',
            );
          if (garoon.tab) {
            const tab = await this.api.tabs.get(garoon.tab.id);
            if (
              !tab.url?.startsWith(`${settings.origin}/g/`) ||
              tab.discarded
            ) {
              throw new Error(
                'Garoonのタブが閉じられたか移動しました。再度開いてください。',
              );
            }
          }
        };
        const summary = await new SyncService(garoon, google, {
          ...settings,
          calendarWriteGenerations,
        }).sync(syncRange(settings), check);
        await check();
        const current = await this.settings.load();
        return await this.status.set(
          current.autoSync ? 'ready' : 'paused',
          '同期が完了しました。',
          {
            lastSuccessAt: new Date().toISOString(),
            summary,
          },
        );
      } catch (error) {
        if (error.name === 'SyncStoppedError')
          return await this.status.set('paused', error.message);
        await this.status.set('unavailable', error.message);
        throw error;
      } finally {
        this.active = null;
      }
    });
  }
}
