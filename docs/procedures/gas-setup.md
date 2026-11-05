# GAS版の準備

GAS版の配備担当者が、既存または新規のApps Scriptプロジェクトへ設定とコードを配備する手順です。[GAS-01](use-cases.md)を対象にします。

## 前提

- [開発環境の構築](development-setup.md)を完了する。
    - claspはルートの共通依存として導入される。GAS配下での個別の依存導入は不要。
- 配備に使うGoogleアカウントを確認する。
- Garoonのパスワード認証を利用できることを確認する。

> [!IMPORTANT] Garoonユーザーに2要素認証が必要な場合、この実装のパスワード認証は利用できません。認証できない状態で定期実行を設定しないでください。

以下のコマンドはリポジトリのルートで実行します。

## 設定を用意する

1. 設定例をコピーする。

    ```bash
    cp gas/src/properties/ScriptProperties.example.js gas/src/properties/ScriptProperties.js
    ```

1. コピーしたファイルの値を利用する環境に合わせる。

    - 接続と同期先のキーは[設定例](../../gas/src/properties/ScriptProperties.example.js)を正本にする。
    - 実際のパスワードをリポジトリへ登録しない。

1. `gas/.clasp.json`の対象を確認する。

    - 既存プロジェクトを使う場合は、そのプロジェクトに対応した設定を用意する。
    - 既存の有効な設定がある場合は新規プロジェクトを作成しない。

## 認証する

1. ログイン用スクリプトを実行する。

    ```bash
    sh ./gas/script/googleLogin.sh
    ```

1. 表示されたブラウザーでGoogleアカウントを選択する。
1. 認証が完了したことを確認する。

    - 失敗した場合は配備へ進まず、対象アカウントと認証結果を確認する。

## 新規プロジェクトを作成する

既存のプロジェクトを使う場合、この節は実行しません。

1. 作成用スクリプトを実行する。

    ```bash
    sh ./gas/script/setupGas.sh
    ```

1. 生成された`gas/.clasp.json`のプロジェクトを確認する。

## 配備する

1. 反映先を確認して配備スクリプトを実行する。

    ```bash
    sh ./gas/script/publishGas.sh
    ```

1. 開いたApps Scriptエディタで、反映先とソースを確認する。
1. 関数選択から`setScriptProperties`を選んで実行する。

    - ファイルをコピーしただけではScriptPropertiesは設定されない。
    - エラーがないことと、プロジェクトの設定に値が反映されたことを確認する。

1. [同期の操作](gas-operations.md#同期する)を手動で確認してから、定期実行を設定する。
