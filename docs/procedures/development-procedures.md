# 開発と検証

開発者がコードと文書を変更した後に行う検証手順です。

## 前提

- [開発環境の構築](development-setup.md)を完了する。
- コマンドはリポジトリのルートから実行する。
- Chrome上の確認には、利用者の予定と分けた確認用カレンダーを用意する。

## ローカル検証

1. 拡張機能と配布処理の自動テストを実行する。

    ```bash
    npm test
    ```

    - 予定の変換と差分判定を確認する。
    - アラームの保存と停止を確認する。
    - 間隔変更とWorker再起動後の復元を確認する。
    - 全削除の確認取消と進捗を確認する。
    - 更新された予定を削除しないことを確認する。
    - 配布ZIPの内容とタグ作成処理を確認する。タグの送信先にはテスト用のローカルリポジトリを使う。
    - エラーがある場合は、以降へ進まず修正する。

1. JavaScriptの構文を検査する。

    ```bash
    npm --prefix chrome-extension run check
    ```

    `src`, `ui`, `test`を対象にする。追加したモジュールも自動的に検査する。

1. Bashスクリプトの構文を検査する。

    ```bash
    find script .github/script gas/script -type f -name '*.sh' -print0 | xargs -0 -r -n 1 bash -n
    ```

1. Markdownのリンクと見出しへの参照を検査する。

    ```bash
    bash script/documentation/check-links.sh
    ```

    - 旧パスと移動前の見出しへの参照が残っていないことを確認する。
    - 外部由来のSkillと依存パッケージは対象にしない。
    - リンクが通っても、手順の前提と内容の整合は別途通読する。

1. 差分の空白エラーを確認する。

    ```bash
    git diff --check
    ```

ローカルのAPI応答はテスト用です。実アカウントの権限と認証、Chromeタブ内の実行を保証する検査ではありません。

## 対象を絞って実行する

変更した境界に応じて、次のコマンドをリポジトリのルートで実行できます。テストの所属と責務は[テスト設計](../design/chrome-extension-tests.md)を参照してください。

| 対象           | コマンド                                          |
| -------------- | ------------------------------------------------- |
| 単体テスト     | `npm --prefix chrome-extension run test:unit`     |
| 画面の部品     | `npm --prefix chrome-extension run test:ui`       |
| ユースケース   | `npm --prefix chrome-extension run test:usecases` |
| 配布とタグ操作 | `npm run test:release`                            |

`npm test`は各フォルダーのテストを再帰的に収集します。仕上げの検証では[ローカル検証](#ローカル検証)の全体実行を行ってください。

Windowsの更新処理は、配布ZIPを作成したうえでWindows PowerShell 5.1から確認します。作業対象はテスト用の一時フォルダーで、GitHubへの接続は差し替えます。

```powershell
powershell.exe -NoProfile -File script/test/test-updater.ps1 -Package dist/garoon-calendar-sync.zip
```

GitHub Actionsも同じ検査を実行します。配布物の作成方法は[リリース手順](chrome-extension-release.md#配布物を手元で確認する)を参照してください。

## 実ブラウザーでの確認

まずリポジトリのルートで、APIを差し替えたブラウザーテストを実行します。

```bash
npm run test:browser
```

ソースから読み込む場合は、Chromeを実行するPC側の`chrome-extension`フォルダーを選びます。[Google認証の準備](google-calendar-setup.md)で設定するmanifestも`chrome-extension/manifest.json`に読み替えてください。devcontainer内の`/workspace`をChromeへ指定しません。

成功後、実サービスとの接続確認が必要な変更では、次の手順を行います。

1. [更新手順](chrome-extension-usage.md#更新する)に従って拡張機能を読み直す。
1. [初回接続](chrome-extension-usage.md#初回接続)の接続検証を実行する。
1. 確認用の予定を同期する。

    - 通常予定と終日予定を確認する。
    - 繰り返し予定の各回が独立して登録されることを確認する。
    - タグ空欄の行とタグ付きの行に、同じカレンダーを設定して確認する。
    - 予定を変更して再度同期し、同じ予定が増えないことを確認する。

1. [自動同期の設定](chrome-extension-usage.md#自動同期を設定する)を検証する。

    - 間隔を変えて保存し、指定した間隔で同期されることを確認する。
    - ポップアップから停止と再開を行い、設定した間隔が維持されることを確認する。
    - Chromeを再起動した後も設定が維持されることを確認する。

1. 削除してよい予定だけを含むカレンダーで、[全削除](chrome-extension-usage.md#予定を全削除する)を検証する。

    - 26件以上を用意し、途中の進捗と完了時の残件数を確認する。
    - 確認ダイアログを開いている間に予定を変更し、削除を開始しないことを確認する。
    - 失敗理由が一覧の直下に表示されることを確認する。

実Chromeを使っても、APIをテスト用に置き換えた検証と実サービスへの接続確認は区別します。検証結果はPRまたは作業記録へ残し、通常手順へ実績を混在させません。

## GAS版を変更した場合

GAS版には自動テストが用意されていません。`npm --prefix gas test`は未設定を報告するため、成功の証拠として使いません。

1. [GAS版の準備](gas-setup.md)に従って検証用プロジェクトへ配備する。
1. [同期](gas-operations.md#同期する)と、変更した機能の成功条件を確認する。
1. 対象期間と同期先を確認する。
1. ログの件数を確認する。
1. 実環境へ反映した場合は、ローカル検証と別に結果を記録する。

## 整形

リポジトリの[Prettier設定](../../.prettierrc)を使います。整形後は上記の検査を実行してください。

リポジトリのルートから対象を指定します。

```bash
npm run format -- docs/design/development-environment.md
npm run format:check -- docs/design/development-environment.md
```

引数には変更したファイルやフォルダーを指定します。hookもルートに導入した同じPrettierを使い、編集のたびに別のバージョンを取得しません。

| 対象       | 設定                        |
| ---------- | --------------------------- |
| Markdown   | 4スペース                   |
| JavaScript | 2スペースとシングルクォート |
| YAML       | 2スペース                   |

自動整形は内容レビューの代わりになりません。仕様と手順の配置を確認し、読者に不要な実装詳細と重複を取り除きます。
