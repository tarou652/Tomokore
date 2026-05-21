# Tomodachi Hair Trace — Claude Instructions

## プロジェクト概要

トモダチコレクション新作のフェイスペイント用「髪型描画ガイド」を自動生成するWebアプリ。
キャラクター画像から「トモコレで似せやすい」髪型線画・シルエット・色ガイドを出力する。

**設計思想の核心**: 写実再現ではなく「トモコレで似せやすくする」こと。

---

## 技術スタック

| 役割                      | 技術                         |
| ------------------------- | ---------------------------- |
| フロントエンド            | Nuxt 4 (SPA)                 |
| AIドット絵変換            | TF.js / Transformers.js      |
| Pixel Snapper（独自実装） | Canvas API                   |
| 実行環境                  | ブラウザ完結（サーバー不要） |

---

## 実装フェーズ

- **Phase 1**: 画像アップロード・クロップ・色量子化（8〜16色）・PNG出力
- **Phase 2**: Pixel Snapper（グリッドスナップ・AA除去）・手動微調整エディタ
- **Phase 3**: TF.js / Transformers.js によるAIドット絵変換

---

## コーディング規約

### 基本方針

- TypeScript を使用する（`any` 型禁止。`unknown` + 型ガードを使う）
- マジックナンバー禁止。数値リテラルは必ず名前付き定数に切り出す
- Tailwind のみでスタイリングする（`<style>` ブロック原則不使用）

### ファイル構成・コンポーネント化

- UIコンポーネントは `components/` 以下に配置
- 画像処理ロジックは `composables/` または `utils/` に分離する
- Canvas操作はコンポーネントに直接書かず、composableに切り出す
- **1ファイル200行超えたらコンポーネント分割を検討する**
- なるべく小さな単位でコンポーネント化し、再利用性を高める

### `.vue` ファイルの記述順

```
<script setup lang="ts">  ← JS
</script>

<template>               ← HTML
</template>

<style scoped>           ← CSS（使う場合のみ）
</style>
```

### `<script setup>` 内の記述順

```
1. import
2. defineProps / defineEmits
3. 定数（SCREAMING_SNAKE_CASE）
4. ref / reactive 変数
5. computed
6. composable の呼び出し
7. ライフサイクルフック（onMounted 等）
8. 関数
```

### Props / Emits

- Props は必ず `defineProps<{}>` で TypeScript 型を明示する
- デフォルト値は `withDefaults` で明示する
- Emits も `defineEmits<{}>` で型定義する

### 命名規則

| 対象                   | 規則                 | 例                      |
| ---------------------- | -------------------- | ----------------------- |
| コンポーネントファイル | PascalCase           | `CropCanvas.vue`        |
| composable             | `use` + camelCase    | `useImageCrop`          |
| イベントハンドラ関数   | `on` + PascalCase    | `onFileChange`          |
| 定数                   | SCREAMING_SNAKE_CASE | `ZOOM_LEVELS`           |
| 変数・関数             | camelCase            | `zoomLevel`, `zoomStep` |

### コメント規則

- **関数には必ずコメントを書く**（何をする関数かを1行で説明）
- ロジックの「なぜ」が自明でない箇所にはインラインコメントを追加する
- 自明な処理にコメントは不要

```ts
/** クロップ範囲を正規化してキャンバスに描画する */
function draw() { ... }

/** Photoshop準拠のズーム段階リスト */
const ZOOM_LEVELS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16]
```

### テスト

- composable のユニットテストは **必須**（Vitest）
- コンポーネントテストは `@vue/test-utils` で主要な入力→出力を検証する
- Canvas / MediaPipe / TensorFlow.js 等のブラウザAPIはモックする
- テストファイルは対象と同階層の `__tests__/` に配置する

---

## 出力仕様（常に意識すること）

- キャンバスサイズ: 256×256px
- 最重要要素: シルエット・前髪形状
- 優先度低: 毛束ディテール・色再現・細かい陰影
- 保持すべき特徴: 外ハネ・アホ毛

---

## ハーネス設定について

このプロジェクトはハーネスエンジニアリングの学習も兼ねている。
`.claude/settings.json` でフック・パーミッションを管理する。
