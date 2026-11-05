# 開発環境の設計

開発者が、導入されるツールと設定の管理場所を確認するための設計です。初期構築は[開発環境を構築する](../procedures/development-setup.md)を参照してください。

## 導入するものと管理場所

| 管理場所 | 担当すること |
| --- | --- |
| [devcontainer](../../.devcontainer/devcontainer.json) | Node.js 24とコンテナーの実行設定 |
| [Dockerfile](../../.devcontainer/Dockerfile) | Gitとシェルの基本ツール。hookが使うjqも導入する |
| [共通package.json](../../package.json) | PrettierとPlaywrightのバージョンと公開コマンド |
| [共通setup.sh](../../script/setup.sh) | lockファイルに基づく依存導入とChromiumの準備 |
| [GAS用package.json](../../gas/package.json) | GASの配備にだけ必要なclasp |

共通ツールとGASの依存関係は、それぞれの`package-lock.json`を追跡します。構築時は`npm ci`を使い、未固定のグローバルnpmパッケージを導入しません。拡張機能本体には実行時のnpm依存がありません。

devcontainer作成時には共通ツールとGAS用ツールを準備します。通常端末の構築では、GAS用ツールは必要な場合だけ追加します。認証やプロジェクト作成は、環境構築の処理に含めません。

## ブラウザーの準備

Playwrightと対応するChromiumを組み合わせます。拡張機能を読み込むため、headless shellだけを導入する構成にはしません。テストは`channel: 'chromium'`で起動します。[Playwrightの拡張機能テスト](https://playwright.dev/docs/chrome-extensions)に従います。

LinuxのOSライブラリはPlaywrightの`install --with-deps`で導入します。対応するライブラリの一覧をDockerfileへ別途複製せず、固定したPlaywrightが必要とするものを導入します。[ブラウザーと依存ライブラリの導入](https://playwright.dev/docs/browsers#install-system-dependencies)を参照してください。

ブラウザーテストは一時プロファイルを作り、終了時に削除します。Google認証とCalendar APIはテスト用に差し替え、普段使うChromeのプロファイルを利用しません。モジュールの読込とChrome固有の動作を確認し、実アカウントの権限確認とは分けます。

## AI文書の読込先

AI文書は`.github/`配下に種類ごとに置きます。規約と実装指示は`.github/instructions/`へまとめ、配下に`rules/`などの階層を増やしません。利用者向けの仕様と手順は`docs/`へ置きます。

VS Codeで[syncGaroonToGoogle.code-workspace](../../syncGaroonToGoogle.code-workspace)を開くと、通常端末とdevcontainerのどちらでも次の読込先を適用します。

| 文書                   | 設定                              |
| ---------------------- | --------------------------------- |
| `.github/instructions` | `chat.instructionsFilesLocations` |
| `.github/agents`       | `chat.agentFilesLocations`        |
| `.github/skills`       | `chat.agentSkillsLocations`       |
| `.github/prompts`      | `chat.promptFilesLocations`       |

これらはエディタの設定です。CLIや別の対話環境への自動適用は保証しません。ルートの[AGENTS.md](../../AGENTS.md)は参照先を案内します。自動検出に対応しない環境では、作業開始時に[リポジトリの作業方針](../../.github/instructions/repository-policy.md)を明示的に読ませます。

promptファイルの読込先設定はLocal harness向けです。利用する環境で対象が表示されない場合も、元の文書を直接参照できます。[VS Codeの設定仕様](https://code.visualstudio.com/docs/agents/reference/ai-settings)を確認してください。
