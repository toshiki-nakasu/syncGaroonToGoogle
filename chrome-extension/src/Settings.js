export const SYNC_ALARM = 'garoon-calendar-sync';
export const SYNC_MINUTES = 5;
export const TAG_ID = 'GAROON_UNIQUE_EVENT_ID';
export const TAG_UPDATED = 'GAROON_SYNC_DATETIME';
export const TAG_SOURCE = 'GAROON_SYNC_SOURCE';
export const DEFAULT_SETTINGS = Object.freeze({
  origin: '',
  userCode: '',
  calendarName: 'Garoon',
  tagCalendars: [],
  daysAgo: 7,
  daysAfter: 90,
  timeZone: 'Asia/Tokyo',
  autoSync: true,
  adoptLegacy: false,
});

/** 設定を検証し、保存可能な値だけを返す。 */
export function validateSettings(input) {
  const origin = new URL(input.origin);
  if (
    origin.protocol !== 'https:' ||
    !/^[a-z0-9-]+(?:\.s)?\.cybozu\.com$/.test(origin.hostname) ||
    origin.port || origin.username || origin.password ||
    origin.pathname !== '/' || origin.search || origin.hash
  ) {
    throw new Error('GaroonのURLには https://example.cybozu.com の形式でオリジンを指定してください。');
  }
  const userCode = String(input.userCode || '').trim();
  const calendarName = String(input.calendarName || '').trim();
  if (!userCode || !calendarName) {
    throw new Error('Garoonのログイン名と同期先カレンダー名を指定してください。');
  }
  if (!Array.isArray(input.tagCalendars) || input.tagCalendars.length > 20) {
    throw new Error('振り分け先は20件以内で指定してください。');
  }
  const tagCalendars = input.tagCalendars.map((name) => String(name).trim());
  if (tagCalendars.some((name) => !/^\w+$/.test(name) || name.toLowerCase() === 'nosync')) {
    throw new Error('振り分け先は英数字とアンダースコアで指定してください。nosyncは予約語です。');
  }
  if (new Set(tagCalendars.map((name) => name.toLowerCase())).size !== tagCalendars.length) {
    throw new Error('振り分け先の名前が重複しています。');
  }
  for (const key of ['daysAgo', 'daysAfter']) {
    if (!Number.isInteger(input[key]) || input[key] < 0 || input[key] > 366) {
      throw new Error('同期期間は0から366日までの整数で指定してください。');
    }
  }
  new Intl.DateTimeFormat('en', { timeZone: input.timeZone }).format();
  return {
    origin: origin.origin,
    userCode,
    calendarName,
    tagCalendars,
    daysAgo: input.daysAgo,
    daysAfter: input.daysAfter,
    timeZone: input.timeZone,
    autoSync: input.autoSync === true,
    adoptLegacy: input.adoptLegacy === true,
  };
}

/** ローカル設定を返す。 */
export async function loadSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...settings };
}

/** 同期元をテナントとログイン名で分離する。 */
export function sourceKey(settings) {
  return `${settings.origin}|${settings.userCode}`;
}

/** 指定タイムゾーンの日付をYYYY-MM-DDで返す。 */
export function localDate(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const value = (type) => parts.find((part) => part.type === type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

/** カレンダー上の日付を加算する。 */
export function addDays(date, days) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** IANAタイムゾーンの午前0時をUTC日時へ変換する。 */
function midnight(date, timeZone) {
  const utc = Date.parse(`${date}T00:00:00Z`);
  let value = utc;
  for (let index = 0; index < 4; index++) {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(value));
    const get = (type) => Number(parts.find((part) => part.type === type).value);
    const shown = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
    const delta = utc - shown;
    value += delta;
    if (!delta) return new Date(value).toISOString();
  }
  throw new Error('指定タイムゾーンの日付境界を解決できません。');
}

/** 今日を含む日単位の同期期間を生成する。終了は翌日の0時(排他)。 */
export function syncRange(settings, now = new Date()) {
  const today = localDate(now, settings.timeZone);
  return {
    start: midnight(addDays(today, -settings.daysAgo), settings.timeZone),
    end: midnight(addDays(today, settings.daysAfter + 1), settings.timeZone),
  };
}
