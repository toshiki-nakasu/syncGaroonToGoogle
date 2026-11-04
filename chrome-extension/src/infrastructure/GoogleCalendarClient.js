const API_BASE = 'https://www.googleapis.com/calendar/v3/';

export class GoogleCalendarClient {
  constructor(token, fetcher = fetch) {
    this.token = token;
    // Workerのfetchはグローバルオブジェクトをthisとして呼び出す必要がある。
    this.fetcher = fetcher.bind(globalThis);
  }

  /** Google認証は拡張機能内だけで行う。定期同期では認証画面を出さない。 */
  static async authenticate(interactive = false) {
    const result = await chrome.identity.getAuthToken({ interactive });
    const token = typeof result === 'string' ? result : result?.token;
    if (!token) throw new Error('設定画面でGoogleへの接続を行ってください。');
    return new GoogleCalendarClient(token);
  }

  /** APIリクエスト。失敗は呼び出し元へ返し、不完全な取得結果を使わせない。 */
  async request(
    path,
    { method = 'GET', query = {}, body, allowMissing = false, ifMatch } = {},
  ) {
    const url = new URL(path, API_BASE);
    if (!url.href.startsWith(API_BASE))
      throw new Error('不正なGoogle API URLです。');
    url.search = new URLSearchParams(query).toString();
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await this.fetcher(url.href, {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          ...(ifMatch ? { 'If-Match': ifMatch } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(20000),
        redirect: 'error',
      });
      if (response.status === 401) {
        if (globalThis.chrome?.identity) {
          await chrome.identity.removeCachedAuthToken({ token: this.token });
        }
        throw Object.assign(
          new Error(
            'Googleの認証が切れました。設定画面でGoogle Calendarの「認証と接続を検証」を実行してください。',
          ),
          { status: 401 },
        );
      }
      if (allowMissing && [404, 410].includes(response.status)) return null;
      if ([429, 500, 502, 503, 504].includes(response.status) && attempt < 2) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * 2 ** attempt),
        );
        continue;
      }
      if (!response.ok) {
        let detail = '';
        try {
          const payload = await response.json();
          if (typeof payload.error?.message === 'string')
            detail = ` ${payload.error.message}`;
        } catch {
          // JSON以外のエラー応答でもHTTPステータスは必ず報告する。
        }
        const error = new Error(
          `Google Calendar APIがHTTP ${response.status}を返しました。${detail} APIの有効化、認証とカレンダーの権限を確認してください。`,
        );
        error.status = response.status;
        throw error;
      }
      if (response.status === 204 || method === 'DELETE') return null;
      return response.json();
    }
  }

  /** ページトークンがある限り全ページを取得する。 */
  async listAll(path, query, check = async () => {}) {
    const items = [];
    const seen = new Set();
    let pageToken = '';
    for (let page = 0; page < 100; page++) {
      await check();
      const data = await this.request(path, {
        query: { ...query, ...(pageToken ? { pageToken } : {}) },
      });
      const pageItems =
        data.items ??
        (['calendar#events', 'calendar#calendarList'].includes(data.kind)
          ? []
          : null);
      if (!Array.isArray(pageItems))
        throw new Error('Google Calendar APIの応答形式が不正です。');
      items.push(...pageItems);
      if (!data.nextPageToken) return items;
      if (seen.has(data.nextPageToken))
        throw new Error('Google Calendar APIのページが循環しています。');
      seen.add(data.nextPageToken);
      pageToken = data.nextPageToken;
    }
    throw new Error(
      'Googleカレンダーの取得上限に達しました。同期期間を短くしてください。',
    );
  }

  /** 同名カレンダーを解決し、存在しなければ作成する。複数候補は中止する。 */
  async resolveCalendars(settings, check) {
    const available = await this.listAll(
      'users/me/calendarList',
      { maxResults: '250' },
      check,
    );
    const calendars = new Map();
    for (const name of new Set(
      settings.calendarMappings.map((mapping) => mapping.calendarName),
    )) {
      await check();
      const matches = available.filter((calendar) => calendar.summary === name);
      if (matches.length > 1)
        throw new Error(
          `同名のカレンダー「${name}」が複数あります。名前を一意にしてください。`,
        );
      let calendar = matches[0];
      if (calendar && !['owner', 'writer'].includes(calendar.accessRole)) {
        throw new Error(`カレンダー「${name}」に書き込み権限がありません。`);
      }
      if (!calendar) {
        calendar = await this.request('calendars', {
          method: 'POST',
          body: { summary: name, timeZone: settings.timeZone },
        });
      }
      calendars.set(name, calendar.id);
    }
    return calendars;
  }

  /** 期間内のGoogle予定を全件取得する。 */
  async listEvents(calendarId, range, check) {
    return this.listAll(
      this.eventsPath(calendarId),
      {
        timeMin: range.start,
        timeMax: range.end,
        maxResults: '2500',
        singleEvents: 'true',
        showDeleted: 'false',
      },
      check,
    );
  }

  /** イベントのエンドポイントを生成する。 */
  eventsPath(calendarId, eventId) {
    return `calendars/${encodeURIComponent(calendarId)}/events${eventId ? `/${encodeURIComponent(eventId)}` : ''}`;
  }

  /** 削除済みならnull、取得失敗なら例外を返す。 */
  async getEvent(calendarId, eventId) {
    return this.request(this.eventsPath(calendarId, eventId), {
      allowMissing: true,
    });
  }

  /** イベントを作成する。再試行でも同じIDを使い二重登録を防ぐ。 */
  async insertEvent(calendarId, event) {
    return this.request(this.eventsPath(calendarId), {
      method: 'POST',
      query: { sendUpdates: 'none' },
      body: event,
    });
  }

  /** 管理対象項目だけを更新し、既存の他の拡張プロパティを残す。 */
  async patchEvent(calendarId, eventId, body) {
    return this.request(this.eventsPath(calendarId, eventId), {
      method: 'PATCH',
      query: { sendUpdates: 'none' },
      body,
    });
  }

  /** 同期管理対象のイベントを削除する。削除済みなら成功扱い。 */
  async deleteEvent(calendarId, eventId, etag) {
    return this.request(this.eventsPath(calendarId, eventId), {
      method: 'DELETE',
      query: { sendUpdates: 'none' },
      allowMissing: true,
      ifMatch: etag,
    });
  }
}
