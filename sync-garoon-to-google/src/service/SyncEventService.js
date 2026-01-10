/**
 * @typedef {Object} EditedEvents
 * @property {Array} create - 作成するイベントの配列
 * @property {Array} delete - 削除するイベントの配列
 * @property {Array} update - 更新するイベントの配列
 */

/**
 * イベント同期を管理するサービスクラス
 */
class SyncEventService {
  /**
   * @param {GCalDao} gCalDao - Google Calendar DAO
   * @param {GaroonDao} garoonDao - Garoon DAO (将来的に使用)
   * @param {ConfigManager} config - 設定管理
   */
  constructor(gCalDao, garoonDao, config) {
    this.gCalDao = gCalDao;
    this.garoonDao = garoonDao;
    this.config = config;
  }

  /**
   * デフォルトカレンダーIDを取得
   * @returns {string} デフォルトカレンダーID
   */
  getDefaultCalendarId() {
    return this.gCalDao.gCal.getId();
  }

  /**
   * 対象カレンダーIDを取得（タグに基づいて振り分け）
   * @param {Object} garoonEvent - Garoonイベント（syncInfo付き）
   * @returns {string} カレンダーID
   */
  getTargetCalendarId(garoonEvent) {
    const syncInfo = garoonEvent.syncInfo;

    // syncInfoがない、またはtargetCalendarがnullの場合はデフォルトカレンダー
    if (!syncInfo || syncInfo.targetCalendar === null) {
      return this.getDefaultCalendarId();
    }

    // タグで指定されたカレンダーのIDを取得（存在しなければ作成）
    return this.gCalDao.getOrCreateCalendarId(syncInfo.targetCalendar);
  }

  /**
   * 検索対象のカレンダーID一覧を取得
   * @returns {string[]} カレンダーID配列
   */
  getAllTargetCalendarIds() {
    const calendarIds = [this.getDefaultCalendarId()];
    const calendarIdSet = new Set(calendarIds);

    // 登録済みカレンダーのIDも追加
    const syncTargetCalendars = this.config.getSyncTargetCalendars();
    for (const calendarName of syncTargetCalendars) {
      try {
        const calendarId = this.gCalDao.getOrCreateCalendarId(calendarName);
        if (!calendarIdSet.has(calendarId)) {
          calendarIds.push(calendarId);
          calendarIdSet.add(calendarId);
        }
      } catch (error) {
        Logger.warn(
          `カレンダー "${calendarName}" のID取得に失敗しました: ${error.message}`,
        );
      }
    }

    return calendarIds;
  }

  /**
   * GaroonからGoogle Calendarへイベントを同期
   * タグに基づいてカレンダーを振り分け
   * @param {EditedEvents} garoonEditedEvents - 編集されたGaroonイベント
   * @param {Array} gCalAllEvents - 全てのGoogle Calendarイベント
   * @param {DatetimeTerm} syncTargetTerm - 同期対象期間
   */
  syncGaroonToGCal(garoonEditedEvents, gCalAllEvents, syncTargetTerm) {
    Logger.info('Sync Garoon To GCal: START');

    // パラメータ検証
    this.validateEditedEvents(garoonEditedEvents);

    if (!Array.isArray(gCalAllEvents)) {
      throw new Error('gCalAllEvents must be an array');
    }

    const totalOperations =
      garoonEditedEvents.create.length +
      garoonEditedEvents.delete.length +
      garoonEditedEvents.update.length;

    Logger.info(
      `Total operations: ${totalOperations} (create: ${garoonEditedEvents.create.length}, delete: ${garoonEditedEvents.delete.length}, update: ${garoonEditedEvents.update.length})`,
    );

    // 全対象カレンダーIDを取得
    const allCalendarIds = this.getAllTargetCalendarIds();

    // イベントIDからカレンダーIDへのマッピングを構築（更新時の高速検索用）
    const eventCalendarMap = this.buildEventCalendarMap(
      allCalendarIds,
      syncTargetTerm,
    );

    // 作成処理（タグに基づいてカレンダーを振り分け）
    if (garoonEditedEvents.create.length > 0) {
      Logger.info(`Creating ${garoonEditedEvents.create.length} events...`);
      for (const garoonEvent of garoonEditedEvents.create) {
        const targetCalendarId = this.getTargetCalendarId(garoonEvent);

        // 他のカレンダーに既存イベントがないか確認（タグ変更対応）
        const existingResult = this.gCalDao.findEventByGaroonIdAcrossCalendars(
          allCalendarIds,
          garoonEvent.uniqueId,
          syncTargetTerm,
        );

        if (existingResult) {
          if (existingResult.calendarId !== targetCalendarId) {
            // 別カレンダーにある場合は削除して新規作成
            Logger.info(
              `イベント "${garoonEvent.subject}" を別カレンダーに移動します。`,
            );
            this.gCalDao.deleteEventOnCalendar(
              existingResult.calendarId,
              existingResult.event,
            );
            this.gCalDao.createEventOnCalendar(targetCalendarId, garoonEvent);
          } else {
            // 同じカレンダーにある場合は更新
            this.gCalDao.updateEventOnCalendar(
              targetCalendarId,
              existingResult.event,
              garoonEvent,
            );
          }
        } else {
          // 新規作成
          this.gCalDao.createEventOnCalendar(targetCalendarId, garoonEvent);
        }
      }
    }

    // 削除処理
    if (garoonEditedEvents.delete.length > 0) {
      Logger.info(`Deleting ${garoonEditedEvents.delete.length} events...`);
      for (const gCalEvent of garoonEditedEvents.delete) {
        this.gCalDao.deleteEvent(gCalEvent);
      }
    }

    // 更新処理（タグに基づいてカレンダーを振り分け）
    if (garoonEditedEvents.update.length > 0) {
      Logger.info(`Updating ${garoonEditedEvents.update.length} events...`);
      for (const eventArray of garoonEditedEvents.update) {
        const [oldGCalEvent, newGaroonEvent] = eventArray;
        const targetCalendarId = this.getTargetCalendarId(newGaroonEvent);

        // マップから現在のカレンダーIDを取得（O(1)）
        const uniqueId = oldGCalEvent.getTag(
          Constants.TAG_GAROON_UNIQUE_EVENT_ID,
        );
        const currentCalendarId =
          eventCalendarMap.get(uniqueId) || this.getDefaultCalendarId();

        if (currentCalendarId !== targetCalendarId) {
          // カレンダーが変わる場合は削除して新規作成
          Logger.info(
            `イベント "${newGaroonEvent.subject}" を別カレンダーに移動します。`,
          );
          this.gCalDao.deleteEvent(oldGCalEvent);
          this.gCalDao.createEventOnCalendar(targetCalendarId, newGaroonEvent);
        } else {
          // 同じカレンダーの場合は通常の更新
          this.gCalDao.updateEvent(eventArray);
        }
      }
    }

    Logger.info('Sync Garoon To GCal: END');
  }

  /**
   * 全カレンダーのイベントからGaroon IDとカレンダーIDのマッピングを構築
   * 更新処理時の高速検索用
   * @param {string[]} calendarIds - 検索対象カレンダーID配列
   * @param {DatetimeTerm} term - 検索期間
   * @returns {Map<string, string>} Garoon Unique ID -> Calendar ID のマップ
   */
  buildEventCalendarMap(calendarIds, term) {
    const map = new Map();

    for (const calendarId of calendarIds) {
      const calendar = CalendarApp.getCalendarById(calendarId);
      if (!calendar) {
        Logger.warn(`カレンダーが見つかりません: ${calendarId}`);
        continue;
      }

      const events = calendar.getEvents(term.start, term.end);
      for (const event of events) {
        const uniqueId = event.getTag(Constants.TAG_GAROON_UNIQUE_EVENT_ID);
        if (uniqueId) {
          map.set(uniqueId, calendarId);
        }
      }
    }

    Logger.info(
      `イベントカレンダーマップを構築しました: ${map.size} イベント`,
    );
    return map;
  }

  /**
   * イベントが存在するカレンダーIDを特定
   * @deprecated 代わりに buildEventCalendarMap() を使用してください
   * @param {GoogleAppsScript.Calendar.CalendarEvent} gCalEvent - GCalイベント
   * @param {string[]} calendarIds - 検索対象カレンダーID配列
   * @param {DatetimeTerm} term - 検索期間
   * @returns {string|null} カレンダーID
   */
  findEventCalendarId(gCalEvent, calendarIds, term) {
    const uniqueId = gCalEvent.getTag(Constants.TAG_GAROON_UNIQUE_EVENT_ID);
    if (!uniqueId) {
      return this.getDefaultCalendarId();
    }

    const result = this.gCalDao.findEventByGaroonIdAcrossCalendars(
      calendarIds,
      uniqueId,
      term,
    );

    return result ? result.calendarId : this.getDefaultCalendarId();
  }

  /**
   * EditedEventsオブジェクトの検証
   * @param {EditedEvents} editedEvents - 検証するオブジェクト
   * @throws {Error} 検証に失敗した場合
   */
  validateEditedEvents(editedEvents) {
    if (!editedEvents) {
      throw new Error('editedEvents is required');
    }

    const requiredArrays = ['create', 'delete', 'update'];
    for (const key of requiredArrays) {
      if (!Array.isArray(editedEvents[key])) {
        throw new Error(`editedEvents.${key} must be an array`);
      }

      // update配列の要素が適切な形式か検証
      if (key === 'update' && editedEvents[key].length > 0) {
        for (let i = 0; i < editedEvents[key].length; i++) {
          const item = editedEvents[key][i];
          if (!Array.isArray(item) || item.length !== 2) {
            throw new Error(
              `editedEvents.update[${i}] must be an array of length 2 [oldEvent, newEvent]`,
            );
          }
        }
      }
    }
  }

  /**
   * Google CalendarからGaroonへイベントを同期
   * TODO 双方向同期のため、現在は未実装
   * @param {EditedEvents} gCalEditedEvents - 編集されたGoogle Calendarイベント
   * @param {Array} garoonAllEvents - 全てのGaroonイベント
   */
  syncGCalToGaroon(gCalEditedEvents, garoonAllEvents) {
    Logger.info('Sync GCal To Garoon: START');

    // TODO 双方向同期が必要なため、以下の実装は保留
    for (const gCalEvent of gCalEditedEvents.create) {
      // const garoonEvent = this.garoonDao.createEvent(gCalEvent);
      // TODO createEvent実装後に有効化
    }

    for (const gCalEvent of gCalEditedEvents.delete) {
      // TODO GCalから削除された: Garoonもイベント更新 (メンバーが自分のみの場合削除、2名以上の場合は脱退)
    }

    for (const gCalEvent of gCalEditedEvents.update) {
      // TODO 最終更新以降の編集がある場合: Garoonのイベント更新, GCalのタグ更新
      // TODO Garoonの更新とGCalの更新、両方あったときはGaroonを優先したい (競合対策)
    }

    Logger.info('Sync GCal To Garoon: END');
  }
}
