/**
 * ログ出力ユーティリティクラス
>
 */
class Logger {
  /**
   * ログレベルの定義
   */
  static get LOG_LEVEL() {
    return {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
    };
  }

  /**
   * 現在のログレベルを
   */
  static getCurrentLevel() {
    if (typeof Logger._currentLevel === 'undefined') {
      Logger._currentLevel = Logger.LOG_LEVEL.INFO;
    }
    return Logger._currentLevel;
  }

  /**
   * @param {number} level - 設定するログレベル
   */
  static setLevel(level) {
    Logger._currentLevel = level;
  }

  /**
   * デバッグログを出力
   * @param {string} message - ログメッセージ
   * @param {*} [data] - 追加のデータ
   */
  static debug(message, data = null) {
    if (Logger.getCurrentLevel() <= Logger.LOG_LEVEL.DEBUG) {
      const logEntry = Logger._formatLogEntry('DEBUG', message, data);
      console.log(logEntry);
    }
  }

  /**
   * 情報ログを出力
   * @param {string} message - ログメッセージ
   * @param {*} [data] - 追加のデータ
   */
  static info(message, data = null) {
    if (Logger.getCurrentLevel() <= Logger.LOG_LEVEL.INFO) {
      const logEntry = Logger._formatLogEntry('INFO', message, data);
      console.info(logEntry);
    }
  }

  /**

   * @param {string} message - ログメッセージ
   * @param {*} [data] - 追加のデータ
   */
  static warn(message, data = null) {
    if (Logger.getCurrentLevel() <= Logger.LOG_LEVEL.WARN) {
      const logEntry = Logger._formatLogEntry('WARN', message, data);
      console.warn(logEntry);
    }
  }

  /**
   * エラーログを出力
   * @param {string} message - ログメッセージ
   * @param {Error} [error] - エラーオブジェクト
   */
  static error(message, error = null) {
    if (Logger.getCurrentLevel() <= Logger.LOG_LEVEL.ERROR) {
      const logEntry = Logger._formatLogEntry('ERROR', message, null, error);
      console.error(logEntry);
    }
  }

  /**
   * パフォーマンス測定を開始
   * @param {string} label - タイマーラベル
   */
  static time(label) {
    console.time(label);
  }

  /**
   * タイマーを終了
   * @param {string} label - タイマーラベル
   */
  static timeEnd(label) {
    console.timeEnd(label);
  }

  /**
   * ログエントリをフォーマット
   * @private
   * @param {string} level - ログレベル
   * @param {string} message - ログメッセージ
   * @param {*} [data] - 追加のデータ
   * @param {Error} [error] - エラーオブジェクト
   * @returns {string} フォーマットされたログエントリ
   */
  static _formatLogEntry(level, message, data = null, error = null) {
    const config = new ConfigManager();
    const logEntry = {
      level: level,
      timestamp: Utilities.formatDate(
        new Date(),
        config.getTimeZone(),
        'yyyy-MM-dd HH:mm:ss',
      ),
      message: message,
    };

    if (data !== null) {
      logEntry.data = data;
    }

    if (error !== null) {
      logEntry.error = {
        message: error.message || String(error),
        stack: error.stack || null,
      };
    }

    return JSON.stringify(logEntry);
  }
}
