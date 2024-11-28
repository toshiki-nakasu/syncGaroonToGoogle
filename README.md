# syncGaroonToGoogle

## 環境構築

1. 設定ファイルを作成

    ```bash
    cp sync-garoon-to-google/src/properties/ScriptProperties.example.js sync-garoon-to-google/src/properties/ScriptProperties.js
    code sync-garoon-to-google/src/properties/ScriptProperties.js
    ```

1. アップロードするGoogleアカウントにログイン

    ```bash
    sh ./script/function/googleLogin.sh
    ```

1. Gasにアップロード

    ```bash
    sh ./script/function/publishGas.sh
    ```

## Gasの自動実行を設定

1. プロジェクトを手動実行してエラーが出ない事を確認しておくこと
1. `デプロイ` > `新しいデプロイ` > `ウェブアプリ`
    - アクセスできるユーザーが「自分のみ」になっていることを確認
1. `デプロイ`ボタンを押下
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

## 注意点

- typescriptはclasp使ってgsコンパイルする
    - うまくいかない (clasp自体の更新が止まっている)
- exportに対応していない
- GCal -> Garoon: 繰り返し予定に未対応
