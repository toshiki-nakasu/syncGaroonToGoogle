/**
 * Garoonのプロファイル情報を管理するクラス
 */
class GaroonProfile {
  /**
   * @param {string} type - プロファイルタイプ
   * @param {string} code - プロファイルコード
   */
  constructor(type, code) {
    this.type = Validator.validateRequired(type, 'type', 'GaroonProfile');
    this.code = Validator.validateRequired(code, 'code', 'GaroonProfile');
  }
}
