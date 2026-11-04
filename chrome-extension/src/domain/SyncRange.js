/** 指定タイムゾーンの日付をYYYY-MM-DDで返す。 */
export function localDate(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
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
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(value));
    const get = (type) =>
      Number(parts.find((part) => part.type === type).value);
    const shown = Date.UTC(
      get('year'),
      get('month') - 1,
      get('day'),
      get('hour'),
      get('minute'),
      get('second'),
    );
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
