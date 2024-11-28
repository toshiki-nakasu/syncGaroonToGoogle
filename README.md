# syncGaroonToGoogle

## 環境構築

### 設定ファイル

```bash
cp sync-garoon-to-google/src/properties/ScriptProperties.example.js sync-garoon-to-google/src/properties/ScriptProperties.js
code sync-garoon-to-google/src/properties/ScriptProperties.js
```

## アップロードするGoogleアカウントにログイン

```bash
sh ./script/function/googleLogin.sh
```

### Gasを構築

```bash
sh ./script/function/setupGas.sh
```

## Gasにアップロード

```bash
sh ./script/function/publishGas.sh
```

---

## 注意点

- typescriptはclasp使ってgsコンパイルする
- exportに対応していない
- GCal -> Garoon: 繰り返し予定に未対応
