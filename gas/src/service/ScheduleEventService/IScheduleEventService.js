/**
 * スケジュールイベントサービスのインターフェース
 * GaroonEventServiceとGCalEventServiceの共通インターフェースを定義します
 * @interface
 */
class IScheduleEventService {
  /**
   * ユニークイベントIDでイベントを検索
   * @abstract
   * @param {Array} events - イベント配列
   * @param {string} uniqueEventId - ユニークイベントID
   * @returns {Object|null} 見つかったイベント、または null
   */
  findEventByUniqueEventId(events, uniqueEventId) {
    throw new Error('Method "findEventByUniqueEventId" must be implemented');
  }

  /**
   * 全日イベントかどうかを判定
   * @abstract
   * @param {Object} event - イベントオブジェクト
   * @returns {boolean} 全日イベントの場合 true
   */
  isAllDay(event) {
    throw new Error('Method "isAllDay" must be implemented');
  }

  /**
   * 期間でイベントを取得
   * @abstract
   * @param {DatetimeTerm} term - 期間
   * @returns {Array} イベント配列
   */
  getByTerm(term) {
    throw new Error('Method "getByTerm" must be implemented');
  }

  /**
   * 作成されたイベントを取得
   * @abstract
   * @param {boolean} [fullSync=false] - フルシンクフラグ
   * @returns {Array} イベント配列
   */
  getCreatedEvents(fullSync = false) {
    throw new Error('Method "getCreatedEvents" must be implemented');
  }

  /**
   * 編集されたイベントを取得
   * @abstract
   * @param {Array} events - 比較対象のイベント配列
   * @returns {Object} { create: [], delete: [], update: [] }
   */
  getEditedEvents(events) {
    throw new Error('Method "getEditedEvents" must be implemented');
  }

  /**
   * イベントから期間オブジェクトを生成
   * @abstract
   * @param {Object} event - イベントオブジェクト
   * @returns {DatetimeTerm|Object} 期間オブジェクト
   */
  createTerm(event) {
    throw new Error('Method "createTerm" must be implemented');
  }

  /**
   * イベントを作成
   * @abstract
   * @param {Object} eventItem - イベント情報
   * @param {string} uniqueEventId - ユニークイベントID
   */
  createEvent(eventItem, uniqueEventId) {
    throw new Error('Method "createEvent" must be implemented');
  }
}
