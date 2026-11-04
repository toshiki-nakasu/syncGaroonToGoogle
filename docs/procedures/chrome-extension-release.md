# Chrome拡張機能をリリースする

保守担当者が、検証済みのコミットへバージョンタグを付けて配布する手順です。[DEV-04](use-cases.md)を対象にします。ストア審査は使わず、GitHub Releasesへ配布用ZIPを公開します。

## 前提

- [開発環境の構築](development-setup.md)を完了する。
- タグを送信できる`origin`とGitの認証を設定する。
- GitHub Actionsを利用できることを確認する。
- 配布するコミットに、ルートの`package.json`と`package-lock.json`を含める。
- 配布先で使う拡張機能IDとGoogle OAuthクライアントの対応を確認する。

現在の認証設定はリリース処理では変更しません。別PCでも同じIDにするにはmanifestの公開鍵`key`を固定し、そのIDをOAuthへ登録する必要があります。既存のIDが変わる場合は設定の移行も確認します。[Google側の準備](google-calendar-setup.md)を参照してください。

## 配布物を手元で確認する

コマンドはリポジトリのルートで実行します。パッケージの生成とテストにはLinuxの`zip`と`unzip`を使います。

1. [ローカル検証](development-procedures.md#ローカル検証)と[ブラウザーテスト](development-procedures.md#実ブラウザーでの確認)を実行する。
1. 配布予定のタグとリポジトリを指定する。

    ```bash
    npm run package:extension -- v0.1.1 toshiki-nakasu/syncGaroonToGoogle
    ```

1. `dist/garoon-calendar-sync.zip`と`dist/garoon-calendar-sync.zip.sha256`を確認する。

    - ZIPに実行ファイル、利用手順、マッピング図、更新ツール、`release.json`が入っていることを確認する。
    - 配布manifestの版が`0.1.1`になっていることを確認する。
    - `README.md`は利用手順から生成される。他文書へのリンクは指定タグを参照するため、タグ公開後に有効になる。
    - ソースのmanifestとpackage.jsonは変更されない。

## タグを作成してpushする

1. リリース対象の変更をレビューし、コミットする。

    - 未コミットの変更があるとタグ作成ツールは停止する。
    - バージョンは`v1.2.3`形式。各数値は0〜65535とし、全桁0とプレリリース表記は使わない。
    - 使用済みのタグは再利用しない。

1. VS Codeで「タスクの実行」から`git: Tag & Push Extension Release`を選ぶ。
1. `0.1.1`または`v0.1.1`のように、公開する版を入力する。

    - 同じ処理はターミナルからも実行できる。

        ```bash
        npm run release:tag -- 0.1.1
        ```

    - 現在のHEADへ注釈付きタグを作成し、そのタグだけを`origin`へpushする。
    - ブランチのpushと自動コミットは行わない。タグが指すコミットをActionsがチェックアウトする。

1. GitHubのActionsで`Chrome Extension CI and Release`を開く。
1. `validate`, `updater`, `release`が成功したことを確認する。
1. Releasesで同じタグの正式リリースを確認する。

    - 配布ZIPとチェックサムが両方添付されていることを確認する。
    - 別PCへの導入は[リリース版を導入する](chrome-extension-usage.md#リリース版を導入する)に従う。

## 失敗した場合

| 失敗した段階 | 対処 |
| --- | --- |
| タグ作成前 | 未コミット変更、タグの形式、既存タグを確認する |
| タグのpush | ローカルタグは残る。通信と認証を直し、表示されたタグだけのpushコマンドで再試行する |
| Actionsの検証 | コード修正が必要なら修正をコミットし、新しい版のタグを作る。既存タグを付け替えない |
| Draft Releaseへの添付 | 通信や権限を確認して失敗したジョブを再実行する。未公開のDraftにだけ再添付できる |
| 正式公開済みの版 | 添付物は上書きせず、新しい版としてリリースする |

ワークフローが使う`GITHUB_TOKEN`の`contents: write`は公開ジョブにだけ付与します。会社のActionsポリシーで制限されている場合は、実行ログに表示された理由を確認してください。利用PCのダウンロード用トークンとは別です。
