# Garoon Google Calendar同期 (GAS版)

旧来のGoogle Apps Script実装です。GaroonからGoogle Calendarへ一方向で同期します。フォルダー改名に伴う同期ロジックの変更はありません。

2要素認証を有効にしたGaroonユーザーでは、この実装のパスワード認証を利用できません。Chrome拡張版の概要と現時点の仕様差分は[リポジトリのREADME](../README.md)を参照してください。

## 初回セットアップ

以下のコマンドはリポジトリのルートで実行します。

1. 設定ファイルを作成します。

    ```bash
    cp gas/src/properties/ScriptProperties.example.js gas/src/properties/ScriptProperties.js
    code gas/src/properties/ScriptProperties.js
    ```

1. アップロードするGoogleアカウントにログインします。

    ```bash
    sh ./gas/script/googleLogin.sh
    ```

1. 新規のApps Script projectが必要な場合は、次のいずれかを実行します。既存のprojectを使う場合はスキップします。

    ```bash
    sh ./gas/script/setupGas.sh
    ```

    ```bash
    npm --prefix gas run setup
    ```

1. GASへアップロードします。

    ```bash
    sh ./gas/script/publishGas.sh
    ```

## GASの自動実行を設定

1. プロジェクトを手動実行してエラーが出ないことを確認します。
1. `デプロイ` > `新しいデプロイ` > `ウェブアプリ` を選択します。アクセスできるユーザーが「自分のみ」であることを確認します。
1. `デプロイ` を押し、デプロイされたバージョンを確認します。後からバージョンを変更する場合は、新たにデプロイします。
1. `トリガー` > `トリガーを追加` を選択します。
    - 実行する関数: `sync`
    - 実行するデプロイ: 先ほどデプロイしたバージョン
    - イベントのソース: `時間主導型`
    - 時間ベースのトリガーのタイプ、間隔とエラー通知: 運用に合わせて設定
1. `保存` を押します。

GAS側では、設定した勤務時間帯の外では同期をスキップします。

## 同期先の設定

- `CalendarName`: 振り分けタグがない予定の同期先カレンダー名
- `SyncTargetCalendars`: タグによる振り分け先の名前を指定するJSON配列
- `FullSyncDaysAgo` と `FullSyncDaysAfter`: 同期対象の過去と未来の日数
- `WorkTermStart` と `WorkTermEnd`: 同期を実行する時間帯

カレンダーは自分が所有する同名のものを検索し、存在しなければ作成します。`#nosync` は同期対象から除外します。設定例は[ScriptProperties.example.js](src/properties/ScriptProperties.example.js)を参照してください。

## 関連文書

- [項目マッピング](../docs/Garoon_GCal_項目マッピング.md)
- [在席情報リセット](../docs/Garoon_在席情報リセット機能.md)
- [APIリファレンス](../docs/Garoon_API_リファレンス.md)

## 注意点

- GAS版のソースは `import` / `export` を使用しません。
- Google CalendarからGaroonへの逆方向同期は未実装です。
