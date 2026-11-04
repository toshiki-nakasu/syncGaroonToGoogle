# 開発環境を構築する

開発者が、テストと整形に必要なツールを導入するための手順です。[DEV-03](use-cases.md)を対象にします。コンテナーを使う場合と通常端末を使う場合のどちらかを選んでください。

## devcontainerで構築する

1. 開発端末に次を用意する。

    - Dockerを起動する。
    - VS Codeを用意する。
    - VS Codeへ`ms-vscode-remote.remote-containers`を導入する。
    - コンテナーからnpmレジストリとPlaywrightのダウンロード先へ接続できることを確認する。

1. VS Codeでリポジトリを開き、`Dev Containers: Rebuild and Reopen in Container`を実行する。

    - Node.jsの導入後、`postCreateCommand`が[初期化スクリプト](../../script/postCreate.sh)を実行する。
    - 初期化は共通ツールを導入し、対応するChromiumとOSライブラリを準備する。
    - GAS用のローカルclaspも導入する。
    - 失敗した場合は作成ログを確認し、通信や権限の問題を解消してから再実行する。

1. コンテナーのターミナルで、リポジトリのルートから導入結果を確認する。

    ```bash
    node --version
    npm exec --no -- prettier --version
    npm exec --no -- playwright --version
    jq --version
    ```

    Node.jsが24系であることを確認する。ほかのバージョンは[package.json](../../package.json)の固定値と照合する。

1. [構築後の検証](#構築後の検証)へ進む。

設定を変更した場合はコンテナーを再構築します。依存関係の再導入だけが必要な場合は、リポジトリのルートで`bash script/postCreate.sh`を実行してください。

## 通常端末で構築する

1. 次のツールを用意する。

    - Git
    - Bash
        - WindowsではWSL2上のLinuxを利用する。
    - Node.js 24と付属のnpm
        - 未導入の場合は[Node.js公式の配布案内](https://nodejs.org/en/download)から24系を導入する。
    - zipとunzip
        - 配布物の生成とリリース用テストに使う。DebianやUbuntuでは`sudo apt-get install zip unzip`で導入する。
    - jq (編集用hookを利用する場合)
        - 未導入の場合は[jq公式の導入案内](https://jqlang.org/download/)から、OSに合う方法で導入する。

1. リポジトリのルートで共通ツールを導入する。

    ```bash
    bash script/setup.sh
    ```

    - `npm ci`で固定した開発依存を導入する。
    - 対応するChromiumを導入する。
    - LinuxでOSライブラリも必要な場合は、代わりに次を実行する。導入時はsudoの権限が必要になる。

        ```bash
        bash script/setup.sh --with-browser-deps
        ```

    - GASも開発する場合は、選んだコマンドに`--with-gas`を付ける。
    - 導入に失敗した場合は、表示された通信と権限のエラーを解消してから同じコマンドを再実行する。

1. VS Codeを利用する場合は、[ワークスペースファイル](../../syncGaroonToGoogle.code-workspace)を開く。

    - 推奨拡張機能は[extensions.json](../../.vscode/extensions.json)から導入する。
    - AI文書を使う場合は、Agent Customizationsの診断で`docs/instructions`配下の対象が認識されているか確認する。
    - 自動認識されない場合の参照方法は[AI文書の読込先](../design/development-environment.md#ai文書の読込先)を確認する。

1. [構築後の検証](#構築後の検証)へ進む。

## 構築後の検証

以下はリポジトリのルートで順に実行します。エラーがある場合は次へ進まず、内容を確認してください。

1. ブラウザーを使わない自動テストを実行する。

    ```bash
    npm test
    ```

1. JavaScriptの構文と文書の参照を検査する。

    ```bash
    npm run check
    ```

1. 導入したChromiumで拡張機能を読み込む。

    ```bash
    npm run test:browser
    ```

    - 自動同期の設定保存を確認する。
    - 全削除の画面操作とバッチ処理を確認する。
    - APIの失敗理由が表示されることを確認する。
    - 共有ライブラリ不足の場合は`npm run browser:install:deps`で追加導入する。

変更後の検証は[開発と検証](development-procedures.md)へ進んでください。開発ツールと配置の管理理由は[開発環境の設計](../design/development-environment.md)を参照してください。
