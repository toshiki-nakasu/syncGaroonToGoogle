/** 自動同期のON/OFFを保存し、停止要求とアラームを一貫させる。 */
export class AutoSyncService {
  constructor({ operations, settings, scheduler, status, sync, clear }) {
    Object.assign(this, {
      operations,
      settings,
      scheduler,
      status,
      sync,
      clear,
    });
  }

  /** ON/OFFを保存する。OFFは進行中の同期にも停止を要求する。 */
  async setEnabled(enabled) {
    if (typeof enabled !== 'boolean')
      throw new Error('自動同期の設定が不正です。');
    return this.operations.updateSettings(async () => {
      const settings = await this.settings.load();
      if (enabled && (await this.clear.isRunning()))
        throw new Error('予定の全削除が完了するまで自動同期は再開できません。');
      if (enabled && this.sync.stopRequested)
        throw new Error(
          '停止処理中です。中断が完了してから自動同期を再開してください。',
        );
      if (enabled) await this.settings.configured();
      if (!enabled) this.sync.requestStop();
      const updated = { ...settings, autoSync: enabled };
      await this.settings.write(updated);
      await this.scheduler.reconcile(updated);
      if (this.sync.stopRequested) {
        await this.status.set(
          'syncing',
          '停止を要求しました。実行中のリクエストが完了したら中断します。',
        );
      } else if (!enabled && !(await this.clear.isRunning())) {
        await this.status.set(
          'paused',
          '自動同期を停止しました。手動同期は利用できます。',
        );
      } else if (!this.operations.running) {
        await this.sync.refreshStatus();
      }
      return this.status.snapshot();
    });
  }
}
