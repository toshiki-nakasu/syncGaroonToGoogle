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
    // デフォルトの同期先カレンダー名
    // タグなしのGaroon予定はこのカレンダーに同期されます
    // カレンダーが存在しない場合は自動作成されます
    CalendarName: 'Garoon',

    // Garoon接続情報
    // GaroonDomain: Garoonのドメイン（例: xxx.cybozu.com）
    // GaroonUserName: Garoonのログインユーザー名
    // GaroonUserPassword: Garoonのログインパスワード
    GaroonDomain: '***.cybozu.com',
    GaroonUserName: 'mei-sei',
    GaroonUserPassword: '***',

    // Garoonプロファイル設定
    // GaroonProfileType: プロファイルの種類（USER: ユーザー指定）
    // GaroonProfileCode: 対象ユーザーのログイン名
    GaroonProfileType: 'USER',
    GaroonProfileCode: 'mei-sei',

    // 同期実行時間帯
    // この時間帯外では sync() を実行してもスキップされます
    // 形式: HH:MM:SS
    WorkTermStart: '08:00:00',
    WorkTermEnd: '21:00:00',

    // 同期対象期間（日数）
    // FullSyncDaysAgo: 現在日から何日前までを同期対象とするか
    // FullSyncDaysAfter: 現在日から何日後までを同期対象とするか
    FullSyncDaysAgo: '60',
    FullSyncDaysAfter: '180',

    // 同期対象のタグ付きカレンダー名（JSON配列形式）
    // Garoon予定のメモに #private と書くと "private" カレンダーに同期されます
    // カレンダーが存在しない場合は自動作成されます
    // タグなし: CalendarName で指定したカレンダーに同期
    // #nosync: 同期しない（最優先）
    // #<タグ名>: 配列に含まれるタグ名のカレンダーに同期
    SyncTargetCalendars: JSON.stringify(['family']),
  });
}
