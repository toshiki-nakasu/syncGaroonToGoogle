/** 全削除の確認画面と進捗、開始前の失敗理由を管理する。 */
export class CalendarClearView {
  constructor(request, onState) {
    this.request = request;
    this.onState = onState;
    this.feedback = document.querySelector('#feedback');
    this.pending = false;
    this.error = null;
    this.clearing = false;
    this.decision = null;
    document
      .querySelector('#clear-confirm')
      .addEventListener('click', () => this.decision?.(true));
    document
      .querySelector('#clear-cancel')
      .addEventListener('click', () => this.decision?.(false));
    document
      .querySelector('#clear-dialog')
      .addEventListener('cancel', (event) => {
        event.preventDefault();
        this.decision?.(false);
      });
  }

  /** 一覧直下の通知を更新する。 */
  showMessage(kind, message) {
    const panel = document.querySelector('#clear-progress');
    panel.hidden = false;
    panel.dataset.kind = kind;
    document.querySelector('#clear-message').textContent = message;
    document.querySelector('#clear-meter').hidden = true;
  }

  /** ダイアログの実行または取消の選択を待つ。 */
  confirm(preview) {
    const dialog = document.querySelector('#clear-dialog');
    document.querySelector('#clear-name').textContent = preview.name;
    document.querySelector('#clear-id').textContent = preview.calendarId;
    document.querySelector('#clear-count').textContent =
      `${preview.count}件 (繰り返し予定はシリーズ単位)`;
    document.querySelector('#clear-confirm').textContent =
      `${preview.count}件を全削除`;
    return new Promise((resolve) => {
      this.decision = (confirmed) => {
        this.decision = null;
        dialog.close();
        resolve(confirmed);
      };
      dialog.showModal();
      document.querySelector('#clear-cancel').focus();
    });
  }

  /** Workerの進捗と、画面に残した開始前のエラーを表示する。 */
  render(state) {
    if (this.pending && state?.kind !== 'clearing') return;
    if (this.error && state?.kind !== 'clearing') return;
    if (!state?.clearProgress && !state?.clearResult) return;
    const panel = document.querySelector('#clear-progress');
    panel.hidden = false;
    panel.dataset.kind =
      state.kind === 'clearing'
        ? 'clearing'
        : state.clearResult?.status || 'failed';
    document.querySelector('#clear-message').textContent =
      state.clearResult?.message || state.message;
    const meter = document.querySelector('#clear-meter');
    meter.hidden = state.kind !== 'clearing';
    if (state.clearProgress) {
      meter.max = state.clearProgress.total || 1;
      meter.value = state.clearProgress.done;
    }
  }

  /** 確認後だけ実行を要求し、どの段階で失敗しても通知を残す。 */
  async clear(calendarName) {
    let stage = '削除対象の取得';
    this.pending = true;
    this.error = null;
    this.showMessage(
      'preparing',
      '自動同期を停止し、削除対象の予定を確認しています。',
    );
    try {
      await chrome.storage.local.set({ calendarClearUiError: null });
      const preview = await this.request({
        type: 'prepareCalendarClear',
        calendarName,
      });
      document.querySelector('#autoSync').checked = false;
      if (!preview.exists || !preview.count) {
        const message = preview.exists
          ? `カレンダー「${preview.name}」に削除する予定はありません。`
          : `カレンダー「${preview.name}」は存在しません。`;
        this.showMessage('idle', message);
        this.feedback.textContent = message;
        return;
      }
      stage = '削除の確認';
      this.showMessage(
        'confirming',
        `「${preview.name}」の${preview.count}件を確認しています。`,
      );
      if (!(await this.confirm(preview))) {
        this.showMessage('cancelled', '予定の全削除をキャンセルしました。');
        this.feedback.textContent = '予定の全削除をキャンセルしました。';
        return;
      }
      stage = '削除開始 (対象の再照合と実行要求)';
      this.showMessage(
        'starting',
        `「${preview.name}」の削除を開始しています。対象を再照合しています。`,
      );
      document
        .querySelector('#clear-progress')
        .scrollIntoView?.({ block: 'nearest' });
      const state = await this.request({
        type: 'executeCalendarClear',
        token: preview.token,
        confirmed: true,
      });
      const latest = (await chrome.storage.local.get('state')).state || state;
      this.pending = false;
      this.clearing = latest.kind === 'clearing';
      this.onState(latest);
      if (!latest.clearProgress && !latest.clearResult) {
        throw new Error(
          '削除処理の結果を取得できませんでした。設定画面を開き直して状態を確認してください。',
        );
      }
      this.render(latest);
      this.feedback.textContent = latest.message;
    } catch (error) {
      const message = `「${calendarName}」の${stage}に失敗しました。${error.message}`;
      this.error = { message, stage };
      this.showMessage('failed', message);
      this.feedback.textContent = message;
      document
        .querySelector('#clear-progress')
        .scrollIntoView?.({ block: 'nearest' });
      // 画面を開き直した場合も、削除開始前の失敗理由を確認できるようにする。
      await chrome.storage.local
        .set({ calendarClearUiError: this.error })
        .catch(() => {});
    } finally {
      this.pending = false;
    }
  }

  /** 画面を開き直した場合も、削除開始前の失敗理由を復元する。 */
  async restore(state) {
    this.clearing = state?.kind === 'clearing';
    this.render(state);
    this.error = (
      await chrome.storage.local.get('calendarClearUiError')
    ).calendarClearUiError;
    if (this.error && !this.clearing)
      this.showMessage('failed', this.error.message);
  }

  /** Workerと別画面で保存された削除状態を表示へ反映する。 */
  update(changes) {
    if (changes.state) {
      this.clearing = changes.state.newValue?.kind === 'clearing';
      this.render(changes.state.newValue);
    }
    if (changes.calendarClearUiError) {
      this.error = changes.calendarClearUiError.newValue;
      if (this.error && !this.clearing)
        this.showMessage('failed', this.error.message);
    }
  }
}
