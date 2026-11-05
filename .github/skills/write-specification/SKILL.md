---
name: write-specification
description: "読者と目的に合わせて文書を配置して見直す。Use when: README, 仕様書, 設計書, 操作手順。"
---

# 文書を作成して見直す

構造と表記の正本は[Markdown規約](../../instructions/markdown.instructions.md)です。規約本文をこのSkillに複製しません。

## 進め方

1. 想定読者と判断する目的を決める。
1. [ドキュメント一覧](../../../docs/README.md)から既存の所有文書を探す。
1. 実装と文書を照合し、所有する文書の種類と置き場所を選ぶ。
1. 手順を変更する場合は`docs/procedures/use-cases.md`から手順へのリンクを更新する。手順から一覧へのリンクは置かない。
1. 変更後の文書を通読し、文書規約の内容レビューを行う。
1. [ローカル検証](../../../docs/procedures/development-procedures.md#ローカル検証)を実行する。

未確認の実環境と未整備の手順は、完成したものとして記述しません。通常文書へ作業の経緯と検証実績を混在させないでください。
