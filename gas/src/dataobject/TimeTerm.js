/**
 * 時刻期間を管理するクラス
 */
class TimeTerm {
  /**
   * @param {string} start - 開始時刻 (HH:mm:ss形式)
   * @param {string} end - 終了時刻 (HH:mm:ss形式)
   */
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }

  /**
   * 時刻文字列をDate型に変換
   * @param {string} timeStr - 時刻文字列 (HH:mm:ss形式)
   * @param {Date} date - 基準日
   * @returns {Date} 変換された日時
   */
  timeToDate(timeStr, date) {
    const array = timeStr.split(':');
    let retDate = new Date(date);
    retDate.setHours(Number(array[0]), Number(array[1]), Number(array[2]), 0);
    return retDate;
  }

  /**
   * DatetimeTermに変換
   * @param {Date} now - 現在日時
   * @returns {DatetimeTerm} 日時期間
   */
  toDatetimeTerm(now) {
    return new DatetimeTerm(
      this.timeToDate(this.start, now),
      this.timeToDate(this.end, now),
    );
  }
}
