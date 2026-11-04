# Google Calendar接続の準備

Google Cloudを設定できる担当者が、Chrome拡張機能のGoogle認証を準備する手順です。対象の作業は[EXT-01](use-cases.md)です。

## 前提

- 拡張機能で利用するGoogleアカウントを用意する。
- Chromeを実行するPCに、開発用ファイルまたは展開済みの配布ZIPを用意する。
- Google CloudでプロジェクトとOAuthクライアントを作成できる権限を確認する。

ここでは「組織なし」のプロジェクトで、利用するアカウントをテストユーザーに追加します。「組織なし」を選べない場合は、そのアカウントでの作成条件を確認してから進めてください。[Googleのプロジェクト作成手順](https://docs.cloud.google.com/resource-manager/docs/creating-managing-projects)に選択条件があります。

## プロジェクトを作成する

1. [Google Cloud Console](https://console.cloud.google.com/)を開く。

    - 右上のアカウントを確認する。
    - 複数のアカウントを使っている場合は、拡張機能で使うアカウントに切り替える。

1. 上部の「プロジェクトを選択」から「新しいプロジェクト」を開く。

    - 見つからない場合は[プロジェクト作成画面](https://console.cloud.google.com/projectcreate)を開く。

1. プロジェクトを作成する。

    | 項目           | 入力                         |
    | -------------- | ---------------------------- |
    | プロジェクト名 | 例: `garoon-calendar-sync`   |
    | プロジェクトID | 自動生成された値を利用できる |
    | 組織と場所     | 「組織なし」を選ぶ           |

1. 作成したプロジェクトを上部の選択欄で選ぶ。

    - 以降の各操作で、同じプロジェクト名が表示されていることを確認する。
    - 権限エラーが出た場合は次へ進まず、プロジェクト作成権限を確認する。

## Calendar APIを有効にする

1. 「APIとサービス」の「ライブラリ」を開く。
1. `Google Calendar API`を検索して開く。
1. 「有効にする」を押す。

    - 「管理」と表示されたら有効化済み。
    - 別のAPIを選択した場合は、Calendar APIを選び直す。

詳しい画面操作は[GoogleのAPI有効化手順](https://developers.google.com/workspace/guides/enable-apis)を参照してください。

## OAuth同意画面を設定する

1. 「Google Auth Platform」を開く。

    - 「OAuth同意画面」から同じ画面へ移動する場合もある。
    - 初回は「使ってみる」または「開始」を選ぶ。

1. アプリの情報を設定する。

    | 項目           | 入力                                 |
    | -------------- | ------------------------------------ |
    | アプリ名       | `Garoon Calendar Sync`               |
    | サポートメール | 連絡できるメールアドレス             |
    | 対象           | 「外部」(External)                   |
    | 連絡先メール   | 設定を管理する担当者のメールアドレス |

1. 「対象」(Audience)で公開ステータスを「テスト」にし、テストユーザーに利用するGoogleアカウントを追加する。
1. 「データアクセス」で、[manifest.json](../../chrome-extension/manifest.json)の`oauth2.scopes`と同じアクセス範囲を設定する。

    - 予定操作とカレンダーの検索および作成に`https://www.googleapis.com/auth/calendar`を使う。
    - 設定したアカウントがテストユーザーに含まれていることを確認する。

対象とテストユーザーの設定は[GoogleのOAuth同意画面の手順](https://developers.google.com/workspace/guides/configure-oauth-consent)を参照してください。

## 拡張機能IDを確認する

1. 利用するPCのChromeで`chrome://extensions`を開く。
1. 「デベロッパーモード」を有効にする。
1. 「パッケージ化されていない拡張機能を読み込む」で`chrome-extension`フォルダーを選ぶ。

    - 配布ZIPを利用する場合は、展開した中の`extension`フォルダーを選ぶ。
    - 選ぶのは[manifest.json](../../chrome-extension/manifest.json)が入っているフォルダー。
    - Dev Containerを使っている場合も、Chromeを実行するPC側のパスを選ぶ。コンテナー内の`/workspace`を指定する手順ではない。

1. カードに表示された32文字の拡張機能IDを控える。

    - 見つからない場合は「詳細」を開く。
    - この段階ではGoogleへの接続を実行しない。

## OAuthクライアントを登録する

1. Consoleの「Google Auth Platform」で「クライアント」を開く。
1. 「クライアントを作成」を選ぶ。

    | 項目                   | 入力                                 |
    | ---------------------- | ------------------------------------ |
    | アプリケーションの種類 | 「Chrome拡張機能」(Chrome Extension) |
    | 名前                   | 例: `Garoon Calendar Sync - Chrome`  |
    | アイテムID             | 前の手順で控えた拡張機能ID           |

1. 作成されたクライアントIDをコピーする。

    - 末尾が`.apps.googleusercontent.com`の値。
    - 32文字の拡張機能IDとは別の値。

クライアントシークレットの設定は不要です。アプリケーションの種類は[ChromeのOAuth接続手順](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth)と照合してください。

## クライアントIDを設定する

1. [manifest.json](../../chrome-extension/manifest.json)の`oauth2.client_id`をコピーした値へ置き換える。

    - 他の項目と`scopes`は変更しない。
    - 既に有効なクライアントIDが入っている場合は、その登録先の拡張機能IDが今回と一致するか確認する。

1. ファイルを保存する。
1. `chrome://extensions`で拡張機能を再読み込みする。
1. 表示された拡張機能IDとOAuthクライアントのアイテムIDが一致することを確認する。
1. [初回接続](chrome-extension-usage.md#初回接続)へ進み、Google認証を完了する。

## 接続がブロックされる場合

Google Workspaceのアプリ利用制限は、プロジェクトの組織設定とは別に適用されます。会社のアカウントがブロックされた場合は次へ進まず、表示された理由を確認してください。

管理者への確認が必要な場合は、OAuthクライアントIDと要求するアクセス範囲を伝えます。制限の適用範囲は[GoogleのOAuthアプリ状態の説明](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview)を参照してください。
