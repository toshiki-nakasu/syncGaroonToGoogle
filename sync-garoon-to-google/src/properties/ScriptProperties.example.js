/**
 * スクリプトプロパティ設定例
 *
 * 実際の設定ファイルを作成する際は、このファイルをコピーして
 * ScriptProperties.js として保存し、実際の値を設定してください。
 *
 * 設定方法:
 * 1. このファイルをコピーして ScriptProperties.js を作成
 * 2. 下記の setScriptProperties 関数の値を実際の値に変更
 * 3. Google Apps Script エディタで setScriptProperties 関数を実行
 */

/**
 * スクリプトプロパティを設定する関数
 * この関数を実行してプロパティを設定します
 */
function setScriptProperties() {
  PropertiesService.getScriptProperties().setProperties({
    CalendarName: 'Garoon',

    GaroonDomain: '***.cybozu.com',
    GaroonUserName: 'mei-sei',
    GaroonUserPassword: '***',

    GaroonProfileType: 'USER',
    GaroonProfileCode: 'mei-sei',

    WorkTermStart: '08:00:00',
    WorkTermEnd: '21:00:00',
    FullSyncDaysAgo: '60',
    FullSyncDaysAfter: '180',
  });
}
