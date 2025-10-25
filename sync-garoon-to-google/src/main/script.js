/**
 * メインスクリプトファイル
 * Google Apps Scriptから実行されるエントリーポイント
 */

/**
 * テスト用関数 - Garoonのプレゼンス情報をリセット
 */
function test() {
  try {
    Logger.info('Test: START');

    const container = new ServiceContainer();
    container.initialize();

    const garoonDao = container.getGaroonDao();
    const requestBody = {
      status: {
        code: '',
      },
      notes: '',
    };
    garoonDao.updatePreference(requestBody);

    Logger.info('Test: END');
  } catch (error) {
    Logger.error('Test failed', error);
    throw error;
  }
}

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
 */
function resetPresence() {
  try {
    Logger.info('Reset Presence: START');

    // GCalを初期化せず、Garoon関連のみを初期化
    const configManager = new ConfigManager();

    const garoonUser = new GaroonUser(
      configManager.getGaroonDomain(),
      configManager.getGaroonUserName(),
      configManager.getGaroonUserPassword(),
    );

    const garoonApiService = new GaroonApiService(garoonUser);
    const garoonDao = new GaroonDao(garoonApiService);

    const requestBody = {
      status: {
        code: '', // ステータスコードをリセット
      },
      notes: '', // メモをリセット
    };

    garoonDao.updatePreference(requestBody);

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
  Logger.info('Garoon All Events: ' + garoonAllEvents.length);

  // GCalから予定を取得
  const gCalEventService = container.getGCalEventService();
  const gCalAllEvents = gCalEventService.getByTerm(syncTargetTerm);
  Logger.info('GCal All Events: ' + gCalAllEvents.length);

  // 編集された予定を取得
  const garoonEditedEvents = garoonEventService.getEditedEvents(
    garoonAllEvents,
    gCalAllEvents,
  );
  const gCalEditedEvents = gCalEventService.getEditedEvents(garoonAllEvents);

  // Garoonの予定をGCalへ同期
  const syncEventService = container.getSyncEventService();
  syncEventService.syncGaroonToGCal(garoonEditedEvents, gCalAllEvents);

  // 同期トークンはgetEditedEvents内のgetNotSyncedEventsで既に更新済み
}
