/**
 * Garoon予定のnotesフィールドからタグを解析するサービス
 */

/**
 * タグ解析結果
 * @typedef {Object} TagParseResult
 * @property {boolean} shouldSync - 同期すべきかどうか
 * @property {string|null} targetCalendar - 対象カレンダー名 (nullの場合はデフォルトカレンダー)
 * @property {string[]} detectedTags - 検出されたすべてのタグ
 */

/**
 * タグパーサークラス
 * Garoonイベントのnotesフィールドからタグを解析し、
 * 同期先カレンダーを決定します
 */
class TagParser {
  /**
   * @param {string[]} registeredCalendars - 登録済みのカレンダー名配列
   */
  constructor(registeredCalendars = []) {
    this.registeredCalendars = registeredCalendars;
  }

  /**
   * notesフィールドからタグを解析する
   * @param {string} notes - Garoon予定のnotesフィールド
   * @returns {TagParseResult} 解析結果
   */
  parse(notes) {
    const result = {
      shouldSync: true,
      targetCalendar: null,
      detectedTags: [],
    };

    if (!notes) {
      return result;
    }

    // タグを抽出 (#で始まる単語)
    const tagPattern = /#(\w+)/g;
    const matches = notes.matchAll(tagPattern);

    const detectedTags = [];
    const matchingCalendarTags = [];
    let hasNosync = false;

    for (const match of matches) {
      const tagName = match[1].toLowerCase();
      detectedTags.push(tagName);

      if (tagName === Constants.GAROON_TO_GCAL_NOT_SYNC_TAG) {
        hasNosync = true;
      } else {
        // 登録済みカレンダーと一致するかチェック (大文字小文字を区別しない)
        const matchedCalendar = this.registeredCalendars.find(
          (cal) => cal.toLowerCase() === tagName,
        );
        if (matchedCalendar) {
          matchingCalendarTags.push(matchedCalendar);
        }
      }
    }

    result.detectedTags = detectedTags;

    // 複数タグの警告
    const significantTags = hasNosync
      ? [Constants.GAROON_TO_GCAL_NOT_SYNC_TAG, ...matchingCalendarTags]
      : matchingCalendarTags;

    if (significantTags.length > 1) {
      if (hasNosync) {
        Logger.warn(
          `複数のタグが検出されました: [${significantTags.join(', ')}]。` +
            `#${Constants.GAROON_TO_GCAL_NOT_SYNC_TAG} を優先して同期をスキップします。`,
        );
      } else {
        Logger.warn(
          `複数のタグが検出されました: [${significantTags.join(', ')}]。` +
            `最初のタグ #${matchingCalendarTags[0]} を使用します。`,
        );
      }
    }

    // #nosync が最優先
    if (hasNosync) {
      result.shouldSync = false;
      return result;
    }

    // カレンダータグがある場合は最初のものを使用
    if (matchingCalendarTags.length > 0) {
      result.targetCalendar = matchingCalendarTags[0];
    }

    return result;
  }

  /**
   * Garoonイベントのタグを解析して同期情報を取得する
   * @param {Object} garoonEvent - Garoonイベント
   * @returns {TagParseResult} タグ解析結果
   */
  parseEvent(garoonEvent) {
    const notes = garoonEvent.notes || '';
    return this.parse(notes);
  }
}
