---
description: "編集後の規約違反を検証する。Use when: 編集後検証, 規約違反チェック, 表記統一。"
---

# 編集後検証

変更されたファイルに対して以下のチェックを実行し、違反箇所を報告する。

## 実行タイミング

エージェントがファイル編集を完了した後、ユーザーが手動で本プロンプトを実行する。

## 検証手順

以下の順で変更されたファイルを検証する:

1. 全ファイル: [copilot-instructions.md](../copilot-instructions.md) の書式ルール (全角括弧, 表記統一)
2. Markdown ファイル (`*.md`): [markdown.instructions.md](../instructions/markdown.instructions.md) を参照し、記法ルールを確認する
    - 特に確認する項目: コードブロック, 箇条書き, 番号付き手順, 矢印の使い分け, 長いインライン列挙の展開, 関連文書参照のリンク化
3. Python ファイル (`*.py`): [python.instructions.md](../instructions/python.instructions.md) を参照し、型ヒント, import, pytest 前提の整合を確認する
4. JavaScript ファイル (`*.js`): [javascript.instructions.md](../instructions/javascript.instructions.md) を参照し、GAS 制約, JSDoc, 定数管理を確認する
    - `sync-garoon-to-google/` 配下を変更した場合は [sync-garoon-to-google-development](../skills/sync-garoon-to-google-development/SKILL.md) スキルも参照する
5. YAML ファイル (`*.yaml`): [yaml.instructions.md](../instructions/yaml.instructions.md) を参照し、インデント, 配列整形, 引用符を確認する
6. AI 文書 (`.github/**/*.md`): [ai-docs.instructions.md](../instructions/ai-docs.instructions.md) と [copilot-instructions.md](../copilot-instructions.md) を参照し、構造と運用整合性を確認する
    - 特に確認する項目: frontmatter (agent / instruction / skill / prompt に必須。top-level shared doc と reference doc は対象外), セクション構成, 参照ルール, ユースケース単位の分離, モデル方針の整合, リンクテキストの正確性

## 出力形式

出力は [ai-docs.instructions.md](../instructions/ai-docs.instructions.md) の「prompts の運用」に従う。個別要件は以下のみ追加する。

### 1. 状況把握

- 対象範囲
- 問題の有無

### 2. フィードバックと確認

- 各違反には共通項目に加えて `対象ファイル`, `行番号`, `違反内容` を含める
- 違反がない場合は「違反なし」と報告する
- 問題がない場合は `状況把握` と `フィードバックと確認` のみで完了できる

### 3. 回答受付

- 一括で修正できる項目
- 個別に判断が必要な項目

### 4. 対応

- この prompt 自身は修正実施の判断を行わず、違反と修正候補の整理までを担当する

### 5. ネクストアクションの提案

- 次のアクション候補
