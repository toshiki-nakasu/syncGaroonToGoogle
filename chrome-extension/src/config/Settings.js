export const SYNC_ALARM = 'garoon-calendar-sync';
export const DEFAULT_SYNC_MINUTES = 5;
export const TAG_ID = 'GAROON_UNIQUE_EVENT_ID';
export const TAG_UPDATED = 'GAROON_SYNC_DATETIME';
export const TAG_SOURCE = 'GAROON_SYNC_SOURCE';
export const MAX_CALENDAR_MAPPINGS = 21;
export const DEFAULT_SETTINGS = Object.freeze({
  origin: '',
  userCode: '',
  calendarMappings: [{ tag: '', calendarName: 'Garoon' }],
  daysAgo: 7,
  daysAfter: 90,
  timeZone: 'Asia/Tokyo',
  autoSync: true,
  syncIntervalMinutes: DEFAULT_SYNC_MINUTES,
});

/** 設定を検証し、保存可能な値だけを返す。 */
export function validateSettings(input) {
  const origin = new URL(input.origin);
  if (
    origin.protocol !== 'https:' ||
    !/^[a-z0-9-]+(?:\.s)?\.cybozu\.com$/.test(origin.hostname) ||
    origin.port ||
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash
  ) {
    throw new Error(
      'GaroonのURLには https://example.cybozu.com の形式でオリジンを指定してください。',
    );
  }
  const userCode = String(input.userCode || '').trim();
  if (!userCode) {
    throw new Error('Garoonのログイン名を指定してください。');
  }
  if (
    !Array.isArray(input.calendarMappings) ||
    !input.calendarMappings.length ||
    input.calendarMappings.length > MAX_CALENDAR_MAPPINGS
  ) {
    throw new Error(
      `同期先は1から${MAX_CALENDAR_MAPPINGS}行で指定してください。`,
    );
  }
  const calendarMappings = input.calendarMappings.map((mapping) => {
    if (
      !mapping ||
      typeof mapping.tag !== 'string' ||
      typeof mapping.calendarName !== 'string'
    ) {
      throw new Error('同期先のタグとカレンダー名を指定してください。');
    }
    return {
      tag: mapping.tag.trim().replace(/^#/, ''),
      calendarName: mapping.calendarName.trim(),
    };
  });
  if (
    calendarMappings.some(
      ({ tag }) =>
        (tag && !/^\w+$/.test(tag)) || tag.toLowerCase() === 'nosync',
    )
  ) {
    throw new Error(
      'タグは英数字とアンダースコアで指定してください。nosyncは予約語です。',
    );
  }
  if (
    calendarMappings.some(
      ({ calendarName }) => !calendarName || calendarName.length > 1024,
    )
  ) {
    throw new Error('カレンダー名は1から1024文字で指定してください。');
  }
  if (
    new Set(calendarMappings.map(({ tag }) => tag.toLowerCase())).size !==
    calendarMappings.length
  ) {
    throw new Error(
      '同じタグは1行だけ設定できます。タグ未指定の行も1行までです。',
    );
  }
  for (const key of ['daysAgo', 'daysAfter']) {
    if (!Number.isInteger(input[key]) || input[key] < 0 || input[key] > 366) {
      throw new Error('同期期間は0から366日までの整数で指定してください。');
    }
  }
  const syncIntervalMinutes = input.syncIntervalMinutes ?? DEFAULT_SYNC_MINUTES;
  if (!Number.isSafeInteger(syncIntervalMinutes) || syncIntervalMinutes < 1) {
    throw new Error('自動同期の間隔は1分以上の整数で指定してください。');
  }
  new Intl.DateTimeFormat('en', { timeZone: input.timeZone }).format();
  return {
    origin: origin.origin,
    userCode,
    calendarMappings,
    daysAgo: input.daysAgo,
    daysAfter: input.daysAfter,
    timeZone: input.timeZone,
    autoSync: input.autoSync === true,
    syncIntervalMinutes,
  };
}

/** ローカル設定を返す。 */
export async function loadSettings(api = chrome) {
  const { settings } = await api.storage.local.get('settings');
  const { calendarName, tagCalendars, ...current } = settings || {};
  const calendarMappings =
    current.calendarMappings ??
    (calendarName
      ? [
          { tag: '', calendarName },
          ...(tagCalendars || []).map((name) => ({
            tag: name,
            calendarName: name,
          })),
        ]
      : structuredClone(DEFAULT_SETTINGS.calendarMappings));
  return { ...DEFAULT_SETTINGS, ...current, calendarMappings };
}

/** 同期元をテナントとログイン名で分離する。 */
export function sourceKey(settings) {
  return `${settings.origin}|${settings.userCode}`;
}
