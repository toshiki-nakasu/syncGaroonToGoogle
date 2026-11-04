import { loadSettings, validateSettings } from '../config/Settings.js';

/** 設定の読み書きと入力の検証を受け持つ。 */
export class SettingsService {
  constructor(api) {
    this.api = api;
  }

  /** 保存済みの設定へ省略時の値を補う。 */
  load() {
    return loadSettings(this.api);
  }

  /** 接続先への許可を含めて、同期可能な設定か検証する。 */
  async configured(input) {
    const settings = validateSettings(input ?? (await this.load()));
    if (
      !(await this.api.permissions.contains({
        origins: [`${settings.origin}/*`],
      }))
    ) {
      throw new Error('設定画面でGaroonへのアクセスを許可してください。');
    }
    return settings;
  }

  /** 検証済みの設定または停止設定を保存する。 */
  async write(settings) {
    await this.api.storage.local.set({ settings });
  }
}
