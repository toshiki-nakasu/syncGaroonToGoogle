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
   */
  constructor(gCalDao, garoonDao) {
    this.gCalDao = gCalDao;
    this.garoonDao = garoonDao;
  }

  /**
   * GaroonからGoogle Calendarへイベントを同期
   * @param {EditedEvents} garoonEditedEvents - 編集されたGaroonイベント
   * @param {Array} gCalAllEvents - 全てのGoogle Calendarイベント
   */
  syncGaroonToGCal(garoonEditedEvents, gCalAllEvents) {
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

    // 作成処理
    if (garoonEditedEvents.create.length > 0) {
      Logger.info(`Creating ${garoonEditedEvents.create.length} events...`);
      for (const garoonEvent of garoonEditedEvents.create) {
        this.gCalDao.createEvent(garoonEvent);
      }
    }

    // 削除処理
    if (garoonEditedEvents.delete.length > 0) {
      Logger.info(`Deleting ${garoonEditedEvents.delete.length} events...`);
      for (const gCalEvent of garoonEditedEvents.delete) {
        this.gCalDao.deleteEvent(gCalEvent);
      }
    }

    // 更新処理
    if (garoonEditedEvents.update.length > 0) {
      Logger.info(`Updating ${garoonEditedEvents.update.length} events...`);
      for (const eventArray of garoonEditedEvents.update) {
        this.gCalDao.updateEvent(eventArray);
      }
    }

    Logger.info('Sync Garoon To GCal: END');
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
