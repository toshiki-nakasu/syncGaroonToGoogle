---
description:
    'JavaScript/GAS コーディング規約。Use when: JavaScript
    ファイルの作成・修正、フォーマット、GAS 固有の制約'
applyTo: '**/*.js'
---

# JavaScript / GAS 規約

- **フォーマッタ**: Prettier
- **リンター**: ESLint

## 命名規則

| 対象                | 規則                   | 例                 |
| ------------------- | ---------------------- | ------------------ |
| JavaScript ファイル | パスカルケース         | `ConfigManager.js` |
| クラス名            | パスカルケース         | `ServiceContainer` |
| メソッド名/関数名   | キャメルケース         | `createTitle`      |
| 変数名              | キャメルケース         | `eventList`        |
| 定数                | アッパースネークケース | `MAX_RETRY_COUNT`  |

## GAS 固有の制約

- `export` / `import` は使用できない
- clasp (`@google/clasp`) 経由でデプロイする
- エントリポイントはグローバル関数として定義する
