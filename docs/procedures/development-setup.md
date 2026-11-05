# 開発環境を構築する

開発者が、テストと整形に必要なツールを導入するための手順です。コンテナーを使う場合と通常端末を使う場合のどちらかを選んでください。

## devcontainerで構築する

1. 開発端末に次を用意する。

    - Dockerを起動する。
    - VS Codeを用意する。
    - VS Codeへ`ms-vscode-remote.remote-containers`を導入する。
    - コンテナーからnpmレジストリとPlaywrightのダウンロード先へ接続できることを確認する。

1. VS Codeでリポジトリを開き、`Dev Containers: Rebuild and Reopen in Container`を実行する。

    - Node.jsの導入後、`postCreateCommand`が[初期化スクリプト](../../script/environment/setup-devcontainer.sh)を実行する。
    - 初期化は共通ツールを導入し、対応するChromiumとOSライブラリを準備する。
    - GAS用のclaspも共通の`node_modules`へ導入する。
    - 失敗した場合は作成ログを確認し、通信や権限の問題を解消してから再実行する。

1. コンテナーのターミナルで、リポジトリのルートから導入結果を確認する。

    ```bash
    node --version
    npm exec --no -- prettier --version
    npm exec --no -- playwright --version
    npm exec --no -- clasp --version
    jq --version
    ```

    Node.jsが24系であることを確認する。ほかのバージョンは[package.json](../../package.json)の固定値と照合する。

1. VS Codeで[ワークスペースファイル](../../syncGaroonToGoogle.code-workspace)を開き、共通のエディタ設定を適用する。
1. [構築後の検証](#構築後の検証)へ進む。

設定を変更した場合はコンテナーを再構築します。依存関係の再導入だけが必要な場合は、リポジトリのルートで`bash script/environment/setup-devcontainer.sh`を実行してください。

## 通常端末で構築する

1. 次のツールを用意する。

    - Git
    - Bash
        - WindowsではWSL2上のLinuxを利用する。
    - Node.js 24と付属のnpm
        - 未導入の場合は[Node.js公式の配布案内](https://nodejs.org/en/download)から24系を導入する。
    - zipとunzip
        - 配布物の生成とリリース用テストに使う。DebianやUbuntuでは`sudo apt-get install zip unzip`で導入する。
    - jq
        - 配布物の生成と文書リンク検査、編集用hookで使う。
        - 未導入の場合は[jq公式の導入案内](https://jqlang.org/download/)から、OSに合う方法で導入する。

1. リポジトリのルートで共通ツールを導入する。

    ```bash
    bash script/environment/setup-development.sh
    ```

    - `npm ci`で固定した開発依存を導入する。
    - 対応するChromiumを導入する。
    - LinuxでOSライブラリも必要な場合は、代わりに次を実行する。導入時はsudoの権限が必要になる。

        ```bash
        bash script/environment/setup-development.sh --with-browser-deps
        ```

    - GAS用のclaspも共通の依存として導入される。GAS配下での個別の`npm install`は不要。
    - 導入に失敗した場合は、表示された通信と権限のエラーを解消してから同じコマンドを再実行する。

1. VS Codeを利用する場合は、[ワークスペースファイル](../../syncGaroonToGoogle.code-workspace)を開く。

    - 推奨拡張機能は[extensions.json](../../.vscode/extensions.json)から導入する。
    - AI文書を使う場合は、Agent Customizationsの診断で`.github`配下の対象が認識されているか確認する。
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

## 依存関係を分けていた環境から移行する

1. devcontainerを使っている場合はコンテナーを再構築し、GAS用の`node_modules`ボリュームのマウントを解除する。
1. リポジトリのルートで`npm ci --include=dev`を実行する。
1. 以前の`gas/node_modules`が残っている場合は削除する。

    - `gas/node_modules`がマウント先ではないことを確認してから、`rm -rf gas/node_modules`を実行する。
    - 接続設定や認証ファイルを含む`gas/`自体は削除しない。

1. リポジトリのルートから`npm --prefix gas exec --no -- clasp --version`を実行し、共通のclaspを呼び出せることを確認する。
