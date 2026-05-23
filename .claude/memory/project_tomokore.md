---
name: project-tomokore
description: トモコレ フェイスペイント髪型変換アプリ「Tomodachi Hair Trace」の仕様・技術スタック・実装フェーズ
metadata: 
  node_type: memory
  type: project
  originSessionId: 03d1dea0-525f-41b6-8d53-9e60d7317bdb
---

キャラクター画像からトモダチコレクション新作のフェイスペイント用「髪型描画ガイド」を自動生成するWebアプリ。

**Why:** トモコレのフェイスペイントはキャンバス256×256pxの制約があり、「写実再現」より「似せやすさ」が重要。手で描ける線に落とし込むガイドが必要。

**How to apply:** 機能追加の提案時は「描きやすさ vs 再現度」トレードオフを意識する。写実方向の処理（グラデ・陰影維持）は仕様外。

## 仕様サマリー

- **キャンバス**: 256×256px
- **最重要要素**: シルエット・前髪形状
- **優先度低**: 毛束ディテール・色再現・細かい陰影
- **保持すべき特徴**: 外ハネ・アホ毛

## 出力物

| 出力 | 内容 |
|---|---|
| ガイド画像 | グリッド補助付き線画 |
| シルエット画像 | 外形最適化済み |
| 色ガイド | ベース・影・ハイライトのHEX |
| 描画順ガイド | 手順テキスト（5ステップ） |
| 難易度分析 | A〜C評価 + コメント |

## 技術スタック

| 役割 | 技術 | 理由 |
|---|---|---|
| フロントエンド | Nuxt 4 (SPA) | Canvas UI・状態管理・SPA構成 |
| 顔検出 | MediaPipe | 軽量・高精度・ブラウザ対応 |
| 髪抽出 | TensorFlow.js | ブラウザ推論・GPU対応 |
| 輪郭・線単純化 | OpenCV.js | Canny/Sobel/Douglas-Peucker |
| 実行環境 | ブラウザ完結 | サーバー不要・画像外部送信なし |

## 実装フェーズ

- **Phase 1（MVP）**: 画像アップロード・MediaPipe顔検出・Canvas描画・PNG出力
- **Phase 2**: 輪郭抽出・前髪検出・シルエット最適化
- **Phase 3**: TensorFlow segmentation・AI簡略化・描画順生成

## 関連ファイル

- `c:\code\tomokore\spec.md` — 完全仕様書 v4
- `c:\code\tomokore\CLAUDE.md` — プロジェクト用Claudeインストラクション
