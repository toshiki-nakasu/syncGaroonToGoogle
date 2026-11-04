# Garoon APIとの接続

保守担当者が、このリポジトリから呼び出すGaroon APIと実装の対応を確認するための資料です。API全体の仕様は[Garoon公式リファレンス](https://cybozu.dev/ja/garoon/docs/rest-api/)を参照してください。

## 認証の境界

| 実装           | 認証と通信                                                 |
| -------------- | ---------------------------------------------------------- |
| Chrome拡張機能 | Garoonタブの同一オリジンからセッション付きで予定を読む     |
| GAS版          | `X-Cybozu-Authorization`に設定したユーザーの認証情報を送る |

拡張機能はCookieを直接読み取りません。Google認証トークンをGaroonのページへ渡す処理もありません。Garoonの認証条件は[公式の認証説明](https://cybozu.dev/ja/garoon/docs/rest-api/overview/authentication/)を参照してください。

## 予定の取得

`GET /g/api/v1/schedule/events`を呼び出します。

| 実装 | 取得の方法 | 確認先 |
| --- | --- | --- |
| Chrome拡張機能 | ログインユーザーを確認し、`targetType`と`target`を指定する。`hasNext`で後続ページを判定する | [GaroonClient](../../chrome-extension/src/infrastructure/GaroonClient.js) |
| GAS版 | 設定した対象期間を使う。返却件数から後続ページを判定する | [GaroonDao](../../gas/src/dao/GaroonDao.js) |

期間とページのパラメーターは[複数予定取得の仕様](https://cybozu.dev/ja/garoon/docs/rest-api/schedule/get-schedule-events/)と照合してください。GAS版のページ上限到達時の扱いは[GAS版の制約](../requirements/gas-requirements.md#制約)を参照してください。

ログインユーザーの確認では[GaroonのJavaScript API](https://cybozu.dev/ja/garoon/docs/js-api/base/get-login-user/)を利用します。

## GAS版にある書き込み用の補助処理

| 操作 | API | 実装 |
| --- | --- | --- |
| 予定の作成 | `POST /g/api/v1/schedule/events` | `GaroonDao.createEvent()` |
| 予定の削除 | `DELETE /g/api/v1/schedule/events/{id}` | `GaroonDao.deleteEvent()` |
| 在席情報の更新 | `PATCH /g/api/v1/presence/users/code/{userCode}` | `GaroonDao.updatePreference()` |

予定の削除は実装済みです。通常のGoogle Calendarへの同期では呼び出しません。逆方向同期も未実装のため、作成メソッドの存在を双方向同期への対応と取り違えないでください。

在席情報のリセットは[GAS版の操作](../procedures/gas-operations.md#在席情報をリセットする)を参照してください。送信する値の意味は[プレゼンス更新API](https://cybozu.dev/ja/garoon/docs/rest-api/presence/users/update-user-presence/)で確認できます。

## エラーと再試行

GAS版の共通処理は[BaseDao](../../gas/src/dao/BaseDao.js)にあります。再試行の対象と回数は実装と定数を確認してください。HTTP 410をすべてGaroonの同期トークン失効と決めつけません。

拡張機能のGoogle向け再試行は[GoogleCalendarClient](../../chrome-extension/src/infrastructure/GoogleCalendarClient.js)が担当します。HTTP 401ではキャッシュ済みの認証トークンを破棄し、画面で再認証を案内します。取得失敗を空の予定一覧へ変換しません。
