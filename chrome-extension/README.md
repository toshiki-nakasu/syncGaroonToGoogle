# Garoon Calendar Sync (Chrome拡張)

ログイン済みのGaroonタブのセッションで予定を読み取り、Googleカレンダーへ一方向に同期します。2要素認証を含むログインは通常どおりGaroonの画面で行います。

この版は開発中の初期実装です。認証と実行条件以外にも、旧GAS版との未解消の仕様差分があります。比較と互換性の方針は[リポジトリのREADME](../README.md)を参照してください。以下の手順と説明は、現在の実装の動作を記載しています。

## 動作条件

- Chrome 120以降で利用します。
- 同じChromeプロファイルで、設定したユーザーのGaroonタブを開いておきます。
- Garoonのログイン状態を維持している間、5分ごとに同期します。
- Chrome終了中やPCのスリープ中は同期できません。時刻の厳密な保証はありません。
- 休止中のGaroonタブは利用しません。タブを一度表示して復帰させてください。
- Googleへの初回接続では、拡張機能へのアクセス許可が必要です。Chromeへのログインだけでは許可は完了しません。

## 初回セットアップ

### 1. Google側を準備する

1. [Google Cloud Console](https://console.cloud.google.com/)で利用するプロジェクトを選択します。
1. Google Calendar APIを有効にします。
1. Google Auth Platformで、利用対象に合わせて同意画面を設定します。外部向けのテスト公開の場合は利用するGoogleアカウントをテストユーザーへ追加します。
1. Chromeの `chrome://extensions` でデベロッパーモードを有効にします。
1. 「パッケージ化されていない拡張機能を読み込む」で、この `chrome-extension` ディレクトリを選択します。
1. 表示された拡張機能IDを控えます。
1. Google Cloud側で、アプリケーションの種類が「Chrome拡張機能」のOAuthクライアントを作成します。先ほどの拡張機能IDを登録します。
1. [manifest.json](manifest.json)の `oauth2.client_id` を、作成したクライアントIDに置き換えます。クライアントシークレットは使いません。
1. `chrome://extensions` で拡張機能を再読み込みします。

拡張機能IDが変わる場合は、OAuthクライアントに登録したIDも合わせます。配布時のID固定については[Chrome公式のOAuth手順](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth)を参照してください。

Google Calendarの予定操作と、名前によるカレンダー検索および作成に `calendar` スコープを使います。管理されたGoogle Workspaceでは、組織のアプリ利用制限が適用される場合があります。

### 2. Garoonの予定取得を確認する

1. ChromeでGaroonにログインし、Garoonの通常画面を開きます。
1. 拡張機能のアイコンを固定し、クリックして「設定」を開きます。
1. Garoonのオリジンを入力します。例: `https://example.cybozu.com`。セキュアアクセス利用時は `https://example.s.cybozu.com` を指定します。
1. Garoonのログイン名、同期先カレンダー名と同期期間を設定します。
1. 最初の接続確認中は「5分おきの自動同期を有効にする」を外して保存します。
1. 接続先へのアクセスを許可します。許可は指定したGaroonのホストに限定されます。
1. 「Garoon接続を確認」を押します。予定を1件まで取得し、成功したかを表示します。Googleカレンダーには書き込みません。
1. 「Googleを接続」を押し、Googleのアクセス許可を完了します。

### 3. 同期を開始する

1. 既存GASの同期トリガーを停止します。
1. 既存GASの予定を引き継ぐ場合は、同じGoogleアカウントと同じカレンダー名を設定し、「既存GASのタグ付き予定を引き継ぐ」を有効にして保存します。
1. タグ別カレンダーを利用していた場合は、その名前も振り分け先へ1行ずつ登録します。
1. アイコンをクリックし、「今すぐ同期」で結果を確認します。
1. 設定画面で自動同期を有効にして保存します。

GASの予定引き継ぎを無効にした場合、旧タグだけの予定は変更しません。同じカレンダーを使うと新旧の予定が重複するため、移行時には引き継ぎを有効にしてください。旧GASのタグには同期元のテナントとユーザー情報がないため、引き継ぐカレンダーには自分のGaroon同期予定を指定します。

## アイコンと状態

| バッジ | 色 | 意味 |
| --- | --- | --- |
| `OK` | 緑 | 接続確認または直近の同期に成功した状態 |
| `…` | 青 | 同期処理中 |
| `!` | 赤 | 設定不足、ログイン切れ、取得や書き込みの失敗などで同期不可 |
| `OFF` | 灰 | 自動同期を停止中。手動同期は利用可能 |

ポップアップで理由、最終成功日時と件数を確認できます。状態は起動時、Garoonタブの読み込み完了時、タブを閉じたとき、定期同期時と手動確認時に更新します。ログイン切れの検知には最大で次回同期まで時間がかかります。`OK` は直近の確認結果であり、次回の成功を保証する表示ではありません。

## 引き継ぐ同期仕様

- GaroonからGoogle Calendarへの一方向同期です。
- タイトルは `【予定メニュー】件名` に変換します。
- 参加者名とメモを説明欄へ転記します。Googleの招待先には追加しません。
- `#nosync` は最優先で除外します。同期済みの予定へ付けた場合は、その同期予定を削除します。
- 登録したタグと一致する最初のタグで振り分けます。タグ名は英数字とアンダースコアに対応し、大文字小文字は区別しません。
- カレンダーは名前で検索し、存在しなければ作成します。同名カレンダーが複数ある場合は同期を止めます。
- 繰り返し予定は `id-repeatId` ごとの独立した予定として登録します。
- 終日予定はGoogleの終了日が排他となるように変換します。
- Google上の手動作成予定と別の同期元の予定は変更しません。

項目変換の元仕様は[項目マッピング](../docs/Garoon_GCal_項目マッピング.md)を参照してください。Chrome拡張での差分は次のとおりです。

- 開始時刻のみ、または開始と終了が同時刻の予定は1分の予定として登録します。Google Calendar APIの終了日時制約に合わせています。
- GASの勤務時間帯制限は使いません。Garoonタブとログイン状態が有効な間、5分ごとに同期します。
- 日付境界は設定したIANAタイムゾーンで計算します。初期値は `Asia/Tokyo` です。
- GASの `ScriptProperties` は自動インポートしません。カレンダー名や日数を設定画面へ転記してください。
- 同期元のテナントとユーザーをGoogle予定のprivate拡張プロパティに保存します。旧GASタグのprivate/shared両方を引き継ぎ対象として認識します。
- 在席情報のリセットとGaroon側の予定編集は対象外です。

## 失敗時の扱いと制約

Garoonの全ページと、全同期先カレンダーの全ページの予定取得を完了してから反映計画を作ります。HTML応答、認証エラー、ページ上限と重複IDは取得失敗として扱います。不完全な取得結果による削除は行いません。予定取得前にカレンダー名の解決が必要なため、不足するカレンダー自体の作成が先に行われる場合があります。

カレンダー間の移動では移動先を作成してから移動元を削除します。途中で停止した場合は、一時的に両方へ表示されることがあります。次回の同期で移動先を採用して移動元を削除します。API間の処理はトランザクションではないため、一部反映後に失敗した場合も次回の取得結果から再計算します。

Garoonの範囲検索に合わせ、設定期間に完全に収まる予定を同期します。Google側で期間境界をまたぐ予定を、Garoon側にないと判断して削除することはありません。タグ振り分け先の設定を削除すると、そのカレンダーは以後検索しません。不要な同期予定を整理してから振り分け設定を削除してください。

同期は約4分で打ち切る設計です。件数が多く繰り返し中断する場合は同期期間を短くしてください。Garoonは最大100ページ、Googleは各一覧で最大100ページまで取得します。Garoonでは `hasNext` を使い、返却件数が少ない場合も続きのページを取得します。

作成時には決定的なGoogleイベントIDを使い、同じ作成リクエストの再実行による重複を防ぎます。そのIDがGoogle側の削除済み予定と衝突した場合はエラーになります。Garoon側で予定を更新してから再試行してください。

## 認証とデータの扱い

GaroonのパスワードとCookieの読み取りおよび保存は行いません。`cookies` 権限は使いません。Garoonの同一オリジンでブラウザーにCookieを送信させ、読み取り専用の予定APIを呼び出します。GoogleのOAuthトークンは拡張機能側で扱い、Garoonページへ渡しません。

設定と同期状態は `chrome.storage.local` に保存します。Googleトークンと予定本文は永続化しません。GaroonからGoogleへ転記する予定情報は、上記の同期仕様に従います。

## 検証

Node.js 20以降で実行します。テスト用の追加依存はありません。

```bash
cd chrome-extension
npm test
npm run check
```

実環境では、2要素認証後の予定取得、Google認証、手動同期と5分後の自動同期を確認します。通常予定、終日予定と繰り返し予定を含め、変更、削除、`#nosync`、タグ変更とタブを閉じたときの状態も確認してください。実環境の認証およびタブ内実行はNode.jsのテストでは検証できません。

## 公式仕様

- [Garoonの認証](https://cybozu.dev/ja/garoon/docs/rest-api/overview/authentication/)
- [Garoonの複数予定取得](https://cybozu.dev/ja/garoon/docs/rest-api/schedule/get-schedule-events/)
- [Garoonのログインユーザー取得](https://cybozu.dev/ja/garoon/docs/js-api/base/get-login-user/)
- [Chromeのスクリプト実行](https://developer.chrome.com/docs/extensions/reference/api/scripting)
- [Chromeの定期実行](https://developer.chrome.com/docs/extensions/reference/api/alarms)
- [ChromeのGoogle認証](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth)
- [Google Calendarの予定一覧](https://developers.google.com/workspace/calendar/api/v3/reference/events/list)
- [Google Calendarの予定登録](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert)
