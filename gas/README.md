# Garoon Calendar Sync (GAS版)

Garoon Calendar SyncのGoogle Apps Script (GAS)版を利用するための案内です。初回の準備と日常の操作は、以下の手順から確認してください。

## 利用条件

- Google CalendarとApps Scriptを利用できるGoogleアカウントを用意する。
- Garoonへユーザー名とパスワードで認証できることを確認する。
- 初回は、配備担当者がApps Scriptプロジェクトへコードと接続設定を登録する。

> [!IMPORTANT] Garoonで2要素認証が必要なユーザーでは利用できません。その場合は[Chrome拡張機能版](../chrome-extension/README.md)の利用を検討してください。

## 初めて利用する

1. 配備担当者が[GAS版の準備](../docs/procedures/gas-setup.md)に従い、Google認証とプロジェクトの設定を完了する。
1. [手動同期](../docs/procedures/gas-operations.md#同期する)を実行し、ログとGoogle Calendarの予定を確認する。
1. 手動同期が成功してから、[定期実行](../docs/procedures/gas-operations.md#定期実行を設定する)を設定する。

配備済みのプロジェクトを利用する場合は、担当者から対象プロジェクトの案内を受けて手動同期へ進んでください。普段の操作はApps Scriptエディタで行います。

## 日常の操作

| 目的 | 手順 |
| --- | --- |
| 予定を手動で同期する | [同期する](../docs/procedures/gas-operations.md#同期する) |
| 定期同期を設定する | [定期実行を設定する](../docs/procedures/gas-operations.md#定期実行を設定する) |
| 自分の在席情報を空にする | [在席情報をリセットする](../docs/procedures/gas-operations.md#在席情報をリセットする) |

同期できない場合は実行ログで認証エラーとAPIエラーを確認してください。設定した実行時間帯の外では同期をスキップします。取得上限の警告が出た場合は対象期間を短くして手動で確認し、失敗が続く場合はトリガーを停止して配備担当者へ確認してください。
