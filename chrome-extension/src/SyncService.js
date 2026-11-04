import { addDays, localDate, sourceKey, TAG_ID, TAG_UPDATED, TAG_SOURCE } from './Settings.js';

/** メモ内のタグを既存GASと同じ優先順で解決する。 */
export function targetCalendar(event, settings) {
  const tags = [...String(event.notes || '').matchAll(/#(\w+)/g)].map((match) => match[1].toLowerCase());
  if (tags.includes('nosync')) return null;
  for (const tag of tags) {
    const name = settings.tagCalendars.find((name) => name.toLowerCase() === tag);
    if (name) return name;
  }
  return settings.calendarName;
}

/** Garoon予定の個別IDを生成する。繰り返しは1回ずつ扱う。 */
export function uniqueId(event) {
  if (!event.id) throw new Error('Garoon予定のIDがありません。');
  return `${event.id}${event.repeatId ? `-${event.repeatId}` : ''}`;
}

/** Googleの管理対象タグを解決する。旧GASタグの採用は明示設定時に限る。 */
export function managedTags(event, settings) {
  const properties = event.extendedProperties || {};
  const own = properties.private || {};
  const shared = properties.shared || {};
  const source = own[TAG_SOURCE] || shared[TAG_SOURCE];
  if (source && source !== sourceKey(settings)) return null;
  if (!source && !settings.adoptLegacy) return null;
  const id = own[TAG_ID] || shared[TAG_ID];
  if (!id) return null;
  return { id, updated: own[TAG_UPDATED] || shared[TAG_UPDATED], source };
}

/** Garoonの開始と終了を検証する。不正データを削除判定に流さない。 */
function eventTimes(event) {
  const start = Date.parse(event.start?.dateTime);
  const end = event.isStartOnly ? start : Date.parse(event.end?.dateTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || !Number.isFinite(Date.parse(event.updatedAt))) {
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
      (event.attendees || []).map((user) => String(user.name || '').replace('　', ' ')).join(', '),
      '', '【メモ】', event.notes || '',
    ].join('\n'),
    extendedProperties: { private: {
      [TAG_ID]: id,
      [TAG_UPDATED]: event.updatedAt,
      [TAG_SOURCE]: sourceKey(settings),
    } },
  };
  if (event.isAllDay) {
    const zone = event.start.timeZone || settings.timeZone;
    const startDate = localDate(new Date(start), zone);
    const endDate = localDate(new Date(end + 1000), event.end?.timeZone || zone);
    body.start = { date: startDate };
    body.end = { date: endDate > startDate ? endDate : addDays(startDate, 1) };
  } else {
    body.start = { dateTime: new Date(start).toISOString() };
    // Calendar APIは終了が開始より後である必要がある。開始時刻のみの予定は1分にする。
    body.end = { dateTime: new Date(end > start ? end : start + 60000).toISOString() };
  }
  return body;
}

/** Google予定がGaroonと同じ取得期間に完全に収まるかを判定する。 */
function withinRange(event, range, settings) {
  if (event.start?.date && event.end?.date) {
    return event.start.date >= localDate(new Date(range.start), settings.timeZone) &&
      event.end.date <= localDate(new Date(range.end), settings.timeZone);
  }
  return Date.parse(event.start?.dateTime) >= Date.parse(range.start) &&
    Date.parse(event.end?.dateTime) <= Date.parse(range.end);
}

function sameTime(left, right) {
  return left?.date === right?.date &&
    (left?.dateTime ? Date.parse(left.dateTime) : null) === (right?.dateTime ? Date.parse(right.dateTime) : null);
}

function needsUpdate(existing, body, settings) {
  const tags = managedTags(existing, settings);
  return tags.source !== sourceKey(settings) || tags.updated !== body.extendedProperties.private[TAG_UPDATED] ||
    existing.summary !== body.summary || (existing.description || '') !== body.description ||
    !sameTime(existing.start, body.start) || !sameTime(existing.end, body.end);
}

/**
 * 全件取得済みのスナップショットから反映計画を作成する。ここでは書き込まない。
 * @param {Array} garoonEvents Garoonの全予定
 * @param {Map<string, Array>} googleEvents カレンダーID別のGoogle予定
 * @param {Map<string, string>} calendars カレンダー名とID
 */
export function buildPlan(garoonEvents, googleEvents, calendars, settings, range) {
  const desired = new Map();
  for (const event of garoonEvents) {
    const id = uniqueId(event);
    const { start, end } = eventTimes(event);
    // Garoonの範囲検索は期間内に完全に収まる予定を返す。境界の余裕分を除く。
    if (start < Date.parse(range.start) || start >= Date.parse(range.end) || end > Date.parse(range.end)) continue;
    const name = targetCalendar(event, settings);
    if (!name) continue;
    if (desired.has(id)) throw new Error('Garoon予定のIDが重複しています。');
    if (!calendars.has(name)) throw new Error('同期先カレンダーが未解決です。');
    desired.set(id, { calendarId: calendars.get(name), body: toGoogleEvent(event, settings) });
  }
  const existing = new Map();
  for (const [calendarId, events] of googleEvents) {
    for (const event of events) {
      const tags = managedTags(event, settings);
      if (!tags || event.status === 'cancelled') continue;
      // Google側で繰り返し予定へ変更された場合は、インスタンスを個別削除しない。
      if (event.recurringEventId || event.recurrence) throw new Error('同期対象のGoogle予定が繰り返し予定に変更されています。');
      const matches = existing.get(tags.id) || [];
      if (matches.some((old) => old.calendarId === calendarId)) {
        throw new Error(`同期済み予定 ${tags.id} が同じカレンダー内で重複しています。既存予定を確認してください。`);
      }
      matches.push({ calendarId, event });
      existing.set(tags.id, matches);
    }
  }
  const upserts = [];
  const deletes = [];
  for (const [id, target] of desired) {
    const matches = existing.get(id) || [];
    const old = matches.find((old) => old.calendarId === target.calendarId) || matches[0];
    if (!old || old.calendarId !== target.calendarId) {
      upserts.push({ ...target, id, kind: old ? 'move' : 'create', old });
    } else if (needsUpdate(old.event, target.body, settings)) {
      upserts.push({ ...target, id, kind: 'update', old });
    }
  }
  for (const [id, matches] of existing) {
    const target = desired.get(id);
    for (const old of matches) {
      if (target) {
        // 移動先の作成直後に中断されても、次回は移動先を採用して移動元だけ消す。
        if (old.calendarId !== target.calendarId) deletes.push(old);
      } else if (withinRange(old.event, range, settings)) {
        deletes.push(old);
      }
    }
  }
  return { upserts, deletes };
}

/** APIのリトライでも変わらない、Calendar APIで有効な16進数IDを生成する。 */
async function insertId(source, calendarId, body) {
  const key = [source, calendarId, body.extendedProperties.private[TAG_ID], body.extendedProperties.private[TAG_UPDATED]].join('|');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

export class SyncService {
  constructor(garoon, google, settings) {
    this.garoon = garoon;
    this.google = google;
    this.settings = settings;
  }

  /** 現在のGoogle予定を再確認してから管理対象項目を更新する。 */
  async update(calendarId, eventId, body) {
    const current = await this.google.getEvent(calendarId, eventId);
    if (!current || managedTags(current, this.settings)?.id !== body.extendedProperties.private[TAG_ID]) {
      throw new Error('更新対象の同期タグが変わりました。次回同期で再取得します。');
    }
    await this.google.patchEvent(calendarId, eventId, {
      ...body,
      start: { date: null, dateTime: null, timeZone: null, ...body.start },
      end: { date: null, dateTime: null, timeZone: null, ...body.end },
      extendedProperties: {
        ...current.extendedProperties,
        private: { ...current.extendedProperties?.private, ...body.extendedProperties.private },
      },
    });
  }

  /** 作成結果が不明な場合も同じIDで再試行し、409なら管理タグを確認する。 */
  async insert(calendarId, body) {
    const id = await insertId(sourceKey(this.settings), calendarId, body);
    try {
      await this.google.insertEvent(calendarId, { ...body, id });
    } catch (error) {
      if (error.status !== 409) throw error;
      const current = await this.google.getEvent(calendarId, id);
      if (!current || current.status === 'cancelled' || managedTags(current, this.settings)?.id !== body.extendedProperties.private[TAG_ID]) {
        throw new Error('作成予定のIDが既存または削除済みの予定と衝突しました。Garoonの予定を更新して再試行してください。');
      }
      await this.update(calendarId, id, body);
    }
  }

  /** 削除前に予定を再取得し、管理対象であることを確認する。 */
  async remove(old) {
    const current = await this.google.getEvent(old.calendarId, old.event.id);
    if (!current || current.status === 'cancelled') return;
    const originalTags = managedTags(old.event, this.settings);
    if (managedTags(current, this.settings)?.id !== originalTags?.id) {
      throw new Error('削除対象の同期タグが変わりました。次回同期で再取得します。');
    }
    if (old.event.etag && current.etag !== old.event.etag) {
      throw new Error('削除対象の予定が同期中に変更されました。次回同期で再取得します。');
    }
    await this.google.deleteEvent(old.calendarId, old.event.id);
  }

  /** 全件取得と計画を完了してから書き込み、作成・更新の完了後に削除する。 */
  async sync(range, check) {
    await this.garoon.connect();
    const garoonEvents = await this.garoon.listEvents(range, check);
    const calendars = await this.google.resolveCalendars(this.settings, check);
    const googleEvents = new Map();
    for (const calendarId of new Set(calendars.values())) {
      googleEvents.set(calendarId, await this.google.listEvents(calendarId, range, check));
    }
    const plan = buildPlan(garoonEvents, googleEvents, calendars, this.settings, range);
    const result = { created: 0, updated: 0, moved: 0, deleted: 0, fetched: garoonEvents.length };
    for (const operation of plan.upserts) {
      await check();
      if (operation.kind === 'update') {
        await this.update(operation.calendarId, operation.old.event.id, operation.body);
        result.updated++;
      } else {
        await this.insert(operation.calendarId, operation.body);
        if (operation.old) {
          result.moved++;
        } else result.created++;
      }
    }
    for (const old of plan.deletes) {
      await check();
      await this.remove(old);
      result.deleted++;
    }
    return result;
  }
}
