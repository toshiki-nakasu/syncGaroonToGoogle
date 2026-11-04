/**
 * DAO基底クラス
 * 共通のエラーハンドリングとユーティリティ機能を提供します
 */
class BaseDao {
  constructor() {}

  /**
   * API呼び出しを実行し、統一されたエラーハンドリングを行う
   * リトライ可能なエラーの場合は自動的にリトライします
   * @param {Function} apiCall - 実行するAPI関数
   * @param {string} operationName - 操作名(ログ用)
   * @param {boolean} [enableRetry=false] - リトライを有効にするか
   * @returns {*} API呼び出しの結果
   * @throws {Error} API呼び出しに失敗した場合
   */
  executeWithErrorHandling(apiCall, operationName, enableRetry = false) {
    if (enableRetry) {
      return this.executeWithRetry(apiCall, operationName);
    }

    try {
      return apiCall();
    } catch (error) {
      Logger.error(`${operationName} failed`, error);
      throw error;
    }
  }

  /**
   * リトライ付きでAPI呼び出しを実行
   * @param {Function} apiCall - 実行するAPI関数
   * @param {string} operationName - 操作名(ログ用)
   * @param {number} [maxRetries=3] - 最大リトライ回数
   * @returns {*} API呼び出しの結果
   * @throws {Error} 最大リトライ回数後も失敗した場合
   */
  executeWithRetry(
    apiCall,
    operationName,
    maxRetries = Constants.MAX_RETRY_COUNT,
  ) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return apiCall();
      } catch (error) {
        lastError = error;
        if (this.isRetryableError(error) && attempt < maxRetries) {
          Logger.warn(
            `${operationName} failed (attempt ${attempt}/${maxRetries}), retrying...`,
          );
          Utilities.sleep(Constants.API_COOL_TIME * attempt);
        } else {
          break;
        }
      }
    }
    Logger.error(
      `${operationName} failed after ${maxRetries} attempts`,
      lastError,
    );
    throw lastError;
  }

  /**
   * リトライ可能なエラーかどうかを判定
   * @param {Error} error - エラーオブジェクト
   * @returns {boolean} リトライ可能な場合 true
   */
  isRetryableError(error) {
    if (!error) return false;

    const errorMessage = error.message || String(error);
    const statusCode = this._extractStatusCode(error);

    // HTTPステータスコードベースの判定
    const retryableStatusCodes = [
      Constants.HTTP_STATUS_GONE,
      Constants.HTTP_STATUS_TOO_MANY_REQUESTS,
      Constants.HTTP_STATUS_INTERNAL_SERVER_ERROR,
      Constants.HTTP_STATUS_SERVICE_UNAVAILABLE,
    ];

    if (statusCode && retryableStatusCodes.includes(statusCode)) {
      return true;
    }

    // フォールバック: メッセージベースの判定
    const retryablePatterns = [
      Constants.ERROR_RATE_LIMIT,
      Constants.ERROR_TIMEOUT,
      Constants.ERROR_ECONNRESET,
      Constants.ERROR_SERVER_ERROR,
      Constants.ERROR_EMPTY_RESPONSE,
      Constants.ERROR_DEADLINE_EXCEEDED,
      Constants.ERROR_ADDRESS_UNAVAILABLE,
    ];

    return retryablePatterns.some((pattern) => errorMessage.includes(pattern));
  }

  /**
   * エラーからステータスコードを抽出
   * @private
   * @param {Error} error - エラーオブジェクト
   * @returns {number|null} ステータスコード
   */
  _extractStatusCode(error) {
    if (!error) return null;

    // 1. error.code が数値の場合
    if (typeof error.code === 'number') {
      return error.code;
    }

    // 2. GoogleAppsScriptのHTTPResponseオブジェクト (error.response)
    if (error.response?.getResponseCode) {
      try {
        return error.response.getResponseCode();
      } catch (e) {
        // エラーログは不要（次の処理へ）
      }
    }

    // 3. UrlFetchApp の HTTPResponse から直接取得
    if (typeof error.getResponseCode === 'function') {
      try {
        return error.getResponseCode();
      } catch (e) {
        // エラーログは不要
      }
    }

    // 4. メッセージから正規表現で抽出 (4xx, 5xx のみ)
    const errorMessage = error.message || String(error);
    const statusMatch = errorMessage.match(/\b([45]\d{2})\b/);
    return statusMatch ? parseInt(statusMatch[1], 10) : null;
  }

  /**
   * Sync Token無効エラーかどうかを判定
   * @param {Error} error - エラーオブジェクト
   * @returns {boolean} Sync Token無効エラーの場合 true
   */
  isSyncTokenError(error) {
    if (!error) return false;

    const statusCode = this._extractStatusCode(error);
    if (statusCode === Constants.HTTP_STATUS_GONE) {
      return true;
    }

    // フォールバック: メッセージ検索
    const errorMessage = error.message || String(error);
    return errorMessage.includes('410') || errorMessage.includes('Sync token');
  }
}
