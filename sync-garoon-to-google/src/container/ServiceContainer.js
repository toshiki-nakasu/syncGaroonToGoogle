/**
 * サービスコンテナ - 依存性注入を管理
 * アプリケーションで使用する全てのサービスとデータオブジェクトのインスタンスを管理します
 */
class ServiceContainer {
  constructor() {
    this.now = new Date();
    this.config = null;
    this.garoonUser = null;
    this.garoonProfile = null;
    this.workTerm = null;
    this.syncTargetTerm = null;
    this.gCal = null;
    this.garoonApiService = null;
    this.syncEventService = null;
    this.garoonEventService = null;
    this.gCalEventService = null;
    this.garoonDao = null;
    this.gCalDao = null;
    this.tagParser = null;
  }

  /**
   * すべての依存関係を初期化
   */
  initialize() {
    Logger.info('ServiceContainer: Initializing dependencies...');

    // ============================================================
    // Phase 1: 設定とデータオブジェクトの初期化（依存関係なし）
    // ============================================================

    // 設定管理
    this.config = new ConfigManager();

    // データオブジェクト
    this.garoonUser = new GaroonUser(
      this.config.getGaroonDomain(),
      this.config.getGaroonUserName(),
      this.config.getGaroonUserPassword(),
    );

    this.garoonProfile = new GaroonProfile(
      this.config.getGaroonProfileType(),
      this.config.getGaroonProfileCode(),
    );

    this.workTerm = new TimeTerm(
      this.config.getWorkTermStart(),
      this.config.getWorkTermEnd(),
    );

    this.syncTargetTerm = new DatetimeTerm(
      this.config.getFullSyncDaysAgo(),
      this.config.getFullSyncDaysAfter(),
    );

    this.gCal = new GCal(this.config.getCalendarName(), this.config);

    // ============================================================
    // Phase 2: タグパーサーの初期化
    // ============================================================

    const syncTargetCalendars = this.config.getSyncTargetCalendars();
    this.tagParser = new TagParser(syncTargetCalendars);

    // ============================================================
    // Phase 3: 基本サービスの初期化
    // ============================================================

    this.garoonApiService = new GaroonApiService(this.garoonUser);

    // ============================================================
    // Phase 4: DAO層の初期化（イベントサービスは後で設定）
    // ============================================================

    this.garoonDao = new GaroonDao(this.garoonApiService);

    this.gCalDao = new GCalDao(this.gCal, this.config);

    // ============================================================
    // Phase 5: イベントサービスの初期化（循環参照対策）
    // GaroonEventService と GCalEventService は相互参照するため、
    // 片方を先に作成し、後からプロパティセッターで接続
    // ============================================================

    // GaroonEventService を先に作成（gCalEventService は後で設定）
    this.garoonEventService = new GaroonEventService(this.garoonDao);

    // TagParserを設定
    this.garoonEventService.setTagParser(this.tagParser);

    // GCalEventService を作成（garoonEventService を注入）
    this.gCalEventService = new GCalEventService(
      this.gCalDao,
      this.garoonEventService,
    );

    // 循環参照を解決: GaroonEventService に GCalEventService をセッターで設定
    this.garoonEventService.gCalEventService = this.gCalEventService;

    // ============================================================
    // Phase 6: DAO層にイベントサービスを設定
    // ============================================================

    this.garoonDao.garoonEventService = this.garoonEventService;
    this.gCalDao.garoonEventService = this.garoonEventService;
    this.gCalDao.gCalEventService = this.gCalEventService;

    // ============================================================
    // Phase 7: 同期サービスの初期化
    // ============================================================

    this.syncEventService = new SyncEventService(
      this.gCalDao,
      this.garoonDao,
      this.config,
    );

    // ============================================================
    // Phase 8: カレンダーの事前初期化
    // すべての対象カレンダーを初期化時に作成・検証することで、
    // 同期処理中の予期しない遅延やエラーを防ぐ
    // ============================================================

    this.initializeTargetCalendars();

    Logger.info('ServiceContainer: Dependencies initialized successfully');
  }

  /**
   * 同期対象のカレンダーを事前に初期化
   * 設定で指定されたすべてのカレンダーを取得または作成し、
   * カレンダーIDをキャッシュに保存する
   */
  initializeTargetCalendars() {
    Logger.info('ServiceContainer: Initializing target calendars...');

    const syncTargetCalendars = this.config.getSyncTargetCalendars();
    for (const calendarName of syncTargetCalendars) {
      try {
        // カレンダーを取得または作成し、IDをキャッシュに保存
        this.gCalDao.getOrCreateCalendarId(calendarName);
        Logger.info(`Successfully initialized calendar: "${calendarName}"`);
      } catch (error) {
        Logger.error(
          `Failed to initialize calendar "${calendarName}": ${error.message}`,
        );
        throw new Error(
          `Calendar initialization failed for "${calendarName}": ${error.message}`,
        );
      }
    }

    Logger.info(
      `ServiceContainer: Successfully initialized ${syncTargetCalendars.length} target calendar(s)`,
    );
  }

  /**
   * Garoon関連のみを初期化（軽量版）
   * プレゼンスリセットなど、Garoonのみにアクセスする処理用
   * Google Calendar関連の初期化をスキップするため高速に動作します
   */
  initializeGaroonOnly() {
    Logger.info('ServiceContainer: Initializing Garoon dependencies only...');

    // 設定管理
    this.config = new ConfigManager();

    // Garoonユーザー情報
    this.garoonUser = new GaroonUser(
      this.config.getGaroonDomain(),
      this.config.getGaroonUserName(),
      this.config.getGaroonUserPassword(),
    );

    // Garoon APIサービス
    this.garoonApiService = new GaroonApiService(this.garoonUser);

    // Garoon DAO
    this.garoonDao = new GaroonDao(this.garoonApiService);

    Logger.info(
      'ServiceContainer: Garoon dependencies initialized successfully',
    );
  }

  /**
   * 現在時刻を取得
   * @returns {Date}
   */
  getNow() {
    return this.now;
  }

  /**
   * 設定管理を取得
   * @returns {ConfigManager}
   */
  getConfig() {
    return this.config;
  }

  /**
   * Garoonユーザー情報を取得
   * @returns {GaroonUser}
   */
  getGaroonUser() {
    return this.garoonUser;
  }

  /**
   * Garoonプロファイル情報を取得
   * @returns {GaroonProfile}
   */
  getGaroonProfile() {
    return this.garoonProfile;
  }

  /**
   * 勤務時間を取得
   * @returns {TimeTerm}
   */
  getWorkTerm() {
    return this.workTerm;
  }

  /**
   * 同期対象期間を取得
   * @returns {DatetimeTerm}
   */
  getSyncTargetTerm() {
    return this.syncTargetTerm;
  }

  /**
   * 同期対象期間を設定
   * @param {DatetimeTerm} term - 同期対象期間
   */
  setSyncTargetTerm(term) {
    this.syncTargetTerm = term;
  }

  /**
   * Google Calendar情報を取得
   * @returns {GCal}
   */
  getGCal() {
    return this.gCal;
  }

  /**
   * Garoon APIサービスを取得
   * @returns {GaroonApiService}
   */
  getGaroonApiService() {
    return this.garoonApiService;
  }

  /**
   * 同期サービスを取得
   * @returns {SyncEventService}
   */
  getSyncEventService() {
    return this.syncEventService;
  }

  /**
   * Garoonイベントサービスを取得
   * @returns {GaroonEventService}
   */
  getGaroonEventService() {
    return this.garoonEventService;
  }

  /**
   * Google Calendarイベントサービスを取得
   * @returns {GCalEventService}
   */
  getGCalEventService() {
    return this.gCalEventService;
  }

  /**
   * Garoon DAOを取得
   * @returns {GaroonDao}
   */
  getGaroonDao() {
    return this.garoonDao;
  }

  /**
   * Google Calendar DAOを取得
   * @returns {GCalDao}
   */
  getGCalDao() {
    return this.gCalDao;
  }

  /**
   * TagParserを取得
   * @returns {TagParser}
   */
  getTagParser() {
    return this.tagParser;
  }
}
