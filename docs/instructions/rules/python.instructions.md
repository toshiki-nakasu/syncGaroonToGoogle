---
description: "Python コーディング規約。Use when: Python ファイルの作成 / 修正, フォーマット, import 順序, 型ヒント, テスト構成。"
applyTo: "**/*.py"
---

# Python 規約

- **フォーマッタ / Linter**: Ruff
- **インデント**: 4 スペース
- **型ヒント**: 公開関数, 公開メソッド, dataclass のフィールドに付与する

## import

- 標準ライブラリ, サードパーティ, ローカルの順でまとめる
- 未使用 import を残さない

## テスト

- テストは pytest を前提に書く
- フィクスチャや共通 setup は必要最小限に留める
- 実装の private detail ではなく公開振る舞いを検証する
