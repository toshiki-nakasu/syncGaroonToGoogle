# Garoon Calendar Sync (Chrome拡張機能)

Garoon Calendar SyncのChrome拡張機能版を導入し、接続と同期を設定するための案内です。

## 利用に必要なもの

- Chrome 120以降
- 同じChromeプロファイルでログインできるGaroonアカウント
- Google Calendarを利用できるGoogleアカウント
- Google CloudでCalendar APIとOAuthを設定できる担当者
- リリース版の導入と更新にはWindowsとWindows PowerShell 5.1

GitとNode.jsは不要です。同期中はGaroonのタブを開いておきます。Chrome終了中とPCのスリープ中は同期できません。

## 初めて利用する

1. 配布用ZIPを取得し、[リリース版を導入する](../docs/procedures/chrome-extension-usage.md#リリース版を導入する)に従ってChromeへ読み込む。
1. [Google Calendar接続の準備](../docs/procedures/google-calendar-setup.md)に従って、Google認証を設定する。
1. [初回接続](../docs/procedures/chrome-extension-usage.md#初回接続)でGaroonとGoogleへの接続を確認し、手動同期を実行する。
1. Google Calendarで予定を確認してから、[自動同期](../docs/procedures/chrome-extension-usage.md#自動同期を設定する)を有効にする。

配布ZIPを展開した場合は、このREADMEと同じ場所にある2つの手順書を順に参照してください。Google認証で使用する拡張機能IDは、実際に利用するPCで確認します。

## 日常の操作

| 目的 | 手順 |
| --- | --- |
| 手動で同期する / 接続を確認する | [初回接続](../docs/procedures/chrome-extension-usage.md#初回接続) |
| タグで同期先を振り分ける | [同期先を編集する](../docs/procedures/chrome-extension-usage.md#同期先を編集する) |
| 自動同期を停止 / 再開する | [自動同期を設定する](../docs/procedures/chrome-extension-usage.md#自動同期を設定する) |
| アイコンの表示を確認する | [アイコンの状態を読む](../docs/procedures/chrome-extension-usage.md#アイコンの状態を読む) |
| 最新版へ更新する | [リリース版を更新する](../docs/procedures/chrome-extension-usage.md#リリース版を更新する) |
| 同期先の予定を全削除する | [予定を全削除する](../docs/procedures/chrome-extension-usage.md#予定を全削除する) |

> [!CAUTION] 「予定を全削除」は、手動作成を含む全期間の予定が対象です。削除対象を確認してから実行してください。

## 困ったとき

- Garoonへ接続できない場合は、同じChromeプロファイルでGaroonへ再ログインし、休止中のタブを開き直して接続を検証する。
- Google認証が失敗する場合は、[Google側の準備](../docs/procedures/google-calendar-setup.md)で拡張機能IDとOAuthの登録を確認する。
- 自動同期されない場合は、ChromeとGaroonのタブが開いていること、および自動同期がONであることを確認する。
- 更新に失敗する場合は、[更新手順](../docs/procedures/chrome-extension-usage.md#リリース版を更新する)で通信と権限を確認する。

予定の項目対応は[マッピング図](../docs/マッピング.drawio.png)で確認できます。カレンダーの共有範囲はGoogle Calendar側で確認してください。
