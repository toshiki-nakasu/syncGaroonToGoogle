---
name: discover-skills
description: "ユースケース別に skill の選定, 読み順, 組合せを案内する索引。Use when: skill 選定, ユースケース整理, skill 組合せ, 参照順確認。"
---

# skill 選定ガイド

`.github/skills/` 配下の skill と、関連する instructions / prompts をユースケース別に案内する。ユースケース別の読み順と組合せの正本として扱い、規約本文は複製せず、何を先に読み、何を組み合わせるかを判断するための索引として使う。

## 選定手順

1. 成果物の種類を判定する
    - コード実装
    - 仕様書 / 設計書
    - AI 文書
    - 運用設定 / 配備手順
2. 共通ルールだけで足りるか、プロジェクト固有の規約が必要かを判定する
3. 共通 skill とプロジェクト固有 skill を必要に応じて組み合わせる

## ユースケース別の参照先

### AI 文書系

| ユースケース | 主に読むもの | 追加で読むもの | 補足 |
| --- | --- | --- | --- |
| AI 文書更新 | [copilot-instructions.md](../../copilot-instructions.md), [ai-docs.instructions.md](../../instructions/ai-docs.instructions.md) | [markdown.instructions.md](../../instructions/markdown.instructions.md), [check-convention.prompt.md](../../prompts/check-convention.prompt.md) | 既存 AI 文書へ修正を入れる場合に使う。実施方針と回答受付は main / handoff 側で確定する |
| AI 文書精査 / レビュー | [review-ai-docs.prompt.md](../../prompts/review-ai-docs.prompt.md) | [copilot-instructions.md](../../copilot-instructions.md), [ai-docs.instructions.md](../../instructions/ai-docs.instructions.md), [markdown.instructions.md](../../instructions/markdown.instructions.md), [write-specification](../write-specification/SKILL.md) | 重複, 旧方針, モデル方針, 分離性, 可読性を確認する。問題がある場合は、状況把握とフィードバックを先に返し、回答受付は `vscode_askQuestions` を使う main が担う |
| AI 文書の新規作成 / 構成見直し | [ai-docs.instructions.md](../../instructions/ai-docs.instructions.md) | [copilot-instructions.md](../../copilot-instructions.md), [markdown.instructions.md](../../instructions/markdown.instructions.md), [write-specification](../write-specification/SKILL.md), [check-convention.prompt.md](../../prompts/check-convention.prompt.md) | 構造, 記法, 品質基準を確認する。複数の修正候補が出る場合も、5 フェーズで扱える粒度に整理する |

### 文書作成系

| ユースケース | 主に読むもの | 追加で読むもの | 補足 |
| --- | --- | --- | --- |
| 仕様書, 設計書作成 | [write-specification](../write-specification/SKILL.md) | [markdown.instructions.md](../../instructions/markdown.instructions.md), [sync-garoon-to-google-development](../sync-garoon-to-google-development/SKILL.md) | 振る舞い変更を文書へ反映する場合は実装側の正本も併読する |
| README / 運用手順の更新 | [write-specification](../write-specification/SKILL.md) | [sync-garoon-to-google-development](../sync-garoon-to-google-development/SKILL.md) | `clasp` 運用, ScriptProperties, 手動確認手順の整合を確認する |

### 実装, 設定系

| ユースケース | 主に読むもの | 追加で読むもの | 補足 |
| --- | --- | --- | --- |
| Apps Script 実装 | [sync-garoon-to-google-development](../sync-garoon-to-google-development/SKILL.md) | [javascript.instructions.md](../../instructions/javascript.instructions.md) | ServiceContainer, DAO, service, dataobject の責務境界を確認する |
| Garoon / GCal 同期ロジック変更 | [sync-garoon-to-google-development](../sync-garoon-to-google-development/SKILL.md) | [write-specification](../write-specification/SKILL.md) | 振る舞い変更が docs に影響する場合は項目マッピング文書も更新する |
| ScriptProperties / 配備手順変更 | [sync-garoon-to-google-development](../sync-garoon-to-google-development/SKILL.md) | [javascript.instructions.md](../../instructions/javascript.instructions.md), [write-specification](../write-specification/SKILL.md) | `Constants`, `ConfigManager`, `ScriptProperties.example.js`, README の整合を確認する |

## 組合せパターン

- Apps Script のコード変更: [javascript.instructions.md](../../instructions/javascript.instructions.md) + [sync-garoon-to-google-development](../sync-garoon-to-google-development/SKILL.md)
- 振る舞い変更を docs に反映する: [sync-garoon-to-google-development](../sync-garoon-to-google-development/SKILL.md) + [write-specification](../write-specification/SKILL.md)
- AI 文書の変更: [ai-docs.instructions.md](../../instructions/ai-docs.instructions.md) + [markdown.instructions.md](../../instructions/markdown.instructions.md) + [check-convention.prompt.md](../../prompts/check-convention.prompt.md)
- AI 文書系の組合せは `ユースケース別の参照先` を正本として参照する
