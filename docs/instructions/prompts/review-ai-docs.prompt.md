---
description: "AI文書の配置と重複を見直す。Use when: instructions, skills, agents, promptsのレビュー。"
---

# AI文書のレビュー

[AI向け文書の保守](../rules/ai-docs.instructions.md)に従います。

1. [実装指示の索引](../maintenance.md)から関連する入口と詳細を読む。
1. 通常文書の仕様と手順をAI指示へ複製していないか確認する。
1. 同じ規則を複数の場所で所有していないか確認する。
1. frontmatterと参照先、適用条件を実際の構成に照合する。
1. hookを説明する場合は、実装と呼び出し条件を確認する。
1. [Markdownの内容レビュー](../rules/markdown.instructions.md#変更時の内容レビュー)を行う。

指摘は重要度順に返します。各指摘に対象, 根拠, 影響, 推奨配置先を含めます。既に依頼された整理と、新たな判断が必要な変更を分けてください。
