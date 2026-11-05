# ユースケース一覧

利用者と保守担当者が、必要な作業の入口を選ぶための一覧です。「管理者」は製品の権限ロールの名称ではなく、設定の権限を持つ作業担当者を指します。

| ID | 実行者 | 目的 | 手順 |
| --- | --- | --- | --- |
| EXT-01 | Google Cloudを設定できる担当者 | APIとOAuthを準備する | [Google側の準備](google-calendar-setup.md#前提) |
| EXT-02 | 拡張機能の利用者 | 接続と同期を設定する | [初回接続](chrome-extension-usage.md#初回接続) |
| EXT-03 | 拡張機能の利用者 | タグで同期先を振り分ける | [同期先を編集する](chrome-extension-usage.md#同期先を編集する) |
| EXT-04 | 拡張機能の利用者 | 自動同期のON/OFFと間隔を変更する | [自動同期を設定する](chrome-extension-usage.md#自動同期を設定する) |
| EXT-05 | 拡張機能の利用者 | 対象カレンダーの予定を全削除する | [予定を全削除する](chrome-extension-usage.md#予定を全削除する) |
| EXT-06 | 拡張機能の利用者 | 拡張機能を更新する | [更新する](chrome-extension-usage.md#更新する) |
| EXT-07 | 拡張機能の利用者 | 開発環境を使わず配布ZIPから導入する | [リリース版を導入する](chrome-extension-usage.md#リリース版を導入する) |
| GAS-01 | GAS版の配備担当者 | 設定と配備を準備する | [GAS版の準備](gas-setup.md#前提) |
| GAS-02 | GAS版の利用者 | 手動と定期の同期を実行する | [同期する](gas-operations.md#同期する) |
| GAS-03 | GAS版の利用者 | 自分の在席情報をリセットする | [在席情報をリセットする](gas-operations.md#在席情報をリセットする) |
| GAS-04 | GAS版の保守担当者 | Garoonの予定を一括削除する | 未整備。コードに補助関数はあるが、一般利用の実行手順は提供していない |
| DEV-01 | 開発者 | コードと文書を検証する | [ローカル検証](development-procedures.md#ローカル検証) |
| DEV-02 | 開発者と利用者 | 実ブラウザーで変更を確認する | [実ブラウザーでの確認](development-procedures.md#実ブラウザーでの確認) |
| DEV-03 | 開発者 | 開発ツールと検証用Chromiumを導入する | [開発環境の構築](development-setup.md) |
| DEV-04 | 保守担当者 | バージョンタグから配布ZIPを公開する | [タグを作成してpushする](chrome-extension-release.md#タグを作成してpushする) |
| DEV-05 | 保守担当者 | Gitタグを作成せずローカルで配布ZIPを生成する | [配布物を手元で確認する](chrome-extension-release.md#配布物を手元で確認する) |
| DEV-06 | 保守担当者 | GitHub Actionsで配布ZIPを生成して取得する | [GitHub ActionsでZIPを生成する](chrome-extension-release.md#github-actionsでzipを生成する) |

Google CalendarからGaroonへの逆方向同期は未実装です。APIの作成用メソッドが存在しても、一般利用の操作として完成した機能とは扱いません。
