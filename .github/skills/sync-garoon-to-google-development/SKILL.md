---
name: sync-garoon-to-google-development
description: "sync-garoon-to-google の設計と運用パターン。Use when: Google Apps Script 実装, Garoon 連携, Google Calendar 同期, ScriptProperties 追加, clasp 運用。"
---

# sync-garoon-to-google 開発

`sync-garoon-to-google/` 配下の Google Apps Script project に適用する。JavaScript の記法は [javascript.instructions.md](../../instructions/javascript.instructions.md) に従い、振る舞い変更を文書へ反映する場合は [write-specification](../write-specification/SKILL.md) を併読する。

## 前提コンテキスト

- 利用者向け運用手順: [README.md](../../../README.md)
- 実装の正本: [sync-garoon-to-google/src/main/script.js](../../../sync-garoon-to-google/src/main/script.js), [sync-garoon-to-google/src/service/SyncEventService.js](../../../sync-garoon-to-google/src/service/SyncEventService.js)
- project manifest: [sync-garoon-to-google/package.json](../../../sync-garoon-to-google/package.json)
- Apps Script 設定: [sync-garoon-to-google/appsscript.json](../../../sync-garoon-to-google/appsscript.json)
- 項目変換仕様: [docs/Garoon_GCal\_項目マッピング.md](../../../docs/Garoon_GCal_項目マッピング.md)
- 在席情報リセット仕様: [docs/Garoon\_在席情報リセット機能.md](../../../docs/Garoon_在席情報リセット機能.md)

## スコープ

- 現行の主要機能は Garoon から Google Calendar への一方向同期
- Google Calendar から Garoon への同期は未実装で、`syncGCalToGaroon()` は TODO が多い
- README は利用者向け運用手順として参照し、実装判断は `src/main/script.js` と `SyncEventService.js` を正本とする
- 既存 project への通常配備は `sh ./script/function/googleLogin.sh` と `sh ./script/function/publishGas.sh` を基準とし、package scripts は同等操作の代替として扱う

## ディレクトリ責務

| ディレクトリ | 役割 |
| --- | --- |
| `src/main/` | `sync()`, `resetPresence()` などのエントリーポイント |
| `src/container/` | `ServiceContainer` による依存性組み立て |
| `src/config/` | `Constants`, `ConfigManager` による設定と定数の正本 |
| `src/dao/` | Garoon API, Calendar API, Apps Script サービスへのアクセス |
| `src/service/` | 差分判定, タグ解釈, 同期適用などの業務ロジック |
| `src/service/ScheduleEventService/` | Garoon / GCal のイベント比較と変換 |
| `src/dataobject/` | 日時範囲, ユーザー, カレンダー設定などの値オブジェクト |
| `src/properties/` | ScriptProperties のセットアップ例 |
| `src/utility/` | Logger, Validator, 汎用補助処理 |

## 実装ルール

- **必須**: エントリーポイントは初期化と処理呼び出しに集中し、API 呼び出しや差分判定を直接持ち込まない
- **必須**: 新しい依存関係は `ServiceContainer` で組み立てる。循環参照がある場合は既存の setter パターンに合わせる
- **必須**: Garoon API や Google Calendar API へのアクセスは DAO に集約し、エラーハンドリングとリトライは `BaseDao` の流儀を再利用する
- **必須**: ScriptProperties を追加 / 変更する場合は `Constants`, `ConfigManager`, [ScriptProperties.example.js](../../../sync-garoon-to-google/src/properties/ScriptProperties.example.js) を同時に更新する
- **推奨**: タグによる振り分けや同期対象判定は `TagParser`, `GaroonEventService`, `SyncEventService` に閉じ込める
- **推奨**: `#nosync` の優先度を崩さない。同期対象カレンダーの解決は `SyncTargetCalendars` と `getOrCreateCalendarId()` に寄せる
- **推奨**: ログは `START`, `END`, 件数サマリを維持し、例外時は `Logger.error()` を経由する

## 代表的な変更パターン

### 設定項目を追加する

1. `Constants` にキー名と必要ならデフォルト値を追加する
2. `ConfigManager` に getter / setter と検証を追加する
3. [ScriptProperties.example.js](../../../sync-garoon-to-google/src/properties/ScriptProperties.example.js) に設定例を追加する
4. 利用箇所を `ServiceContainer` または対象 service / dao に接続する
5. ユーザーに影響する設定なら README か docs を更新する

### 同期ロジックを変更する

1. [docs/Garoon_GCal\_項目マッピング.md](../../../docs/Garoon_GCal_項目マッピング.md) と既存 service の責務を確認する
2. Garoon 側の取得 / 変換は `GaroonEventService`、Google Calendar への反映は `SyncEventService` / `GCalDao` に分けて考える
3. `GAROON_UNIQUE_EVENT_ID`, `GAROON_SYNC_DATETIME` などの同期タグ運用を崩さない
4. 振る舞いを変えた場合は docs を同時に更新する

### 新しい service / dao を追加する

1. 役割に応じて `dao`, `service`, `utility` のいずれかへ配置する
2. 外部サービス呼び出しは DAO、業務ルールは service に置く
3. `ServiceContainer` に生成と getter を追加する
4. 既存の初期化順序と循環参照の有無を確認する

## 運用と検証

- 既存 project への通常配備:
    1.  `sh ./script/function/googleLogin.sh`
    2.  `sh ./script/function/publishGas.sh`
- **必須**: 認証と配備は上記 shell script を正本とし、raw の `clasp` コマンドへ置き換えない
- **必須**: 配備は状態変更を伴うため、ユーザーの明示承認後にだけ実行する
- 新規 Apps Script project を作成する場合:
    1.  `sh ./script/function/setupGas.sh`
    2.  または `cd sync-garoon-to-google && npm run setup` (`clasp login` と `clasp create --type api` をまとめて実行)
- 補助的な npm scripts: `npm run push`, `npm run open`, `npm run deploy`
- 自動テスト基盤はまだ薄いため、重要変更では手動確認手順を明示する
- 手動確認では `sync()` または対象 helper を実行し、Apps Script のログ, Garoon の予定, Google Calendar の反映結果を確認する
