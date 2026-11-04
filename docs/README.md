# ドキュメント一覧

利用者と保守担当者が、目的に合う仕様と操作を選ぶための入口です。コードは実行環境ごとに独立したフォルダーで管理します。

最初に[ユースケース一覧](procedures/use-cases.md)で実行者と目的を確認してください。

## Chrome拡張機能

| 読む目的 | 文書 |
| --- | --- |
| Google側を準備する | [Google Calendar接続の準備](procedures/google-calendar-setup.md) |
| 設定して利用する | [接続設定と同期の操作](procedures/chrome-extension-usage.md) |
| ZIPから導入する | [リリース版の導入](procedures/chrome-extension-usage.md#リリース版を導入する) |
| タグを付けて配布する | [リリース手順](procedures/chrome-extension-release.md) |
| 配布と更新の責務を知る | [リリースの設計](design/chrome-extension-release.md) |
| 動作と制約を知る | [同期機能の要件](requirements/chrome-extension-requirements.md) |
| クラスの責務を知る | [設計と依存関係](design/chrome-extension-design.md) |

## Google Apps Script

| 読む目的 | 文書 |
| --- | --- |
| 認証と配備を準備する | [GAS版の準備](procedures/gas-setup.md) |
| 定期同期と在席情報リセットを使う | [GAS版の操作](procedures/gas-operations.md) |
| 動作と制約を知る | [GAS版の要件](requirements/gas-requirements.md) |
| クラスの責務を知る | [GAS版の設計](design/gas-design.md) |
| 予定の変換を確認する | [項目変換](design/gas-event-mapping.md) |

## 保守

| 読む目的 | 文書 |
| --- | --- |
| 開発ツールを導入する | [開発環境の構築](procedures/development-setup.md) |
| 導入するツールと設定の管理場所を知る | [開発環境の設計](design/development-environment.md) |
| APIとの接続を調べる | [Garoon APIとの接続](design/garoon-api.md) |
| テストの責務と確認範囲を選ぶ | [Chrome拡張機能のテスト設計](design/chrome-extension-tests.md) |
| ローカルで検証する | [開発と検証](procedures/development-procedures.md) |
| AIによる変更の確認先を探す | [実装指示の索引](instructions/maintenance.md) |

要件と設計を分け、操作手順も独立した文書で管理します。個別作業の記録は恒久文書の前提にしません。
