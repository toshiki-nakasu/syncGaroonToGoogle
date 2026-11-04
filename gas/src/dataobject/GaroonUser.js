/**
 * Garoonのユーザー情報を管理するクラス
 */
class GaroonUser {
  /**
   * @param {string} domain - Garoonドメイン
   * @param {string} userName - ユーザー名
   * @param {string} userPassword - パスワード
   */
  constructor(domain, userName, userPassword) {
    this.domain = Validator.validateRequired(domain, 'domain', 'GaroonUser');
    this.userName = Validator.validateRequired(
      userName,
      'userName',
      'GaroonUser',
    );
    this.userPassword = Validator.validateRequired(
      userPassword,
      'userPassword',
      'GaroonUser',
    );
  }

  /**
   * Garoonドメインを取得
   * @returns {string}
   */
  getDomain() {
    return this.domain;
  }

  /**
   * ユーザー名を取得
   * @returns {string}
   */
  getUserName() {
    return this.userName;
  }

  /**
   * パスワードを取得
   * @returns {string}
   */
  getUserPassword() {
    return this.userPassword;
  }
}
