/**
 * アプリケーション全体で使用する定数クラス
 * マジックナンバーや文字列リテラルを一元管理します
 */
class Constants {
  // ============================================================
  // API関連
  // ============================================================

  /**
   * Garoon APIのベースエンドポイント
   */
  static get GAROON_API_ENDPOINT() {
    return '/g/api/v1/';
  }

  /**
   * Garoonスケジュールイベントのパス
   */
  static get GAROON_SCHEDULE_EVENTS_PATH() {
    return 'schedule/events';
  }

  /**
   * Garoonプレゼンスのパス
   */
  static get GAROON_PRESENCE_USERS_PATH() {
    return 'presence/users/code/';
  }

  /**
   * Garoonプレゼンスリセット用のリクエストボディ
   * ステータスコードとメモを空にしてプレゼンス情報をリセットします
   */
  static get GAROON_PRESENCE_RESET_BODY() {
    return {
      status: {
        code: '',
      },
      notes: '',
    };
  }

  // ============================================================
  // タグ名
  // ============================================================

  /**
   * GaroonのユニークイベントIDを保存するタグ名
   */
  static get TAG_GAROON_UNIQUE_EVENT_ID() {
    return 'GAROON_UNIQUE_EVENT_ID';
  }

  /**
   * Garoonの同期日時を保存するタグ名
   */
  static get TAG_GAROON_SYNC_DATETIME() {
    return 'GAROON_SYNC_DATETIME';
  }

  // ============================================================
  // プロパティキー
  // ============================================================

  /**
   * Garoonドメインのプロパティキー
   */
  static get PROPERTY_GAROON_DOMAIN() {
    return 'GaroonDomain';
  }

  /**
   * Garoonユーザー名のプロパティキー
   */
  static get PROPERTY_GAROON_USER_NAME() {
    return 'GaroonUserName';
  }

  /**
   * Garoonパスワードのプロパティキー
   */
  static get PROPERTY_GAROON_USER_PASSWORD() {
    return 'GaroonUserPassword';
  }

  /**
   * Garoonプロファイルタイプのプロパティキー
   */
  static get PROPERTY_GAROON_PROFILE_TYPE() {
    return 'GaroonProfileType';
  }

  /**
   * Garoonプロファイルコードのプロパティキー
   */
  static get PROPERTY_GAROON_PROFILE_CODE() {
    return 'GaroonProfileCode';
  }

  /**
   * フルシンク過去日数のプロパティキー
   */
  static get PROPERTY_FULL_SYNC_DAYS_AGO() {
    return 'FullSyncDaysAgo';
  }

  /**
   * フルシンク未来日数のプロパティキー
   */
  static get PROPERTY_FULL_SYNC_DAYS_AFTER() {
    return 'FullSyncDaysAfter';
  }

  /**
   * 勤務時間開始時刻のプロパティキー
   */
  static get PROPERTY_WORK_TERM_START() {
    return 'WorkTermStart';
  }

  /**
   * 勤務時間終了時刻のプロパティキー
   */
  static get PROPERTY_WORK_TERM_END() {
    return 'WorkTermEnd';
  }

  /**
   * カレンダー名のプロパティキー
   */
  static get PROPERTY_CALENDAR_NAME() {
    return 'CalendarName';
  }

  /**
   * プロパティストアに保存する次回同期トークンのキー
   * Google Calendar API などのインクリメンタル同期で使用
   */
  static get SYNC_TOKEN_PROPERTY_KEY() {
    return 'nextSyncToken';
  }

  /**
   * Garoon→GCal同>
   */
  static get GAROON_TO_GCAL_NOT_SYNC_TAG() {
    return 'nosync';
  }

  // ============================================================
  // API制御
  // ============================================================

  /**
)
   */
  static get API_COOL_TIME() {
    return 1000;
  }

  /**
   * ページネーションの最大件数
   * Google Calendar API のデフォルト上限
   */
  static get MAX_RESULTS_PER_PAGE() {
    return 250;
  }

  /**
npm run Setup
   */
  static get GAROON_MAX_RESULTS_PER_PAGE() {
    return 200;
  }

  /**
   * API呼び出しの最大リトライ回数
   */
  static get MAX_RETRY_COUNT() {
    return 3;
  }

  /**
   * ページネーションの最大ページ数（無限ループ対策）
   */
  static get MAX_PAGINATION_PAGES() {
    return 100;
  }

  // ============================================================
  // HTTPステータスコード
  // ============================================================

  /**
   * Sync Token無効エラーのステータスコード
   */
  static get HTTP_STATUS_GONE() {
    return 410;
  }

  /**
   * レート制限エラーのステータスコード
   */
  static get HTTP_STATUS_TOO_MANY_REQUESTS() {
    return 429;
  }

  /**
   * サービス利用不可エラーのステータスコード
   */
  static get HTTP_STATUS_SERVICE_UNAVAILABLE() {
    return 503;
  }

  /**
   * 内部サーバーエラーのステータスコード
   */
  static get HTTP_STATUS_INTERNAL_SERVER_ERROR() {
    return 500;
  }

  /**
   * リクエスト成功のステータスコード
   */
  static get HTTP_STATUS_OK() {
    return 200;
  }

  /**
   * 作成成功のステータスコード
   */
  static get HTTP_STATUS_CREATED() {
    return 201;
  }

  /**
   * 成功レスポンスの最小ステータスコード
   */
  static get HTTP_STATUS_SUCCESS_MIN() {
    return 200;
  }

  /**
   * 成功レスポンスの最大ステータスコード
   */
  static get HTTP_STATUS_SUCCESS_MAX() {
    return 299;
  }

  // ============================================================
  // イベントステータス
  // ============================================================

  /**
   * キャンセルされたイベントのステータス値
   */
  static get EVENT_STATUS_CANCELLED() {
    return 'cancelled';
  }

  // ============================================================
  // エラーメッセージキーワード
  // ============================================================

  /**
   * レート制限エラーのキーワード
   */
  static get ERROR_RATE_LIMIT() {
    return 'Rate Limit';
  }

  /**
   * タイムアウトエラーのキーワード
   */
  static get ERROR_TIMEOUT() {
    return 'Timeout';
  }

  /**
   * 接続リセットエラーのキーワード
   */
  static get ERROR_ECONNRESET() {
    return 'ECONNRESET';
  }

  // ============================================================
  // フォーマット関連
  // ============================================================

  /**
   * ゼロパディングのデフォルト桁数
   */
  static get DEFAULT_PADDING_LENGTH() {
    return 2;
  }

  // ============================================================
  // デフォルト値
  // ============================================================

  /**
   * デフォルトのフルシンク過去日数
   */
  static get DEFAULT_FULL_SYNC_DAYS_AGO() {
    return 7;
  }

  /**
   * デフォルトのフルシンク未来日数
   */
  static get DEFAULT_FULL_SYNC_DAYS_AFTER() {
    return 90;
  }

  /**
   * デフォルトの勤務時間開始
   */
  static get DEFAULT_WORK_TERM_START() {
    return '09:00:00';
  }

  /**
   * デフォルトの勤務時間終了
   */
  static get DEFAULT_WORK_TERM_END() {
    return '18:00:00';
  }
}
