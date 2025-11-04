/**
 * メインスクリプトファイル
 * Google Apps Scriptから実行されるエントリーポイント
 */

/**
 * Garoonの在席情報（プレゼンス）をリセット
 *
 * この関数は、Garoonに登録されている自分の在席情報を初期状態に戻します。
 * ステータスコードとメモの両方が空文字列にリセットされます。
 *
 * 使用例:
 * - 退勤時に在席情報をクリアしたい場合
 * - 外出・離席などの状態を解除したい場合
 * - 誤って設定した在席情報を削除したい場合
 *
 * @throws {Error} API呼び出しに失敗した場合
 * @throws {Error} 認証に失敗した場合
 * @throws {Error} 必須設定が不足している場合
 */
function resetPresence() {
  try {
    Logger.info('Reset Presence: START');

    const container = new ServiceContainer();
    container.initializeGaroonOnly();

    const garoonDao = container.getGaroonDao();
    garoonDao.updatePreference(Constants.GAROON_PRESENCE_RESET_BODY);

    Logger.info('Reset Presence: Successfully reset presence information');
    Logger.info('Reset Presence: END');
  } catch (error) {
    Logger.error('Reset Presence failed', error);
    throw error;
  }
}

/**
 * 同期処理のメインエントリーポイント
 * Garoonのスケジュールとgoogle Calendarを同期します
 */
function sync() {
  try {
    Logger.info('Sync: START');

    const container = new ServiceContainer();
    container.initialize();

    if (!isWithinWorkHours(container)) {
      Logger.info('Sync: Outside work hours. Skipping sync.');
      return;
    }

    performSync(container);

    Logger.info('Sync: END');
  } catch (error) {
    Logger.error('Sync failed', error);
    throw error;
  }
}

/**
 * 勤務時間内かどうかを判定
 * @param {ServiceContainer} container - サービスコンテナ
 * @returns {boolean} 勤務時間内の場合 true
 */
function isWithinWorkHours(container) {
  const now = container.getNow();
  const workTerm = container.getWorkTerm();
  const workDatetimeTerm = workTerm.toDatetimeTerm(now);
  return workDatetimeTerm.isInTerm(now);
}

/**
 * 実際の同期処理を実行
 * @param {ServiceContainer} container - サービスコンテナ
 */
function performSync(container) {
  const now = container.getNow();
  const syncTargetTerm = container.getSyncTargetTerm().toSyncTargetTerm(now);

  // Garoonから予定を取得
  const garoonEventService = container.getGaroonEventService();
  const garoonAllEvents = garoonEventService.getByTerm(syncTargetTerm);
  Logger.info(`Garoon All Events: ${garoonAllEvents.length}`);

  // GCalから予定を取得
  const gCalEventService = container.getGCalEventService();
  const gCalAllEvents = gCalEventService.getByTerm(syncTargetTerm);
  Logger.info(`GCal All Events: ${gCalAllEvents.length}`);

  // 編集された予定を取得
  const garoonEditedEvents = garoonEventService.getEditedEvents(
    garoonAllEvents,
    gCalAllEvents,
  );
  const gCalEditedEvents = gCalEventService.getEditedEvents(garoonAllEvents);

  // Garoonの予定をGCalへ同期
  const syncEventService = container.getSyncEventService();
  syncEventService.syncGaroonToGCal(garoonEditedEvents, gCalAllEvents);
}

/**
 * 指定された日付以降のGaroon予定を全て削除する
 *
 * この関数は指定された日付以降のGaroonの予定を取得し、
 * それらを全て削除します。削除処理にはレート制限対策が含まれています。
 * 削除対象期間は指定日から1年後までです。
 *
 * @param {Date} fromDate - 削除開始日（Date型）この日付の0時0分0秒以降、1年後までの予定が削除されます
 * @throws {Error} API呼び出しに失敗した場合
 * @throws {Error} 認証に失敗した場合
 * @throws {Error} 必須設定が不足している場合
 * @throws {Error} 日付が不正な場合
 */
function deleteEventsFrom(fromDate) {
  try {
    // 日付のバリデーション
    if (!(fromDate instanceof Date) || isNaN(fromDate.getTime())) {
      throw new Error('Invalid date parameter. Expected a valid Date object.');
    }

    // 指定された日付の0時0分0秒を基準日時として設定
    const startDate = new Date(fromDate);
    startDate.setHours(0, 0, 0, 0);

    // 終了日時は開始日から1年後の23時59分59秒に設定
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);
    endDate.setHours(23, 59, 59, 999);

    const fromDateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD形式
    Logger.info(`Delete Events From ${fromDateStr}: START`);

    const container = new ServiceContainer();
    container.initializeGaroonOnly();

    const garoonDao = container.getGaroonDao();

    Logger.info(
      `Target period: ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );

    // 期間内の予定を取得
    const queryParam = {
      rangeStart: startDate.toISOString(),
      rangeEnd: endDate.toISOString(),
      orderBy: 'start asc',
      limit: Constants.GAROON_MAX_RESULTS_PER_PAGE,
    };

    Logger.info('Fetching events from Garoon...');
    const events = garoonDao.selectEventByTerm(queryParam);
    Logger.info(`Found ${events.length} events to delete`);

    if (events.length === 0) {
      Logger.info('No events to delete');
      Logger.info(`Delete Events From ${fromDateStr}: END`);
      return;
    }

    // 削除処理
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      Logger.info(
        `Deleting event ${i + 1}/${events.length}: ${event.subject} (ID: ${
          event.id
        })`,
      );

      try {
        const result = garoonDao.deleteEvent(event.id);
        if (result) {
          successCount++;
        } else {
          failureCount++;
        }

        // API制限対策: 一定間隔でスリープ
        if ((i + 1) % 10 === 0) {
          Logger.info(
            `Progress: ${i + 1}/${events.length} completed. Cooling down...`,
          );
          Utilities.sleep(Constants.API_COOL_TIME);
        }
      } catch (error) {
        Logger.error(`Failed to delete event: ${event.id}`, error);
        failureCount++;
      }
    }

    Logger.info(`Delete Events From ${fromDateStr}: SUMMARY`);
    Logger.info(`  Total events: ${events.length}`);
    Logger.info(`  Successfully deleted: ${successCount}`);
    Logger.info(`  Failed to delete: ${failureCount}`);
    Logger.info(`Delete Events From ${fromDateStr}: END`);
  } catch (error) {
    Logger.error(`Delete Events From ${fromDateStr} failed`, error);
    throw error;
  }
}

/**
 * 2025年11月1日以降のGaroon予定を全て削除する
 *
 */
function deleteEventsFrom20251101() {
  deleteEventsFrom(new Date('2025-11-01'));
}
