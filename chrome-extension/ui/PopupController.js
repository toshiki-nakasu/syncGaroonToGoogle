import { loadSettings } from '../src/config/Settings.js';
import { renderConnection } from './ConnectionStatus.js';

const LABELS = {
  ready: '同期可',
  syncing: '同期中',
  clearing: '予定を全削除中',
  unavailable: '同期不可',
  paused: '停止中',
};

/** ポップアップの表示と操作を、画面ごとの状態で管理する。 */
export class PopupController {
  constructor(api = chrome, root = document) {
    this.api = api;
    this.root = root;
    this.autoSync = null;
    this.state = null;
    this.syncPending = false;
    this.togglePending = false;
  }

  /** 操作と保存領域の通知を登録し、接続を読み取り専用で確認する。 */
  async start() {
    this.element('sync').addEventListener('click', () => this.sync());
    this.element('auto-sync').addEventListener('click', () => this.toggle());
    this.element('options').addEventListener('click', () =>
      this.api.runtime.openOptionsPage(),
    );
    this.api.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes.settings)
        this.autoSync = changes.settings.newValue?.autoSync !== false;
      this.render(changes.state?.newValue);
      for (const provider of ['garoon', 'google']) {
        if (changes[`${provider}Connection`])
          renderConnection(
            provider,
            changes[`${provider}Connection`].newValue,
            this.root,
          );
      }
    });
    try {
      this.autoSync = (await loadSettings(this.api)).autoSync;
      this.render((await this.api.storage.local.get('state')).state);
      for (const provider of ['garoon', 'google']) {
        const key = `${provider}Connection`;
        renderConnection(
          provider,
          (await this.api.storage.local.get(key))[key],
          this.root,
        );
      }
      await this.request('status');
    } catch (error) {
      this.showFeedback(error.message);
    }
  }

  /** 画面のIDから表示要素を取得する。 */
  element(id) {
    return this.root.querySelector(`#${id}`);
  }

  /** 実行失敗を操作の近くへ表示する。 */
  showFeedback(message = '') {
    const feedback = this.element('feedback');
    feedback.textContent = message;
    feedback.hidden = !message;
  }

  /** 同期状態と操作の可否を更新する。 */
  render(state) {
    if (state) this.state = state;
    state = this.state;
    const toggle = this.element('auto-sync');
    toggle.textContent =
      this.autoSync === null
        ? '読み込み中'
        : this.autoSync
          ? '自動同期を停止'
          : '自動同期を再開';
    toggle.disabled =
      this.autoSync === null ||
      this.togglePending ||
      state?.kind === 'clearing';
    this.element('sync').disabled =
      this.syncPending || ['syncing', 'clearing'].includes(state?.kind);
    if (!state) return;
    this.element('status').dataset.kind = state.kind;
    this.element('label').textContent = LABELS[state.kind] || '同期不可';
    const message = this.element('message');
    message.hidden = !['unavailable', 'syncing', 'clearing'].includes(
      state.kind,
    );
    message.textContent = message.hidden ? '' : state.message;
    this.element('last-success').textContent =
      `最終同期: ${state.lastSuccessAt ? new Date(state.lastSuccessAt).toLocaleString('ja-JP') : '未実行'}`;
    const value = state.summary;
    this.element('summary').textContent = value
      ? `作成 ${value.created}件, 更新 ${value.updated}件, 移動 ${value.moved}件, 削除 ${value.deleted}件`
      : '';
  }

  /** Workerから返った状態へ画面を合わせる。 */
  async request(type, extra = {}) {
    const response = await this.api.runtime.sendMessage({ type, ...extra });
    if (!response.ok) throw new Error(response.error);
    if (typeof response.value?.autoSync === 'boolean')
      this.autoSync = response.value.autoSync;
    this.render(response.value);
    return response.value;
  }

  /** 同期中の二重送信を防いで手動同期を依頼する。 */
  async sync() {
    this.syncPending = true;
    this.showFeedback();
    this.render();
    try {
      await this.request('sync');
    } catch (error) {
      this.showFeedback(error.message);
    } finally {
      this.syncPending = false;
      this.render();
    }
  }

  /** 保存された間隔を変更せずにON/OFFだけを依頼する。 */
  async toggle() {
    this.togglePending = true;
    this.showFeedback();
    this.render();
    try {
      await this.request('setAutoSync', { enabled: !this.autoSync });
    } catch (error) {
      this.showFeedback(error.message);
    } finally {
      this.togglePending = false;
      this.render();
    }
  }
}
