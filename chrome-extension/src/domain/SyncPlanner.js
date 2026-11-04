import { sourceKey, TAG_UPDATED } from '../config/Settings.js';
import { localDate } from './SyncRange.js';
import {
  targetCalendar,
  uniqueId,
  eventTimes,
  toGoogleEvent,
  managedTags,
} from './EventMapping.js';

/** Google予定がGaroonと同じ取得期間に完全に収まるかを判定する。 */
function withinRange(event, range, settings) {
  if (event.start?.date && event.end?.date) {
    return (
      event.start.date >= localDate(new Date(range.start), settings.timeZone) &&
      event.end.date <= localDate(new Date(range.end), settings.timeZone)
    );
  }
  return (
    Date.parse(event.start?.dateTime) >= Date.parse(range.start) &&
    Date.parse(event.end?.dateTime) <= Date.parse(range.end)
  );
}

function sameTime(left, right) {
  return (
    (left?.date || null) === (right?.date || null) &&
    (left?.dateTime ? Date.parse(left.dateTime) : null) ===
      (right?.dateTime ? Date.parse(right.dateTime) : null)
  );
}

function needsUpdate(existing, body, settings) {
  const tags = managedTags(existing, settings);
  return (
    tags.source !== sourceKey(settings) ||
    tags.updated !== body.extendedProperties.private[TAG_UPDATED] ||
    existing.summary !== body.summary ||
    (existing.description || '') !== body.description ||
    !sameTime(existing.start, body.start) ||
    !sameTime(existing.end, body.end)
  );
}

/** 全件取得したスナップショットから、書き込みを行わず反映計画を作る。 */
export class SyncPlanner {
  constructor(settings) {
    this.settings = settings;
  }

  /**
   * 予定の検証と照合を終えてから反映計画を返す。
   * @param {Array<object>} garoonEvents Garoonの取得済み予定
   * @param {Map<string, Array<object>>} googleEvents カレンダーID別の取得済み予定
   * @param {Map<string, string>} calendars カレンダー名とIDの対応
   * @param {{start: string, end: string}} range 同期期間
   * @returns {{upserts: Array<object>, deletes: Array<object>}} 書き込み前に検証を終えた計画
   */
  build(garoonEvents, googleEvents, calendars, range) {
    const desired = this.desiredEvents(garoonEvents, calendars, range);
    const existing = this.existingEvents(googleEvents);
    return this.plan(desired, existing, range);
  }

  /** 同期期間とタグに合致する予定を、Garoon識別子でまとめる。 */
  desiredEvents(garoonEvents, calendars, range) {
    const desired = new Map();
    for (const event of garoonEvents) {
      const id = uniqueId(event);
      const { start, end } = eventTimes(event);
      // Garoonの範囲検索は期間内に完全に収まる予定を返す。境界の余裕分を除く。
      if (
        start < Date.parse(range.start) ||
        start >= Date.parse(range.end) ||
        end > Date.parse(range.end)
      )
        continue;
      const name = targetCalendar(event, this.settings);
      if (!name) continue;
      if (desired.has(id)) throw new Error('Garoon予定のIDが重複しています。');
      if (!calendars.has(name))
        throw new Error('同期先カレンダーが未解決です。');
      desired.set(id, {
        calendarId: calendars.get(name),
        body: toGoogleEvent(event, this.settings),
      });
    }
    return desired;
  }

  /** Google予定の管理情報を読み取り、同じカレンダー内の重複を拒否する。 */
  existingEvents(googleEvents) {
    const existing = new Map();
    for (const [calendarId, events] of googleEvents) {
      for (const event of events) {
        const tags = managedTags(event, this.settings);
        if (!tags || event.status === 'cancelled') continue;
        // Google側で繰り返し予定へ変更された場合は、インスタンスを個別削除しない。
        if (event.recurringEventId || event.recurrence)
          throw new Error(
            '同期対象のGoogle予定が繰り返し予定に変更されています。',
          );
        const matches = existing.get(tags.id) || [];
        if (matches.some((old) => old.calendarId === calendarId)) {
          throw new Error(
            `Garoon識別子 ${tags.id} の予定「${event.summary || '(無題)'}」が同じカレンダー内で重複しています。予定への書き込みを停止しました。既存予定を確認してください。`,
          );
        }
        matches.push({ calendarId, event });
        existing.set(tags.id, matches);
      }
    }
    return existing;
  }

  /** 移動先を先に作成し、移動元や不要になった管理予定を後で削除する。 */
  plan(desired, existing, range) {
    const upserts = [];
    const deletes = [];
    for (const [id, target] of desired) {
      const matches = existing.get(id) || [];
      const old =
        matches.find((old) => old.calendarId === target.calendarId) ||
        matches[0];
      if (!old || old.calendarId !== target.calendarId) {
        upserts.push({ ...target, id, kind: old ? 'move' : 'create', old });
      } else if (needsUpdate(old.event, target.body, this.settings)) {
        upserts.push({ ...target, id, kind: 'update', old });
      }
    }
    for (const [id, matches] of existing) {
      const target = desired.get(id);
      for (const old of matches) {
        if (target) {
          // 移動先の作成直後に中断されても、次回は移動先を採用して移動元だけ消す。
          if (old.calendarId !== target.calendarId) deletes.push(old);
        } else if (
          managedTags(old.event, this.settings).source ===
            sourceKey(this.settings) &&
          withinRange(old.event, range, this.settings)
        ) {
          deletes.push(old);
        }
      }
    }
    return { upserts, deletes };
  }
}
