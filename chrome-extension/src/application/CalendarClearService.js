export const CLEAR_ALARM = 'garoon-calendar-clear';
export const CLEAR_BATCH_SIZE = 25;
export const CLEAR_PREVIEW_TTL = 10 * 60 * 1000;

/** カレンダー名の検証。クリア処理ではカレンダーを新規作成しない。 */
function checkedName(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 1024) {
    throw new Error('全削除するカレンダー名を入力してください。');
  }
  return value.trim();
}

export class CalendarClearService {
  constructor(google) {
    this.google = google;
  }

  /** 全削除の対象を既存カレンダーから一意に特定する。 */
  async findCalendar(name) {
    const calendars = await this.google.listAll('users/me/calendarList', {
      maxResults: '250',
    });
    const matches = calendars.filter((calendar) => calendar.summary === name);
    if (matches.length > 1)
      throw new Error(
        `同名のカレンダー「${name}」が複数あります。対象を一意にできないため全削除を停止しました。`,
      );
    const calendar = matches[0];
    if (calendar && !['owner', 'writer'].includes(calendar.accessRole)) {
      throw new Error(`カレンダー「${name}」に予定の削除権限がありません。`);
    }
    return calendar || null;
  }

  /** 期間や同期タグで絞らず取得する。繰り返しはシリーズ単位にする。 */
  async listEvents(calendarId) {
    const events = await this.google.listAll(
      this.google.eventsPath(calendarId),
      {
        maxResults: '2500',
        singleEvents: 'false',
        showDeleted: 'false',
      },
    );
    const seen = new Set();
    return events
      .filter((event) => event.status !== 'cancelled')
      .map((event) => {
        if (!event.id || !event.etag || seen.has(event.id)) {
          throw new Error(
            '予定の取得結果に不正なIDまたは重複があり、全削除を停止しました。',
          );
        }
        seen.add(event.id);
        return { id: event.id, etag: event.etag };
      })
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  /** 削除対象を読み取り、ユーザーに提示する確認用の計画を生成する。 */
  async prepare(calendarName) {
    const name = checkedName(calendarName);
    const calendar = await this.findCalendar(name);
    if (!calendar) return { exists: false, name, count: 0 };
    const events = await this.listEvents(calendar.id);
    return {
      exists: true,
      name,
      calendarId: calendar.id,
      events,
      count: events.length,
      token: crypto.randomUUID(),
      createdAt: Date.now(),
    };
  }

  /** 確認画面の後にカレンダーや予定が変わっていれば書き込まずに停止する。 */
  async validatePreview(preview, token) {
    if (
      !preview ||
      !token ||
      preview.token !== token ||
      !Number.isFinite(preview.createdAt) ||
      Date.now() - preview.createdAt > CLEAR_PREVIEW_TTL
    ) {
      throw new Error(
        '全削除の確認が無効または期限切れです。もう一度「予定を全削除」を押してください。',
      );
    }
    const calendar = await this.findCalendar(preview.name);
    if (!calendar || calendar.id !== preview.calendarId)
      throw new Error(
        '対象カレンダーが変更されました。もう一度確認してください。',
      );
    const events = await this.listEvents(calendar.id);
    // Chrome storageの往復でオブジェクトのキー順が変わるため、JSON文字列では比較しない。
    if (
      !Array.isArray(preview.events) ||
      events.length !== preview.events.length ||
      events.some(
        (event, index) =>
          event.id !== preview.events[index]?.id ||
          event.etag !== preview.events[index]?.etag,
      )
    ) {
      throw new Error(
        '確認中に予定が変更されました。もう一度「予定を全削除」を押してください。',
      );
    }
  }

  /** 保存した削除計画を小分けに実行し、各予定の削除後に進捗を保存する。 */
  async runBatch(job, saveProgress, now = Date.now) {
    const deadline = now() + 150000;
    const batchEnd = Math.min(job.cursor + CLEAR_BATCH_SIZE, job.events.length);
    while (job.cursor < batchEnd && now() < deadline) {
      const event = job.events[job.cursor];
      try {
        await this.google.deleteEvent(job.calendarId, event.id, event.etag);
      } catch (error) {
        if (error.status === 412)
          throw new Error('確認後に予定が変更されたため、削除を停止しました。');
        throw error;
      }
      job.cursor++;
      await saveProgress(job);
    }
    return job.cursor === job.events.length;
  }

  /** APIの削除応答だけで完了とせず、全期間の残件数を再取得する。 */
  async verifyEmpty(calendarId) {
    const remaining = await this.listEvents(calendarId);
    if (remaining.length) {
      throw new Error(
        `削除後の確認で予定が${remaining.length}件残っています。対象を再確認してから、もう一度全削除してください。`,
      );
    }
  }
}
