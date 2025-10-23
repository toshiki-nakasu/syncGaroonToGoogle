/**
 * @typedef {Object} GaroonEvent
 * @property {string} id - イベントID
 * @property {string} subject - 件名
 * @property {Object} start - 開始日時情報
 * @property {string} start.dateTime - 開始日時(ISO 8601形式)
 * @property {string} start.timeZone - タイムゾーン
 * @property {Object} end - 終了日時情報
 * @property {string} end.dateTime - 終了日時(ISO 8601形式)
 * @property {string} end.timeZone - タイムゾーン
 * @property {boolean} isAllDay - 終日イベントかどうか
 * @property {string} [notes] - メモ
 * @property {string} uniqueId - ユニークイベントID
 * @property {string} updatedAt - 更新日時
 */

/**
 * Garoon APIへのアクセスを提供するDAOクラス
 * @extends BaseDao
 */
class GaroonDao extends BaseDao {
  /**
   * @param {GaroonApiService} garoonApiService - Garoon APIサービス
   */
  constructor(garoonApiService) {
    super();
    this.garoonApiService = garoonApiService;
    this._garoonEventService = null;
  }

  /**
   * GaroonEventService を設定（循環参照解決のため）
   * ServiceContainer の初期化時に呼び出される
   * @param {GaroonEventService} service - Garoonイベントサービス
   */
  set garoonEventService(service) {
    if (this._garoonEventService !== null) {
      throw new Error('GaroonEventService is already set. Cannot overwrite.');
    }
    this._garoonEventService = service;
  }

  /**
   * GaroonEventService を取得（遅延評価）
   * @returns {GaroonEventService}
   * @throws {Error} GaroonEventService が未設定の場合
   */
  get garoonEventService() {
    if (this._garoonEventService === null) {
      throw new Error('GaroonEventService is not initialized.');
    }
    return this._garoonEventService;
  }

  /**
   * APIアクションを実行
   * @param {string} uri - リクエストURI
   * @param {Object} option - リクエストオプション
   * @returns {GoogleAppsScript.URL_Fetch.HTTPResponse} レスポンス
   */
  apiAction(uri, option) {
    return UrlFetchApp.fetch(uri, option);
  }

  /**
   * 期間内のGaroonイベントを取得（ページネーション対応）
   * @param {Object} queryParam - クエリパラメータ
   * @returns {GaroonEvent[]} Garoonイベントの配列
   */
  selectEventByTerm(queryParam) {
    return this.executeWithErrorHandling(
      () => {
        let allEvents = [];
        let offset = 0;
        let hasMore = true;
        let pageCount = 0;
        const maxPages = Constants.MAX_PAGINATION_PAGES;

        while (hasMore) {
          if (pageCount >= maxPages) {
            Logger.warn(
              `Pagination limit reached (${maxPages} pages, ${allEvents.length} events). Consider adjusting sync period.`,
            );
            break;
          }

          const currentQuery = {
            ...queryParam,
            offset: offset,
          };

          const queryUri =
            this.garoonApiService.createEventApiUri() +
            '?' +
            Utility.paramToString(currentQuery);
          const option = {
            method: 'GET',
            headers: this.garoonApiService.createApiHeader(),
          };
          const response = this.apiAction(queryUri, option);
          const result = JSON.parse(response.getContentText('UTF-8'));

          allEvents = allEvents.concat(result.events);

          // 取得した件数が limit より少ない場合は最後のページ
          hasMore =
            result.events.length >=
            (queryParam.limit || Constants.GAROON_MAX_RESULTS_PER_PAGE);
          offset += result.events.length;
          pageCount++;

          if (hasMore) {
            Utilities.sleep(Constants.API_COOL_TIME);
          }
        }

        return allEvents;
      },
      'GaroonDao.selectEventByTerm',
      true,
    ); // リトライ有効化
  }

  /**
   * Garoonイベントを作成
   * 注意: 繰り返し予定、仮予定は登録できません
   * @param {Object} requestBody - リクエストボディ
   * @returns {GaroonEvent|null} 作成されたGaroonイベント、失敗時はnull
   */
  createEvent(requestBody) {
    return this.executeWithErrorHandling(() => {
      const option = {
        method: 'POST',
        headers: this.garoonApiService.createApiHeader(),
        payload: JSON.stringify(requestBody),
      };
      const response = this.apiAction(
        this.garoonApiService.createEventApiUri(),
        option,
      );
      const statusCode = response.getResponseCode();

      let garoonEvent = null;
      if (
        Constants.HTTP_STATUS_SUCCESS_MIN <= statusCode &&
        statusCode <= Constants.HTTP_STATUS_SUCCESS_MAX
      ) {
        garoonEvent = this.garoonEventService.addUniqueId(
          JSON.parse(response.getContentText('UTF-8')),
        );
        Logger.info('Create Garoon event: ' + garoonEvent.uniqueId);
      } else {
        Logger.error('Failed to create Garoon event. Status: ' + statusCode);
      }
      return garoonEvent;
    }, 'GaroonDao.createEvent');
  }

  /**
   * Garoonイベントを更新
   * @param {GaroonEvent} event - 更新するイベント
   * @throws {Error} 未実装のため常にエラーをスロー
   */
  updateEvent(event) {
    throw new Error(
      'GaroonDao.updateEvent is not implemented. Garoon event updates are not supported.',
    );
  }

  /**
   * Garoonイベントを削除
   * @param {GaroonEvent} event - 削除するイベント
   * @throws {Error} 未実装のため常にエラーをスロー
   */
  deleteEvent(event) {
    throw new Error(
      'GaroonDao.deleteEvent is not implemented. Garoon event deletion is not supported.',
    );
  }

  /**
   * Garoonのプレゼンス情報を更新
   * @param {Object} requestBody - リクエストボディ
   */
  updatePreference(requestBody) {
    return this.executeWithErrorHandling(() => {
      const option = {
        method: 'PATCH',
        headers: this.garoonApiService.createApiHeader(),
        payload: JSON.stringify(requestBody),
      };
      this.apiAction(this.garoonApiService.createPresenceApiUri(), option);
    }, 'GaroonDao.updatePreference');
  }
}
