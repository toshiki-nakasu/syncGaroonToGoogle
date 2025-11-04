/**
 * Garoon APIへのアクセスを提供するサービスクラス
 */
class GaroonApiService {
  /**
   * @param {GaroonUser} garoonUser - Garoonユーザー情報
   */
  constructor(garoonUser) {
    this.garoonUser = garoonUser;
  }

  /**
   * イベントAPI URIを作成
   * @returns {string} イベントAPI URI
   */
  createEventApiUri() {
    return (
      'https://' +
      this.garoonUser.getDomain() +
      Constants.GAROON_API_ENDPOINT +
      Constants.GAROON_SCHEDULE_EVENTS_PATH
    );
  }

  /**
   * プレゼンスAPI URIを作成
   * @returns {string} プレゼンスAPI URI
   */
  createPresenceApiUri() {
    return (
      'https://' +
      this.garoonUser.getDomain() +
      Constants.GAROON_API_ENDPOINT +
      Constants.GAROON_PRESENCE_USERS_PATH +
      encodeURIComponent(this.garoonUser.getUserName())
    );
  }

  /**
   * プレゼンス情報をリセット
   * 注意: garoonDaoへの依存が必要なため、外部から呼び出す必要があります
   * @returns {*} リセット結果
   */
  resetPreference() {
    const requestBody = {
      status: {
        code: '',
      },
      notes: '',
    };
    // この処理はGaroonDaoで行うため、ここでは定義のみ
    throw new Error('resetPreference should be called through GaroonDao');
  }

  /**
   * API リクエストヘッダーを作成
   * @returns {Object} APIヘッダー
   */
  createApiHeader() {
    return {
      'Content-Type': 'application/json',
      'X-Cybozu-Authorization': Utilities.base64Encode(
        `${this.garoonUser.getUserName()}:${this.garoonUser.getUserPassword()}`,
      ),
    };
  }
}
