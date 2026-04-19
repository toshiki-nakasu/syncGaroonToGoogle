# syncGaroonToGoogle

Garoon の予定を Google Calendar に同期する Google Apps Script project です。現行実装の同期方向は Garoon から Google Calendar への一方向です。

## 初回セットアップ

1. 設定ファイルを作成

    ```bash
    cp sync-garoon-to-google/src/properties/ScriptProperties.example.js sync-garoon-to-google/src/properties/ScriptProperties.js
    code sync-garoon-to-google/src/properties/ScriptProperties.js
    ```

1. アップロードするGoogleアカウントにログイン

    ```bash
    sh ./script/function/googleLogin.sh
    ```

1. Apps Script project を準備
    - 既存の Apps Script project にアップロードする場合は、この手順をスキップ
    - 新規に作成する場合は、以下のいずれかを実行

    ```bash
    sh ./script/function/setupGas.sh
    ```

    ```bash
    cd sync-garoon-to-google
    npm run setup
    ```

1. GAS にアップロード

    ```bash
    sh ./script/function/publishGas.sh
    ```

## GAS の自動実行を設定

1. プロジェクトを手動実行してエラーが出ないことを確認しておく
1. `デプロイ` > `新しいデプロイ` > `ウェブアプリ`
    - アクセスできるユーザーが「自分のみ」になっていることを確認
1. `デプロイ` ボタンを押下
1. デプロイされたバージョンを確認しておく
    - **後からバージョンを変更できない**
    - 新たにバージョンアップしてデプロイする場合、再度この手順が必要
1. `トリガー` > `トリガーを追加`
    - 実行する関数: `sync`
    - 実行するデプロイを選択: デプロイされたバージョン
    - イベントのソースを選択: `時間主導型`
        - `カレンダーから`は不都合が多いのでナシ
    - 時間ベースのトリガーのタイプを選択: お好みに合わせて
    - 時間の間隔を選択: お好みに合わせて
    - エラー通知設定: お好みに合わせて
        - 正常に動作していても週に1,2回ほどエラーが出ます
1. `保存`を押下

---

## 使い方

- Garoon にスケジュールを入れると、トリガーのタイミングで自動的に Google Calendar に登録されます。
- Garoon スケジュールの「メモ」欄に `#nosync` が含まれている場合は同期しません。

## 関連文書

- [docs/Garoon_GCal\_項目マッピング.md](docs/Garoon_GCal_項目マッピング.md)
- [docs/Garoon\_在席情報リセット機能.md](docs/Garoon_在席情報リセット機能.md)
- [docs/Garoon_API\_リファレンス.md](docs/Garoon_API_リファレンス.md)

## 注意点

- `import` / `export` を使うモジュール構成には対応していません。
- Google Calendar から Garoon への同期は未実装です。
