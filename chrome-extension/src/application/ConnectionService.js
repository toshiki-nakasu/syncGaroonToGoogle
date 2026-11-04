import { syncRange } from '../domain/SyncRange.js';
import { GaroonClient } from '../infrastructure/GaroonClient.js';
import { GoogleCalendarClient } from '../infrastructure/GoogleCalendarClient.js';

/** 接続の検証と、接続先ごとの結果の保存を受け持つ。 */
export class ConnectionService {
  constructor(api) {
    this.api = api;
  }

  /** 接続先ごとの結果を保存し、失敗は呼び出し元へ返す。 */
  async verify(provider, action) {
    const key = `${provider}Connection`;
    const save = (kind, message) =>
      this.api.storage.local.set({
        [key]: { kind, message, checkedAt: new Date().toISOString() },
      });
    await save('checking', '接続を確認しています。');
    try {
      const value = await action();
      await save('connected', '接続できます。');
      return value;
    } catch (error) {
      await save('unavailable', error.message);
      throw error;
    }
  }

  /** Garoonのセッションと予定の読み取り権限を検証する。 */
  garoon(settings) {
    return this.verify('garoon', async () => {
      const garoon = new GaroonClient(settings, this.api);
      await garoon.connect();
      const data = await garoon.readPage(syncRange(settings), 0, 1);
      return { garoon, data };
    });
  }

  /** Google認証とCalendar APIへの接続を検証する。 */
  google(interactive = false) {
    return this.verify('google', async () => {
      const google = await GoogleCalendarClient.authenticate(interactive);
      await google.request('users/me/calendarList', {
        query: { maxResults: '1' },
      });
      return google;
    });
  }
}
