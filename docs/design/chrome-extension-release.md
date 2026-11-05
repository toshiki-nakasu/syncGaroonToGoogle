# Chrome拡張機能の配布と更新

保守担当者が、タグから配布物を作成し、導入済みファイルを更新する責務を確認するための設計です。公開操作は[リリース手順](../procedures/chrome-extension-release.md)、利用者の操作は[更新手順](../procedures/chrome-extension-usage.md#更新する)を参照してください。

## バージョンと配布物

正式リリース番号の正本は`v1.2.3`形式のGitタグです。ZIPの生成だけを行う場合は、同じ形式のタグ名を入力として使い、Gitタグの存在は要求しません。ビルド時に配布物のmanifestへ`1.2.3`を設定し、開発用manifestの版と認証設定は書き換えません。Chromeに合わせて各数値は0〜65535、全桁0は拒否します。

配布物は[build-extension.sh](../../script/release/build-extension.sh)で組み立てます。`chrome-extension/src`と`ui`、manifest、更新ツール、利用手順、画像を明示してコピーします。テスト、GAS、`tmp`の参考ファイルは含めません。

ローカルのZIP生成タスクとGitHub Actionsは同じBashスクリプトを呼び出します。この処理は作業ツリーのファイルを使い、Gitタグの作成とpushは行いません。タグを送信するVS Codeタスクは[tag-and-push.sh](../../script/release/tag-and-push.sh)を呼び出し、ZIP生成から独立させます。

`chrome-extension/README.md`を利用者向けの配布用`README.md`へ変換します。`docs/procedures/`の`google-calendar-setup.md`と`chrome-extension-usage.md`もZIP直下へ同梱します。READMEから導入とGoogle認証、日常操作と更新の手順へ進める構成です。各文書の正本をコピーし、配布専用の本文は作りません。

同梱文書間のリンクと画像、manifestへのリンクはZIP内の相対パスへ変換します。同一文書内の見出しもローカル参照を維持し、同梱しない文書へのリンクだけ同じタグのGitHubへ向けます。ZIPの日本語ファイル名はUTF-8で格納します。

`release.json`にはリポジトリ、タグ、版、ZIP名、画像名、各ファイルのSHA-256を記録します。ZIP本体のSHA-256も別ファイルへ出力します。これらは破損と配布物の不整合を検出するものであり、公開元から独立した署名ではありません。

## CIとリリース

[ワークフロー](../../.github/workflows/chrome-extension.yml)はブランチpush、`v*`タグpush、手動実行を受け付けます。PRの更新もブランチpushで検証し、PRイベントとの二重起動を避けます。タグで必要な文書の更新を取りこぼさないよう、パスフィルターは使いません。

| ジョブ | 確認または反映すること |
| --- | --- |
| `validate` | 構文検査と文書リンク検査を行い、各テストと実Chromiumの検証後に配布ZIPを作る |
| `updater` | 生成したZIPをWindows PowerShell 5.1で展開し、更新処理を検証する |
| `release` | タグpushの場合だけ、両検証に成功したZIPをDraftへ添付して正式公開する |

手動実行では`package_tag`に指定したタグ名でZIPを生成します。ブランチpushでは検査用の版を使います。どちらも同梱しない文書へのリンクは生成元のコミットSHAへ向け、成果物はArtifactsから取得します。手動実行でタグを選択しても、Gitタグの作成と正式リリースの公開は行いません。

タグpushではGitタグから版を決め、公開ジョブが検証ジョブから成果物を受け取り、再ビルドせずに公開します。

ワークフロー全体で同じconcurrencyグループを使い、ブランチやタグが異なっても同時実行は1件に制限します。`cancel-in-progress: false`で実行中の処理を維持し、`queue: max`で後続を最大100件まで待機させます。公開済みリリースの添付物は変更しません。[GitHubの同時実行制御](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)を参照してください。

正式公開までの処理は同じワークフロー内で行い、トークンが起こす次のイベントには依存しません。[GitHubのイベント仕様](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)を参照してください。

## 更新の境界

[update.bat](../../script/release/updater/update.bat)はダブルクリック用の入口で、[update.ps1](../../script/release/updater/update.ps1)が更新処理を担当します。BATは実行前に処理ブロックを読み込むため、更新中のランチャー差し替え後に未読の行へ依存しません。PowerShellも関数を読み込んでから処理を開始します。

更新元は導入済み`release.json`のGitHubリポジトリに限定します。最新の正式リリースから固定名のZIPとチェックサムを取得します。非公開リポジトリは環境変数のトークンを利用し、配布物へ保存しません。

更新ツールは追加の手順書を許可し、メタデータに記載された同梱文書も置き換えます。手順書が分かれる前のメタデータも読み込めます。旧更新ツールは追加の手順書を拒否するため、その版からの移行には最新ZIPを同じ導入先へ展開し直す方法を使います。

1. 一時フォルダーへダウンロードし、ZIPのSHA-256を照合する。
1. ZIP内の区切り文字を`/`へ統一し、展開前に絶対パス、親参照、重複項目、リンクを拒否する。検証した名前で展開する。
1. リポジトリとタグ、全ファイルのSHA-256、manifestの版、想定外ファイルの有無を確認する。
1. 旧`extension`を削除して新しい内容をコピーし、文書と更新ツールを置き換える。
1. `release.json`を最後に書き込み、一時ファイルを削除する。

バックアップと自動ロールバックは行いません。ネットワークと検証の失敗時は導入済みファイルを変更しません。コピー中の失敗では一部更新が残るため、同じ版でもファイルが不足または破損していれば再取得します。最新リリースより新しい版が導入済みの場合は、自動でダウングレードしません。

Chromeのプロファイルには触れず、導入先の固定パスを維持します。Chromeの再読み込みと実サービスへの接続確認は利用者が行います。これらはCIのAPI代替テストで完了したとは扱いません。
