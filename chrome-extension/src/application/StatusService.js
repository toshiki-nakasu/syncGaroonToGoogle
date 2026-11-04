import { loadSettings } from '../config/Settings.js';
import { renderStatus } from '../infrastructure/StatusIcon.js';

/** 同期状態を保存し、アイコンと画面が同じ状態を参照できるようにする。 */
export class StatusService {
  constructor(api) {
    this.api = api;
  }

  /** 保存済みの状態を返す。 */
  async read() {
    return (await this.api.storage.local.get('state')).state;
  }

  /** 状態の永続化を終えてからアイコンを更新する。 */
  async set(kind, message, extra = {}) {
    const previous = (await this.read()) || {};
    const state = {
      ...previous,
      ...extra,
      kind,
      message,
      checkedAt: new Date().toISOString(),
    };
    await this.api.storage.local.set({ state });
    await this.render(state);
    return state;
  }

  /** 起動後に保存済みの状態をアイコンへ描画する。 */
  render(state) {
    return renderStatus(state, this.api);
  }

  /** ポップアップ用の状態へ、保存されたON/OFFを添える。 */
  async snapshot() {
    const state = await this.read();
    const settings = await loadSettings(this.api);
    return { ...state, autoSync: settings.autoSync };
  }
}
