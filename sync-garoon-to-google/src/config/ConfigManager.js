/**
 * アプリケーション設定を管理するクラス
 * PropertiesServiceへのアクセスを一元化し、型安全性を提供します
 */
class ConfigManager {
  constructor() {
    this.props = PropertiesService.getScriptProperties();
    this._cachedTimeZone = null;
  }

  /**
   * 必須プロパティを取得
   * @param {string} key - プロパティキー
   * @param {string} propertyName - プロパティ名(エラーメッセージ用)
   * @returns {string} プロパティ値
   * @throws {Error} プロパティが未設定または空の場合
   */
  getRequired(key, propertyName) {
    const value = this.props.getProperty(key);
    if (!value || value.trim() === '') {
      throw new Error(
        `Required property "${propertyName}" (${key}) is not set or empty`,
      );
    }
    return value;
  }

  /**
   * オプショナルプロパティを取得
   * @param {string} key - プロパティキー
   * @param {string} [defaultValue=''] - デフォルト値
   * @returns {string} プロパティ値またはデフォルト値
   */
  getOptional(key, defaultValue = '') {
    return this.props.getProperty(key) || defaultValue;
  }

  /**
   * 数値型プロパティを取得
   * @param {string} key - プロパティキー
   * @param {number} [defaultValue=0] - デフォルト値
   * @returns {number} プロパティ値(数値)またはデフォルト値
   */
  getNumber(key, defaultValue = 0) {
    const value = this.props.getProperty(key);
    return value ? Number(value) : defaultValue;
  }

  /**
   * 正の整数値を検証して取得
   * @param {string} key - プロパティキー
   * @param {number} defaultValue - デフォルト値
   * @param {string} paramName - パラメータ名（エラーメッセージ用）
   * @returns {number} 検証済みの値
   */
  getPositiveInteger(key, defaultValue, paramName) {
    const value = this.getNumber(key, defaultValue);
    Validator.validatePositiveInteger(value, paramName);
    return value;
  }

  /**
   * プロパティを設定
   * @param {string} key - プロパティキー
   * @param {string} value - 値
   */
  set(key, value) {
    this.props.setProperty(key, String(value));
  }

  /**
   * プロパティを削除
   * @param {string} key - プロパティキー
   */
  delete(key) {
    this.props.deleteProperty(key);
  }

  // ============================================================
  // Garoon設定
  // ============================================================

  /**
   * Garoonドメインを取得
   * @returns {string}
   */
  getGaroonDomain() {
    return this.getRequired(Constants.PROPERTY_GAROON_DOMAIN, 'Garoon Domain');
  }

  /**
   * Garoonユーザー名を取得
   * @returns {string}
   */
  getGaroonUserName() {
    return this.getRequired(
      Constants.PROPERTY_GAROON_USER_NAME,
      'Garoon User Name',
    );
  }

  /**
   * Garoonパスワードを取得
   * @returns {string}
   */
  getGaroonUserPassword() {
    return this.getRequired(
      Constants.PROPERTY_GAROON_USER_PASSWORD,
      'Garoon User Password',
    );
  }

  /**
   * Garoonプロファイルタイプを取得
   * @returns {string}
   */
  getGaroonProfileType() {
    return this.getRequired(
      Constants.PROPERTY_GAROON_PROFILE_TYPE,
      'Garoon Profile Type',
    );
  }

  /**
   * Garoonプロファイルコードを取得
   * @returns {string}
   */
  getGaroonProfileCode() {
    return this.getRequired(
      Constants.PROPERTY_GAROON_PROFILE_CODE,
      'Garoon Profile Code',
    );
  }

  /**
   * フルシンク過去日数を取得
   * @returns {number}
   */
  getFullSyncDaysAgo() {
    return this.getPositiveInteger(
      Constants.PROPERTY_FULL_SYNC_DAYS_AGO,
      Constants.DEFAULT_FULL_SYNC_DAYS_AGO,
      'FullSyncDaysAgo',
    );
  }

  /**
   * フルシンク未来日数を取得
   * @returns {number}
   */
  getFullSyncDaysAfter() {
    return this.getPositiveInteger(
      Constants.PROPERTY_FULL_SYNC_DAYS_AFTER,
      Constants.DEFAULT_FULL_SYNC_DAYS_AFTER,
      'FullSyncDaysAfter',
    );
  }

  /**
   * 同期対象期間を取得
   * @param {Date} [now=new Date()] - 基準日時
   * @returns {DatetimeTerm} 同期対象期間
   */
  getSyncTargetTerm(now = new Date()) {
    const daysAgo = this.getFullSyncDaysAgo();
    const daysAfter = this.getFullSyncDaysAfter();
    return new DatetimeTerm(daysAgo, daysAfter).toSyncTargetTerm(now);
  }

  // ============================================================
  // 勤務時間設定
  // ============================================================

  /**
   * 勤務時間開始時刻を取得
   * @returns {string}
   */
  getWorkTermStart() {
    return this.getOptional(Constants.PROPERTY_WORK_TERM_START, '09:00');
  }

  /**
   * 勤務時間終了時刻を取得
   * @returns {string}
   */
  getWorkTermEnd() {
    return this.getOptional(Constants.PROPERTY_WORK_TERM_END, '18:00');
  }

  // ============================================================
  // Google Calendar設定
  // ============================================================

  /**
   * カレンダー名を取得
   * @returns {string}
   */
  getCalendarName() {
    return this.getRequired(Constants.PROPERTY_CALENDAR_NAME, 'Calendar Name');
  }

  /**
   * タイムゾーンを取得（キャッシュ付き）
   * @returns {string}
   * @throws {Error} タイムゾーンが無効な場合
   */
  getTimeZone() {
    if (!this._cachedTimeZone) {
      this._cachedTimeZone = Session.getScriptTimeZone();

      // タイムゾーンの妥当性チェック
      try {
        Utilities.formatDate(new Date(), this._cachedTimeZone, 'yyyy-MM-dd');
      } catch (error) {
        const errorMsg = `Invalid timezone from Session: ${this._cachedTimeZone}`;
        Logger.error(errorMsg, error);
        throw new Error(errorMsg);
      }
    }
    return this._cachedTimeZone;
  }

  /**
   * 次回のSync Tokenを取得
   * @returns {string|null}
   */
  getNextSyncToken() {
    const token = this.props.getProperty(Constants.SYNC_TOKEN_PROPERTY_KEY);
    return token || null;
  }

  /**
   * Sync Tokenを設定
   * @param {string} token - Sync Token
   */
  setNextSyncToken(token) {
    this.set(Constants.SYNC_TOKEN_PROPERTY_KEY, token);
  }

  /**
   * Sync Tokenを削除
   */
  deleteNextSyncToken() {
    this.delete(Constants.SYNC_TOKEN_PROPERTY_KEY);
  }
}
