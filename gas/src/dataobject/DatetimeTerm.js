/**
 * 日時期間を管理するクラス
 */
class DatetimeTerm {
  /**
   * @param {Date|number} start - 開始日時またはオフセット日数
   * @param {Date|number} end - 終了日時またはオフセット日数
   */
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }

  /**
   * 同期対象期間に変換（現在日時基準でDatetimeTermを作成）
   * @param {Date} now - 現在日時
   * @returns {DatetimeTerm} 同期対象期間
   */
  toSyncTargetTerm(now) {
    let today = now.getDate();
    let start = new Date(now);
    let end = new Date(now);

    start.setDate(today - Number(this.start));
    start.setHours(0, 0, 0, 0);

    end.setDate(today + Number(this.end));
    end.setHours(23, 59, 59, 0);
    return new DatetimeTerm(start, end);
  }

  /**
   * 指定された日時が期間内かどうかを判定
   * @param {Date} dateTime - 判定する日時
   * @returns {boolean} 期間内の場合 true
   */
  isInTerm(dateTime) {
    return this.start <= dateTime && dateTime <= this.end;
  }
}
