/** ページ側の公開APIからログイン名だけを取得する。Googleの認証情報は渡さない。 */
function readLoginUser() {
  try {
    const user = globalThis.garoon?.base?.user?.getLoginUser();
    return user ? { code: user.code, garoonId: user.garoonId } : null;
  } catch {
    return null;
  }
}

/**
 * GaroonタブのISOLATED環境で同一オリジンの読み取りAPIだけを呼び出す。
 * Cookieはブラウザーが送信する。Cookieを読み取ったり拡張側へ返したりしない。
 */
async function readSchedulePage(origin, userId, range, offset, limit) {
  if (location.origin !== origin || !location.pathname.startsWith('/g/')) {
    return { error: 'Garoonのタブが移動しました。' };
  }
  const url = new URL('/g/api/v1/schedule/events', origin);
  url.search = new URLSearchParams({
    // Garoonは開始より後、終了より前を検索するため境界に1秒の余裕を持たせる。
    rangeStart: new Date(Date.parse(range.start) - 1000).toISOString(),
    rangeEnd: new Date(Date.parse(range.end) + 1000).toISOString(),
    target: userId,
    targetType: 'user',
    orderBy: 'start asc',
    offset: String(offset),
    limit: String(limit),
  }).toString();
  try {
    const response = await fetch(url.href, {
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      return { error: `Garoon APIがHTTP ${response.status}を返しました。ログイン状態とアクセス権を確認してください。` };
    }
    if (!response.headers.get('content-type')?.includes('application/json')) {
      return { error: 'GaroonからJSONを取得できません。再ログインしてください。' };
    }
    const data = await response.json();
    if (!Array.isArray(data.events) || typeof data.hasNext !== 'boolean') {
      return { error: 'Garoonの応答形式が不正です。同期を中止しました。' };
    }
    return { events: data.events, hasNext: data.hasNext };
  } catch {
    return { error: 'Garoonへ接続できません。ログイン状態とネットワークを確認してください。' };
  }
}

export class GaroonClient {
  constructor(settings, browser = chrome) {
    this.settings = settings;
    this.browser = browser;
    this.tab = null;
    this.userId = null;
  }

  /** ログイン済みで設定したユーザーに一致するGaroonタブを選択する。 */
  async connect() {
    const tabs = await this.browser.tabs.query({ url: `${this.settings.origin}/g/*` });
    for (const tab of tabs) {
      if (tab.discarded || tab.status !== 'complete') continue;
      try {
        const [result] = await this.browser.scripting.executeScript({
          target: { tabId: tab.id }, world: 'MAIN', func: readLoginUser,
        });
        const user = result?.result;
        if (user?.code === this.settings.userCode && user.garoonId) {
          this.tab = tab;
          this.userId = String(user.garoonId);
          return;
        }
      } catch {
        // 別の対象タブが使える場合は、そちらを試す。
      }
    }
    throw new Error('設定したユーザーでログイン済みのGaroonタブを開いてください。休止中のタブは一度表示してください。');
  }

  /** 1ページ取得する。失敗やHTML応答は空配列として扱わない。 */
  async readPage(range, offset, limit = 200) {
    const [result] = await this.browser.scripting.executeScript({
      target: { tabId: this.tab.id }, world: 'ISOLATED',
      func: readSchedulePage,
      args: [this.settings.origin, this.userId, range, offset, limit],
    });
    const data = result?.result;
    if (!data || data.error) throw new Error(data?.error || 'Garoonタブから応答がありません。');
    return data;
  }

  /** 全ページを取得する。短いページでもhasNextを優先し、上限到達時は失敗とする。 */
  async listEvents(range, check = async () => {}) {
    const events = [];
    const seen = new Set();
    for (let page = 0; page < 100; page++) {
      await check();
      const data = await this.readPage(range, page * 200);
      for (const event of data.events) {
        const key = `${event.id}-${event.repeatId || ''}`;
        if (!event.id || seen.has(key)) {
          throw new Error('Garoon予定の重複または不正なIDを検出しました。次回の同期で再取得します。');
        }
        seen.add(key);
        events.push(event);
      }
      if (!data.hasNext) return events;
    }
    throw new Error('Garoon予定の取得上限に達しました。同期期間を短くしてください。');
  }
}
