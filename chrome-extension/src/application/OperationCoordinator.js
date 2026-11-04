/** Worker内の処理の排他と、設定の更新順を管理する。 */
export class OperationCoordinator {
  constructor() {
    this.running = false;
    this.finished = Promise.resolve();
    this.settingsUpdate = Promise.resolve();
  }

  /** 同期, 全削除, 接続確認を同時に実行させない。 */
  async run(action) {
    if (this.running)
      throw new Error(
        '同期または接続確認が進行中です。完了後に再実行してください。',
      );
    this.running = true;
    let finish;
    this.finished = new Promise((resolve) => {
      finish = resolve;
    });
    try {
      return await action();
    } finally {
      this.running = false;
      finish();
    }
  }

  /** 停止要求は実行中でも受け付け、設定変更の書き込み順は保つ。 */
  updateSettings(action) {
    const update = this.settingsUpdate.then(action);
    this.settingsUpdate = update.catch(() => {});
    return update;
  }
}
