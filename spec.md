# 機能仕様書 — Phase 2 追加機能

> 作成日: 2026-05-23  
> 対象リポジトリ: TomodachiHairTrace (Nuxt 4 SPA)

---

## 概要

以下 5 機能を追加する。実装順は依存関係に基づき後述。

| #   | 機能名               | 概要                                                          |
| --- | -------------------- | ------------------------------------------------------------- |
| A   | 用途別クロップ       | トモコレの描画エリアに合わせたアスペクト比プリセット          |
| B   | 色調整               | クロップ後・変換前に明度/彩度/コントラスト/シャープネスを調整 |
| C   | 84色パレット自動変換 | トモコレのゲーム内 84色に最近傍マッチング                     |
| D   | 使用色レシピ         | 各色の使用数・割合・ゲーム内 HSV 手順を一覧表示               |
| E   | ドット絵エディタ     | 変換後にピクセル単位で手直しできるキャンバスエディタ          |

---

## A. 用途別クロップ

### 目的

トモコレのペイントエリアはフェイス（1:1）以外にも横長・縦長がある。
クロップ枠のアスペクト比をワンタップでロックできるようにする。

### 入力

なし（プリセットボタン選択のみ）

### 出力

`CropCanvas` 内のクロップ枠が選択したアスペクト比に変形される

### プリセット定義

| ラベル      | 縦横比 (w:h) | 備考                           |
| ----------- | ------------ | ------------------------------ |
| 顔 🧑       | 1 : 1        | フェイスペイント（デフォルト） |
| たてなが 📖 | 2 : 3        | 本・カード類                   |
| よこなが 📺 | 16 : 9       | TV・壁紙                       |
| ゲーム 🎮   | 3 : 2        | ゲーム画面                     |

### UI

- `CropCanvas.vue` のヘッダー下に横並びタブボタンとして配置
- 選択中プリセットはハイライト表示
- プリセット変更時、クロップ枠は中央に再配置しアスペクト比をロック

### 変更ファイル

- `composables/useImageCrop.ts` — `CropRect` を `{ x, y, w, h }` に拡張し、アスペクトロック機能を追加
- `components/CropCanvas.vue` — プリセットタブ UI を追加
- `components/CropPresets.vue` (**新規**) — プリセット選択ボタン群

### 型定義変更

```ts
// Before
export interface CropRect {
  x: number;
  y: number;
  size: number;
}

// After
export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AspectPreset {
  id: string;
  label: string;
  emoji: string;
  wRatio: number; // 横
  hRatio: number; // 縦
}
```

---

## B. 色調整

### 目的

クロップ後の画像に対して、変換前にトーン調整を加えることで
パレット変換の精度を高める。

### 入力

クロップ済み ImageData

### 出力

調整済み ImageData（変換ステップに渡される）

### パラメータ

| パラメータ   | 型     | 範囲        | デフォルト | 説明                             |
| ------------ | ------ | ----------- | ---------- | -------------------------------- |
| `brightness` | number | -100 ~ +100 | 0          | 明度オフセット                   |
| `contrast`   | number | -100 ~ +100 | 0          | コントラスト倍率                 |
| `saturation` | number | -100 ~ +100 | 0          | 彩度倍率                         |
| `sharpness`  | number | 0 ~ 100     | 0          | シャープネス強度（ラプラシアン） |

### 処理方式

- brightness/contrast/saturation: ピクセル単位 RGB 演算（Canvas filter 非使用）
- sharpness: 3×3 ラプラシアンカーネルによる畳み込み
- リセットボタンで全パラメータを初期値に戻す
- 調整はリアルタイムプレビューせず、変換ボタン押下時に適用

### UI

- `ConvertSettings.vue` 内の既存設定に続けてスライダーセクションを追加
- 各スライダーの現在値を右端に表示
- 「リセット」ボタン

### 変更ファイル

- `composables/useColorAdjust.ts` (**新規**) — ピクセル演算ロジック
- `components/ConvertSettings.vue` — スライダー UI 追加

### インターフェース

```ts
export interface ColorAdjustParams {
  brightness: number; // -100 ~ +100
  contrast: number; // -100 ~ +100
  saturation: number; // -100 ~ +100
  sharpness: number; // 0 ~ 100
}

/** ImageData に色調整を適用して新しい ImageData を返す */
export function applyColorAdjust(
  src: ImageData,
  params: ColorAdjustParams,
): ImageData;
```

---

## C. 84色パレット自動変換

### 目的

任意色の ImageData をトモコレのゲーム内パレット 84色に強制マッチングする。
変換後は必ずこの 84色のいずれかのみ使われる。

### パレットデータ

トモコレのゲーム内 7行×12列 = 84色（HEX 定義）:

```ts
export const TOMODACHI_PALETTE_HEX = [
  // 行 0（最も明るい）
  "#FFFFFF",
  "#F1F0F8",
  "#F0F0F8",
  "#F0F7FF",
  "#F0FBF3",
  "#F1F3EE",
  "#F4FAF0",
  "#FCFDEF",
  "#FEF3EF",
  "#FAF0EF",
  "#FDEDDD",
  "#FE0000",
  // 行 1
  "#EBEBEB",
  "#CFC8E9",
  "#C7CDE7",
  "#C8E8FD",
  "#C9F1D7",
  "#C8DBC8",
  "#DAEFC8",
  "#FBF9C8",
  "#FCD6C9",
  "#EFC9C8",
  "#E4CFB0",
  "#FFFF00",
  // 行 2
  "#D5D5D3",
  "#A692D7",
  "#929FD4",
  "#92D6FD",
  "#93E6BA",
  "#92BC94",
  "#BBE194",
  "#FAF492",
  "#FAB492",
  "#E19691",
  "#CAA976",
  "#05FF00",
  // 行 3
  "#BCBCBC",
  "#6500C2",
  "#004BC0",
  "#08C2FD",
  "#00DA90",
  "#019616",
  "#92D315",
  "#F9F001",
  "#F68400",
  "#D42700",
  "#90620D",
  "#01FFFF",
  // 行 4
  "#9C9C9A",
  "#5600A9",
  "#0040A4",
  "#01A5D8",
  "#02BC7B",
  "#04800E",
  "#7DB50C",
  "#D6CE01",
  "#D57101",
  "#B62100",
  "#774200",
  "#0000FE",
  // 行 5
  "#727272",
  "#420084",
  "#013281",
  "#0283AB",
  "#00935F",
  "#01650D",
  "#638D0D",
  "#A8A301",
  "#A85801",
  "#901600",
  "#5D380C",
  "#8801FE",
  // 行 6（最も暗い）
  "#000000",
  "#22004C",
  "#001648",
  "#014962",
  "#015534",
  "#013800",
  "#355001",
  "#605D00",
  "#612E01",
  "#510D00",
  "#34220C",
  "#FF00C2",
] as const;
```

### 処理方式

- 距離計算: 知覚的 RGB 距離（redmean 法）
  ```
  r̄ = (r1 + r2) / 2
  dist = (2 + r̄/256)*(r1-r2)² + 4*(g1-g2)² + (2+(255-r̄)/256)*(b1-b2)²
  ```
- 透明ピクセル（alpha < 128）はスキップ（透明のまま保持）
- 初回呼び出し時にパレット RGB を事前計算してキャッシュ

### UI

- `ConvertSettings.vue` に「84色変換モード」トグルを追加
- ON: 量子化をスキップして 84色マッチングのみ行う
- OFF: 従来の中央値カット量子化（既存挙動）
- 両モードとも解像度選択は共通

### 変更ファイル

- `composables/useTomodachiPalette.ts` (**新規**) — パレット定義と最近傍マッチング
- `components/ConvertSettings.vue` — 84色モードトグル追加
- `pages/index.vue` — `onConvert` に 84色モード分岐を追加

### インターフェース

```ts
export interface TomodachiPaletteEntry {
  hex: string;
  r: number;
  g: number;
  b: number;
  index: number; // パレット内インデックス (0-83)
  row: number; // 行 (0-6)
  col: number; // 列 (0-11)
  count: number;
  percentage: number;
}

/**
 * ImageData の各ピクセルをトモコレ 84色に最近傍マッチングする
 * @returns マッチング済み ImageData と使用色エントリ一覧
 */
export function matchToTomodachiPalette(src: ImageData): {
  imageData: ImageData;
  usedColors: TomodachiPaletteEntry[];
};
```

---

## D. 使用色レシピ

### 目的

84色変換後、各色が何ピクセル使われたか・ゲーム内での色の作り方（HSV 操作手順）を
一覧表示してペイント作業を補助する。

### 表示内容（1色あたり）

| 項目             | 内容                                   |
| ---------------- | -------------------------------------- |
| カラースウォッチ | 16×16px の塗り潰しボックス             |
| HEX              | `#RRGGBB` テキスト（コピーボタン付き） |
| 使用数           | `N px (XX.X%)`                         |
| 使用割合バー     | 最多色を 100% とした相対バー           |
| HSV 手順         | H: NNN° / S: NN% / V: NN%              |

### HSV 手順の算出

トモコレのカラーピッカーは HSV スライダー（H: 0-359°, S: 0-100%, V: 0-100%）。

```ts
function rgbToHsvSteps(
  r: number,
  g: number,
  b: number,
): { h: number; s: number; v: number };
// H: 0-359（整数）, S: 0-100（整数）, V: 0-100（整数）
```

### ソート順

デフォルトは「使用数降順」。ヘッダーをクリックで「使用数 / HSV-H 値」切り替え可。

### UI

- 既存 `ColorPalette.vue` を置き換えて `PaletteRecipe.vue` (**新規**) として実装
- 84色モード OFF（従来量子化）時はレシピなしの簡易表示（HEX + 割合のみ）
- 84色モード ON 時はフル表示（HSV 手順付き）

### 変更ファイル

- `components/PaletteRecipe.vue` (**新規**) — レシピ表示コンポーネント

---

## E. ドット絵エディタ

### 目的

変換後のドット絵をピクセル単位で手直しできるインタラクティブエディタ。

### 編集ツール

| ツール        | 説明                                     |
| ------------- | ---------------------------------------- |
| ペン ✏️       | 1ピクセル単位で選択色を塗る              |
| 消しゴム 🧹   | ピクセルを透明にする                     |
| 塗りつぶし 🪣 | 4方向フラッドフィル（BFS、距離閾値あり） |
| 対称 🔄       | ON/OFF トグル。左右鏡像に同時描画        |

### 状態管理

```ts
export type EditorTool = "pen" | "eraser" | "fill";

export interface EditorState {
  imageData: ImageData; // 編集中のピクセルデータ
  activeTool: EditorTool;
  activeColor: string; // HEX（84色パレットから選択）
  symmetryMode: boolean;
  undoStack: ImageData[]; // 最大 UNDO_STACK_MAX = 20 件
  redoStack: ImageData[];
}
```

### キャンバス描画

- 表示サイズ: 最大 512px（`imageData` が 64px → 8倍、128px → 4倍、256px → 2倍）
- ピクセルグリッド: 表示倍率 ≥ 4 のとき薄いグレーでグリッド線描画

### フラッドフィルアルゴリズム

```
BFS（幅優先探索）
- 起点色と redmean 距離 ≤ FILL_THRESHOLD(=30) のピクセルを上下左右に展開
- 透明ピクセルは対象外
```

### Undo / Redo

- 操作開始前に ImageData の深コピーを undoStack に積む
- キーボード: `Ctrl+Z` / `Ctrl+Y`（`UNDO_STACK_MAX = 20`）

### 色選択

- PaletteRecipe パネルの 84色スウォッチをクリックして `activeColor` を設定

### エクスポート

- `💾 ほぞんする` ボタン: 編集済み PNG をダウンロード
- ファイル名: `tomokore-pixel_YYYYMMDD.png`

### UI レイアウト

```
[EditorToolbar]
  ✏️ペン  🧹消しゴム  🪣塗りつぶし  |  🔄対称  ↩Undo  ↪Redo  💾保存

[PixelEditor キャンバス]
  最大 512px 表示 + ピクセルグリッドオーバーレイ

[PaletteRecipe]
  84色スウォッチ（クリックで色選択） + レシピ一覧
```

### 変更ファイル

- `composables/usePixelEditor.ts` (**新規**) — エディタ状態管理・ツールロジック
- `composables/useFloodFill.ts` (**新規**) — フラッドフィルアルゴリズム
- `components/PixelEditor.vue` (**新規**) — エディタキャンバス
- `components/EditorToolbar.vue` (**新規**) — ツールバー

---

## 実装順序と依存関係

```
A. 用途別クロップ          ← 独立（既存 useImageCrop 改修）
    ↓
B. 色調整                  ← A 完了後（調整対象はクロップ済みデータ）
    ↓
C. 84色パレット自動変換    ← B 完了後（調整済みデータを変換）
    ↓
D. 使用色レシピ            ← C 完了後（変換結果から生成）
    ↓
E. ドット絵エディタ        ← C 完了後（変換結果を編集）
```

---

## ファイル構成まとめ（変更・追加のみ）

```
app/
├── components/
│   ├── CropCanvas.vue            ← 改修（プリセットタブ追加）
│   ├── CropPresets.vue           ★ 新規
│   ├── ConvertSettings.vue       ← 改修（色調整スライダー・84色トグル追加）
│   ├── PaletteRecipe.vue         ★ 新規
│   ├── PixelEditor.vue           ★ 新規
│   └── EditorToolbar.vue         ★ 新規
├── composables/
│   ├── useImageCrop.ts           ← 改修（CropRect を w/h に拡張）
│   ├── useColorAdjust.ts         ★ 新規
│   ├── useTomodachiPalette.ts    ★ 新規（84色定義 + マッチング）
│   ├── usePixelEditor.ts         ★ 新規
│   └── useFloodFill.ts           ★ 新規
└── pages/
    └── index.vue                 ← 改修（新機能の接続）
```

---

## 決定事項（2026-05-24 確定）

| #   | 問い                       | 決定                                                                                                                             |
| --- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 非正方形クロップの出力形状 | **アスペクト比を維持して出力**。`getCroppedCanvas` は長辺 = `targetSize`、短辺はアスペクト比から計算した非正方形キャンバスを返す |
| 2   | 84色モードと量子化の共存   | **排他（どちらか一方）**。ConvertSettings のトグルで切り替え。同時 ON 不可                                                       |
| 3   | タッチ / スマホ対応        | **Phase 3 以降に先送り**。ドット絵エディタはマウス操作のみ実装                                                                   |
