import { loadSettings, validateSettings } from '../src/config/Settings.js';
import { CalendarMappingEditor } from './CalendarMappingEditor.js';
import { CalendarClearView } from './CalendarClearView.js';
import { renderConnection } from './ConnectionStatus.js';

const FIELDS = [
  'origin',
  'userCode',
  'daysAgo',
  'daysAfter',
  'timeZone',
  'syncIntervalMinutes',
];

/** 設定フォームの読み込み, 保存, 操作中の編集制御を受け持つ。 */
export class OptionsController {
  constructor() {
    this.form = document.querySelector('#settings');
    this.feedback = document.querySelector('#feedback');
    this.busy = true;
    this.clearing = false;
    this.clearView = new CalendarClearView(
      (message) => this.send(message),
      (state) => this.updateState(state),
    );
    this.calendars = new CalendarMappingEditor(
      document.querySelector('#calendar-rows'),
      (name) => this.run(() => this.clearView.clear(name)),
    );
  }

  /** 画面イベントを登録し、保存済みの設定を読み込む。 */
  async start() {
    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      return this.run(() => this.save());
    });
    for (const [id, type] of [
      ['probe', 'probe'],
      ['google', 'connectGoogle'],
    ]) {
      document.getElementById(id).addEventListener('click', () =>
        this.run(async () => {
          this.feedback.textContent = '接続を検証しています。';
          await this.send({ type });
        }),
      );
    }
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes.settings)
        document.querySelector('#autoSync').checked =
          changes.settings.newValue?.autoSync === true;
      this.clearView.update(changes);
      if (changes.state) this.updateState(changes.state.newValue);
      for (const provider of ['garoon', 'google']) {
        if (changes[`${provider}Connection`])
          renderConnection(provider, changes[`${provider}Connection`].newValue);
      }
    });
    this.render();
    try {
      await this.load();
    } catch (error) {
      this.feedback.textContent = error.message;
    } finally {
      this.busy = false;
      this.render();
    }
  }

  /** 全削除の実行状態に合わせてフォームを制御する。 */
  updateState(state) {
    this.clearing = state?.kind === 'clearing';
    this.render();
  }

  /** 操作中の二重送信を防ぎ、画面内にエラーを表示する。 */
  async run(action) {
    if (this.busy) return;
    this.busy = true;
    this.render();
    try {
      await action();
    } catch (error) {
      this.feedback.textContent = error.message;
    } finally {
      this.busy = false;
      this.render();
    }
  }

  /** 入力と各操作の可否を現在の処理状態へ合わせる。 */
  render() {
    const locked = this.busy || this.clearing;
    for (const element of this.form.querySelectorAll('input, button'))
      element.disabled = locked;
    this.calendars.setDisabled(locked);
    for (const id of ['probe', 'google'])
      document.getElementById(id).disabled = locked;
  }

  /** 設定と削除結果、接続結果を復元する。 */
  async load() {
    const settings = await loadSettings();
    for (const key of FIELDS)
      document.getElementById(key).value = settings[key];
    for (const mapping of settings.calendarMappings)
      this.calendars.add(mapping);
    document.querySelector('#autoSync').checked = settings.autoSync;
    const { state } = await chrome.storage.local.get('state');
    this.updateState(state);
    await this.clearView.restore(state);
    for (const provider of ['garoon', 'google']) {
      const key = `${provider}Connection`;
      renderConnection(provider, (await chrome.storage.local.get(key))[key]);
    }
  }

  /** 入力値を検証し、ユーザー操作内でGaroonのホスト許可を要求する。 */
  async save() {
    this.feedback.textContent = '';
    const input = Object.fromEntries(
      FIELDS.map((key) => [key, document.getElementById(key).value]),
    );
    const settings = validateSettings({
      ...input,
      daysAgo: Number(input.daysAgo),
      daysAfter: Number(input.daysAfter),
      syncIntervalMinutes: Number(input.syncIntervalMinutes),
      calendarMappings: this.calendars.values(),
      autoSync: document.querySelector('#autoSync').checked,
    });
    if (
      !(await chrome.permissions.request({ origins: [`${settings.origin}/*`] }))
    ) {
      throw new Error('Garoonへのアクセスが許可されませんでした。');
    }
    await this.send({ type: 'saveSettings', settings });
  }

  /** Workerへ操作を依頼し、処理結果をフォームの通知欄へ返す。 */
  async send(message) {
    const response = await chrome.runtime.sendMessage(message);
    if (!response.ok) throw new Error(response.error);
    if (response.value?.message)
      this.feedback.textContent = response.value.message;
    return response.value;
  }
}
