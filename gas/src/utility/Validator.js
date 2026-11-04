/**
 * 共通の検証ユーティリティクラス
 * データオブジェクトのパラメータ検証機能を提供します
 */
class Validator {
  /**
   * 必須パラメータの検証
   * @param {*} value - 検証する値
   * @param {string} paramName - パラメータ名
   * @param {string} className - クラス名
   * @returns {*} 検証済みの値
   * @throws {Error} 値が null、undefined、空文字列の場合
   */
  static validateRequired(value, paramName, className) {
    if (value === null || value === undefined || value === '') {
      throw new Error(
        `Required parameter "${paramName}" is missing or empty in ${className}`,
      );
    }
    return value;
  }

  /**
   * 正の整数値を検証
   * @param {number} value - 検証する値
   * @param {string} paramName - パラメータ名
   * @throws {Error} 値が負の整数または整数でない場合
   */
  static validatePositiveInteger(value, paramName) {
    if (value < 0 || !Number.isInteger(value)) {
      throw new Error(`${paramName} must be a non-negative integer`);
    }
  }

  /**
   * 文字列型を検証
   * @param {*} value - 検証する値
   * @param {string} paramName - パラメータ名
   * @param {string} className - クラス名
   * @returns {string} 検証済みの値
   * @throws {Error} 値が文字列でない場合
   */
  static validateString(value, paramName, className) {
    if (typeof value !== 'string') {
      throw new Error(
        `Parameter "${paramName}" must be a string in ${className}`,
      );
    }
    return value;
  }

  /**
   * 数値型を検証
   * @param {*} value - 検証する値
   * @param {string} paramName - パラメータ名
   * @param {string} className - クラス名
   * @returns {number} 検証済みの値
   * @throws {Error} 値が数値でない場合
   */
  static validateNumber(value, paramName, className) {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error(
        `Parameter "${paramName}" must be a number in ${className}`,
      );
    }
    return value;
  }

  /**
   * オブジェクト型を検証
   * @param {*} value - 検証する値
   * @param {string} paramName - パラメータ名
   * @param {string} className - クラス名
   * @returns {Object} 検証済みの値
   * @throws {Error} 値がオブジェクトでない場合
   */
  static validateObject(value, paramName, className) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(
        `Parameter "${paramName}" must be an object in ${className}`,
      );
    }
    return value;
  }

  /**
   * 配列型を検証
   * @param {*} value - 検証する値
   * @param {string} paramName - パラメータ名
   * @param {string} className - クラス名
   * @returns {Array} 検証済みの値
   * @throws {Error} 値が配列でない場合
   */
  static validateArray(value, paramName, className) {
    if (!Array.isArray(value)) {
      throw new Error(
        `Parameter "${paramName}" must be an array in ${className}`,
      );
    }
    return value;
  }
}
