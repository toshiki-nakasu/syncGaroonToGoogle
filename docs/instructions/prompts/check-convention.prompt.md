---
description: "変更したコードと文書の規約を確認する。Use when: 編集後の検証。"
---

# 編集後の確認

[共通方針](../maintenance.md)を適用し、変更したファイルを確認します。

1. 対象に適用されるinstructionsを読む。
1. [ローカル検証](../../procedures/development-procedures.md#ローカル検証)を実行する。
1. Markdownは[内容レビュー](../rules/markdown.instructions.md#変更時の内容レビュー)を行う。
1. 実装固有の落とし穴を[実装指示の索引](../maintenance.md)から確認する。

結果は重要度順に返します。各指摘に対象, 根拠, 影響, 推奨変更を含めます。問題がない場合はその旨を示し、未実施の実環境確認は別に記載します。
