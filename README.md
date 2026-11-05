# syncGaroonToGoogle

Garoonで管理している予定をGoogle Calendarでも確認できるようにするツールです。Chrome拡張機能版とGoogle Apps Script (GAS)版は、同じ目的を異なる実行環境で実現します。

## できること

両方式で共通して、次の機能を利用できます。

- 指定した期間のGaroon予定をGoogle Calendarへ同期する。
- Garoonでの予定の作成と変更、削除をGoogle Calendarへ反映する。
- メモのタグに応じて同期先のカレンダーを振り分ける。
- `#nosync`を付けた予定を同期から除外する。
- 手動で同期するほか、定期的に自動同期する。

同期はGaroonからGoogle Calendarへの一方向です。Google Calendarで編集した内容はGaroonへ戻りません。

## 方式ごとの違い

| 比較項目 | Chrome拡張機能 | GAS |
| --- | --- | --- |
| 実行環境 | 利用者のPC上のChrome | Google Apps Scriptの実行環境 |
| Garoonの認証 | Chromeでログインしたセッションを利用する。2要素認証に対応 | ユーザー名とパスワードで認証する。2要素認証が必要なユーザーは利用不可 |
| 同期中のPCとブラウザー | Chromeとログイン済みのGaroonタブを開いておく。PCのスリープ中は同期不可 | PCとブラウザーを起動しておく必要はない |
| Googleへの接続準備 | Google CloudでCalendar APIとChrome拡張機能用のOAuthを設定する | Apps Scriptの初回実行時にGoogleへのアクセスを許可する |
| 自動同期の設定 | 拡張機能の設定画面で間隔を指定し、ポップアップから停止と再開を行う | Apps Scriptで時間主導型トリガーを設定する。設定した実行時間帯だけ同期する |
| タグとカレンダー名 | 別々に設定できる。同じカレンダーへ複数のタグをまとめられる | 振り分け先のカレンダー名をタグとして使う |
| 一致するタグがない予定 | タグが空欄の行へ同期する。空欄の行がなければ同期しない | 既定のカレンダーへ同期する |
| 同期先カレンダーの予定の全削除 | 設定画面から実行できる。手動作成を含む全期間の予定が対象 | 利用手順なし |
| 自分の在席情報のリセット | 機能なし | Garoonの在席ステータスとメモを空にできる |
| 導入と更新 | Windows向け配布ZIPから導入し、同梱ツールで更新する。GitとNode.jsは不要 | 配備担当者がApps Scriptプロジェクトへコードと接続設定を登録する |
| 利用手順 | [Chrome拡張機能のREADME](chrome-extension/README.md) | [GAS版のREADME](gas/README.md) |

同じ予定を重複して同期しないよう、同じ同期先へ両方式を同時に実行しないでください。

## 開発環境を構築する

コードを変更する場合は、以下のどちらかで環境を準備します。Chrome拡張機能のリリース版を利用するだけなら開発環境は不要です。

### devcontainerを利用する

1. Gitでこのリポジトリを取得し、Dockerを起動する。
1. VS CodeとDev Containers拡張機能を用意し、取得したフォルダーを開く。
1. `Dev Containers: Rebuild and Reopen in Container`を実行する。

    - Node.js 24と共通のnpm依存を導入する。
    - ブラウザーテスト用のChromiumとOSライブラリも自動で導入する。

1. [構築後の検証](docs/procedures/development-setup.md#構築後の検証)を実行する。

失敗時の確認と再構築は[devcontainerの構築手順](docs/procedures/development-setup.md#devcontainerで構築する)を参照してください。

### devcontainerを利用しない

1. Gitでこのリポジトリを取得する。
1. 次のツールを用意する。

    - Git
    - Bash
    - Node.js 24と付属のnpm
    - zipとunzip
    - jq

1. リポジトリのルートで次を実行する。

    ```bash
    bash script/environment/setup-development.sh
    ```

    - 共通のnpm依存とChromiumを導入する。
    - LinuxでOSライブラリも必要な場合は、`bash script/environment/setup-development.sh --with-browser-deps`を実行する。

1. [構築後の検証](docs/procedures/development-setup.md#構築後の検証)を実行する。

ツールの導入先と失敗時の対処は[通常端末の構築手順](docs/procedures/development-setup.md#通常端末で構築する)を参照してください。依存関係はルートの`package.json`と`package-lock.json`で管理し、claspも共通の`node_modules`へ導入します。

## scriptの構成

開発と配布に使うスクリプトは、`script/`配下で用途ごとにまとめています。

```text
script/
├── environment/                 # 開発環境の準備
│   ├── setup-development.sh
│   └── setup-devcontainer.sh
├── documentation/               # 文書の検査
│   └── check-links.sh
├── release/                     # 配布ZIPの生成とタグ操作
│   ├── build-extension.sh
│   ├── tag-and-push.sh
│   ├── lib/                     # リリース専用の関数
│   │   └── metadata.sh
│   └── updater/                 # ZIPに同梱する更新ツール
│       ├── update.bat
│       └── update.ps1
├── lib/                         # 複数用途で共有する関数
│   └── markdown.sh
└── test/                        # 開発ツールの自動テスト
    ├── test-documentation.sh
    ├── test-release.sh
    └── test-updater.ps1
```

配置と命名の詳細は[スクリプトの配置と命名](docs/design/development-environment.md#スクリプトの配置と命名)を参照してください。

仕様と設計、変更後の検証は[ドキュメント一覧](docs/README.md)から確認できます。
