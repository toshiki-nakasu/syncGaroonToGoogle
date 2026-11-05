---
name: sync-garoon-to-google-development
description: "GAS版の初期化と設定の変更を確認する。Use when: gas配下の実装, ScriptProperties, clasp配備。"
---

# GAS版の開発

`gas/`配下を変更するときに使います。Chrome拡張機能へGAS固有の構成と運用を持ち込みません。

1. [GAS版の変更時の注意](../../instructions/gas-development.md)を読む。
1. 変更する責務を[GAS版の設計](../../../docs/design/gas-design.md)と照合する。
1. 項目変換を変更する場合は[項目変換](../../../docs/design/gas-event-mapping.md)を確認する。
1. 振る舞いが変わる場合は[write-specification](../write-specification/SKILL.md)に従って所有文書を更新する。
1. [GAS版の検証](../../../docs/procedures/development-procedures.md#gas版を変更した場合)で確認範囲を決める。

認証と配備のコマンドは[準備手順](../../../docs/procedures/gas-setup.md)を正本にします。許可された編集と実環境への反映を同じ作業として扱わないでください。
