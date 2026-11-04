import {
  sourceKey,
  TAG_ID,
  TAG_UPDATED,
  TAG_SOURCE,
} from '../config/Settings.js';
import { addDays, localDate } from './SyncRange.js';

/** メモ内のタグを出現順で解決する。nosyncを最優先する。 */
export function targetCalendar(event, settings) {
  const tags = [...String(event.notes || '').matchAll(/#(\w+)/g)].map((match) =>
    match[1].toLowerCase(),
  );
  if (tags.includes('nosync')) return null;
  for (const tag of tags) {
    const mapping = settings.calendarMappings.find(
      (mapping) => mapping.tag.toLowerCase() === tag,
    );
    if (mapping) return mapping.calendarName;
  }
  return (
    settings.calendarMappings.find((mapping) => mapping.tag === '')
      ?.calendarName || null
  );
}

/** Garoon予定の個別IDを生成する。繰り返しは1回ずつ扱う。 */
export function uniqueId(event) {
  if (!event.id) throw new Error('Garoon予定のIDがありません。');
  return `${event.id}${event.repeatId ? `-${event.repeatId}` : ''}`;
}

/** 予定に保存されたGaroon識別子を取得し、明示的に異なる同期元は除外する。 */
export function managedTags(event, settings) {
  const own = event.extendedProperties?.private || {};
  const shared = event.extendedProperties?.shared || {};
  const sources = [own[TAG_SOURCE], shared[TAG_SOURCE]].filter(Boolean);
  if (sources.some((source) => source !== sourceKey(settings))) return null;
  if (own[TAG_ID] && shared[TAG_ID] && own[TAG_ID] !== shared[TAG_ID]) {
    throw new Error(
      '予定に保存されたGaroon識別子が矛盾しています。同期を停止しました。',
    );
  }
  const source = sources[0];
  const id = own[TAG_ID] || shared[TAG_ID];
  if (!id) return null;
  return { id, updated: own[TAG_UPDATED] || shared[TAG_UPDATED], source };
}

/** Garoonの開始と終了を検証する。不正データを削除判定に流さない。 */
export function eventTimes(event) {
  const start = Date.parse(event.start?.dateTime);
  const end = event.isStartOnly ? start : Date.parse(event.end?.dateTime);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end < start ||
    !Number.isFinite(Date.parse(event.updatedAt))
  ) {
    throw new Error(`Garoon予定 ${event.id || '(IDなし)'} の日時が不正です。`);
  }
  return { start, end };
}

/** Garoon予定をGoogle Calendar APIの形式に変換する。 */
export function toGoogleEvent(event, settings) {
  const { start, end } = eventTimes(event);
  const id = uniqueId(event);
  const body = {
    summary: `${event.eventMenu ? `【${event.eventMenu}】` : ''}${event.subject || ''}`,
    description: [
      '【参加者】',
      (event.attendees || [])
        .map((user) => String(user.name || '').replace('　', ' '))
        .join(', '),
      '',
      '【メモ】',
      event.notes || '',
    ].join('\n'),
    extendedProperties: {
      private: {
        [TAG_ID]: id,
        [TAG_UPDATED]: event.updatedAt,
        [TAG_SOURCE]: sourceKey(settings),
      },
    },
  };
  if (event.isAllDay) {
    const zone = event.start.timeZone || settings.timeZone;
    const startDate = localDate(new Date(start), zone);
    const endDate = localDate(
      new Date(end + 1000),
      event.end?.timeZone || zone,
    );
    body.start = { date: startDate };
    body.end = { date: endDate > startDate ? endDate : addDays(startDate, 1) };
  } else {
    body.start = { dateTime: new Date(start).toISOString() };
    // Calendar APIは終了が開始より後である必要がある。開始時刻のみの予定は1分にする。
    body.end = {
      dateTime: new Date(end > start ? end : start + 60000).toISOString(),
    };
  }
  return body;
}
