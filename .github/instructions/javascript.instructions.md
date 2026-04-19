---
description: "JavaScript / GAS コーディング規約。Use when: JavaScript ファイルの作成 / 修正, Google Apps Script 実装, JSDoc, フォーマット。"
applyTo: "**/*.js"
---

# JavaScript / GAS 規約

- **フォーマッタ**: Prettier
- **インデント**: 2 スペース
- **文字列**: シングルクォート
- **セミコロン**: 常に付与する
- **複数行リテラル**: 末尾カンマを付与する

## 命名規則

| 対象                              | 規則           | 例                  |
| --------------------------------- | -------------- | ------------------- |
| クラス定義ファイル                | パスカルケース | `ConfigManager.js`  |
| エントリーポイント / 特殊ファイル | 既存命名を維持 | `script.js`         |
| クラス名                          | パスカルケース | `ServiceContainer`  |
| メソッド名 / 関数名               | キャメルケース | `getSyncTargetTerm` |
| ローカル変数                      | キャメルケース | `targetCalendarId`  |

## Google Apps Script 固有の制約

- `import` / `export` を使用せず、Apps Script が読み込めるグローバル定義を維持する
- エントリーポイント関数は `sync-garoon-to-google/src/main/script.js` にグローバル関数として定義する
- `PropertiesService`, `CalendarApp`, `Calendar`, `UrlFetchApp`, `Utilities`, `Session` への直接アクセスは config / dao / utility に寄せ、業務ロジックへ散らさない
- ScriptProperties のキー, タグ名, API パスのような共有定数は文字列直書きせず `Constants` に集約する
- ScriptProperties を追加 / 変更する場合は `Constants`, `ConfigManager`, `ScriptProperties.example.js` を同時に更新する

## JSDoc

- グローバル関数, 公開メソッド, `@typedef` には JSDoc を付与する
- `@param`, `@returns`, `@throws` は振る舞いが読み取りにくい箇所で省略しない
- 型注釈は TypeScript ではなく JSDoc で補う
