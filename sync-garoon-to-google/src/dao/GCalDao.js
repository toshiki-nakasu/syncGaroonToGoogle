/**
 * @typedef {Object} GCalEvent
 * @property {string} id - イベントID
 * @property {string} summary - タイトル
 * @property {Object} start - 開始日時情報
 * @property {string} [start.dateTime] - 開始日時(ISO 8601形式)
 * @property {string} [start.date] - 開始日(終日イベント用)
 * @property {string} start.timeZone - タイムゾーン
 * @property {Object} end - 終了日時情報
 * @property {string} [end.dateTime] - 終了日時(ISO 8601形式)
 * @property {string} [end.date] - 終了日(終日イベント用)
 * @property {string} end.timeZone - タイムゾーン
 * @property {string} [description] - 説明
 * @property {string} status - ステータス
 * @property {Object} [extendedProperties] - 拡張プロパティ
 */

/**
 * イベントマッピング情報
 * @typedef {Object} EventMapping
 * @property {string} eventId - Google Event ID
 * @property {string} calendarId - Calendar ID
 */

/**
 * Google Calendar APIへのアクセスを提供するDAOクラス
 * @extends BaseDao
 */
class GCalDao extends BaseDao {
  /**
   * @param {GCal} gCal - Google Calendar情報
   * @param {ConfigManager} config - 設定管理
   */
  constructor(gCal, config) {
    super();
    this.gCal = gCal;
    this.config = config;
    this._garoonEventService = null;
    this._gCalEventService = null;
    // カレンダーIDキャッシュ (カレンダー名 -> カレンダーID)
    this._calendarIdCache = new Map();
    // イベントキャッシュ (カレンダーID -> イベント配列)
    this._eventCache = new Map();
    // キャッシュが有効かどうかのフラグ
    this._cacheEnabled = false;
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
   * GCalEventService を設定（循環参照解決のため）
   * ServiceContainer の初期化時に呼び出される
   * @param {GCalEventService} service - Google Calendarイベントサービス
   */
  set gCalEventService(service) {
    if (this._gCalEventService !== null) {
      throw new Error('GCalEventService is already set. Cannot overwrite.');
    }
    this._gCalEventService = service;
  }

  /**
   * GCalEventService を取得（遅延評価）
   * @returns {GCalEventService}
   * @throws {Error} GCalEventService が未設定の場合
   */
  get gCalEventService() {
    if (this._gCalEventService === null) {
      throw new Error('GCalEventService is not initialized.');
    }
    return this._gCalEventService;
  }

  /**
   * Google Calendarを作成
   * @param {string} name - カレンダー名
   * @returns {GoogleAppsScript.Calendar.Calendar} 作成されたカレンダー
   */
  createCalendar(name) {
    return this.executeWithErrorHandling(() => {
      const option = {
        timeZone: this.config.getTimeZone(),
        color: CalendarApp.Color.PURPLE,
      };
      const retCalendar = CalendarApp.createCalendar(name, option);
      Logger.info('Creating GCal calendar...');
      Utilities.sleep(Constants.API_COOL_TIME * 5);
      Logger.warn('Created GCal calendar - please notify, color setting');
      return retCalendar;
    }, 'GCalDao.createCalendar');
  }

  /**
   * カレンダー名からカレンダーを取得、存在しない場合は作成
   * @param {string} calendarName - カレンダー名
   * @returns {GoogleAppsScript.Calendar.Calendar} カレンダーオブジェクト
   */
  getOrCreateCalendar(calendarName) {
    return this.executeWithErrorHandling(() => {
      const calendars = CalendarApp.getOwnedCalendarsByName(calendarName);
      if (calendars.length > 0) {
        Logger.info(
          `Get GCal calendar: existing calendar "${calendarName}" found`,
        );
        return calendars[0];
      }

      Logger.info(`カレンダー "${calendarName}" を新規作成します。`);
      return this.createCalendar(calendarName);
    }, 'GCalDao.getOrCreateCalendar');
  }

  /**
   * カレンダー名からカレンダーIDを取得、存在しない場合は作成
   * キャッシュを使用して効率化
   * @param {string} calendarName - カレンダー名
   * @returns {string} カレンダーID
   */
  getOrCreateCalendarId(calendarName) {
    if (this._calendarIdCache.has(calendarName)) {
      return this._calendarIdCache.get(calendarName);
    }

    const calendar = this.getOrCreateCalendar(calendarName);
    const calendarId = calendar.getId();
    this._calendarIdCache.set(calendarName, calendarId);
    return calendarId;
  }

  /**
   * カレンダーIDからカレンダーオブジェクトを取得
   * @param {string} calendarId - カレンダーID
   * @returns {GoogleAppsScript.Calendar.Calendar|null} カレンダーオブジェクト
   */
  getCalendarById(calendarId) {
    return this.executeWithErrorHandling(() => {
      return CalendarApp.getCalendarById(calendarId);
    }, 'GCalDao.getCalendarById');
  }

  /**
   * 期間内のGoogle Calendarイベントを取得
   * @param {DatetimeTerm} term - 検索期間
   * @returns {GoogleAppsScript.Calendar.CalendarEvent[]} カレンダーイベントの配列
   */
  selectEventByTerm(term) {
    return this.executeWithErrorHandling(() => {
      return this.gCal.getCalendar().getEvents(term.start, term.end);
    }, 'GCalDao.selectEventByTerm');
  }

  /**
   * 同期されていないイベントを取得
   * Sync Tokenを使用した差分取得、またはフルシンクを実行します
   * @param {boolean} [fullSync=false] - フルシンクを行うかどうか
   * @returns {GCalEvent[]} 同期されていないイベントの配列
   */
  getNotSyncedEvents(fullSync = false) {
    return this.executeWithErrorHandling(
      () => {
        let retEvents = [];
        const syncToken = this.gCal.getNextSyncToken();
        const maxPages = Constants.MAX_PAGINATION_PAGES;

        let option = {};
        if (Utility.isNullOrUndefined(syncToken) || fullSync) {
          option.singleEvents = true;
          // フルシンクの場合は同期対象期間を指定
          const syncTargetTerm = this.config.getSyncTargetTerm();
          option.timeMin = syncTargetTerm.start.toISOString();
          option.timeMax = syncTargetTerm.end.toISOString();
        } else {
          option.syncToken = syncToken;
        }

        try {
          let response;
          let nextPageToken;
          let pageCount = 0;

          do {
            if (pageCount >= maxPages) {
              Logger.warn(
                `Pagination limit reached (${maxPages} pages, ${retEvents.length} events). Consider adjusting sync period.`,
              );
              throw new Error(
                `Pagination limit exceeded (max: ${maxPages} pages)`,
              );
            }

            option.pageToken = nextPageToken;
            response = Calendar.Events.list(this.gCal.getId(), option);
            retEvents = retEvents.concat(response.items);

            nextPageToken = response.nextPageToken;
            pageCount++;
          } while (nextPageToken);

          // nextSyncTokenがある場合のみ保存
          if (response.nextSyncToken) {
            this.gCal.setNextSyncToken(response.nextSyncToken);
          }
          return retEvents;
        } catch (error) {
          // Sync Tokenが無効な場合(410エラー)はTokenを削除してフルシンクで再試行
          // 無限再帰を防ぐため、既にフルシンク中の場合はエラーをスロー
          if (this.isSyncTokenError(error) && !fullSync) {
            Logger.warn('Sync token expired. Switching to full sync...');
            this.gCal.delNextSyncToken();
            return this.getNotSyncedEvents(true);
          }
          throw error;
        }
      },
      'GCalDao.getNotSyncedEvents',
      false,
    ); // Sync Token エラー処理が内部にあるためリトライ無効化
  }

  /**
   * GaroonイベントからGoogle Calendarイベントを作成
   * @param {GaroonEvent} garoonEvent - Garoonイベント
   */
  createEvent(garoonEvent) {
    return this.executeWithErrorHandling(() => {
      let gCalEvent;
      const title = this.garoonEventService.createTitle(garoonEvent);
      const term = this.garoonEventService.createTerm(garoonEvent);
      const option = this.garoonEventService.createOptions(garoonEvent);

      if (garoonEvent.isAllDay) {
        gCalEvent = this.gCal
          .getCalendar()
          .createAllDayEvent(title, term.start, term.end, option);
      } else {
        gCalEvent = this.gCal
          .getCalendar()
          .createEvent(title, term.start, term.end, option);
      }

      this.gCalEventService.setTagToEvent(
        gCalEvent,
        garoonEvent.uniqueId,
        garoonEvent.updatedAt,
      );
      Logger.info(`Create GCal event: ${garoonEvent.uniqueId}`);
      Utilities.sleep(Constants.API_COOL_TIME);
    }, 'GCalDao.createEvent');
  }

  /**
   * Google Calendarイベントを更新
   * @param {Array} eventArray - [旧イベント, 新イベント]の配列
   */
  updateEvent(eventArray) {
    return this.executeWithErrorHandling(() => {
      const [oldEvent, newGaroonEvent] = eventArray;

      // タイトル・期間・説明を更新
      const title = this.garoonEventService.createTitle(newGaroonEvent);
      const term = this.garoonEventService.createTerm(newGaroonEvent);
      const option = this.garoonEventService.createOptions(newGaroonEvent);

      oldEvent.setTitle(title);
      oldEvent.setDescription(option.description);

      // 終日イベントと時刻指定イベントで処理を分岐
      if (newGaroonEvent.isAllDay) {
        oldEvent.setAllDayDates(term.start, term.end);
      } else {
        oldEvent.setTime(term.start, term.end);
      }

      // タグを更新
      this.gCalEventService.setTagToEvent(
        oldEvent,
        newGaroonEvent.uniqueId,
        newGaroonEvent.updatedAt,
      );

      Logger.info(`Update GCal event: ${newGaroonEvent.uniqueId}`);
      Utilities.sleep(Constants.API_COOL_TIME);
    }, 'GCalDao.updateEvent');
  }

  /**
   * Google Calendarイベントを削除
   * @param {GoogleAppsScript.Calendar.CalendarEvent} gCalEvent - 削除するGCalイベント
   */
  deleteEvent(gCalEvent) {
    return this.executeWithErrorHandling(() => {
      gCalEvent.deleteEvent();
      const uniqueId = gCalEvent.getTag(Constants.TAG_GAROON_UNIQUE_EVENT_ID);
      Logger.info(`Delete GCal event: ${uniqueId || 'No ID'}`);
      Utilities.sleep(Constants.API_COOL_TIME);
    }, 'GCalDao.deleteEvent');
  }

  // ============================================================
  // カレンダー指定イベント操作
  // ============================================================

  /**
   * 指定カレンダーにGaroonイベントからGoogle Calendarイベントを作成
   * @param {string} calendarId - カレンダーID
   * @param {GaroonEvent} garoonEvent - Garoonイベント
   * @returns {GoogleAppsScript.Calendar.CalendarEvent} 作成されたイベント
   */
  createEventOnCalendar(calendarId, garoonEvent) {
    return this.executeWithErrorHandling(() => {
      const calendar = CalendarApp.getCalendarById(calendarId);
      if (!calendar) {
        throw new Error(`カレンダーが見つかりません: ${calendarId}`);
      }

      let gCalEvent;
      const title = this.garoonEventService.createTitle(garoonEvent);
      const term = this.garoonEventService.createTerm(garoonEvent);
      const option = this.garoonEventService.createOptions(garoonEvent);

      if (garoonEvent.isAllDay) {
        gCalEvent = calendar.createAllDayEvent(
          title,
          term.start,
          term.end,
          option,
        );
      } else {
        gCalEvent = calendar.createEvent(title, term.start, term.end, option);
      }

      this.gCalEventService.setTagToEvent(
        gCalEvent,
        garoonEvent.uniqueId,
        garoonEvent.updatedAt,
      );

      Logger.info(
        `Create GCal event on calendar ${calendarId}: ${garoonEvent.uniqueId}`,
      );
      Utilities.sleep(Constants.API_COOL_TIME);

      return gCalEvent;
    }, 'GCalDao.createEventOnCalendar');
  }

  /**
   * 指定カレンダーのGoogle Calendarイベントを更新
   * @param {string} calendarId - カレンダーID
   * @param {GoogleAppsScript.Calendar.CalendarEvent} gCalEvent - 更新対象のイベント
   * @param {GaroonEvent} garoonEvent - Garoonイベント
   */
  updateEventOnCalendar(calendarId, gCalEvent, garoonEvent) {
    return this.executeWithErrorHandling(() => {
      const title = this.garoonEventService.createTitle(garoonEvent);
      const term = this.garoonEventService.createTerm(garoonEvent);
      const option = this.garoonEventService.createOptions(garoonEvent);

      gCalEvent.setTitle(title);
      gCalEvent.setDescription(option.description);

      if (garoonEvent.isAllDay) {
        gCalEvent.setAllDayDates(term.start, term.end);
      } else {
        gCalEvent.setTime(term.start, term.end);
      }

      this.gCalEventService.setTagToEvent(
        gCalEvent,
        garoonEvent.uniqueId,
        garoonEvent.updatedAt,
      );

      Logger.info(
        `Update GCal event on calendar ${calendarId}: ${garoonEvent.uniqueId}`,
      );
      Utilities.sleep(Constants.API_COOL_TIME);
    }, 'GCalDao.updateEventOnCalendar');
  }

  /**
   * 指定カレンダーのGoogle Calendarイベントを削除
   * @param {string} calendarId - カレンダーID
   * @param {GoogleAppsScript.Calendar.CalendarEvent} gCalEvent - 削除するイベント
   */
  deleteEventOnCalendar(calendarId, gCalEvent) {
    return this.executeWithErrorHandling(() => {
      const uniqueId = gCalEvent.getTag(Constants.TAG_GAROON_UNIQUE_EVENT_ID);
      gCalEvent.deleteEvent();
      Logger.info(
        `Delete GCal event on calendar ${calendarId}: ${uniqueId || 'No ID'}`,
      );
      Utilities.sleep(Constants.API_COOL_TIME);
    }, 'GCalDao.deleteEventOnCalendar');
  }

  /**
   * イベントキャッシュをウォームアップ（事前取得）
   * @param {string[]} calendarIds - カレンダーID配列
   * @param {DatetimeTerm} term - 検索期間
   * @throws {Error} calendarIds が配列でない場合、または term が無効な場合
   */
  warmupEventCache(calendarIds, term) {
    // パラメータ検証
    if (!Array.isArray(calendarIds)) {
      throw new Error('calendarIds must be an array');
    }
    if (!term || !term.start || !term.end) {
      throw new Error('term must have valid start and end dates');
    }

    Logger.info(
      `イベントキャッシュをウォームアップ中: ${calendarIds.length}個のカレンダー`,
    );
    this._eventCache.clear();
    this._cacheEnabled = true;

    for (const calendarId of calendarIds) {
      this.executeWithErrorHandling(() => {
        const calendar = CalendarApp.getCalendarById(calendarId);
        if (!calendar) {
          Logger.warn(
            `カレンダーが見つかりません: ${calendarId} - キャッシュに空配列を設定`,
          );
          // キャッシュの一貫性を保つため、空配列を設定
          this._eventCache.set(calendarId, []);
          return;
        }

        const events = calendar.getEvents(term.start, term.end);
        this._eventCache.set(calendarId, events);
        Logger.info(
          `カレンダー ${calendarId}: ${events.length}個のイベントをキャッシュしました`,
        );
      }, 'GCalDao.warmupEventCache');
    }

    Logger.info('イベントキャッシュのウォームアップが完了しました');
  }

  /**
   * イベントキャッシュをクリア
   */
  clearEventCache() {
    this._eventCache.clear();
    this._cacheEnabled = false;
    Logger.info('イベントキャッシュをクリアしました');
  }

  /**
   * 指定カレンダーからGaroonユニークIDでイベントを検索
   * @param {string} calendarId - カレンダーID
   * @param {string} garoonUniqueId - GaroonユニークID
   * @param {DatetimeTerm} term - 検索期間
   * @returns {GoogleAppsScript.Calendar.CalendarEvent|null} イベントまたはnull
   */
  findEventByGaroonIdOnCalendar(calendarId, garoonUniqueId, term) {
    return this.executeWithErrorHandling(() => {
      let events;

      // キャッシュが有効な場合はキャッシュから取得
      if (this._cacheEnabled && this._eventCache.has(calendarId)) {
        events = this._eventCache.get(calendarId);
      } else {
        // キャッシュが無効な場合は通常通りAPIから取得
        const calendar = CalendarApp.getCalendarById(calendarId);
        if (!calendar) {
          return null;
        }
        events = calendar.getEvents(term.start, term.end);
      }

      // イベントを検索
      for (const event of events) {
        const tagId = event.getTag(Constants.TAG_GAROON_UNIQUE_EVENT_ID);
        if (tagId === garoonUniqueId) {
          return event;
        }
      }
      return null;
    }, 'GCalDao.findEventByGaroonIdOnCalendar');
  }

  /**
   * 複数カレンダーからGaroonユニークIDでイベントを検索
   * @param {string[]} calendarIds - 検索対象のカレンダーID配列
   * @param {string} garoonUniqueId - GaroonユニークID
   * @param {DatetimeTerm} term - 検索期間
   * @returns {{event: GoogleAppsScript.Calendar.CalendarEvent, calendarId: string}|null} 検索結果
   */
  findEventByGaroonIdAcrossCalendars(calendarIds, garoonUniqueId, term) {
    for (const calendarId of calendarIds) {
      const event = this.findEventByGaroonIdOnCalendar(
        calendarId,
        garoonUniqueId,
        term,
      );
      if (event) {
        return { event, calendarId };
      }
    }
    return null;
  }
}
