import { sourceKey, TAG_ID, TAG_UPDATED } from '../config/Settings.js';
import { managedTags } from '../domain/EventMapping.js';
import { SyncPlanner } from '../domain/SyncPlanner.js';

/** APIのリトライでも変わらない、Calendar APIで有効な16進数IDを生成する。 */
async function insertId(source, calendarId, body, generation) {
  const parts = [
    source,
    calendarId,
    body.extendedProperties.private[TAG_ID],
    body.extendedProperties.private[TAG_UPDATED],
  ];
  if (generation) parts.push(generation);
  const key = parts.join('|');
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(key),
  );
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

export class SyncService {
  constructor(garoon, google, settings) {
    this.garoon = garoon;
    this.google = google;
    this.settings = settings;
  }

  /** 現在のGoogle予定を再確認してから管理対象項目を更新する。 */
  async update(calendarId, eventId, body, check = async () => {}) {
    await check();
    const current = await this.google.getEvent(calendarId, eventId);
    if (
      !current ||
      managedTags(current, this.settings)?.id !==
        body.extendedProperties.private[TAG_ID]
    ) {
      throw new Error(
        '更新対象の同期タグが変わりました。次回同期で再取得します。',
      );
    }
    await check();
    await this.google.patchEvent(calendarId, eventId, {
      ...body,
      start: { date: null, dateTime: null, timeZone: null, ...body.start },
      end: { date: null, dateTime: null, timeZone: null, ...body.end },
      extendedProperties: {
        ...current.extendedProperties,
        private: {
          ...current.extendedProperties?.private,
          ...body.extendedProperties.private,
        },
      },
    });
  }

  /** 作成結果が不明な場合も同じIDで再試行し、409なら管理タグを確認する。 */
  async insert(calendarId, body, check = async () => {}) {
    const id = await insertId(
      sourceKey(this.settings),
      calendarId,
      body,
      this.settings.calendarWriteGenerations?.[calendarId],
    );
    await check();
    try {
      await this.google.insertEvent(calendarId, { ...body, id });
    } catch (error) {
      if (error.status !== 409) throw error;
      const current = await this.google.getEvent(calendarId, id);
      if (
        !current ||
        current.status === 'cancelled' ||
        managedTags(current, this.settings)?.id !==
          body.extendedProperties.private[TAG_ID]
      ) {
        throw new Error(
          '作成予定のIDが既存または削除済みの予定と衝突しました。Garoonの予定を更新して再試行してください。',
        );
      }
      await this.update(calendarId, id, body, check);
    }
  }

  /** 削除前に予定を再取得し、管理対象であることを確認する。 */
  async remove(old, check = async () => {}) {
    await check();
    const current = await this.google.getEvent(old.calendarId, old.event.id);
    if (!current || current.status === 'cancelled') return;
    const originalTags = managedTags(old.event, this.settings);
    if (managedTags(current, this.settings)?.id !== originalTags?.id) {
      throw new Error(
        '削除対象の同期タグが変わりました。次回同期で再取得します。',
      );
    }
    if (old.event.etag && current.etag !== old.event.etag) {
      throw new Error(
        '削除対象の予定が同期中に変更されました。次回同期で再取得します。',
      );
    }
    await check();
    await this.google.deleteEvent(old.calendarId, old.event.id);
  }

  /** 全件取得と計画を完了してから書き込み、作成と更新の完了後に削除する。 */
  async sync(range, check) {
    await this.garoon.connect();
    const garoonEvents = await this.garoon.listEvents(range, check);
    const calendars = await this.google.resolveCalendars(this.settings, check);
    const googleEvents = new Map();
    for (const calendarId of new Set(calendars.values())) {
      googleEvents.set(
        calendarId,
        await this.google.listEvents(calendarId, range, check),
      );
    }
    const plan = new SyncPlanner(this.settings).build(
      garoonEvents,
      googleEvents,
      calendars,
      range,
    );
    const result = {
      created: 0,
      updated: 0,
      moved: 0,
      deleted: 0,
      fetched: garoonEvents.length,
    };
    for (const operation of plan.upserts) {
      await check();
      if (operation.kind === 'update') {
        await this.update(
          operation.calendarId,
          operation.old.event.id,
          operation.body,
          check,
        );
        result.updated++;
      } else {
        await this.insert(operation.calendarId, operation.body, check);
        if (operation.old) {
          result.moved++;
        } else result.created++;
      }
    }
    for (const old of plan.deletes) {
      await check();
      await this.remove(old, check);
      result.deleted++;
    }
    return result;
  }
}
